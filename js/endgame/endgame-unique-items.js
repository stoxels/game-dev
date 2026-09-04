//------------------------------------------------------------------------
//-------------------UNIQUE ITEMS (PoE-STYLE)-----------------------------
//------------------------------------------------------------------------
// Fixed-modifier named items with a built-in downside — the golden tier
// above epics. Uniques are NOT rolled: every copy of a unique has the exact
// same stats, but each one carries a twist that makes it build-defining in
// the right setup and a trap in the wrong one.
//
// Load AFTER endgame-equipment-generator.js (uses _egMapLootRarityWeightMult,
// EG_SLOT_ICONS) — the drop hook is applied inside _egSpawnLootDrop
// (endgame-grid-pickups.js), which tries _egTryGenerateUniqueDrop() first.
//
// Rarity string is 'legendary' (the game's golden tier) plus `isUnique:true`
// so all existing rendering (glow, toasts, chips, vendor) works out of the
// box while tooltips / crafting gates can special-case uniques.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

// Chance that an equipment drop is replaced by a random unique
// (~2% of equipment drops → roughly 1 in 150 normal monster kills).
const EG_UNIQUE_DROP_CHANCE = 0.02;

// The active map's loot-rarity bonus also makes uniques more likely
// (applied as a square-root so rarity farming helps, but softly).

// Unique-only QoL perk text for the zero-line auto-mark modifier.
// Rendered as a special (blue) tooltip line, NOT a stat mod — it never
// touches EG_STAT_KEY_MAP / _egComputePlayerStats.
const EG_UNIQUE_ZERO_AUTOMARK_EN = 'Rows and Columns with zero filled cells are automatically marked incorrect on level start';
const EG_UNIQUE_ZERO_AUTOMARK_DE = 'Reihen und Spalten ohne gefüllte Zellen werden bei Levelstart automatisch als falsch markiert';


//------------------------------------------------------------------------
//-------------------UNIQUE DEFINITIONS-----------------------------------
//------------------------------------------------------------------------
// Stat keys MUST exist in EG_STAT_KEY_MAP (endgame-player-stats.js) so the
// mods actually apply to gameplay. Negative values are real downsides —
// stat aggregation simply adds them, so e.g. flat_health:-30 reduces life.
// Label templates use '#' for the value ('+' prefix is auto-inserted for
// positive values).
//
// Optional per-unique fields:
//   defenses      — { armour, evasion, absorption } implicit
//   damage        — { min, max } + attackIntervalSeconds (weapons)
//   blockChance   — implicit block % (shields)
//   autoMarkZeroLines — true → rows/cols with zero filled cells are auto-
//     marked incorrect (grey X, userGrid=2) on level start. Unique-only QoL
//     perk traded for raw power: the carrier uniques below are deliberately
//     tuned slightly below curve for their level (see _egApplyUniqueZeroLineAutomark).

const EG_UNIQUE_ITEMS = [

    // ── Head ──────────────────────────────────────────────────────────
    {
        uniqueId: 'crown_of_quiet_kings',
        nameEn: 'Crown of Quiet Kings',
        nameDe: 'Krone der Stillen Könige',
        icon: '👑', slotType: 'head', archetype: 'any',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 0, int: 100 },
        defenses: { armour: 0, evasion: 0, absorption: 165 },
        bonuses: [
            { key: 'flat_mana', value: 70, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'inc_spell_damage', value: 25, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-1 Allowed Mistake', de: '-1 erlaubter Fehler' }
        ],
        flavorEn: 'A kingdom ruled in silence fell to a single shouted word.',
        flavorDe: 'Ein im Schweigen regiertes Königreich fiel einem einzigen Schrei zum Opfer.',
    },

    // ── Gloves ────────────────────────────────────────────────────────
    {
        uniqueId: 'bloodweave_grips',
        nameEn: 'Bloodweave Grips',
        nameDe: 'Blutgewebte Fäustlinge',
        icon: '🧤', slotType: 'gloves', archetype: 'any',
        minLevel: 22,
        requirements: { level: 22, str: 60, agi: 0, int: 0 },
        defenses: { armour: 95, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_leech', value: 5, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'life_on_kill', value: 10, en: '+# Life gained on Kill', de: '+# Leben bei jedem Kill' },
            { key: 'heart_heal', value: 15, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Every thread stitched shut with something that used to bleed.',
        flavorDe: 'Jeder Faden mit etwas vernäht, das einst blutete.',
    },

    // ── Belt ──────────────────────────────────────────────────────────
    {
        uniqueId: 'girdle_of_the_timekeeper',
        nameEn: 'Girdle of the Timekeeper',
        nameDe: 'Gürtel des Zeitwächters',
        icon: '⏳', slotType: 'belt', archetype: 'any',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 0, int: 76 },
        defenses: { armour: 0, evasion: 0, absorption: 110 },
        bonuses: [
            { key: 'time_added', value: 45, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'focus', value: 20, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'chance_for_new_question', value: -35, en: '-#% Chance to receive a new Question after failing', de: '-#% Chance auf eine neue Frage nach einer falschen Antwort' }
        ],
        flavorEn: 'He saved every second he ever wasted. They saved him back.',
        flavorDe: 'Er bewahrte jede verschwendete Sekunde auf. Sie bewahrten ihn zurück.',
    },

    // ── Ring 1 ────────────────────────────────────────────────────────
    {
        uniqueId: 'ember_of_the_reckless',
        nameEn: 'Ember of the Reckless',
        nameDe: 'Glut der Tollkühnen',
        icon: '🔥', slotType: 'ring', archetype: 'any',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'crit_chance', value: 12, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 45, en: '+#% to Critical Strike Multiplier', de: '+#% Kritischer Trefferschaden' },
            { key: 'fire_damage_1', value: 8, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' }
        ],
        downsides: [
            { key: 'fire_resist', value: -32, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'It does not burn the wearer. It burns everyone near enough to matter.',
        flavorDe: 'Sie verbrennt nicht die Trägerin. Sie verbrennt alle, die nah genug sind, um zu zählen.',
    },

    // ── Shield ────────────────────────────────────────────────────────
    {
        uniqueId: 'aegis_of_the_last_king',
        nameEn: 'Aegis of the Last King',
        nameDe: 'Aegis des Letzten Königs',
        icon: '🛡️', slotType: 'shield', archetype: 'strength',
        minLevel: 45,
        requirements: { level: 45, str: 140, agi: 0, int: 0 },
        defenses: { armour: 340, evasion: 0, absorption: 0 },
        blockChance: 30,
        bonuses: [
            { key: 'block_recovery', value: 60, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'spell_block_chance', value: 10, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'grounded_1', value: 25, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' },
            { key: 'dodge', value: -13, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'The wall held. The kingdom behind it did not.',
        flavorDe: 'Die Mauer hielt. Das Königreich dahinter nicht.',
    },

    // ── Boots ─────────────────────────────────────────────────────────
    {
        uniqueId: 'stormstriders',
        nameEn: 'Stormstriders',
        nameDe: 'Sturmschreiter',
        icon: '👟', slotType: 'boots', archetype: 'agility',
        minLevel: 38,
        requirements: { level: 38, str: 0, agi: 144, int: 0 },
        defenses: { armour: 0, evasion: 320, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 12, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 12, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'faster_absorption_regen_start', value: 8, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Lightning never strikes the same feet twice.',
        flavorDe: 'Blitz schlägt nie zweimal in dieselben Füße.',
    },

    // ── Melee Weapon ──────────────────────────────────────────────────
    {
        uniqueId: 'hungering_edge',
        nameEn: 'Hungering Edge',
        nameDe: 'Hungrige Klinge',
        icon: '🗡️', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 30,
        requirements: { level: 30, str: 82, agi: 0, int: 0 },
        damage: { min: 124, max: 241 }, attackIntervalSeconds: 7.2,
        bonuses: [
            { key: 'inc_physical_damage', value: 55, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'life_leech', value: 4, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -48, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'It feeds whether or not you hit. It simply prefers it when you do.',
        flavorDe: 'Sie frisst, ob du trifft oder nicht. Es schmeckt nur besser, wenn du trifft.',
    },

    // ── Ranged Weapon ─────────────────────────────────────────────────
    {
        uniqueId: 'whisperwind_screamer',
        nameEn: 'Whisperwind Screamer',
        nameDe: 'Flüsterwind-Schreier',
        icon: '🏹', slotType: 'ranged', archetype: 'agility',
        minLevel: 42,
        requirements: { level: 42, str: 0, agi: 160, int: 0 },
        damage: { min: 236, max: 471 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'multishot', value: 30, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'pierce', value: 35, en: '#% chance for Projectiles to Pierce Monsters', de: '#% Chance, dass Projektile Monster durchbohren' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'pushback', value: -2, en: '-#s Charge Pushback on hit', de: '-#s Angriffslade-Rückstoß bei Treffern' }
        ],
        flavorEn: 'The shot arrives before the silence it broke.',
        flavorDe: 'Der Schuss kommt an, bevor die Stille ankommt, die er brach.',
    },

    // ── Amulet ────────────────────────────────────────────────────────
    {
        uniqueId: 'sigil_of_probability',
        nameEn: 'Sigil of Probability',
        nameDe: 'Sigill der Wahrscheinlichkeit',
        icon: '🎲', slotType: 'amulet', archetype: 'any',
        minLevel: 50,
        requirements: { level: 50, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'fate', value: 20, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'reveal_hint', value: 15, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'chance_for_new_question', value: 20, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -42, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'The odds are always in your favor. Never ask whose favor.',
        flavorDe: 'Die Quoten stehen immer zu deinen Gunsten. Frage nie, wessen Gunsten.',
    },

    // ── Chest ─────────────────────────────────────────────────────────
    {
        uniqueId: 'bulwark_of_dawn',
        nameEn: 'Bulwark of Dawn',
        nameDe: 'Bollwerk der Dämmerung',
        icon: '🦺', slotType: 'chest', archetype: 'strength',
        minLevel: 55,
        requirements: { level: 55, str: 210, agi: 0, int: 0 },
        defenses: { armour: 720, evasion: 0, absorption: 160 },
        bonuses: [
            { key: 'warding', value: 120, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'grounded_1', value: 25, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'absorption_on_kill', value: 6, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'flat_health', value: 75, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'crit_chance', value: -18, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Forged for a war that ended before sunrise. It still refuses to fall.',
        flavorDe: 'Geschmiedet für einen Krieg, der vor Sonnenaufgang endete. Es weigert sich bis heute zu fallen.',
    },

    // ── Ring 2 ────────────────────────────────────────────────────────
    {
        uniqueId: 'betrayers_coil',
        nameEn: "Betrayer's Coil",
        nameDe: 'Ring des Verräters',
        icon: '💍', slotType: 'ring', archetype: 'any',
        minLevel: 33,
        requirements: { level: 33, str: 0, agi: 0, int: 90 },
        bonuses: [
            { key: 'mana_to_damage', value: 18, en: '#% of Mana converted to Damage', de: '#% des Manas in Schaden umgewandelt' },
            { key: 'echo_1', value: 15, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'echo_2', value: 30, en: 'Echoes deal #% of the original damage', de: 'Echos verursachen #% des ursprünglichen Schadens' }
        ],
        downsides: [
            { key: 'flat_mana', value: -56, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'mana_regen', value: -4.4, en: '-# Mana regenerated per 5s', de: '-# Mana-Regeneration pro 5s' }
        ],
        flavorEn: 'It gave everything, and took exactly what it was owed.',
        flavorDe: 'Er gab alles und nahm genau, was ihm zustand.',
    },

    // ── Talisman ──────────────────────────────────────────────────────
    {
        uniqueId: 'hourglass_of_fractured_moments',
        nameEn: 'Hourglass of Fractured Moments',
        nameDe: 'Sanduhr der Gesplitterten Momente',
        icon: '⌛', slotType: 'talisman', archetype: 'any',
        minLevel: 47,
        requirements: { level: 47, str: 0, agi: 0, int: 120 },
        bonuses: [
            { key: 'time_added', value: 75, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'first_step', value: 3, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-1 Allowed Mistake', de: '-1 erlaubter Fehler' }
        ],
        flavorEn: 'All the time in the world — for someone who never makes mistakes.',
        flavorDe: 'Unendlich viel Zeit – für jemanden, der niemals Fehler macht.',
    },

    // ── Earring ───────────────────────────────────────────────────────
    {
        uniqueId: 'voidwhisper_charm',
        nameEn: 'Voidwhisper Charm',
        nameDe: 'Leerenflüster-Amulett',
        icon: '🪬', slotType: 'earring', archetype: 'any',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 66 },
        bonuses: [
            { key: 'chance_to_blind', value: 15, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'chance_to_convert', value: 8, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'intelligence', value: -26, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'It listens back.',
        flavorDe: 'Es hört mit.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── LOW LEVEL UNIQUES (fresh accounts, early maps) ─────────────────
    // ══════════════════════════════════════════════════════════════════

    {
        uniqueId: 'lucky_acorn',
        nameEn: 'Lucky Acorn',
        nameDe: 'Glückseichel',
        icon: '🌰', slotType: 'talisman', archetype: 'any',
        minLevel: 3,
        requirements: { level: 3, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'fate', value: 10, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'reveal_hint', value: 10, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'chance_for_new_question', value: 10, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' }
        ],
        downsides: [
            { key: 'flat_health', value: -28, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Plant it, and probability grows.',
        flavorDe: 'Pflanze sie ein, und die Wahrscheinlichkeit wächst.',
    },

    {
        uniqueId: 'apprentices_blunderbuss',
        nameEn: "Apprentice's Blunderbuss",
        nameDe: 'Blunderbuss des Lehrlings',
        icon: '💥', slotType: 'ranged', archetype: 'any',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 23, int: 0 },
        damage: { min: 24, max: 57 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'splash_damage', value: 25, en: '#% increased Splash Area', de: '#% vergrößerter Spritzbereich' },
            { key: 'multishot', value: 15, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Point it generally at the problem.',
        flavorDe: 'Ziele damit ungefähr auf das Problem.',
    },

    {
        uniqueId: 'cracked_schoolbell',
        nameEn: 'Cracked Schoolbell',
        nameDe: 'Zersprungene Schulglocke',
        icon: '🔔', slotType: 'earring', archetype: 'any',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 0, int: 15 },
        bonuses: [
            { key: 'chance_for_new_question', value: 30, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 22, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -18, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'It never learned to ring true — only to ring again.',
        flavorDe: 'Sie lernte nie, rein zu läuten – nur erneut zu läuten.',
    },

    {
        uniqueId: 'wanderers_ragged_cloak',
        nameEn: "Wanderer's Ragged Cloak",
        nameDe: 'Zerfledderter Wandrerumhang',
        icon: '🧥', slotType: 'cloak', archetype: 'any',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 19, int: 0 },
        defenses: { armour: 0, evasion: 45, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'faster_absorption_regen_start', value: 6, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'flat_health', value: -33, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Every patch was sewn on somewhere far from home.',
        flavorDe: 'Jeder Flicken wurde irgendwo fern der Heimat aufgenäht.',
    },

    {
        uniqueId: 'butchers_cleaver',
        nameEn: "Butcher's Cleaver",
        nameDe: 'Schlachtermesser',
        icon: '🔪', slotType: 'weapon', archetype: 'strength', hands: 1,
        minLevel: 12,
        requirements: { level: 12, str: 46, agi: 0, int: 0 },
        damage: { min: 74, max: 149 }, attackIntervalSeconds: 6.4,
        bonuses: [
            { key: 'overkill', value: 25, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'life_on_kill', value: 5, en: '+# Life gained on Kill', de: '+# Leben bei jedem Kill' }
        ],
        downsides: [
            { key: 'life_regen', value: -2.2, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'It remembers the shop. It misses the shop.',
        flavorDe: 'Es erinnert sich an den Laden. Es vermisst den Laden.',
    },

    {
        uniqueId: 'soot_covered_grimoire',
        nameEn: 'Soot-Covered Grimoire',
        nameDe: 'Rußbedecktes Grimoire',
        icon: '📕', slotType: 'arcane', archetype: 'intellect',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 0, int: 38 },
        defenses: { armour: 0, evasion: 0, absorption: 40 },
        bonuses: [
            { key: 'spell_damage', value: 15, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'inc_spell_damage', value: 15, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'flat_mana', value: -42, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Half the spells are illegible. The other half are better for it.',
        flavorDe: 'Die Hälfte der Zauber ist unlesbar. Die andere Hälfte ist besser so.',
    },

    {
        uniqueId: 'padded_practice_vest',
        nameEn: 'Padded Practice Vest',
        nameDe: 'Gepolsterte Übungsweste',
        icon: '🎽', slotType: 'chest', archetype: 'any',
        minLevel: 8,
        requirements: { level: 8, str: 30, agi: 0, int: 0 },
        defenses: { armour: 130, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 15, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht gezählt werden' },
            { key: 'flat_health', value: 21, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -26, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'Built for students who learn best by failing safely.',
        flavorDe: 'Gebaut für Schüler, die am besten lernen, indem sie sicher scheitern.',
    },

    {
        uniqueId: 'diggers_mitts',
        nameEn: "Digger's Mitts",
        nameDe: 'Gräber-Handschuhe',
        icon: '🧤', slotType: 'gloves', archetype: 'strength',
        minLevel: 7,
        requirements: { level: 7, str: 27, agi: 0, int: 0 },
        defenses: { armour: 40, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'heart_heal', value: 10, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'intelligence', value: -18, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'Six calluses per finger. Do not ask how.',
        flavorDe: 'Sechs Schwiizen pro Finger. Frag nicht wie.',
    },

    {
        uniqueId: 'second_hand_sash',
        nameEn: 'Second-Hand Sash',
        nameDe: 'Getragene Schärpe',
        icon: '🎗️', slotType: 'belt', archetype: 'any',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 0, int: 0 },
        defenses: { armour: 10, evasion: 10, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 25, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'mana_on_mistake', value: 5, en: '+# Mana gained on Mistake', de: '+# Mana bei einem Fehler' }
        ],
        downsides: [
            { key: 'focus', value: -17, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Previous owner: unknown. Regrets: included.',
        flavorDe: 'Vorheriger Besitzer: unbekannt. Reue: inklusive.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── MID LEVEL UNIQUES (the leveling bridges) ───────────────────────
    // ══════════════════════════════════════════════════════════════════

    {
        uniqueId: 'frostbite_loop',
        nameEn: 'Frostbite Loop',
        nameDe: 'Ring der Erfrierung',
        icon: '❄️', slotType: 'ring', archetype: 'any',
        minLevel: 27,
        requirements: { level: 27, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'cold_damage_1', value: 10, en: 'Adds # Cold Damage to Attacks', de: 'Fügt Angriffen # Kälteschaden hinzu' },
            { key: 'cold_damage_2', value: 18, en: 'Adds # Cold Damage to Attacks', de: 'Fügt Angriffen # Kälteschaden hinzu' },
            { key: 'chance_to_freeze', value: 12, en: '#% chance to Chill Monsters on hit', de: '#% Chance, Monster bei Treffern zu unterkühlen' },
            { key: 'ailment_duration', value: 18, en: '#% increased Duration of Player-Applied Ailments', de: '#% längere Dauer von durch den Spieler verursachten Leiden' }
        ],
        downsides: [
            { key: 'cold_resist', value: -30, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'Winter does not negotiate. It takes a finger as toll.',
        flavorDe: 'Der Winter verhandelt nicht. Er nimmt einen Finger als Maut.',
    },

    {
        uniqueId: 'thunderstep_greaves',
        nameEn: 'Thunderstep Greaves',
        nameDe: 'Donnertritt-Stiefelschienen',
        icon: '⚡', slotType: 'boots', archetype: 'agility',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 114, int: 0 },
        defenses: { armour: 0, evasion: 260, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'first_step', value: 2, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'lightning_damage_1', value: 6, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'max_lightning_res', value: 8, en: '+#% to maximum Lightning Resistance', de: '+#% zu maximalem Blitzwiderstand' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -32, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'Each stride lands a heartbeat early.',
        flavorDe: 'Jeder Schritt landet einen Herzschlag zu früh.',
    },

    {
        uniqueId: 'plagueheart_amulet',
        nameEn: 'Plagueheart Amulet',
        nameDe: 'Pestherz-Amulett',
        icon: '🫀', slotType: 'amulet', archetype: 'any',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'life_on_kill', value: 8, en: '+# Life gained on Kill', de: '+# Leben bei jedem Kill' },
            { key: 'mana_on_kill', value: 8, en: '+# Mana gained on Kill', de: '+# Mana bei jedem Kill' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'life_regen', value: -4.4, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'It only beats when something else stops.',
        flavorDe: 'Es schlägt nur, wenn etwas anderes aufhört.',
    },

    {
        uniqueId: 'juggernaut_pauldrons',
        nameEn: 'Juggernaut Pauldrons',
        nameDe: 'Schulterplatten des Juggernaut',
        icon: '🏋️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 35,
        requirements: { level: 35, str: 133, agi: 0, int: 0 },
        defenses: { armour: 290, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'grounded_1', value: 20, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'stagger', value: 35, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'flat_health', value: 45, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'crit_chance', value: -13, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' }
        ],
        flavorEn: 'Mountains envy them.',
        flavorDe: 'Berge beneiden sie.',
    },

    {
        uniqueId: 'assassins_ribbons',
        nameEn: "Assassin's Ribbons",
        nameDe: 'Bänder des Assassinen',
        icon: '🎀', slotType: 'bracers', archetype: 'agility',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 106, int: 0 },
        defenses: { armour: 0, evasion: 95, absorption: 0 },
        bonuses: [
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'chance_to_blind', value: 12, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -55, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Worn openly. That was the warning.',
        flavorDe: 'Offen zur Schau getragen. Das war die Warnung.',
    },

    {
        uniqueId: 'spell_eater_aegis',
        nameEn: 'Spell-Eater Aegis',
        nameDe: 'Zauberfresser-Aegis',
        icon: '🛡️', slotType: 'shield', archetype: 'intellect',
        minLevel: 32,
        requirements: { level: 32, str: 0, agi: 0, int: 122 },
        defenses: { armour: 160, evasion: 0, absorption: 170 },
        blockChance: 22,
        bonuses: [
            { key: 'spell_block_chance', value: 12, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'spell_dodge', value: 8, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'flat_health', value: 42, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cleave', value: -32, en: '-#% chance to Cleave nearby Monsters', de: '-#% Chance, nahe Monster zu spalten' }
        ],
        flavorEn: 'Hungry for hexes. Allergic to crowds.',
        flavorDe: 'Hungrig nach Flüchen. Allergisch gegen Menschenmengen.',
    },

    {
        uniqueId: 'mathematicians_crown',
        nameEn: "Mathematician's Crown",
        nameDe: 'Krone des Mathematikers',
        icon: '📐', slotType: 'head', archetype: 'intellect',
        minLevel: 34,
        requirements: { level: 34, str: 0, agi: 0, int: 129 },
        defenses: { armour: 0, evasion: 0, absorption: 210 },
        bonuses: [
            { key: 'intelligence', value: 15, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'fire_resist', value: 20, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' },
            { key: 'max_fire_res', value: 10, en: '+#% to maximum Fire Resistance', de: '+#% zu maximalem Feuerwiderstand' }
        ],
        downsides: [
            { key: 'flat_health', value: -72, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Proof left as exercise for the wearer. The furnace never wins.',
        flavorDe: 'Der Beweis bleibt dem Träger als Übung überlassen. Der Ofen gewinnt nie.',
    },

    {
        uniqueId: 'static_coil',
        nameEn: 'Static Coil',
        nameDe: 'Reibelektro-Ring',
        icon: '🌀', slotType: 'ring', archetype: 'any',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'lightning_damage_1', value: 8, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'lightning_damage_2', value: 14, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'chance_to_shock', value: 10, en: '#% chance to Shock Monsters on hit', de: '#% Chance, Monster bei Treffern zu schocken' },
            { key: 'ailment_effect', value: 18, en: '#% increased Effect of Player-Applied Ailments', de: '#% stärkere, durch den Spieler verursachte Leiden' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -30, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'Rub it on a cat on a dry day. Or do not.',
        flavorDe: 'Reibe ihn an einer Katze an einem trockenen Tag. Oder lieber nicht.',
    },

    {
        uniqueId: 'deadeye_scope',
        nameEn: 'Deadeye Scope',
        nameDe: 'Deadeye-Zielglas',
        icon: '🔭', slotType: 'ranged', archetype: 'agility',
        minLevel: 36,
        requirements: { level: 36, str: 0, agi: 137, int: 0 },
        damage: { min: 163, max: 329 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'snipe', value: 30, en: '#% chance for Projectiles to Snipe (double damage)', de: '#% Chance auf Sniping (doppelter Schaden)' },
            { key: 'accuracy', value: 25, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'multishot', value: -24, en: '-#% chance to fire an additional Projectile', de: '-#% Chance auf ein zusätzliches Projektil' }
        ],
        flavorEn: 'One shot. One breath. One everything.',
        flavorDe: 'Ein Schuss. Ein Atemzug. Ein alles.',
    },

    {
        uniqueId: 'monks_wrapped_knuckles',
        nameEn: "Monk's Wrapped Knuckles",
        nameDe: 'Gewickelte Mönchsfäuste',
        icon: '🥊', slotType: 'gloves', archetype: 'any',
        minLevel: 33,
        requirements: { level: 33, str: 0, agi: 125, int: 0 },
        defenses: { armour: 0, evasion: 145, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 2, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'channel_1', value: 3, en: '+# Channel Damage per Stack', de: '+# Kanalisierungsschaden pro Stapel' },
            { key: 'flat_health', value: 43, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'inc_heart_heal', value: -34, en: '-#% increased Heart Heal Amount', de: '-#% verringerte Herzheilung' }
        ],
        flavorEn: 'Discipline heals all wounds. Eventually.',
        flavorDe: 'Disziplin heilt alle Wunden. Irgendwann.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── CHASE UNIQUES (endgame targets, high-tier maps) ────────────────
    // ══════════════════════════════════════════════════════════════════

    {
        uniqueId: 'voidfrost_orb',
        nameEn: 'Voidfrost Orb',
        nameDe: 'Leerenfrost-Kugel',
        icon: '🔮', slotType: 'arcane', archetype: 'intellect',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 0, int: 228 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'spell_damage', value: 60, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'inc_spell_damage', value: 40, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'chance_to_freeze', value: 10, en: '#% chance to Freeze Monsters on hit', de: '#% Chance, Monster bei Treffern einzufrieren' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_mana', value: -72, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'flat_health', value: -45, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Cold enough that even entropy slows down to look.',
        flavorDe: 'So kalt, dass selbst die Entropie innehält, um hinzusehen.',
    },

    {
        uniqueId: 'godshard_gauntlets',
        nameEn: 'Godshard Gauntlets',
        nameDe: 'Göttersplitter-Panzerhandschuhe',
        icon: '✋', slotType: 'gloves', archetype: 'any',
        minLevel: 65,
        requirements: { level: 65, str: 100, agi: 100, int: 100 },
        defenses: { armour: 240, evasion: 240, absorption: 0 },
        bonuses: [
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 60, en: '+#% to Critical Strike Multiplier', de: '+#% Kritischer Trefferschaden' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'life_leech', value: 2, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' }
        ],
        downsides: [
            { key: 'flat_health', value: -100, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Something divine broke here. The fragments kept swinging.',
        flavorDe: 'Hier zerbrach etwas Göttliches. Die Splitter schlagen weiter zu.',
    },

    {
        uniqueId: 'leviathan_coil',
        nameEn: 'Leviathan Coil',
        nameDe: 'Leviatan-Ring',
        icon: '🐋', slotType: 'belt', archetype: 'any',
        minLevel: 58,
        requirements: { level: 58, str: 110, agi: 110, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 260 },
        bonuses: [
            { key: 'flat_health', value: 120, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'absorption_regen_rate', value: 30, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'absorption_on_kill', value: 8, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'dodge', value: -17, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Too vast to move. It simply endures, and the sea rearranges.',
        flavorDe: 'Zu gewaltig, um sich zu bewegen. Es hält einfach stand, und das Meer ordnet sich neu.',
    },

    {
        uniqueId: 'starforged_helm',
        nameEn: 'Starforged Helm',
        nameDe: 'Sterngeschmiedeter Helm',
        icon: '🌟', slotType: 'head', archetype: 'any',
        minLevel: 70,
        requirements: { level: 70, str: 66, agi: 66, int: 66 },
        defenses: { armour: 180, evasion: 180, absorption: 180 },
        bonuses: [
            { key: 'fire_resist', value: 15, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' },
            { key: 'cold_resist', value: 15, en: '+#% to Cold Resistance', de: '+#% Kältewiderstand' },
            { key: 'lightning_resist', value: 15, en: '+#% to Lightning Resistance', de: '+#% Blitzwiderstand' },
            { key: 'shadow_resist', value: 15, en: '+#% to Shadow Resistance', de: '+#% Schattenwiderstand' },
            { key: 'max_all_res', value: 5, en: '+#% to maximum Fire, Cold, Lightning and Shadow Resistances', de: '+#% zu maximalem Feuer-, Kälte-, Blitz- und Schattenwiderstand' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-1 Allowed Mistake', de: '-1 erlaubter Fehler' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Forged in the last light of a dying constellation.',
        flavorDe: 'Geschmiedet im letzten Licht eines sterbenden Sternbildes.',
    },

    {
        uniqueId: 'worldsplitter',
        nameEn: 'Worldsplitter',
        nameDe: 'Weltspalter',
        icon: '⚔️', slotType: 'weapon', archetype: 'strength', hands: 2,
        minLevel: 75,
        requirements: { level: 75, str: 285, agi: 0, int: 0 },
        damage: { min: 820, max: 1510 }, attackIntervalSeconds: 12.0,
        bonuses: [
            { key: 'inc_physical_damage', value: 85, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'stagger', value: 40, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'flat_health', value: 85, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -54, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The map is not drawn to scale. Neither is this.',
        flavorDe: 'Die Karte ist nicht maßstabsgetreu. Das hier auch nicht.',
    },

    {
        uniqueId: 'aetherweave_shroud',
        nameEn: 'Aetherweave Shroud',
        nameDe: 'Äthergewebe-Schleier',
        icon: '🌫️', slotType: 'cloak', archetype: 'intellect',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 0, int: 235 },
        defenses: { armour: 0, evasion: 520, absorption: 0 },
        bonuses: [
            { key: 'spell_dodge', value: 15, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'arcane_resistance', value: 25, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 67, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'block_chance', value: -17, en: '-#% Block Chance', de: '-#% Blockchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Between you and the spell: a rumor of fabric.',
        flavorDe: 'Zwischen dir und dem Zauber: ein Gerücht aus Stoff.',
    },

    {
        uniqueId: 'phoenix_embers',
        nameEn: 'Phoenix Embers',
        nameDe: 'Phönixglut',
        icon: '🔥', slotType: 'earring', archetype: 'any',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'chance_to_ignite', value: 25, en: '#% chance to Ignite Monsters on hit', de: '#% Chance, Monster bei Treffern zu entzünden' },
            { key: 'fire_damage_1', value: 25, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'inc_heart_heal', value: 30, en: '#% increased Heart Heal Amount', de: '#% erhöhte Herzheilung' },
            { key: 'flat_health', value: 75, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cold_resist', value: -39, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Ash remembers being glorious.',
        flavorDe: 'Asche erinnert sich daran, glorreich gewesen zu sein.',
    },

    {
        uniqueId: 'titanhide_tassets',
        nameEn: 'Titanhide Tassets',
        nameDe: 'Titanhaut-Tassetten',
        icon: '🦏', slotType: 'pants', archetype: 'strength',
        minLevel: 68,
        requirements: { level: 68, str: 258, agi: 0, int: 0 },
        defenses: { armour: 850, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'grounded_2', value: 40, en: '#% reduced effect of being Grounded', de: '#% reduzierter Effekt des Bodenstoßes' },
            { key: 'flat_health', value: 100, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The titan is no longer with us. The hide did not notice.',
        flavorDe: 'Der Titan ist nicht mehr unter uns. Die Haut hat es nicht bemerkt.',
    },

    {
        uniqueId: 'chronomancers_pendant',
        nameEn: "Chronomancer's Pendant",
        nameDe: 'Anhänger des Chronomanten',
        icon: '🕰️', slotType: 'amulet', archetype: 'any',
        minLevel: 72,
        requirements: { level: 72, str: 0, agi: 0, int: 140 },
        bonuses: [
            { key: 'first_step', value: 4, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'time_added', value: 40, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'preemptive_dodge', value: 20, en: '#% chance to preemptively Dodge incoming Attacks', de: '#% Chance, Angriffen präventiv auszuweichen' },
            { key: 'flat_health', value: 97, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'life_regen', value: -7, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'You have all the time in the world. You pay for it in heartbeats.',
        flavorDe: 'Du hast alle Zeit der Welt. Bezahlt wird sie in Herzschlägen.',
    },

    {
        uniqueId: 'coin_of_fated_chances',
        nameEn: 'Coin of Fated Chances',
        nameDe: 'Münze der Schicksalschancen',
        icon: '🪙', slotType: 'talisman', archetype: 'any',
        minLevel: 78,
        requirements: { level: 78, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'fate', value: 35, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'overkill', value: 30, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'flat_health', value: 88, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 70, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -28, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Flip it. Fate has already called it.',
        flavorDe: 'Wirf sie. Das Schicksal hat längst gerufen.',
    },

    {
        uniqueId: 'sanctum_wardens_bulwark',
        nameEn: "Sanctum Warden's Bulwark",
        nameDe: 'Bollwerk des Sanktum-Wächters',
        icon: '🛡️', slotType: 'shield', archetype: 'strength',
        minLevel: 80,
        requirements: { level: 80, str: 304, agi: 0, int: 0 },
        defenses: { armour: 720, evasion: 0, absorption: 240 },
        blockChance: 32,
        bonuses: [
            { key: 'block_recovery', value: 80, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'spell_block_chance', value: 15, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'warding', value: 200, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_health', value: 90, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -3.9, en: 'Melee Strikes occur 3s slower', de: 'Nahkampfschläge erfolgen 3s langsamer' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Behind this, even prayers take a number.',
        flavorDe: 'Dahinter nehmen sogar Gebete eine Nummer.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── EXPANSION WAVE (levels 9–74, all slots) ────────────────────────
    // ══════════════════════════════════════════════════════════════════

    {
        uniqueId: 'moth_eaten_shroud',
        nameEn: 'Moth-Eaten Shroud',
        nameDe: 'Mottenzerfresser-Leichentuch',
        icon: '🕸️', slotType: 'cloak', archetype: 'any',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 34, int: 0 },
        defenses: { armour: 0, evasion: 70, absorption: 0 },
        bonuses: [
            { key: 'spell_dodge', value: 6, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'faster_absorption_regen_start', value: 5, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'flat_health', value: -34, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The moths ate the warmth and left the shadows.',
        flavorDe: 'Die Motten fraßen die Wärme und ließen die Schatten zurück.',
    },

    {
        uniqueId: 'buckler_of_bad_ideas',
        nameEn: 'Buckler of Bad Ideas',
        nameDe: 'Faustschild der Schlechten Ideen',
        icon: '🛡️', slotType: 'shield', archetype: 'any',
        minLevel: 13,
        requirements: { level: 13, str: 40, agi: 20, int: 0 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
        blockChance: 18,
        bonuses: [
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'block_recovery', value: 30, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'block_chance', value: 6, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -44, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Every dent is a lesson. Most were learned the hard way.',
        flavorDe: 'Jede Beule ist eine Lektion. Die meisten wurden auf die harte Tour gelernt.',
    },

    {
        uniqueId: 'pendant_of_the_devout_student',
        nameEn: 'Pendant of the Devout Student',
        nameDe: 'Anhänger der Frommen Schülerin',
        icon: '📖', slotType: 'amulet', archetype: 'any',
        minLevel: 14,
        requirements: { level: 14, str: 0, agi: 0, int: 53 },
        bonuses: [
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'heart_heal', value: 12, en: '+# to Heart Heal Amount', de: '+# Herzheilung' },
            { key: 'flat_health', value: 22, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -17, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'She memorized everything except how to think for herself.',
        flavorDe: 'Sie memorierte alles – außer, wie man selbst denkt.',
    },

    {
        uniqueId: 'firestarters_wraps',
        nameEn: "Firestarter's Wraps",
        nameDe: 'Feuerlegers Binden',
        icon: '🔥', slotType: 'gloves', archetype: 'any',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 57, int: 0 },
        defenses: { armour: 45, evasion: 45, absorption: 0 },
        bonuses: [
            { key: 'chance_to_ignite', value: 15, en: '#% chance to Ignite Monsters on hit', de: '#% Chance, Monster bei Treffern zu entzünden' },
            { key: 'fire_damage_1', value: 6, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'flat_health', value: 18, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cold_resist', value: -22, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'One spark is an accident. A hundred are a hobby.',
        flavorDe: 'Ein Funke ist ein Unfall. Hundert sind ein Hobby.',
    },

    {
        uniqueId: 'scholars_trousers',
        nameEn: "Scholar's Trousers",
        nameDe: 'Hose des Gelehrten',
        icon: '🩳', slotType: 'pants', archetype: 'intellect',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 0, int: 61 },
        defenses: { armour: 95, evasion: 0, absorption: 60 },
        bonuses: [
            { key: 'intelligence', value: 12, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'mana_regen', value: 2, en: '+# Mana regenerated per 5s', de: '+# Mana-Regeneration pro 5s' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'strength', value: -17, en: '-# to Strength', de: '-# zu Stärke' }
        ],
        flavorEn: 'Padded for long hours in a chair, not on a battlefield.',
        flavorDe: 'Gepolstert für lange Stunden im Stuhl, nicht auf dem Schlachtfeld.',
    },

    {
        uniqueId: 'kindling_brand',
        nameEn: 'Kindling Brand',
        nameDe: 'Anzündbrand',
        icon: '🗡️', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 17,
        requirements: { level: 17, str: 65, agi: 0, int: 0 },
        damage: { min: 100, max: 201 }, attackIntervalSeconds: 5.6,
        bonuses: [
            { key: 'fire_damage_1', value: 8, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'fire_damage_2', value: 14, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'chance_to_ignite', value: 10, en: '#% chance to Ignite Monsters on hit', de: '#% Chance, Monster bei Treffern zu entzünden' }
        ],
        downsides: [
            { key: 'mana_regen', value: -4.4, en: '-# Mana regenerated per 5s', de: '-# Mana-Regeneration pro 5s' }
        ],
        flavorEn: 'It starts fires faster than it starts arguments. Barely.',
        flavorDe: 'Es legt Brände schneller als Streitigkeiten. Knapp.',
    },

    {
        uniqueId: 'hood_of_second_thoughts',
        nameEn: 'Hood of Second Thoughts',
        nameDe: 'Kapuze der Zweiten Gedanken',
        icon: '🎭', slotType: 'head', archetype: 'any',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 68, int: 0 },
        defenses: { armour: 0, evasion: 130, absorption: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 20, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht gezählt werden' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 10, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -26, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        flavorEn: 'It whispers: are you sure? — every single time.',
        flavorDe: 'Es flüstert: Bist du sicher? – jedes einzelne Mal.',
    },

    {
        uniqueId: 'alchemists_utility_band',
        nameEn: "Alchemist's Utility Band",
        nameDe: 'Gürtel des Alchemisten',
        icon: '⚗️', slotType: 'belt', archetype: 'any',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 0, int: 80 },
        defenses: { armour: 0, evasion: 0, absorption: 80 },
        bonuses: [
            { key: 'mana_on_mistake', value: 6, en: '+# Mana gained on Mistake', de: '+# Mana bei einem Fehler' },
            { key: 'life_on_kill', value: 4, en: '+# Life gained on Kill', de: '+# Leben bei jedem Kill' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'focus', value: -20, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Every vial solves one problem and leaks another.',
        flavorDe: 'Jedes Fläschchen löst ein Problem und leckt ein anderes.',
    },

    {
        uniqueId: 'sevenleague_slippers',
        nameEn: 'Sevenleague Slippers',
        nameDe: 'Siebenmeilen-Pantoffeln',
        icon: '👟', slotType: 'boots', archetype: 'any',
        minLevel: 23,
        requirements: { level: 23, str: 0, agi: 87, int: 0 },
        defenses: { armour: 0, evasion: 210, absorption: 0 },
        bonuses: [
            { key: 'first_step', value: 3, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'preemptive_dodge', value: 15, en: '#% chance to preemptively Dodge incoming Attacks', de: '#% Chance, Angriffen präventiv auszuweichen' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'faster_absorption_regen_start', value: -4, en: '#s slower start of Absorption Regeneration', de: '#s langsamerer Start der Absorptionsregeneration' }
        ],
        flavorEn: 'You arrive before you leave. The monsters noticed.',
        flavorDe: 'Du kommst an, bevor du gehst. Die Monster haben es bemerkt.',
    },

    {
        uniqueId: 'rabbits_unlucky_foot',
        nameEn: "Rabbit's Unlucky Foot",
        nameDe: 'Unglückspfote des Hasen',
        icon: '🍀', slotType: 'talisman', archetype: 'any',
        minLevel: 32,
        requirements: { level: 32, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'fate', value: 25, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'flat_health', value: 42, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -26, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        flavorEn: 'It was lucky for exactly one of the two of them.',
        flavorDe: 'Glück gebracht hat es genau einem von beiden.',
    },

    {
        uniqueId: 'splinterstorm_crossbow',
        nameEn: 'Splinterstorm Crossbow',
        nameDe: 'Splittersturm-Armbrust',
        icon: '🏹', slotType: 'ranged', archetype: 'agility',
        minLevel: 34,
        requirements: { level: 34, str: 0, agi: 129, int: 0 },
        damage: { min: 120, max: 243 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'multishot', value: 20, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'splash_damage', value: 20, en: '#% increased Splash Area', de: '#% vergrößerter Spritzbereich' },
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -44, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Aiming optional. Splinters go everywhere anyway.',
        flavorDe: 'Zielen optional. Splitter fliegen ohnehin überallhin.',
    },

    {
        uniqueId: 'bracers_of_the_zealot',
        nameEn: 'Bracers of the Zealot',
        nameDe: 'Armschienen des Fanatikers',
        icon: '🧿', slotType: 'bracers', archetype: 'strength',
        minLevel: 37,
        requirements: { level: 37, str: 141, agi: 0, int: 0 },
        defenses: { armour: 120, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 2, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'flat_mana', value: -60, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Conviction burns bright. And fast. And briefly.',
        flavorDe: 'Überzeugung brennt hell. Und schnell. Und kurz.',
    },

    {
        uniqueId: 'retaliators_tower',
        nameEn: "Retaliator's Tower",
        nameDe: 'Turm des Vergelters',
        icon: '🏯', slotType: 'shield', archetype: 'strength',
        minLevel: 39,
        requirements: { level: 39, str: 148, agi: 0, int: 0 },
        defenses: { armour: 380, evasion: 0, absorption: 0 },
        blockChance: 26,
        bonuses: [
            { key: 'shield_bash_1', value: 20, en: '+#% chance to Bash with your Shield on Block', de: '+#% Chance auf Schildbash bei Block' },
            { key: 'shield_bash_2', value: 60, en: '+# Shield Bash Damage', de: '+# Schildbash-Schaden' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' }
        ],
        flavorEn: 'The best answer to every question is a wall to the face.',
        flavorDe: 'Die beste Antwort auf jede Frage ist eine Wand ins Gesicht.',
    },

    {
        uniqueId: 'prism_of_divided_light',
        nameEn: 'Prism of Divided Light',
        nameDe: 'Prisma des Geteilten Lichts',
        icon: '💠', slotType: 'arcane', archetype: 'any',
        minLevel: 41,
        requirements: { level: 41, str: 0, agi: 0, int: 156 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'fire_damage_1', value: 12, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'cold_damage_1', value: 12, en: 'Adds # Cold Damage to Attacks', de: 'Fügt Angriffen # Kälteschaden hinzu' },
            { key: 'lightning_damage_1', value: 12, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' }
        ],
        downsides: [
            { key: 'flat_mana', value: -56, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'White light entered. Commitment issues remained.',
        flavorDe: 'Weißes Licht trat ein. Bindungsprobleme blieben zurück.',
    },

    {
        uniqueId: 'ring_of_borrowed_time',
        nameEn: 'Ring of Borrowed Time',
        nameDe: 'Ring der Geliehenen Zeit',
        icon: '⏱️', slotType: 'ring', archetype: 'any',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'time_added', value: 35, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'first_step', value: -4.4, en: '-#s Monsters delay Charge-up after Spawning', de: '-#s Monster verzögern Angriffsladen nach Erscheinen' }
        ],
        flavorEn: 'The seconds come from somewhere. Somewhere has teeth.',
        flavorDe: 'Die Sekunden kommen von irgendwoher. Dort drüben hat es Zähne.',
    },

    {
        uniqueId: 'deepwell_cuirass',
        nameEn: 'Deepwell Cuirass',
        nameDe: 'Tiefbrunnen-Kürass',
        icon: '🕳️', slotType: 'chest', archetype: 'any',
        minLevel: 46,
        requirements: { level: 46, str: 100, agi: 100, int: 0 },
        defenses: { armour: 420, evasion: 0, absorption: 320 },
        bonuses: [
            { key: 'absorption_on_kill', value: 10, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'absorption_regen_rate', value: 25, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'flat_health', value: 46, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'life_regen', value: -7, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'Draw from it too often and you forget which layer is really you.',
        flavorDe: 'Schöpfe zu oft, und du vergisst, welche Schicht wirklich du bist.',
    },

    {
        uniqueId: 'laurel_of_unending_study',
        nameEn: 'Laurel of Unending Study',
        nameDe: 'Lorbeer des Endlosen Lernens',
        icon: '🌿', slotType: 'head', archetype: 'intellect',
        minLevel: 48,
        requirements: { level: 48, str: 0, agi: 0, int: 182 },
        defenses: { armour: 0, evasion: 0, absorption: 260 },
        bonuses: [
            { key: 'intelligence', value: 18, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'chance_for_new_question', value: 15, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'fire_resist', value: 20, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' }
        ],
        downsides: [
            { key: 'time_added', value: -35, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'There is always one more chapter. Always.',
        flavorDe: 'Es gibt immer noch ein Kapitel. Immer.',
    },

    {
        uniqueId: 'whisperbone_stud',
        nameEn: 'Whisperbone Stud',
        nameDe: 'Flüsterknochen-Ohrstecker',
        icon: '🦴', slotType: 'earring', archetype: 'any',
        minLevel: 49,
        requirements: { level: 49, str: 0, agi: 0, int: 90 },
        bonuses: [
            { key: 'chance_to_convert', value: 15, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'chance_to_blind', value: 10, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -30, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' }
        ],
        flavorEn: 'Carved from someone who talked too much. It still does.',
        flavorDe: 'Geschnitzt aus jemandem, der zu viel geredet hat. Tut er immer noch.',
    },

    {
        uniqueId: 'atlas_yoke',
        nameEn: 'Atlas Yoke',
        nameDe: 'Atlasjoch',
        icon: '🌍', slotType: 'shoulders', archetype: 'strength',
        minLevel: 51,
        requirements: { level: 51, str: 194, agi: 0, int: 0 },
        defenses: { armour: 430, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'grounded_1', value: 25, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 71, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_armour', value: 90, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'agility', value: -26, en: '-# to Agility', de: '-# zu Beweglichkeit' }
        ],
        flavorEn: 'The world weighs less than it used to. You weigh more.',
        flavorDe: 'Die Welt wiegt weniger als früher. Du wiegst mehr.',
    },

    {
        uniqueId: 'loop_of_hollow_whispers',
        nameEn: 'Loop of Hollow Whispers',
        nameDe: 'Ring der Hohlen Geflüster',
        icon: '👻', slotType: 'ring', archetype: 'any',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 110 },
        bonuses: [
            { key: 'echo_1', value: 20, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'echo_2', value: 40, en: 'Echoes deal #% of the original damage', de: 'Echos verursachen #% des ursprünglichen Schadens' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_mana', value: -63, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Everything you say comes back. Nothing you hear is yours.',
        flavorDe: 'Alles, was du sagst, kehrt zurück. Nichts, was du hörst, ist dein.',
    },

    {
        uniqueId: 'nimbus_mantle',
        nameEn: 'Nimbus Mantle',
        nameDe: 'Nimbus-Mantel',
        icon: '☁️', slotType: 'cloak', archetype: 'any',
        minLevel: 53,
        requirements: { level: 53, str: 0, agi: 140, int: 100 },
        defenses: { armour: 0, evasion: 480, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'arcane_resistance', value: 20, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 73, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'focus', value: -26, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Head in the clouds. Feet anywhere at all.',
        flavorDe: 'Kopf in den Wolken. Füße irgendwo.',
    },

    {
        uniqueId: 'compass_of_impossible_roads',
        nameEn: 'Compass of Impossible Roads',
        nameDe: 'Kompass der Unmöglichen Wege',
        icon: '🧭', slotType: 'talisman', archetype: 'any',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'reveal_hint', value: 20, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'chance_for_new_question', value: 15, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 76, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'time_added', value: -49, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'It always points the right way. Never the short way.',
        flavorDe: 'Er zeigt immer den richtigen Weg. Nie den kurzen.',
    },

    {
        uniqueId: 'longshot_of_the_lonely_peak',
        nameEn: 'Longshot of the Lonely Peak',
        nameDe: 'Weitschuss des Einsamen Gipfels',
        icon: '🏹', slotType: 'ranged', archetype: 'agility',
        minLevel: 57,
        requirements: { level: 57, str: 0, agi: 217, int: 0 },
        damage: { min: 323, max: 646 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'chain', value: 30, en: '#% chance for Projectiles to Chain to distant Monsters', de: '#% Chance, dass Projektile auf ferne Monster überspringen' },
            { key: 'overkill', value: 20, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'pushback', value: -1.6, en: '-#s Charge Pushback on hit', de: '-#s Angriffslade-Rückstoß bei Treffern' },
            { key: 'flat_health', value: -45, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Fired once a year, from very far away, at something that earned it.',
        flavorDe: 'Einmal im Jahr abgefeuert, von sehr weit weg, auf etwas, das es verdient hat.',
    },

    {
        uniqueId: 'thorned_refuge',
        nameEn: 'Thorned Refuge',
        nameDe: 'Zuflucht der Dornen',
        icon: '🌵', slotType: 'chest', archetype: 'strength',
        minLevel: 61,
        requirements: { level: 61, str: 232, agi: 0, int: 0 },
        defenses: { armour: 810, evasion: 0, absorption: 120 },
        bonuses: [
            { key: 'stagger', value: 30, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'grounded_1', value: 20, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 66, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 4, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' }
        ],
        downsides: [
            { key: 'life_leech', value: -6, en: '-#% of Damage Dealt Leeched as Life', de: '-#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Safe inside. Unfriendly everywhere else, including accidentally.',
        flavorDe: 'Innen sicher. Überall sonst unfreundlich – auch versehentlich.',
    },

    {
        uniqueId: 'runescribed_vambraces',
        nameEn: 'Runescribed Vambraces',
        nameDe: 'Runenbeschriftete Armschienen',
        icon: '📜', slotType: 'bracers', archetype: 'intellect',
        minLevel: 63,
        requirements: { level: 63, str: 0, agi: 0, int: 239 },
        defenses: { armour: 150, evasion: 0, absorption: 150 },
        bonuses: [
            { key: 'spell_damage', value: 30, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'inc_spell_damage', value: 25, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_health', value: 68, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'intelligence', value: -28, en: '-# to Intelligence', de: '-# zu Intelligenz' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The runes do the thinking. You just wear them.',
        flavorDe: 'Die Runen übernehmen das Denken. Du trägst sie nur.',
    },

    {
        uniqueId: 'necklace_of_stolen_faces',
        nameEn: 'Necklace of Stolen Faces',
        nameDe: 'Halskette der Gestohlenen Gesichter',
        icon: '😶', slotType: 'amulet', archetype: 'any',
        minLevel: 64,
        requirements: { level: 64, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'chance_to_blind', value: 20, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'chance_to_convert', value: 12, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'flat_health', value: 69, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -32, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'None of them are wearing their original expressions.',
        flavorDe: 'Keines trägt mehr seinen ursprünglichen Ausdruck.',
    },

    {
        uniqueId: 'coreforge_girdle',
        nameEn: 'Coreforge Girdle',
        nameDe: 'Kernschmiede-Gürtel',
        icon: '🌋', slotType: 'belt', archetype: 'strength',
        minLevel: 66,
        requirements: { level: 66, str: 251, agi: 0, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 300 },
        bonuses: [
            { key: 'strength', value: 25, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 80, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'absorption_regen_rate', value: 15, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'flat_mana', value: -72, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Quenched in magma, tempered by stubbornness.',
        flavorDe: 'In Magma gelöscht, durch Sturheit gehärtet.',
    },

    {
        uniqueId: 'doomcallers_maul',
        nameEn: "Doomcaller's Maul",
        nameDe: 'Schicksalsrufer-Hammer',
        icon: '🔨', slotType: 'weapon', archetype: 'strength', hands: 2,
        minLevel: 68,
        requirements: { level: 68, str: 258, agi: 0, int: 0 },
        damage: { min: 1050, max: 1980 }, attackIntervalSeconds: 11.5,
        bonuses: [
            { key: 'stagger', value: 45, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'cleave', value: 40, en: '#% chance to Cleave nearby Monsters', de: '#% Chance, nahe Monster zu spalten' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'It announces your position to everything within a valley.',
        flavorDe: 'Es meldet deine Position an alles innerhalb eines Tals.',
    },

    {
        uniqueId: 'entropy_engine',
        nameEn: 'Entropy Engine',
        nameDe: 'Entropie-Triebwerk',
        icon: '⚙️', slotType: 'arcane', archetype: 'intellect',
        minLevel: 69,
        requirements: { level: 69, str: 0, agi: 0, int: 262 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
        bonuses: [
            { key: 'mana_to_damage', value: 25, en: '#% of Mana converted to Damage', de: '#% des Manas in Schaden umgewandelt' },
            { key: 'mana_regen', value: 4, en: '+# Mana regenerated per 5s', de: '+# Mana-Regeneration pro 5s' },
            { key: 'inc_spell_damage', value: 40, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_mana', value: -96, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'It runs perfectly. Forever. As long as you never stop feeding it.',
        flavorDe: 'Es läuft perfekt. Für immer. Solange du nie aufhörst, es zu füttern.',
    },

    {
        uniqueId: 'greaves_of_the_last_stand',
        nameEn: 'Greaves of the Last Stand',
        nameDe: 'Beinschienen des Letzten Gefechts',
        icon: '🏰', slotType: 'pants', archetype: 'strength',
        minLevel: 74,
        requirements: { level: 74, str: 281, agi: 0, int: 0 },
        defenses: { armour: 900, evasion: 0, absorption: 200 },
        bonuses: [
            { key: 'grounded_2', value: 50, en: '#% reduced effect of being Grounded', de: '#% reduzierter Effekt des Bodenstoßes' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_health', value: 99, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 26, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'dodge', value: -20, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'They held that hill. They intend to hold yours, too.',
        flavorDe: 'Sie hielten jenen Hügel. Sie haben vor, deinen auch zu halten.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── THIRD WAVE (levels 2–84, mechanic-driven designs) ──────────────
    // ══════════════════════════════════════════════════════════════════

    // ── Low level ─────────────────────────────────────────────────────
    {
        uniqueId: 'pebble_of_patience',
        nameEn: 'Pebble of Patience',
        nameDe: 'Kieselstein der Geduld',
        icon: '🪨', slotType: 'talisman', archetype: 'any',
        minLevel: 2,
        requirements: { level: 2, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'first_step', value: 2, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'faster_absorption_regen_start', value: 5, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'time_added', value: -45, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'Small stones begin small avalanches. Eventually.',
        flavorDe: 'Kleine Steine starten kleine Lawinen. Irgendwann.',
    },

    {
        uniqueId: 'torch_stub',
        nameEn: 'Torch Stub',
        nameDe: 'Fackelstummel',
        icon: '🕯️', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 4,
        requirements: { level: 4, str: 15, agi: 0, int: 0 },
        damage: { min: 29, max: 63 }, attackIntervalSeconds: 5.0,
        bonuses: [
            { key: 'chance_to_ignite', value: 12, en: '#% chance to Ignite Monsters on hit', de: '#% Chance, Monster bei Treffern zu entzünden' },
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'cold_resist', value: -20, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'Half torch. All temper.',
        flavorDe: 'Halbe Fackel. Ganz Laune.',
    },

    {
        uniqueId: 'bubble_charm',
        nameEn: 'Bubble Charm',
        nameDe: 'Blubber-Amulett',
        icon: '🫧', slotType: 'earring', archetype: 'any',
        minLevel: 5,
        requirements: { level: 5, str: 0, agi: 0, int: 19 },
        bonuses: [
            { key: 'absorption_regen_rate', value: 20, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'faster_absorption_regen_start', value: 5, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' }
        ],
        downsides: [
            { key: 'flat_health', value: -28, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Pop it, and it forgives you. Mostly.',
        flavorDe: 'Platze sie, und sie vergibt dir. Meistens.',
    },

    {
        uniqueId: 'training_weights',
        nameEn: 'Training Weights',
        nameDe: 'Trainingsgewichte',
        icon: '🏋️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 7,
        requirements: { level: 7, str: 27, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'strength', value: 8, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 20, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'agility', value: -18, en: '-# to Agility', de: '-# zu Beweglichkeit' }
        ],
        flavorEn: 'Slow is smooth. Smooth is eventually strong.',
        flavorDe: 'Langsam ist geschmeidig. Geschmeidig ist irgendwann stark.',
    },

    {
        uniqueId: 'whetstone_pendant',
        nameEn: 'Whetstone Pendant',
        nameDe: 'Wetzstein-Anhänger',
        icon: '🪒', slotType: 'amulet', archetype: 'any',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 21, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -30, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Sharp edges, dull eyes.',
        flavorDe: 'Scharfe Klingen, trübe Augen.',
    },

    {
        uniqueId: 'lucky_pencil_stub',
        nameEn: 'Lucky Pencil Stub',
        nameDe: 'Glücklicher Stummelbleistift',
        icon: '✏️', slotType: 'ring', archetype: 'any',
        minLevel: 9,
        requirements: { level: 9, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'reveal_hint', value: 15, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_health', value: 22, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'fate', value: -17, en: '-#% increased Fate', de: '-#% erhöhtes Schicksal' }
        ],
        flavorEn: 'Chewed through every exam. Luck ran out somewhere around question two.',
        flavorDe: 'Durch jede Prüfung gekaut. Das Glück endete etwa bei Frage zwei.',
    },

    {
        uniqueId: 'bandage_wraps',
        nameEn: 'Bandage Wraps',
        nameDe: 'Verbandswickel',
        icon: '🩹', slotType: 'gloves', archetype: 'any',
        minLevel: 11,
        requirements: { level: 11, str: 0, agi: 42, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_regen', value: 2, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'heart_heal', value: 8, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'life_on_kill', value: -10, en: '-# Life gained on Kill', de: '-# Leben bei jedem Kill' }
        ],
        flavorEn: 'Healing hands, borrowed patience.',
        flavorDe: 'Heilende Hände, geliehene Geduld.',
    },

    {
        uniqueId: 'battered_storybook',
        nameEn: 'Battered Storybook',
        nameDe: 'Zerschlagenes Märchenbuch',
        icon: '📚', slotType: 'arcane', archetype: 'intellect',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 0, int: 46 },
        defenses: { armour: 0, evasion: 0, absorption: 40 },
        bonuses: [
            { key: 'spell_damage', value: 10, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'chance_for_new_question', value: 12, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' }
        ],
        downsides: [
            { key: 'flat_mana', value: -44, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Every ending was rewritten by someone who hated it.',
        flavorDe: 'Jedes Ende wurde von jemandem umgeschrieben, der es hasste.',
    },

    {
        uniqueId: 'cracked_mirror_shield',
        nameEn: 'Cracked Mirror Shield',
        nameDe: 'Gesprungener Spiegelschild',
        icon: '🪞', slotType: 'shield', archetype: 'intellect',
        minLevel: 14,
        requirements: { level: 14, str: 0, agi: 0, int: 53 },
        defenses: { armour: 60, evasion: 0, absorption: 40 },
        blockChance: 16,
        bonuses: [
            { key: 'spell_block_chance', value: 8, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'flat_health', value: 22, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 6, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'block_recovery', value: -34, en: '#% slower Block Recovery', de: '#% langsamere Blockerholung' }
        ],
        flavorEn: 'Bad luck reflected seven times. Badly.',
        flavorDe: 'Unglück siebenfach reflektiert. Schlecht.',
    },

    {
        uniqueId: 'wool_socks_of_defiance',
        nameEn: 'Wool Socks of Defiance',
        nameDe: 'Wollsocken des Trotzes',
        icon: '🧦', slotType: 'boots', archetype: 'any',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 61, int: 0 },
        defenses: { armour: 70, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'grounded_1', value: 30, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_evasion', value: 35, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'dodge', value: -11, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'Grandma knitted them. You WILL stand your ground.',
        flavorDe: 'Oma hat sie gestrickt. Du wirst DEINEN Boden halten.',
    },

    {
        uniqueId: 'oversized_helmet',
        nameEn: 'Oversized Helmet',
        nameDe: 'Überdimensionierter Helm',
        icon: '⛑️', slotType: 'head', archetype: 'strength',
        minLevel: 18,
        requirements: { level: 18, str: 68, agi: 0, int: 0 },
        defenses: { armour: 115, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 10, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'fire_resist', value: 16, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' }
        ],
        downsides: [
            { key: 'accuracy', value: -30, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Nothing gets in. Including your own field of vision.',
        flavorDe: 'Nichts kommt herein. Auch dein eigenes Sichtfeld nicht.',
    },

    {
        uniqueId: 'chalk_dusted_bracers',
        nameEn: 'Chalk-Dusted Bracers',
        nameDe: 'Kreisbestäubte Armschienen',
        icon: '🤍', slotType: 'bracers', archetype: 'intellect',
        minLevel: 19,
        requirements: { level: 19, str: 0, agi: 0, int: 72 },
        defenses: { armour: 0, evasion: 0, absorption: 10 },
        bonuses: [
            { key: 'mana_on_mistake', value: 5, en: '+# Mana gained on Mistake', de: '+# Mana bei einem Fehler' },
            { key: 'mana_regen', value: 2, en: '+# Mana regenerated per 5s', de: '+# Mana-Regeneration pro 5s' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -18, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'Every error is just chalk for the next attempt.',
        flavorDe: 'Jeder Fehler ist nur Kreide für den nächsten Versuch.',
    },

    // ── Mid level ─────────────────────────────────────────────────────
    {
        uniqueId: 'serpents_coil_band',
        nameEn: "Serpent's Coil Band",
        nameDe: 'Ring der Schlangenwindung',
        icon: '🐍', slotType: 'ring', archetype: 'any',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 0, int: 84 },
        bonuses: [
            { key: 'chance_to_convert', value: 12, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'flat_health', value: 29, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 28, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -22, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' }
        ],
        flavorEn: 'It sheds its loyalty every season. So will you.',
        flavorDe: 'Sie häutet ihre Loyalität jede Saison. Du auch.',
    },

    {
        uniqueId: 'featherfall_anklet',
        nameEn: 'Featherfall Anklet',
        nameDe: 'Federfall-Knöchelband',
        icon: '🪶', slotType: 'boots', archetype: 'agility',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 91, int: 0 },
        defenses: { armour: 0, evasion: 76, absorption: 0 },
        bonuses: [
            { key: 'preemptive_dodge', value: 15, en: '#% chance to preemptively Dodge incoming Attacks', de: '#% Chance, Angriffen präventiv auszuweichen' },
            { key: 'dodge', value: 5, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_evasion', value: 35, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'flat_health', value: -55, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Land like a leaf. Bleed like anyone.',
        flavorDe: 'Landen wie ein Blatt. Bluten wie jeder andere.',
    },

    {
        uniqueId: 'stormglass_focus',
        nameEn: 'Stormglass Focus',
        nameDe: 'Sturmglass-Fokus',
        icon: '🌩️', slotType: 'arcane', archetype: 'intellect',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 99 },
        defenses: { armour: 0, evasion: 0, absorption: 95 },
        bonuses: [
            { key: 'chance_to_shock', value: 15, en: '#% chance to Shock Monsters on hit', de: '#% Chance, Monster bei Treffern zu schocken' },
            { key: 'lightning_damage_1', value: 10, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'fire_resist', value: -22, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Caught lightning in glass. The glass has opinions now.',
        flavorDe: 'Blitz in Glas gefangen. Das Glas hat jetzt Meinungen.',
    },

    {
        uniqueId: 'butchers_apron',
        nameEn: "Butcher's Apron",
        nameDe: 'Metzgerschürze',
        icon: '🥩', slotType: 'chest', archetype: 'strength',
        minLevel: 28,
        requirements: { level: 28, str: 106, agi: 0, int: 0 },
        defenses: { armour: 360, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'cleave', value: 25, en: '#% chance to Cleave nearby Monsters', de: '#% Chance, nahe Monster zu spalten' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'inc_armour', value: 20, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'life_regen', value: -4.4, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'Stained beyond washing. Worn beyond reason.',
        flavorDe: 'Über jede Wäsche hinaus befleckt. Über jede Vernunft hinaus getragen.',
    },

    {
        uniqueId: 'cartomancers_deck',
        nameEn: "Cartomancer's Deck",
        nameDe: 'Kartenleger-Deck',
        icon: '🃏', slotType: 'arcane', archetype: 'any',
        minLevel: 37,
        requirements: { level: 37, str: 0, agi: 0, int: 141 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
        bonuses: [
            { key: 'fate', value: 20, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'reveal_hint', value: 10, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'time_added', value: -28, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'The deck never lies. It just deals slowly.',
        flavorDe: 'Das Deck lügt nie. Es mischt nur langsam.',
    },

    {
        uniqueId: 'meditation_beads',
        nameEn: 'Meditation Beads',
        nameDe: 'Meditationsperlen',
        icon: '📿', slotType: 'talisman', archetype: 'any',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'mana_regen', value: 4, en: '+# Mana regenerated per 5s', de: '+# Mana-Regeneration pro 5s' },
            { key: 'focus', value: 15, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2, en: 'Melee Strikes occur 1.5s slower', de: 'Nahkampfschläge erfolgen 1,5s langsamer' }
        ],
        flavorEn: 'Breathe in. Breathe out. Swing tomorrow.',
        flavorDe: 'Einatmen. Ausatmen. Morgen zuschlagen.',
    },

    {
        uniqueId: 'duelists_sigil',
        nameEn: "Duelist's Sigil",
        nameDe: 'Sigill des Duellanten',
        icon: '⚔️', slotType: 'amulet', archetype: 'any',
        minLevel: 32,
        requirements: { level: 32, str: 0, agi: 122, int: 0 },
        bonuses: [
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'accuracy', value: 15, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'First blood settles most arguments.',
        flavorDe: 'Erstes Blut entscheidet die meisten Streitigkeiten.',
    },

    {
        uniqueId: 'gravewatchers_lantern',
        nameEn: "Gravewatcher's Lantern",
        nameDe: 'Grabhüter-Laterne',
        icon: '🏮', slotType: 'cloak', archetype: 'intellect',
        minLevel: 33,
        requirements: { level: 33, str: 0, agi: 60, int: 125 },
        defenses: { armour: 0, evasion: 240, absorption: 0 },
        bonuses: [
            { key: 'chance_to_blind', value: 12, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'spell_dodge', value: 8, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'arcane_resistance', value: 15, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' }
        ],
        downsides: [
            { key: 'cold_resist', value: -22, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'It keeps the dead polite and the living nervous.',
        flavorDe: 'Es hält die Toten höflich und die Lebenden nervös.',
    },

    {
        uniqueId: 'iron_bulwark_pauldrons',
        nameEn: 'Iron Bulwark Pauldrons',
        nameDe: 'Eisenbollwerk-Schulterplatten',
        icon: '🛠️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 35,
        requirements: { level: 35, str: 133, agi: 0, int: 0 },
        defenses: { armour: 330, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'inc_armour', value: 40, en: '#% increased Armour', de: '#% erhöhte Rüstung' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_armour', value: 60, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Armor that argues back.',
        flavorDe: 'Rüstung, die widerspricht.',
    },

    {
        uniqueId: 'hungering_roots',
        nameEn: 'Hungering Roots',
        nameDe: 'Hungrige Wurzeln',
        icon: '🌱', slotType: 'pants', archetype: 'any',
        minLevel: 36,
        requirements: { level: 36, str: 95, agi: 0, int: 0 },
        defenses: { armour: 280, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_leech', value: 3, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'flat_health', value: 50, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'mana_regen', value: -4.4, en: '-# Mana regenerated per 5s', de: '-# Mana-Regeneration pro 5s' }
        ],
        flavorEn: 'They drink deep. The soil complains.',
        flavorDe: 'Sie trinken tief. Der Boden beschwert sich.',
    },

    {
        uniqueId: 'frostward_signet',
        nameEn: 'Frostward Signet',
        nameDe: 'Frostwacht-Siegelring',
        icon: '🧊', slotType: 'ring', archetype: 'any',
        minLevel: 38,
        requirements: { level: 38, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'chance_to_freeze', value: 15, en: '#% chance to Freeze Monsters on hit', de: '#% Chance, Monster bei Treffern einzufrieren' },
            { key: 'cold_damage_1', value: 10, en: 'Adds # Cold Damage to Attacks', de: 'Fügt Angriffen # Kälteschaden hinzu' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2, en: 'Melee Strikes occur 1.5s slower', de: 'Nahkampfschläge erfolgen 1,5s langsamer' }
        ],
        flavorEn: 'Cold patience, frozen enemies, unhurried fists.',
        flavorDe: 'Kalte Geduld, eingefrorene Feinde, ungeeilte Fäuste.',
    },

    {
        uniqueId: 'powder_monkey_gloves',
        nameEn: 'Powder Monkey Gloves',
        nameDe: 'Pulveraffen-Handschuhe',
        icon: '💣', slotType: 'gloves', archetype: 'any',
        minLevel: 39,
        requirements: { level: 39, str: 148, agi: 0, int: 0 },
        defenses: { armour: 132, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'fire_damage_1', value: 10, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'fire_damage_2', value: 16, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'splash_damage', value: 20, en: '#% increased Splash Area', de: '#% vergrößerter Spritzbereich' }
        ],
        downsides: [
            { key: 'fire_resist', value: -30, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Eyebrows are temporary. Explosions are forever.',
        flavorDe: 'Augenbrauen sind temporär. Explosionen sind ewig.',
    },

    {
        uniqueId: 'scholarly_skullcap',
        nameEn: 'Scholarly Skullcap',
        nameDe: 'Gelehrten Käppchen',
        icon: '🎓', slotType: 'head', archetype: 'intellect',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 152 },
        defenses: { armour: 0, evasion: 0, absorption: 310 },
        bonuses: [
            { key: 'intelligence', value: 14, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'mana_on_mistake', value: 8, en: '+# Mana gained on Mistake', de: '+# Mana bei einem Fehler' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'strength', value: -20, en: '-# to Strength', de: '-# zu Stärke' }
        ],
        flavorEn: 'Failure is data. Wear the data.',
        flavorDe: 'Scheitern ist Datenmaterial. Trage die Daten.',
    },

    {
        uniqueId: 'vampiric_fang',
        nameEn: 'Vampiric Fang',
        nameDe: 'Vampir-Reißzahn',
        icon: '🦇', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 41,
        requirements: { level: 41, str: 156, agi: 0, int: 0 },
        damage: { min: 380, max: 694 }, attackIntervalSeconds: 7.4,
        bonuses: [
            { key: 'life_leech', value: 5, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'life_regen', value: -7, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'It prefers its meals moving. Yours will do.',
        flavorDe: 'Er bevorzugt seine Mahlzeiten beweglich. Deine genügen.',
    },

    {
        uniqueId: 'windcutter_cloak',
        nameEn: 'Windcutter Cloak',
        nameDe: 'Windschneider-Umhang',
        icon: '🍃', slotType: 'cloak', archetype: 'agility',
        minLevel: 42,
        requirements: { level: 42, str: 0, agi: 160, int: 0 },
        defenses: { armour: 0, evasion: 390, absorption: 0 },
        bonuses: [
            { key: 'pierce', value: 25, en: '#% chance for Projectiles to Pierce Monsters', de: '#% Chance, dass Projektile Monster durchbohren' },
            { key: 'flat_health', value: 42, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'block_chance', value: -18, en: '-#% Block Chance', de: '-#% Blockchance' }
        ],
        flavorEn: 'Cutting wind, threading shots.',
        flavorDe: 'Schneidender Wind, fädelnde Schüsse.',
    },

    {
        uniqueId: 'second_wind_sash',
        nameEn: 'Second Wind Sash',
        nameDe: 'Zweiter-Atem-Schärpe',
        icon: '💨', slotType: 'belt', archetype: 'any',
        minLevel: 43,
        requirements: { level: 43, str: 0, agi: 0, int: 163 },
        defenses: { armour: 0, evasion: 0, absorption: 190 },
        bonuses: [
            { key: 'faster_absorption_regen_start', value: 9, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' },
            { key: 'absorption_regen_rate', value: 30, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'flat_health', value: 43, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'life_regen', value: -4.4, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'Get knocked down. Get recharged. Repeat.',
        flavorDe: 'Umgeworfen werden. Neu aufgeladen werden. Wiederholen.',
    },

    {
        uniqueId: 'hexbreaker_earring',
        nameEn: 'Hexbreaker Earring',
        nameDe: 'Fluchbrecher-Ohrring',
        icon: '🧿', slotType: 'earring', archetype: 'any',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 0, int: 167 },
        bonuses: [
            { key: 'arcane_resistance', value: 25, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -22, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' }
        ],
        flavorEn: 'Breaks hexes. Attracts shadows. Fair trade.',
        flavorDe: 'Bricht Flüche. Zieht Schatten an. Faire Sache.',
    },

    {
        uniqueId: 'juggernauts_treads',
        nameEn: "Juggernaut's Treads",
        nameDe: 'Tritte des Juggernaut',
        icon: '🥾', slotType: 'pants', archetype: 'strength',
        minLevel: 45,
        requirements: { level: 45, str: 171, agi: 0, int: 0 },
        defenses: { armour: 520, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 70, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'grounded_2', value: 30, en: '#% reduced effect of being Grounded', de: '#% reduzierter Effekt des Bodenstoßes' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'dodge', value: -18, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'You do not move out of the way. The way moves out of you.',
        flavorDe: 'Du weicht nicht aus. Der Weg weicht dir aus.',
    },

    // ── High level ────────────────────────────────────────────────────
    {
        uniqueId: 'astral_cartographers_monocle',
        nameEn: "Astral Cartographer's Monocle",
        nameDe: 'Monokkel der Astralkartografin',
        icon: '🧿', slotType: 'head', archetype: 'intellect',
        minLevel: 47,
        requirements: { level: 47, str: 0, agi: 0, int: 179 },
        defenses: { armour: 0, evasion: 0, absorption: 300 },
        bonuses: [
            { key: 'reveal_hint', value: 18, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'fate', value: 15, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 15, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-1 Allowed Mistake', de: '-1 erlaubter Fehler' }
        ],
        flavorEn: 'Charts constellations perfectly. Trips over its own feet.',
        flavorDe: 'Vermisst Sternbilder perfekt. Stolpert über die eigenen Füße.',
    },

    {
        uniqueId: 'bloodforged_gorget',
        nameEn: 'Bloodforged Gorget',
        nameDe: 'Blutgeschmiedeter Halsberge',
        icon: '🩸', slotType: 'amulet', archetype: 'strength',
        minLevel: 49,
        requirements: { level: 49, str: 186, agi: 0, int: 0 },
        bonuses: [
            { key: 'life_leech', value: 4, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'inc_physical_damage', value: 35, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'heart_heal', value: 15, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'flat_mana', value: -70, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Quenched in something warm and unwilling.',
        flavorDe: 'In etwas Warmem und Willenlosem gelöscht.',
    },

    {
        uniqueId: 'thundercore_gauntlet',
        nameEn: 'Thundercore Gauntlet',
        nameDe: 'Donnerkern-Panzerhandschuh',
        icon: '⚡', slotType: 'gloves', archetype: 'any',
        minLevel: 50,
        requirements: { level: 50, str: 100, agi: 90, int: 0 },
        defenses: { armour: 230, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'lightning_damage_1', value: 14, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'lightning_damage_2', value: 22, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'chance_to_shock', value: 12, en: '#% chance to Shock Monsters on hit', de: '#% Chance, Monster bei Treffern zu schocken' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cold_resist', value: -30, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'Shakes hands like a thundercloud settles arguments.',
        flavorDe: 'Reicht die Hand wie eine Gewitterwolke Streitigkeiten beilegt.',
    },

    {
        uniqueId: 'permafrost_plate',
        nameEn: 'Permafrost Plate',
        nameDe: 'Permafrost-Platte',
        icon: '🏔️', slotType: 'chest', archetype: 'strength',
        minLevel: 52,
        requirements: { level: 52, str: 198, agi: 0, int: 0 },
        defenses: { armour: 700, evasion: 0, absorption: 140 },
        bonuses: [
            { key: 'chance_to_freeze', value: 10, en: '#% chance to Freeze Monsters on hit', de: '#% Chance, Monster bei Treffern einzufrieren' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' }
        ],
        flavorEn: 'Winter wears you now.',
        flavorDe: 'Der Winter trägt jetzt dich.',
    },

    {
        uniqueId: 'voidtouched_kilt',
        nameEn: 'Voidtouched Kilt',
        nameDe: 'Leerenberührter Kilt',
        icon: '🕳️', slotType: 'pants', archetype: 'intellect',
        minLevel: 53,
        requirements: { level: 53, str: 0, agi: 0, int: 201 },
        defenses: { armour: 260, evasion: 260, absorption: 0 },
        bonuses: [
            { key: 'spell_damage', value: 25, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'echo_1', value: 15, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Pockets open into nowhere. Everything falls in politely.',
        flavorDe: 'Taschen öffnen sich ins Nirgendwo. Alles fällt höflich hinein.',
    },

    {
        uniqueId: 'hurricane_string',
        nameEn: 'Hurricane String',
        nameDe: 'Wirbelsturm-Sehne',
        icon: '🌪️', slotType: 'ranged', archetype: 'agility',
        minLevel: 54,
        requirements: { level: 54, str: 0, agi: 205, int: 0 },
        damage: { min: 225, max: 449 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'multishot', value: 25, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'chain', value: 25, en: '#% chance for Projectiles to Chain to distant Monsters', de: '#% Chance, dass Projektile auf ferne Monster überspringen' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Accuracy is a suggestion. Volume is a strategy.',
        flavorDe: 'Präzision ist ein Vorschlag. Menge ist eine Strategie.',
    },

    {
        uniqueId: 'mirrorplate_aegis',
        nameEn: 'Mirrorplate Aegis',
        nameDe: 'Spiegelplatten-Aegis',
        icon: '🪩', slotType: 'shield', archetype: 'any',
        minLevel: 55,
        requirements: { level: 55, str: 130, agi: 0, int: 130 },
        defenses: { armour: 500, evasion: 0, absorption: 180 },
        blockChance: 28,
        bonuses: [
            { key: 'spell_block_chance', value: 12, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'flat_health', value: 75, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'flat_armour', value: 90, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'cleave', value: -34, en: '-#% chance to Cleave nearby Monsters', de: '-#% Chance, nahe Monster zu spalten' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Shows monsters their own bad ideas at full brightness.',
        flavorDe: 'Zeigt Monstern ihre eigenen schlechten Ideen in voller Helligkeit.',
    },

    {
        uniqueId: 'emberheart_circlet',
        nameEn: 'Emberheart Circlet',
        nameDe: 'Glutherz-Reif',
        icon: '❤️‍🔥', slotType: 'head', archetype: 'intellect',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 213 },
        defenses: { armour: 0, evasion: 0, absorption: 340 },
        bonuses: [
            { key: 'inc_spell_damage', value: 30, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'chance_to_ignite', value: 15, en: '#% chance to Ignite Monsters on hit', de: '#% Chance, Monster bei Treffern zu entzünden' },
            { key: 'flat_health', value: 76, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'cold_resist', value: -32, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Warm thoughts. Flammable conclusions.',
        flavorDe: 'Warme Gedanken. Brennbare Schlüsse.',
    },

    {
        uniqueId: 'titans_oath_girdle',
        nameEn: "Titan's Oath Girdle",
        nameDe: 'Gürtel des Titangelöbnisses',
        icon: '🗿', slotType: 'belt', archetype: 'strength',
        minLevel: 58,
        requirements: { level: 58, str: 220, agi: 0, int: 0 },
        defenses: { armour: 265, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 100, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'grounded_1', value: 30, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'crit_chance', value: -18, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Promises made of granite are hard to break. So is the waistline.',
        flavorDe: 'Aus Granit gegebene Versprechen sind schwer zu brechen. Die Taille auch.',
    },

    {
        uniqueId: 'necromancers_vertebra',
        nameEn: "Necromancer's Vertebra",
        nameDe: 'Wirbel des Nekromanten',
        icon: '☠️', slotType: 'talisman', archetype: 'intellect',
        minLevel: 59,
        requirements: { level: 59, str: 0, agi: 0, int: 224 },
        bonuses: [
            { key: 'chance_to_convert', value: 18, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'overkill', value: 20, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'flat_health', value: 79, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'life_regen', value: -7, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Part of someone spineless. Now yours bends for them.',
        flavorDe: 'Teil eines Rücksichtslosen. Jetzt beugt sich deiner für ihn.',
    },

    {
        uniqueId: 'zephyrwing_mantle',
        nameEn: 'Zephyrwing Mantle',
        nameDe: 'Zephirflügel-Mantel',
        icon: '🕊️', slotType: 'cloak', archetype: 'agility',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 228, int: 0 },
        defenses: { armour: 0, evasion: 620, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 12, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 12, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'flat_health', value: 65, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_evasion', value: 90, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'focus', value: -26, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Untouchable, unless you panic.',
        flavorDe: 'Unberührbar – außer im Panikmoment.',
    },

    {
        uniqueId: 'runefist_wraps',
        nameEn: 'Runefist Wraps',
        nameDe: 'Runenfaust-Wickel',
        icon: '✍️', slotType: 'bracers', archetype: 'any',
        minLevel: 61,
        requirements: { level: 61, str: 0, agi: 116, int: 116 },
        defenses: { armour: 222, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 2.5, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'channel_2', value: 2, en: '+# maximum Channel Stacks', de: '+# maximale Kanalisierungsstapel' },
            { key: 'echo_2', value: 35, en: 'Echoes deal #% of the original damage', de: 'Echos verursachen #% des ursprünglichen Schadens' },
            { key: 'flat_health', value: 66, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'flat_mana', value: -63, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Each rune is a promise to hit things faster.',
        flavorDe: 'Jede Rune ist ein Versprechen, schneller zuzuschlagen.',
    },

    // ── Chase ─────────────────────────────────────────────────────────
    {
        uniqueId: 'crown_of_the_probability_king',
        nameEn: 'Crown of the Probability King',
        nameDe: 'Krone des Wahrscheinlichkeitskönigs',
        icon: '👑', slotType: 'head', archetype: 'any',
        minLevel: 63,
        requirements: { level: 63, str: 80, agi: 80, int: 80 },
        defenses: { armour: 220, evasion: 220, absorption: 220 },
        bonuses: [
            { key: 'fate', value: 30, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'reveal_hint', value: 15, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'chance_for_new_question', value: 15, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 68, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -56, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'He wagered his clockwork kingdom on a coin flip. He won. Once.',
        flavorDe: 'Er setzte sein uhrwerkgetriebenes Königreich auf einen Münzwurf. Er gewann. Einmal.',
    },

    {
        uniqueId: 'heart_of_the_deep',
        nameEn: 'Heart of the Deep',
        nameDe: 'Herz der Tiefe',
        icon: '🌊', slotType: 'amulet', archetype: 'any',
        minLevel: 64,
        requirements: { level: 64, str: 120, agi: 0, int: 120 },
        defenses: { armour: 0, evasion: 0, absorption: 400 },
        bonuses: [
            { key: 'absorption_on_kill', value: 12, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'absorption_regen_rate', value: 40, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'faster_absorption_regen_start', value: 6, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' },
            { key: 'flat_health', value: 69, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'life_leech', value: -8, en: '-#% of Damage Dealt Leeched as Life', de: '-#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Pressure makes diamonds. It also makes you very hard to kill.',
        flavorDe: 'Druck macht Diamanten. Er macht dich auch sehr schwer totzubekommen.',
    },

    {
        uniqueId: 'aegis_absolute',
        nameEn: 'Aegis Absolute',
        nameDe: 'Absolute Aegis',
        icon: '🛡️', slotType: 'shield', archetype: 'strength',
        minLevel: 66,
        requirements: { level: 66, str: 251, agi: 0, int: 0 },
        defenses: { armour: 800, evasion: 0, absorption: 250 },
        blockChance: 34,
        bonuses: [
            { key: 'inc_armour', value: 80, en: '#% increased Armour', de: '#% erhöhte Rüstung' },
            { key: 'block_recovery', value: 50, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'flat_health', value: 71, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'attack_speed', value: -3.9, en: 'Melee Strikes occur 3s slower', de: 'Nahkampfschläge erfolgen 3s langsamer' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Behind this shield, patience becomes a weapon.',
        flavorDe: 'Hinter diesem Schild wird Geduld zur Waffe.',
    },

    {
        uniqueId: 'mindspike_tiara',
        nameEn: 'Mindspike Tiara',
        nameDe: 'Geistesspitzen-Diadem',
        icon: '💠', slotType: 'arcane', archetype: 'intellect',
        minLevel: 68,
        requirements: { level: 68, str: 0, agi: 0, int: 258 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
        bonuses: [
            { key: 'spell_damage', value: 70, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'inc_spell_damage', value: 35, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_health', value: -88, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Think hard enough, and reality flinches first.',
        flavorDe: 'Denke hart genug, und die Realität blinzelt zuerst.',
    },

    {
        uniqueId: 'apex_predator_fang',
        nameEn: 'Apex Predator Fang',
        nameDe: 'Reißzahn des Spitzenprädatoren',
        icon: '🐉', slotType: 'weapon', archetype: 'agility', hands: 1,
        minLevel: 75,
        requirements: { level: 75, str: 0, agi: 285, int: 0 },
        damage: { min: 731, max: 1323 }, attackIntervalSeconds: 6.8,
        bonuses: [
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'life_leech', value: 3, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 85, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -47, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Fast, hungry, and utterly unconcerned with missing.',
        flavorDe: 'Schnell, hungrig und völlig unbeeindruckt vom Verfehlen.',
    },

    {
        uniqueId: 'monolith_greaves',
        nameEn: 'Monolith Greaves',
        nameDe: 'Monolith-Beinschienen',
        icon: '🏛️', slotType: 'pants', archetype: 'strength',
        minLevel: 77,
        requirements: { level: 77, str: 292, agi: 0, int: 0 },
        defenses: { armour: 1000, evasion: 0, absorption: 220 },
        bonuses: [
            { key: 'inc_armour', value: 60, en: '#% increased Armour', de: '#% erhöhte Rüstung' },
            { key: 'grounded_2', value: 50, en: '#% reduced effect of being Grounded', de: '#% reduzierter Effekt des Bodenstoßes' },
            { key: 'flat_health', value: 87, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 26, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'dodge', value: -26, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'You are not wearing legs anymore. You are wearing architecture.',
        flavorDe: 'Du trägst keine Beine mehr. Du trägst Architektur.',
    },

    {
        uniqueId: 'sigil_of_the_unbound_hour',
        nameEn: 'Sigil of the Unbound Hour',
        nameDe: 'Sigill der Ungebundenen Stunde',
        icon: '⏳', slotType: 'talisman', archetype: 'any',
        minLevel: 81,
        requirements: { level: 81, str: 0, agi: 0, int: 308 },
        bonuses: [
            { key: 'time_added', value: 90, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'first_step', value: 4, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'flat_health', value: 91, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 70, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-1 Allowed Mistake', de: '-1 erlaubter Fehler' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Time enough at last — for those who never slip.',
        flavorDe: 'Endlich genug Zeit – für diejenigen, die nie straucheln.',
    },

    {
        uniqueId: 'ring_of_the_eternal_question',
        nameEn: 'Ring of the Eternal Question',
        nameDe: 'Ring der Ewigen Frage',
        icon: '❓', slotType: 'ring', archetype: 'any',
        minLevel: 84,
        requirements: { level: 84, str: 0, agi: 0, int: 319 },
        bonuses: [
            { key: 'chance_for_new_question', value: 30, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'reveal_hint', value: 15, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_health', value: 94, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 85, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'time_added', value: -63, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Wrong answers are just questions you get to ask again.',
        flavorDe: 'Falsche Antworten sind nur Fragen, die du erneut stellen darfst.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── FINAL WAVE (77 uniques, completing the collection to 200) ──────
    // ══════════════════════════════════════════════════════════════════

    // ── Head ──────────────────────────────────────────────────────────
    {
        uniqueId: 'tin_can_helm',
        nameEn: 'Tin Can Helm',
        nameDe: 'Blechdosen-Helm',
        icon: '🥫', slotType: 'head', archetype: 'any',
        minLevel: 3,
        requirements: { level: 3, str: 12, agi: 0, int: 0 },
        defenses: { armour: 15, evasion: 15, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 15, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 6, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'accuracy', value: -15, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Lunch included. Dignity sold separately.',
        flavorDe: 'Mittagessen inklusive. Würde separat erhältlich.',
    },

    {
        uniqueId: 'hood_of_loud_silence',
        nameEn: 'Hood of Loud Silence',
        nameDe: 'Kapuze des Lauten Schweigens',
        icon: '🔇', slotType: 'head', archetype: 'any',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 46, int: 0 },
        defenses: { armour: 56, evasion: 56, absorption: 0 },
        bonuses: [
            { key: 'spell_dodge', value: 6, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'flat_health', value: 20, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'mana_regen', value: -2.2, en: '-# Mana regenerated per 5s', de: '-# Mana-Regeneration pro 5s' }
        ],
        flavorEn: 'It muffles everything. Even your thoughts get quieter.',
        flavorDe: 'Sie dämpft alles. Selbst deine Gedanken werden leiser.',
    },

    {
        uniqueId: 'circlet_of_second_chances',
        nameEn: 'Circlet of Second Chances',
        nameDe: 'Reif der Zweiten Chancen',
        icon: '💫', slotType: 'head', archetype: 'any',
        minLevel: 26,
        requirements: { level: 26, str: 0, agi: 0, int: 99 },
        defenses: { armour: 210, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 12, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht gezählt werden' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 10, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'time_added', value: -28, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'Forgiveness, billed by the minute.',
        flavorDe: 'Vergebung, minutengenau abgerechnet.',
    },

    {
        uniqueId: 'visor_of_narrow_truths',
        nameEn: 'Visor of Narrow Truths',
        nameDe: 'Visier der Schmalen Wahrheiten',
        icon: '🥽', slotType: 'head', archetype: 'agility',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 167, int: 0 },
        defenses: { armour: 0, evasion: 395, absorption: 0 },
        bonuses: [
            { key: 'accuracy', value: 30, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 5, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -20, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        flavorEn: 'Focus on one truth and miss every other.',
        flavorDe: 'Konzentriere dich auf eine Wahrheit und verpasse alle anderen.',
    },

    {
        uniqueId: 'halo_of_static_prayers',
        nameEn: 'Halo of Static Prayers',
        nameDe: 'Halo der Statischen Gebete',
        icon: '😇', slotType: 'head', archetype: 'intellect',
        minLevel: 59,
        requirements: { level: 59, str: 0, agi: 0, int: 224 },
        defenses: { armour: 0, evasion: 0, absorption: 465 },
        bonuses: [
            { key: 'warding', value: 120, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'arcane_resistance', value: 20, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 79, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -22, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The signal is divine. The interference is also divine.',
        flavorDe: 'Das Signal ist göttlich. Die Störung ist ebenfalls göttlich.',
    },

    // ── Amulet ────────────────────────────────────────────────────────
    {
        uniqueId: 'bone_whistle',
        nameEn: 'Bone Whistle',
        nameDe: 'Knochenpfeife',
        icon: '🪈', slotType: 'amulet', archetype: 'any',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'mana_on_kill', value: 3, en: '+# Mana gained on Kill', de: '+# Mana bei jedem Kill' },
            { key: 'flat_health', value: 22, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'life_regen', value: -2.2, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'Blown once, answered forever.',
        flavorDe: 'Einmal geblasen, für immer beantwortet.',
    },

    {
        uniqueId: 'locket_of_someone_else',
        nameEn: 'Locket of Someone Else',
        nameDe: 'Medaillon einer Anderen',
        icon: '🪪', slotType: 'amulet', archetype: 'any',
        minLevel: 13,
        requirements: { level: 13, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'heart_heal', value: 10, en: '+# to Heart Heal Amount', de: '+# Herzheilung' },
            { key: 'inc_heart_heal', value: 15, en: '#% increased Heart Heal Amount', de: '#% erhöhte Herzheilung' },
            { key: 'flat_health', value: 21, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -18, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: "The portrait isn't you. The love might be.",
        flavorDe: 'Das Porträt bist nicht du. Die Liebe vielleicht.',
    },

    {
        uniqueId: 'medallion_of_stubborn_mules',
        nameEn: 'Medallion of Stubborn Mules',
        nameDe: 'Medaillon der Sturen Maultiere',
        icon: '🐴', slotType: 'amulet', archetype: 'strength',
        minLevel: 24,
        requirements: { level: 24, str: 91, agi: 0, int: 0 },
        bonuses: [
            { key: 'grounded_1', value: 35, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 31, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'dodge', value: -13, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'You will not be moved. You have never been moved.',
        flavorDe: 'Du wirst nicht bewegt werden. Du wurdest nie bewegt.',
    },

    {
        uniqueId: 'pendant_of_quiet_coincidence',
        nameEn: 'Pendant of Quiet Coincidence',
        nameDe: 'Anhänger des Leisen Zufalls',
        icon: '🍀', slotType: 'amulet', archetype: 'any',
        minLevel: 39,
        requirements: { level: 39, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'fate', value: 18, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'heart_heal', value: 15, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: "Nothing about it is lucky. Things just happen near it.",
        flavorDe: 'Nichts an ihm hat Glück. Dinge passieren nur in seiner Nähe.',
    },

    {
        uniqueId: 'throat_of_the_void_chorus',
        nameEn: 'Throat of the Void Chorus',
        nameDe: 'Kehle des Leerenchores',
        icon: '🎤', slotType: 'amulet', archetype: 'intellect',
        minLevel: 57,
        requirements: { level: 57, str: 0, agi: 0, int: 217 },
        bonuses: [
            { key: 'echo_1', value: 18, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'echo_2', value: 30, en: 'Echoes deal #% of the original damage', de: 'Echos verursachen #% des ursprünglichen Schadens' },
            { key: 'flat_health', value: 77, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -30, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Every note you sing comes back with harmonies you never wrote.',
        flavorDe: 'Jede Note, die du singst, kommt mit Harmonien zurück, die du nie geschrieben hast.',
    },

    // ── Ring ──────────────────────────────────────────────────────────
    {
        uniqueId: 'copper_grip_ring',
        nameEn: 'Copper Grip Ring',
        nameDe: 'Kupfergriff-Ring',
        icon: '🟠', slotType: 'ring', archetype: 'strength',
        minLevel: 6,
        requirements: { level: 6, str: 23, agi: 0, int: 0 },
        bonuses: [
            { key: 'strength', value: 8, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 19, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -13, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'Turns green with envy. Yours.',
        flavorDe: 'Wirft grüne Adern. Vor Neid. Deinem.',
    },

    {
        uniqueId: 'ring_of_polite_knives',
        nameEn: 'Ring of Polite Knives',
        nameDe: 'Ring der Höflichen Messer',
        icon: '🔪', slotType: 'ring', archetype: 'agility',
        minLevel: 17,
        requirements: { level: 17, str: 0, agi: 65, int: 0 },
        bonuses: [
            { key: 'crit_multiplier', value: 30, en: '+#% to Critical Strike Multiplier', de: '+#% Kritischer Trefferschaden' },
            { key: 'flat_health', value: 31, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 28, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'crit_chance', value: -13, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' }
        ],
        flavorEn: 'Rarely drawn. Devastating when justified.',
        flavorDe: 'Selten gezogen. Verheerend, wenn berechtigt.',
    },

    {
        uniqueId: 'band_of_rehearsed_apologies',
        nameEn: 'Band of Rehearsed Apologies',
        nameDe: 'Band der Eingeübten Entschuldigungen',
        icon: '🙇', slotType: 'ring', archetype: 'any',
        minLevel: 29,
        requirements: { level: 29, str: 0, agi: 0, int: 110 },
        bonuses: [
            { key: 'mana_on_mistake', value: 8, en: '+# Mana gained on Mistake', de: '+# Mana bei einem Fehler' },
            { key: 'flat_health', value: 29, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 28, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'focus', value: -20, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Sorry takes longer than sorry should.',
        flavorDe: 'Entschuldigung dauert länger, als Entschuldigung sollte.',
    },

    {
        uniqueId: 'loop_of_leaking_hours',
        nameEn: 'Loop of Leaking Hours',
        nameDe: 'Ring der Laufenden Stunden',
        icon: '⏰', slotType: 'ring', archetype: 'any',
        minLevel: 46,
        requirements: { level: 46, str: 0, agi: 0, int: 0 },
        bonuses: [
            { key: 'time_added', value: 50, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'flat_health', value: 46, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'first_step', value: -4.4, en: '-#s Monsters delay Charge-up after Spawning', de: '-#s Monster verzögern Angriffsladen nach Erscheinen' }
        ],
        flavorEn: 'The hours come in. Something else goes out.',
        flavorDe: 'Die Stunden kommen herein. Etwas anderes geht hinaus.',
    },

    {
        uniqueId: 'signet_of_the_final_word',
        nameEn: 'Signet of the Final Word',
        nameDe: 'Siegel des Letzten Wortes',
        icon: '🗯️', slotType: 'ring', archetype: 'strength',
        minLevel: 68,
        requirements: { level: 68, str: 258, agi: 0, int: 0 },
        bonuses: [
            { key: 'overkill', value: 30, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'cleave', value: 25, en: '#% chance to Cleave nearby Monsters', de: '#% Chance, nahe Monster zu spalten' },
            { key: 'flat_health', value: 73, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Arguments end when the shouting stops hitting something.',
        flavorDe: 'Streitigkeiten enden, wenn das Schreien aufhört, etwas zu treffen.',
    },

    // ── Belt ──────────────────────────────────────────────────────────
    {
        uniqueId: 'rope_belt_of_improvised_faith',
        nameEn: 'Rope Belt of Improvised Faith',
        nameDe: 'Seilgürtel des Improvisierten Glaubens',
        icon: '🪢', slotType: 'belt', archetype: 'any',
        minLevel: 8,
        requirements: { level: 8, str: 0, agi: 0, int: 30 },
        defenses: { armour: 0, evasion: 0, absorption: 65 },
        bonuses: [
            { key: 'absorption_on_kill', value: 4, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'strength', value: 6, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -33, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Belief held together with knots. It holds anyway.',
        flavorDe: 'Glaube mit Knoten zusammengehalten. Er hält trotzdem.',
    },

    {
        uniqueId: 'sash_of_counted_steps',
        nameEn: 'Sash of Counted Steps',
        nameDe: 'Schärpe der Gezählten Schritte',
        icon: '👣', slotType: 'belt', archetype: 'any',
        minLevel: 21,
        requirements: { level: 21, str: 0, agi: 80, int: 0 },
        defenses: { armour: 52, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'first_step', value: 2.5, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'faster_absorption_regen_start', value: -3, en: '#s slower start of Absorption Regeneration', de: '#s langsamerer Start der Absorptionsregeneration' }
        ],
        flavorEn: 'One, two, three… now.',
        flavorDe: 'Eins, zwei, drei … jetzt.',
    },

    {
        uniqueId: 'buckle_of_unspent_wrath',
        nameEn: 'Buckle of Unspent Wrath',
        nameDe: 'Schnalle des Ungelebten Zorns',
        icon: '😡', slotType: 'belt', archetype: 'strength',
        minLevel: 40,
        requirements: { level: 40, str: 152, agi: 0, int: 0 },
        defenses: { armour: 178, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'stagger', value: 25, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'flat_mana', value: -51, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Anger saved is anger doubled.',
        flavorDe: 'Aufgesparter Ärger ist doppelter Ärger.',
    },

    {
        uniqueId: 'cable_of_deep_currents',
        nameEn: 'Cable of Deep Currents',
        nameDe: 'Kabel der Tiefen Strömung',
        icon: '🌊', slotType: 'belt', archetype: 'any',
        minLevel: 61,
        requirements: { level: 61, str: 116, agi: 116, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 290 },
        bonuses: [
            { key: 'absorption_on_kill', value: 10, en: '+# Absorption gained on Kill', de: '+# Absorption bei jedem Kill' },
            { key: 'flat_health', value: 66, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'dodge', value: -18, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Currents do not dodge. They simply are everywhere.',
        flavorDe: 'Strömungen weichen nicht aus. Sie sind einfach überall.',
    },

    // ── Gloves ────────────────────────────────────────────────────────
    {
        uniqueId: 'oven_mitts_of_courage',
        nameEn: 'Oven Mitts of Courage',
        nameDe: 'Topfhandschuhe des Mutes',
        icon: '🧤', slotType: 'gloves', archetype: 'any',
        minLevel: 5,
        requirements: { level: 5, str: 19, agi: 0, int: 0 },
        defenses: { armour: 14, evasion: 14, absorption: 0 },
        bonuses: [
            { key: 'fire_resist', value: 15, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' },
            { key: 'flat_health', value: 18, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cold_resist', value: -20, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'Fire is fine. Everything else is suspicious.',
        flavorDe: 'Feuer ist okay. Alles andere ist verdächtig.',
    },

    {
        uniqueId: 'gardeners_grips',
        nameEn: "Gardener's Grips",
        nameDe: 'Gärtner-Griffe',
        icon: '🌿', slotType: 'gloves', archetype: 'any',
        minLevel: 15,
        requirements: { level: 15, str: 57, agi: 0, int: 0 },
        defenses: { armour: 26, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_on_kill', value: 6, en: '+# Life gained on Kill', de: '+# Leben bei jedem Kill' },
            { key: 'heart_heal', value: 8, en: '+# to Heart Heal Amount', de: '+# Herzheilung' },
            { key: 'flat_health', value: 18, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'crit_chance', value: -11, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' }
        ],
        flavorEn: 'Weeds pulled, things grown, patience earned.',
        flavorDe: 'Unkraut gerupft, Dinge gewachsen, Geduld verdient.',
    },

    {
        uniqueId: 'stranglers_wrap',
        nameEn: "Strangler's Wrap",
        nameDe: 'Würger-Wickel',
        icon: '🥊', slotType: 'gloves', archetype: 'agility',
        minLevel: 27,
        requirements: { level: 27, str: 0, agi: 103, int: 0 },
        defenses: { armour: 0, evasion: 144, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 1.5, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'life_leech', value: 2, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'accuracy', value: 28, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -55, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Quick hands tell no tales. They end them.',
        flavorDe: 'Flinke Hände erzählen keine Geschichten. Sie beenden sie.',
    },

    {
        uniqueId: 'gauntlets_of_the_clockwork_duelist',
        nameEn: 'Gauntlets of the Clockwork Duelist',
        nameDe: 'Panzerhandschuhe des Uhrwerk-Duellanten',
        icon: '⚙️', slotType: 'gloves', archetype: 'any',
        minLevel: 43,
        requirements: { level: 43, str: 80, agi: 80, int: 0 },
        defenses: { armour: 230, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'crit_chance', value: 7, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'attack_speed', value: 1.5, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'flat_health', value: 43, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'flat_mana', value: -51, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Wound tight, springs ready, patience unwound.',
        flavorDe: 'Aufgezogen, Federn gespannt, Geduld abgelaufen.',
    },

    {
        uniqueId: 'fists_of_falling_stars',
        nameEn: 'Fists of Falling Stars',
        nameDe: 'Fäuste der Fallenden Sterne',
        icon: '🌠', slotType: 'gloves', archetype: 'intellect',
        minLevel: 62,
        requirements: { level: 62, str: 118, agi: 118, int: 0 },
        defenses: { armour: 0, evasion: 0, absorption: 305 },
        bonuses: [
            { key: 'fire_damage_1', value: 20, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'fire_damage_2', value: 30, en: 'Adds # Fire Damage to Attacks', de: 'Fügt Angriffen # Feuerschaden hinzu' },
            { key: 'chance_to_blind', value: 10, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'flat_health', value: 67, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'cold_resist', value: -30, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Make a wish. Then make contact.',
        flavorDe: 'Wünsch dir was. Dann mach Kontakt.',
    },

    // ── Chest ─────────────────────────────────────────────────────────
    {
        uniqueId: 'quilted_hope',
        nameEn: 'Quilted Hope',
        nameDe: 'Gesteppte Hoffnung',
        icon: '🛏️', slotType: 'chest', archetype: 'any',
        minLevel: 6,
        requirements: { level: 6, str: 23, agi: 0, int: 0 },
        defenses: { armour: 105, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 10, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht gezählt werden' },
            { key: 'flat_health', value: 19, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -20, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'Stitched from every maybe that ever mattered.',
        flavorDe: 'Genäht aus jedem Vielleicht, das je zählte.',
    },

    {
        uniqueId: 'breastplate_of_quiet_mornings',
        nameEn: 'Breastplate of Quiet Mornings',
        nameDe: 'Brustplatte der Stillen Morgen',
        icon: '🌅', slotType: 'chest', archetype: 'any',
        minLevel: 19,
        requirements: { level: 19, str: 72, agi: 0, int: 0 },
        defenses: { armour: 270, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_regen', value: 2, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'inc_armour', value: 20, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'crit_chance', value: -11, en: '-#% to Critical Strike Chance', de: '-#% Kritische Trefferchance' }
        ],
        flavorEn: 'Nothing dramatic happens while wearing it. That is the point.',
        flavorDe: 'Nichts Dramatisches passiert darin. Das ist der Punkt.',
    },

    {
        uniqueId: 'lamellar_of_the_tidecourt',
        nameEn: 'Lamellar of the Tidecourt',
        nameDe: 'Lamellar des Gezeitenhofes',
        icon: '🐚', slotType: 'chest', archetype: 'intellect',
        minLevel: 31,
        requirements: { level: 31, str: 0, agi: 0, int: 118 },
        defenses: { armour: 390, evasion: 0, absorption: 160 },
        bonuses: [
            { key: 'faster_absorption_regen_start', value: 6, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' },
            { key: 'flat_health', value: 41, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -22, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'The tide always comes back. So does your shield.',
        flavorDe: 'Die Gezeit kehrt immer zurück. Dein Schild auch.',
    },

    {
        uniqueId: 'siege_wall_harness',
        nameEn: 'Siege Wall Harness',
        nameDe: 'Belagerungsmauer-Geschirr',
        icon: '🧱', slotType: 'chest', archetype: 'strength',
        minLevel: 48,
        requirements: { level: 48, str: 182, agi: 0, int: 0 },
        defenses: { armour: 760, evasion: 0, absorption: 100 },
        bonuses: [
            { key: 'grounded_1', value: 30, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'dodge', value: -17, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'Walls do not sidestep. They get hit, and remain.',
        flavorDe: 'Mauern weichen nicht seitlich aus. Sie werden getroffen – und bleiben.',
    },

    {
        uniqueId: 'raiment_of_hollow_stars',
        nameEn: 'Raiment of Hollow Stars',
        nameDe: 'Gewand der Hohlen Sterne',
        icon: '✨', slotType: 'chest', archetype: 'intellect',
        minLevel: 67,
        requirements: { level: 67, str: 0, agi: 128, int: 128 },
        defenses: { armour: 380, evasion: 380, absorption: 360 },
        bonuses: [
            { key: 'warding', value: 180, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 4, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'life_leech', value: -6, en: '-#% of Damage Dealt Leeched as Life', de: '-#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Light without warmth. Protection without weight. Hunger without end.',
        flavorDe: 'Licht ohne Wärme. Schutz ohne Gewicht. Hunger ohne Ende.',
    },

    // ── Boots ─────────────────────────────────────────────────────────
    {
        uniqueId: 'mismatched_boots',
        nameEn: 'Mismatched Boots',
        nameDe: 'Unpaarige Stiefel',
        icon: '🥾', slotType: 'boots', archetype: 'any',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 27, int: 0 },
        defenses: { armour: 28, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_health', value: 20, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -24, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'One walks true. One walks sideways. Enemies cannot predict either.',
        flavorDe: 'Der eine geht gerade. Der andere seitwärts. Feinde können beides nicht vorhersagen.',
    },

    {
        uniqueId: 'pilgrim_sandals',
        nameEn: 'Pilgrim Sandals',
        nameDe: 'Pilgersandalen',
        icon: '🦶', slotType: 'boots', archetype: 'intellect',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 68 },
        defenses: { armour: 0, evasion: 0, absorption: 56 },
        bonuses: [
            { key: 'mana_regen', value: 3, en: '+# Mana regenerated per 5s', de: '+# Mana-Regeneration pro 5s' },
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_evasion', value: 35, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'flat_health', value: -44, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Worn thin by roads that promised meaning.',
        flavorDe: 'Dünn getragen von Wegen, die Sinn versprachen.',
    },

    {
        uniqueId: 'hoarfrost_hobnails',
        nameEn: 'Hoarfrost Hobnails',
        nameDe: 'Raureif-Nagelstiefel',
        icon: '❄️', slotType: 'boots', archetype: 'any',
        minLevel: 28,
        requirements: { level: 28, str: 106, agi: 0, int: 0 },
        defenses: { armour: 138, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'chance_to_freeze', value: 10, en: '#% chance to Freeze Monsters on hit', de: '#% Chance, Monster bei Treffern einzufrieren' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'fire_resist', value: -22, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Stomp twice. Apologize never.',
        flavorDe: 'Zweimal stampfen. Nie entschuldigen.',
    },

    {
        uniqueId: 'sprinters_shackles',
        nameEn: "Sprinter's Shackles",
        nameDe: 'Sprinter-Fesseln',
        icon: '⛓️', slotType: 'boots', archetype: 'agility',
        minLevel: 41,
        requirements: { level: 41, str: 0, agi: 156, int: 0 },
        defenses: { armour: 0, evasion: 260, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 2, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'flat_health', value: 41, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'first_step', value: -4.4, en: '-#s Monsters delay Charge-up after Spawning', de: '-#s Monster verzögern Angriffsladen nach Erscheinen' }
        ],
        flavorEn: 'Once you start, nothing stops you. Including caution.',
        flavorDe: 'Einmal gestartet, hält dich nichts auf. Auch keine Vorsicht.',
    },

    {
        uniqueId: 'cloudstep_soles',
        nameEn: 'Cloudstep Soles',
        nameDe: 'Wolken Schritt-Sohlen',
        icon: '☁️', slotType: 'boots', archetype: 'agility',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 228, int: 0 },
        defenses: { armour: 0, evasion: 355, absorption: 0 },
        bonuses: [
            { key: 'preemptive_dodge', value: 25, en: '#% chance to preemptively Dodge incoming Attacks', de: '#% Chance, Angriffen präventiv auszuweichen' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_evasion', value: 90, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'flat_health', value: -88, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Walk where the ground forgot to be.',
        flavorDe: 'Gehe dorthin, wo der Boden vergaß zu sein.',
    },

    // ── Weapon ────────────────────────────────────────────────────────
    {
        uniqueId: 'splintered_oak_club',
        nameEn: 'Splintered Oak Club',
        nameDe: 'Splittriger Eichenknüppel',
        icon: '🪵', slotType: 'weapon', archetype: 'strength', hands: 1,
        minLevel: 3,
        requirements: { level: 3, str: 12, agi: 0, int: 0 },
        damage: { min: 33, max: 74 }, attackIntervalSeconds: 6.0,
        bonuses: [
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'crit_chance', value: 6, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -18, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'The tree forgave nothing.',
        flavorDe: 'Der Baum hat nichts verziehen.',
    },

    {
        uniqueId: 'carving_knife_of_endless_portions',
        nameEn: 'Carving Knife of Endless Portions',
        nameDe: 'Tranchiermesser der Endlosen Portionen',
        icon: '🍴', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 14,
        requirements: { level: 14, str: 53, agi: 0, int: 0 },
        damage: { min: 72, max: 132 }, attackIntervalSeconds: 5.4,
        bonuses: [
            { key: 'cleave', value: 15, en: '#% chance to Cleave nearby Monsters', de: '#% Chance, nahe Monster zu spalten' },
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 18, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'life_on_kill', value: -8, en: '-# Life gained on Kill', de: '-# Leben bei jedem Kill' }
        ],
        flavorEn: 'Everyone eats. Not everyone enjoys being served.',
        flavorDe: 'Alle essen. Nicht jeder genießt, serviert zu werden.',
    },

    {
        uniqueId: 'oathbreaker_estoc',
        nameEn: 'Oathbreaker Estoc',
        nameDe: 'Eidbrecher-Estoc',
        icon: '🗡️', slotType: 'weapon', archetype: 'agility', hands: 1,
        minLevel: 33,
        requirements: { level: 33, str: 0, agi: 125, int: 0 },
        damage: { min: 179, max: 320 }, attackIntervalSeconds: 6.6,
        bonuses: [
            { key: 'crit_multiplier', value: 40, en: '+#% to Critical Strike Multiplier', de: '+#% Kritischer Trefferschaden' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -72, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'It kept only one promise: the sharp one.',
        flavorDe: 'Es hielt nur ein Versprechen: das scharfe.',
    },

    {
        uniqueId: 'hammer_of_reasonable_doubt',
        nameEn: 'Hammer of Reasonable Doubt',
        nameDe: 'Hammer des Vernünftigen Zweifels',
        icon: '🔨', slotType: 'weapon', archetype: 'strength', hands: 2,
        minLevel: 52,
        requirements: { level: 52, str: 198, agi: 0, int: 0 },
        damage: { min: 700, max: 1250 }, attackIntervalSeconds: 11.0,
        bonuses: [
            { key: 'stagger', value: 40, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' }
        ],
        flavorEn: 'It raises questions. Then it answers them.',
        flavorDe: 'Er stellt Fragen. Dann beantwortet er sie.',
    },

    {
        uniqueId: 'requiem_needle',
        nameEn: 'Requiem Needle',
        nameDe: 'Requiem-Nadel',
        icon: '📌', slotType: 'weapon', archetype: 'agility', hands: 1,
        minLevel: 71,
        requirements: { level: 71, str: 0, agi: 270, int: 0 },
        damage: { min: 637, max: 1105 }, attackIntervalSeconds: 5.8,
        bonuses: [
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'life_leech', value: 3, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 85, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_mana', value: -72, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'A song played one stab at a time.',
        flavorDe: 'Ein Lied, gespielt einen Stich nach dem anderen.',
    },

    // ── Ranged ────────────────────────────────────────────────────────
    {
        uniqueId: 'slingshot_of_grudges',
        nameEn: 'Slingshot of Grudges',
        nameDe: 'Steinschleuder des Grolls',
        icon: '🎯', slotType: 'ranged', archetype: 'any',
        minLevel: 10,
        requirements: { level: 10, str: 0, agi: 38, int: 0 },
        damage: { min: 27, max: 63 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'multishot', value: 12, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'crit_chance', value: 6, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -30, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Every stone remembers who threw it.',
        flavorDe: 'Jeder Stein erinnert sich, wer ihn warf.',
    },

    {
        uniqueId: 'fowling_piece',
        nameEn: 'Fowling Piece',
        nameDe: 'Vogelflinte',
        icon: '💥', slotType: 'ranged', archetype: 'agility',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 95, int: 0 },
        damage: { min: 92, max: 188 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'splash_damage', value: 30, en: '#% increased Splash Area', de: '#% vergrößerter Spritzbereich' },
            { key: 'accuracy', value: 28, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 6, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'pierce', value: -24, en: '-#% chance for Projectiles to Pierce Monsters', de: '-#% Chance, dass Projektile Monster durchbohren' }
        ],
        flavorEn: 'Everything nearby gets some. Nothing gets through.',
        flavorDe: 'Alles in der Nähe bekommt etwas ab. Nichts kommt durch.',
    },

    {
        uniqueId: 'harpoon_rifle',
        nameEn: 'Harpoon Rifle',
        nameDe: 'Harpunen-Gewehr',
        icon: '🔱', slotType: 'ranged', archetype: 'strength',
        minLevel: 45,
        requirements: { level: 45, str: 171, agi: 0, int: 0 },
        damage: { min: 275, max: 550 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'chain', value: 30, en: '#% chance for Projectiles to Chain to distant Monsters', de: '#% Chance, dass Projektile auf ferne Monster überspringen' },
            { key: 'pushback', value: 0.5, en: '+#s Charge Pushback on hit', de: '+#s Angriffslade-Rückstoß bei Treffern' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'multishot', value: -24, en: '-#% chance to fire an additional Projectile', de: '-#% Chance auf ein zusätzliches Projektil' }
        ],
        flavorEn: 'One line in, one monster dragged out of position.',
        flavorDe: 'Eine Leine hinein, ein Monster aus der Position gezogen.',
    },

    {
        uniqueId: 'starfall_ballista',
        nameEn: 'Starfall Ballista',
        nameDe: 'Sternenfall-Balliste',
        icon: '🌟', slotType: 'ranged', archetype: 'any',
        minLevel: 69,
        requirements: { level: 69, str: 131, agi: 131, int: 0 },
        damage: { min: 332, max: 665 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'snipe', value: 35, en: '#% chance for Projectiles to Snipe (double damage)', de: '#% Chance auf Sniping (doppelter Schaden)' },
            { key: 'overkill', value: 25, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'accuracy', value: -44, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Reload speed measured in constellations.',
        flavorDe: 'Nachladegeschwindigkeit in Sternbildern gemessen.',
    },

    // ── Cloak ─────────────────────────────────────────────────────────
    {
        uniqueId: 'blanket_with_a_hole',
        nameEn: 'Blanket With a Hole',
        nameDe: 'Decke Mit Einem Loch',
        icon: '🧣', slotType: 'cloak', archetype: 'any',
        minLevel: 4,
        requirements: { level: 4, str: 0, agi: 15, int: 0 },
        defenses: { armour: 0, evasion: 38, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 10, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_mana', value: -33, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Cozy though.',
        flavorDe: 'Gemütlich trotzdem.',
    },

    {
        uniqueId: 'couriers_halfcape',
        nameEn: "Courier's Half-Cape",
        nameDe: 'Halbumhang des Boten',
        icon: '📨', slotType: 'cloak', archetype: 'any',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 61, int: 0 },
        defenses: { armour: 0, evasion: 150, absorption: 0 },
        bonuses: [
            { key: 'faster_absorption_regen_start', value: 6, en: '#s faster start of Absorption Regeneration', de: '#s schnellerer Start der Absorptionsregeneration' },
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 6, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -33, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Neither wind nor deadlines stopped it. Both tried.',
        flavorDe: 'Weder Wind noch Deadlines hielten es auf. Beide versuchten es.',
    },

    {
        uniqueId: 'mothwing_duster',
        nameEn: 'Mothwing Duster',
        nameDe: 'Nachtfalterflügel-Mantel',
        icon: '🌙', slotType: 'cloak', archetype: 'agility',
        minLevel: 30,
        requirements: { level: 30, str: 0, agi: 114, int: 0 },
        defenses: { armour: 0, evasion: 330, absorption: 0 },
        bonuses: [
            { key: 'spell_dodge', value: 7, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'fire_resist', value: -22, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Drawn helplessly to every bright and terrible thing.',
        flavorDe: 'Hilflos angezogen von allem Hellen und Furchtbaren.',
    },

    {
        uniqueId: 'shroud_of_patient_moss',
        nameEn: 'Shroud of Patient Moss',
        nameDe: 'Leichentuch des Geduldigen Mooses',
        icon: '🍃', slotType: 'cloak', archetype: 'any',
        minLevel: 49,
        requirements: { level: 49, str: 93, agi: 93, int: 0 },
        defenses: { armour: 0, evasion: 480, absorption: 0 },
        bonuses: [
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'spell_dodge', value: 8, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'flat_evasion', value: 60, en: '+# to Evasion', de: '+# zu Ausweichen' }
        ],
        downsides: [
            { key: 'dodge', value: -18, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'It grows on you. Slowly. Inevitably.',
        flavorDe: 'Es wächst an dir. Langsam. Unaufhaltsam.',
    },

    {
        uniqueId: 'eclipseveil',
        nameEn: 'Eclipseveil',
        nameDe: 'Finsternisschleier',
        icon: '🌑', slotType: 'cloak', archetype: 'intellect',
        minLevel: 63,
        requirements: { level: 63, str: 0, agi: 120, int: 120 },
        defenses: { armour: 0, evasion: 540, absorption: 0 },
        bonuses: [
            { key: 'shadow_resist', value: 25, en: '+#% to Shadow Resistance', de: '+#% Schattenwiderstand' },
            { key: 'chance_to_blind', value: 12, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'flat_health', value: 68, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'fire_resist', value: -30, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Daylight filed a complaint. It was not read.',
        flavorDe: 'Das Tageslicht reichte eine Beschwerde ein. Sie wurde nicht gelesen.',
    },

    // ── Shoulders ─────────────────────────────────────────────────────
    {
        uniqueId: 'yoke_of_small_debts',
        nameEn: 'Yoke of Small Debts',
        nameDe: 'Joch der Kleinen Schulden',
        icon: '📜', slotType: 'shoulders', archetype: 'any',
        minLevel: 11,
        requirements: { level: 11, str: 42, agi: 0, int: 0 },
        defenses: { armour: 20, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 25, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 6, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'mana_regen', value: -4.4, en: '-# Mana regenerated per 5s', de: '-# Mana-Regeneration pro 5s' }
        ],
        flavorEn: 'Every creditor sends regards.',
        flavorDe: 'Jeder Gläubiger lässt grüßen.',
    },

    {
        uniqueId: 'barnacle_pauldrons',
        nameEn: 'Barnacle Pauldrons',
        nameDe: 'Entenmuschel-Schulterplatten',
        icon: '🐚', slotType: 'shoulders', archetype: 'any',
        minLevel: 23,
        requirements: { level: 23, str: 87, agi: 0, int: 0 },
        defenses: { armour: 210, evasion: 0, absorption: 130 },
        bonuses: [
            { key: 'absorption_regen_rate', value: 20, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -24, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'Still growing. Please do not scratch.',
        flavorDe: 'Wächst noch. Bitte nicht kratzen.',
    },

    {
        uniqueId: 'mantle_of_uphill_arguments',
        nameEn: 'Mantle of Uphill Arguments',
        nameDe: 'Mantel der Bergauf-Argumente',
        icon: '⛰️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 37,
        requirements: { level: 37, str: 141, agi: 0, int: 0 },
        defenses: { armour: 350, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'grounded_1', value: 25, en: '#% chance to be Grounded instead of Knocked Back', de: '#% Chance, statt zurückgestoßen zu Boden gestoßen zu werden' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'agility', value: -17, en: '-# to Agility', de: '-# zu Beweglichkeit' }
        ],
        flavorEn: 'Wins every debate by refusing to attend it.',
        flavorDe: 'Gewinnt jede Debatte, indem es ihr fernbleibt.',
    },

    {
        uniqueId: 'frostmane_pauldrons',
        nameEn: 'Frostmane Pauldrons',
        nameDe: 'Frostmähnen-Schulterplatten',
        icon: '🐎', slotType: 'shoulders', archetype: 'any',
        minLevel: 54,
        requirements: { level: 54, str: 102, agi: 102, int: 0 },
        defenses: { armour: 460, evasion: 230, absorption: 0 },
        bonuses: [
            { key: 'cold_damage_1', value: 12, en: 'Adds # Cold Damage to Attacks', de: 'Fügt Angriffen # Kälteschaden hinzu' },
            { key: 'cold_resist', value: 20, en: '+#% to Cold Resistance', de: '+#% Kältewiderstand' },
            { key: 'flat_health', value: 74, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'fire_resist', value: -30, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Breathes winter onto your enemies. And your campfires.',
        flavorDe: 'Atmet Winter auf deine Feinde. Und deine Lagerfeuer.',
    },

    {
        uniqueId: 'wings_of_icarus',
        nameEn: 'Wings of Icarus',
        nameDe: 'Flügel des Ikarus',
        icon: '🪽', slotType: 'shoulders', archetype: 'agility',
        minLevel: 66,
        requirements: { level: 66, str: 0, agi: 251, int: 0 },
        defenses: { armour: 0, evasion: 700, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_armour', value: 90, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Fly closer. See what happens.',
        flavorDe: 'Flieg näher heran. Und sieh, was passiert.',
    },

    // ── Pants ─────────────────────────────────────────────────────────
    {
        uniqueId: 'patched_overalls',
        nameEn: 'Patched Overalls',
        nameDe: 'Geflickte Latzhose',
        icon: '👖', slotType: 'pants', archetype: 'any',
        minLevel: 9,
        requirements: { level: 9, str: 34, agi: 0, int: 0 },
        defenses: { armour: 145, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 20, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 6, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'accuracy', value: -18, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Every patch a story. Every hole a sequel.',
        flavorDe: 'Jeder Flicken eine Geschichte. Jedes Loch eine Fortsetzung.',
    },

    {
        uniqueId: 'wader_leggings',
        nameEn: 'Wader Leggings',
        nameDe: 'Watstiefelhose',
        icon: '🦆', slotType: 'pants', archetype: 'any',
        minLevel: 22,
        requirements: { level: 22, str: 84, agi: 0, int: 0 },
        defenses: { armour: 245, evasion: 0, absorption: 95 },
        bonuses: [
            { key: 'flat_health', value: 29, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 60, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -24, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'Waterproof. Stormproof. Nothing-proof against pride.',
        flavorDe: 'Wasserdicht. Sturmfest. Nichts fest gegen Stolz.',
    },

    {
        uniqueId: 'duelists_parade_hose',
        nameEn: "Duelist's Parade Hose",
        nameDe: 'Paradehose des Duellanten',
        icon: '🎩', slotType: 'pants', archetype: 'agility',
        minLevel: 38,
        requirements: { level: 38, str: 0, agi: 144, int: 0 },
        defenses: { armour: 0, evasion: 410, absorption: 0 },
        bonuses: [
            { key: 'crit_chance', value: 6, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 100, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Style is armor. Just not the protective kind.',
        flavorDe: 'Stil ist Rüstung. Nur nicht die schützende Art.',
    },

    {
        uniqueId: 'bulwark_of_bones_greaves',
        nameEn: 'Bulwark of Bones Greaves',
        nameDe: 'Knochenbollwerk-Beinschienen',
        icon: '🦴', slotType: 'pants', archetype: 'strength',
        minLevel: 64,
        requirements: { level: 64, str: 243, agi: 0, int: 0 },
        defenses: { armour: 860, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'inc_armour', value: 40, en: '#% increased Armour', de: '#% erhöhte Rüstung' },
            { key: 'flat_health', value: 69, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'dodge', value: -17, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Somebody else’s skeleton finally useful.',
        flavorDe: 'Das Skelett eines anderen endlich nützlich.',
    },

    // ── Bracers ───────────────────────────────────────────────────────
    {
        uniqueId: 'lucky_coin_straps',
        nameEn: 'Lucky Coin Straps',
        nameDe: 'Glücksmünzen-Bänder',
        icon: '🪙', slotType: 'bracers', archetype: 'any',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 0, int: 46 },
        defenses: { armour: 12, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'fate', value: 12, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'strength', value: 6, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -33, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Heads you win. Tails it hurts.',
        flavorDe: 'Kopf, du gewinnst. Zahl, es tut weh.',
    },

    {
        uniqueId: 'bracers_of_the_understudy',
        nameEn: 'Bracers of the Understudy',
        nameDe: 'Armschienen der Zweitbesetzung',
        icon: '🎭', slotType: 'bracers', archetype: 'any',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 95 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'chance_for_new_question', value: 15, en: '#% chance to receive a new Question after failing', de: '#% Chance auf eine neue Frage nach einer falschen Antwort' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -17, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        flavorEn: 'Always ready with another line. Rarely the right one.',
        flavorDe: 'Immer bereit mit einer anderen Zeile. Selten der richtigen.',
    },

    {
        uniqueId: 'archers_counterweights',
        nameEn: "Archer's Counterweights",
        nameDe: 'Gegengewichte der Bogenschützin',
        icon: '🏹', slotType: 'bracers', archetype: 'agility',
        minLevel: 34,
        requirements: { level: 34, str: 0, agi: 129, int: 0 },
        defenses: { armour: 0, evasion: 95, absorption: 0 },
        bonuses: [
            { key: 'multishot', value: 15, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'More arrows. Fewer answers.',
        flavorDe: 'Mehr Pfeile. Weniger Antworten.',
    },

    {
        uniqueId: 'bloodstone_bindings',
        nameEn: 'Bloodstone Bindings',
        nameDe: 'Blutstein-Bindungen',
        icon: '🩸', slotType: 'bracers', archetype: 'strength',
        minLevel: 50,
        requirements: { level: 50, str: 190, agi: 0, int: 0 },
        defenses: { armour: 185, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_leech', value: 4, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'inc_physical_damage', value: 25, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_mana', value: -60, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Warm to the touch. Always.',
        flavorDe: 'Immer warm bei Berührung.',
    },

    {
        uniqueId: 'vambrace_of_inverted_hexes',
        nameEn: 'Vambrace of Inverted Hexes',
        nameDe: 'Armschiene der Umgekehrten Flüche',
        icon: '🔃', slotType: 'bracers', archetype: 'intellect',
        minLevel: 65,
        requirements: { level: 65, str: 0, agi: 0, int: 247 },
        defenses: { armour: 0, evasion: 0, absorption: 167 },
        bonuses: [
            { key: 'spell_block_chance', value: 12, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'arcane_resistance', value: 30, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 70, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -30, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Curses arrive. They leave confused.',
        flavorDe: 'Flüche kommen an. Sie gehen verwirrt wieder.',
    },

    // ── Arcane ────────────────────────────────────────────────────────
    {
        uniqueId: 'chipped_crystal_shard',
        nameEn: 'Chipped Crystal Shard',
        nameDe: 'Angebissener Kristallsplitter',
        icon: '💎', slotType: 'arcane', archetype: 'intellect',
        minLevel: 7,
        requirements: { level: 7, str: 0, agi: 0, int: 27 },
        defenses: { armour: 0, evasion: 0, absorption: 15 },
        bonuses: [
            { key: 'spell_damage', value: 8, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'flat_mana', value: -33, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Someone bit it to test authenticity. It bit back.',
        flavorDe: 'Jemand biss hinein, um die Echtheit zu prüfen. Es biss zurück.',
    },

    {
        uniqueId: 'lantern_of_second_sight',
        nameEn: 'Lantern of Second Sight',
        nameDe: 'Laterne des Zweiten Blicks',
        icon: '🏮', slotType: 'arcane', archetype: 'intellect',
        minLevel: 20,
        requirements: { level: 20, str: 0, agi: 0, int: 76 },
        defenses: { armour: 0, evasion: 0, absorption: 95 },
        bonuses: [
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'time_added', value: -26, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'Shows what could be. Charges by the second.',
        flavorDe: 'Zeigt, was sein könnte. Berechnet pro Sekunde.',
    },

    {
        uniqueId: 'stormcaller_orb',
        nameEn: 'Stormcaller Orb',
        nameDe: 'Sturmrufer-Kugel',
        icon: '🌩️', slotType: 'arcane', archetype: 'intellect',
        minLevel: 36,
        requirements: { level: 36, str: 0, agi: 0, int: 137 },
        defenses: { armour: 0, evasion: 0, absorption: 180 },
        bonuses: [
            { key: 'lightning_damage_1', value: 14, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'lightning_damage_2', value: 20, en: 'Adds # Lightning Damage to Attacks', de: 'Fügt Angriffen # Blitzschaden hinzu' },
            { key: 'chance_to_shock', value: 10, en: '#% chance to Shock Monsters on hit', de: '#% Chance, Monster bei Treffern zu schocken' },
            { key: 'ailment_effect', value: 18, en: '#% increased Effect of Player-Applied Ailments', de: '#% stärkere, durch den Spieler verursachte Leiden' }
        ],
        downsides: [
            { key: 'cold_resist', value: -22, en: '-#% to Cold Resistance', de: '-#% Kältewiderstand' }
        ],
        flavorEn: 'Whisper to it and the sky answers rudely.',
        flavorDe: 'Flüstre ihm zu, und der Himmel antwortet unhöflich.',
    },

    {
        uniqueId: 'codex_of_recursive_thoughts',
        nameEn: 'Codex of Recursive Thoughts',
        nameDe: 'Codex der Rekursiven Gedanken',
        icon: '♾️', slotType: 'arcane', archetype: 'intellect',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 0, int: 228 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'inc_spell_damage', value: 35, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'echo_1', value: 12, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Page one explains page one. Forever.',
        flavorDe: 'Seite eins erklärt Seite eins. Für immer.',
    },

    // ── Earring ───────────────────────────────────────────────────────
    {
        uniqueId: 'shell_of_the_reluctant_hero',
        nameEn: 'Shell of the Reluctant Hero',
        nameDe: 'Muschel der Widerwilligen Heldin',
        icon: '🐚', slotType: 'earring', archetype: 'any',
        minLevel: 6,
        requirements: { level: 6, str: 0, agi: 0, int: 23 },
        defenses: { armour: 0, evasion: 0, absorption: 55 },
        bonuses: [
            { key: 'absorption_regen_rate', value: 15, en: '#% faster Absorption Regeneration Rate', de: '#% schnellere Absorptionsregeneration' },
            { key: 'flat_mana', value: 12, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'flat_health', value: -28, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Retreat inside until the story blows over.',
        flavorDe: 'Sich zurückziehen, bis die Geschichte sich legt.',
    },

    {
        uniqueId: 'bell_of_minor_calamities',
        nameEn: 'Bell of Minor Calamities',
        nameDe: 'Glocke der Kleinen Katastrophen',
        icon: '🔔', slotType: 'earring', archetype: 'any',
        minLevel: 18,
        requirements: { level: 18, str: 0, agi: 0, int: 68 },
        bonuses: [
            { key: 'chance_to_blind', value: 10, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'fate', value: -17, en: '-#% increased Fate', de: '-#% erhöhtes Schicksal' }
        ],
        flavorEn: 'Rings once. Somewhere, a vase falls.',
        flavorDe: 'Läutet einmal. Irgendwo fällt eine Vase.',
    },

    {
        uniqueId: 'quill_of_signed_confessions',
        nameEn: 'Quill of Signed Confessions',
        nameDe: 'Feder der Unterzeichneten Geständnisse',
        icon: '🖊️', slotType: 'earring', archetype: 'intellect',
        minLevel: 32,
        requirements: { level: 32, str: 0, agi: 0, int: 122 },
        bonuses: [
            { key: 'mana_on_kill', value: 8, en: '+# Mana gained on Kill', de: '+# Mana bei jedem Kill' },
            { key: 'flat_health', value: 42, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'intelligence', value: -20, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'Everyone signs eventually. Few read first.',
        flavorDe: 'Alle unterschreiben irgendwann. Wenige lesen zuerst.',
    },

    {
        uniqueId: 'tick_of_the_devouring_clock',
        nameEn: 'Tick of the Devouring Clock',
        nameDe: 'Ticken der Verschlingenden Uhr',
        icon: '🕰️', slotType: 'earring', archetype: 'any',
        minLevel: 47,
        requirements: { level: 47, str: 0, agi: 0, int: 179 },
        bonuses: [
            { key: 'time_added', value: 30, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        downsides: [
            { key: 'life_regen', value: -7, en: '-# Life Regeneration per second', de: '-# Lebensregeneration pro Sekunde' }
        ],
        flavorEn: 'It lends minutes. It collects moments.',
        flavorDe: 'Es leiht Minuten. Es kassiert Momente.',
    },

    {
        uniqueId: 'stud_of_eclipsed_oaths',
        nameEn: 'Stud of Eclipsed Oaths',
        nameDe: 'Ohrring der Verfinsterten Eide',
        icon: '🌘', slotType: 'earring', archetype: 'any',
        minLevel: 61,
        requirements: { level: 61, str: 0, agi: 0, int: 232 },
        bonuses: [
            { key: 'chance_to_convert', value: 15, en: '#% chance to Convert Monsters on kill', de: '#% Chance, Monster bei Kills zu konvertieren' },
            { key: 'chance_to_blind', value: 8, en: '#% chance to Blind Monsters on hit', de: '#% Chance, Monster bei Treffern zu blenden' },
            { key: 'flat_health', value: 66, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'shadow_resist', value: -30, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Sworn under a darkened sun. Binding either way.',
        flavorDe: 'Geschworen unter einer finsteren Sonne. Bindend in beide Richtungen.',
    },

    // ── Shield ────────────────────────────────────────────────────────
    {
        uniqueId: 'pot_lid_shield',
        nameEn: 'Pot Lid Shield',
        nameDe: 'Kochtopfdeckel-Schild',
        icon: '🍲', slotType: 'shield', archetype: 'any',
        minLevel: 8,
        requirements: { level: 8, str: 30, agi: 0, int: 0 },
        defenses: { armour: 75, evasion: 0, absorption: 0 },
        blockChance: 14,
        bonuses: [
            { key: 'flat_health', value: 21, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 6, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -15, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Dinner is served.',
        flavorDe: 'Das Abendessen wird serviert.',
    },

    {
        uniqueId: 'door_of_last_resort',
        nameEn: 'Door of Last Resort',
        nameDe: 'Tür der Letzten Zuflucht',
        icon: '🚪', slotType: 'shield', archetype: 'strength',
        minLevel: 26,
        requirements: { level: 26, str: 99, agi: 0, int: 0 },
        defenses: { armour: 310, evasion: 0, absorption: 0 },
        blockChance: 22,
        bonuses: [
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 6, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 6, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2.6, en: 'Melee Strikes occur 2s slower', de: 'Nahkampfschläge erfolgen 2s langsamer' }
        ],
        flavorEn: 'Knock knock. No.',
        flavorDe: 'Klopf klopf. Nein.',
    },

    {
        uniqueId: 'tidepool_buckler',
        nameEn: 'Tidepool Buckler',
        nameDe: 'Gezeitenbecken-Faustschild',
        icon: '🪸', slotType: 'shield', archetype: 'any',
        minLevel: 42,
        requirements: { level: 42, str: 80, agi: 0, int: 80 },
        defenses: { armour: 240, evasion: 0, absorption: 230 },
        blockChance: 32,
        bonuses: [
            { key: 'block_recovery', value: 40, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'flat_health', value: 42, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 8, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -22, en: '-#% to Lightning Resistance', de: '-#% Blitzwiderstand' }
        ],
        flavorEn: 'Full of small lives that resent being disturbed.',
        flavorDe: 'Voll kleiner Lebewesen, die es übelnehmen, gestört zu werden.',
    },

    {
        uniqueId: 'rampart_of_ruined_vows',
        nameEn: 'Rampart of Ruined Vows',
        nameDe: 'Bollwerk der Zerrütteten Gelübde',
        icon: '🏰', slotType: 'shield', archetype: 'strength',
        minLevel: 62,
        requirements: { level: 62, str: 235, agi: 0, int: 0 },
        defenses: { armour: 600, evasion: 0, absorption: 200 },
        blockChance: 30,
        bonuses: [
            { key: 'inc_armour', value: 50, en: '#% increased Armour', de: '#% erhöhte Rüstung' },
            { key: 'flat_health', value: 67, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 10, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' }
        ],
        downsides: [
            { key: 'dodge', value: -17, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Promises broke against it. It did not.',
        flavorDe: 'Versprechen zerbrachen daran. Es selbst nicht.',
    },

    // ── Talisman ──────────────────────────────────────────────────────
    {
        uniqueId: 'knotted_string_of_reminders',
        nameEn: 'Knotted String of Reminders',
        nameDe: 'Verschnürte Schnur der Erinnerungen',
        icon: '🪢', slotType: 'talisman', archetype: 'any',
        minLevel: 15,
        requirements: { level: 15, str: 0, agi: 0, int: 57 },
        bonuses: [
            { key: 'focus', value: 15, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 18, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'fate', value: 12, en: '#% increased Fate', de: '#% erhöhtes Schicksal' }
        ],
        downsides: [
            { key: 'flat_mana', value: -44, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Each knot: something important. Which knot meant what is lost.',
        flavorDe: 'Jeder Knoten: etwas Wichtiges. Welcher was bedeutete, ist verloren.',
    },

    {
        uniqueId: 'hourglass_charm_of_delayed_regret',
        nameEn: 'Hourglass Charm of Delayed Regret',
        nameDe: 'Sanduhr-Anhänger des Aufgeschobenen Bedauerns',
        icon: '⌛', slotType: 'talisman', archetype: 'any',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 0, int: 209 },
        bonuses: [
            { key: 'time_added', value: 45, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'focus', value: 20, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 75, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -26, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Plenty of time to think about what you did.',
        flavorDe: 'Ausreichend Zeit, um darüber nachzudenken, was du getan hast.',
    },

    // ── Batch 2 (Wave of the Hundred): Head / Earring / Amulet / Shoulders ──
    {
        uniqueId: 'diadem_of_wrong_answers_only',
        nameEn: 'Diadem of Wrong Answers Only',
        nameDe: 'Diadem der Nur-Falschen-Antworten',
        icon: '🎓', slotType: 'head', archetype: 'intellect',
        minLevel: 42,
        requirements: { level: 42, str: 0, agi: 0, int: 160 },
        defenses: { armour: 0, evasion: 0, absorption: 190 },
        bonuses: [
            { key: 'reveal_hint', value: 25, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'inc_spell_damage', value: 30, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'intelligence', value: 15, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'It whispers the answer. Just never the right one.',
        flavorDe: 'Es flüstert dir die Antwort zu. Nur nie die richtige.',
    },
    {
        uniqueId: 'mortarboard_of_momentum',
        nameEn: 'Mortarboard of Momentum',
        nameDe: 'Doktorhut des Schwungs',
        icon: '🎩', slotType: 'head', archetype: 'agility',
        minLevel: 28,
        requirements: { level: 28, str: 0, agi: 105, int: 0 },
        defenses: { armour: 0, evasion: 120, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 15, en: '#% increased Attack Speed', de: '#% erhöhte Angriffsgeschwindigkeit' },
            { key: 'crit_chance', value: 10, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'agility', value: 10, en: '+# to Agility', de: '+# zu Geschick' }
        ],
        downsides: [
            { key: 'flat_health', value: -70, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Thrown at graduation. It never landed.',
        flavorDe: 'Bei der Abschlussfeier geworfen. Ist nie gelandet.',
    },
    {
        uniqueId: 'helm_of_held_breath',
        nameEn: 'Helm of Held Breath',
        nameDe: 'Helm des Angehaltenen Atems',
        icon: '⛑️', slotType: 'head', archetype: 'strength',
        minLevel: 33,
        requirements: { level: 33, str: 125, agi: 0, int: 0 },
        defenses: { armour: 210, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'warding', value: 60, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_health', value: 70, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'intelligence', value: 15, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'focus', value: -17, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Airtight. So are your decisions inside it.',
        flavorDe: 'Luftdicht. Deine Entscheidungen darin auch.',
    },
    {
        uniqueId: 'circlet_of_perfect_recall',
        nameEn: 'Circlet of Perfect Recall',
        nameDe: 'Reif der Perfekten Erinnerung',
        icon: '💠', slotType: 'head', archetype: 'intellect',
        minLevel: 48,
        requirements: { level: 48, str: 0, agi: 0, int: 182 },
        defenses: { armour: 0, evasion: 0, absorption: 220 },
        bonuses: [
            { key: 'focus', value: 25, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'fire_resist', value: 20, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' }
        ],
        downsides: [
            { key: 'chance_for_new_question', value: -26, en: '-#% chance to get a new Question', de: '-#% Chance auf eine neue Frage' }
        ],
        flavorEn: 'You remember every question you have ever failed. All of them.',
        flavorDe: 'Du erinnerst dich an jede Frage, die du je vermasselt hast. An jede einzelne.',
    },
    {
        uniqueId: 'browband_of_the_berserker',
        nameEn: 'Browband of the Berserker',
        nameDe: 'Stirnband des Berserkers',
        icon: '🪖', slotType: 'head', archetype: 'strength',
        minLevel: 38,
        requirements: { level: 38, str: 145, agi: 0, int: 0 },
        defenses: { armour: 180, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'inc_physical_damage', value: 45, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -48, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Thinking is for after the fight. Preferably someone else\u2019s.',
        flavorDe: 'Nachdenken ist was für nach dem Kampf. Lieber dem von jemand anderem.',
    },
    {
        uniqueId: 'thinking_cap_of_overthinking',
        nameEn: 'Thinking Cap of Overthinking',
        nameDe: 'Denkhaube des Grübelns',
        icon: '🧢', slotType: 'head', archetype: 'any',
        minLevel: 52,
        requirements: { level: 52, str: 0, agi: 0, int: 198 },
        defenses: { armour: 0, evasion: 0, absorption: 235 },
        bonuses: [
            { key: 'flat_mana', value: 90, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'mistake_count', value: 1, en: '+# Allowed Mistakes', de: '+# erlaubte Fehler' },
            { key: 'mana_regen', value: 3, en: '+# Mana every 5 Seconds', de: '+# Mana alle 5 Sekunden' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'focus', value: -28, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'One mistake is fine when you spend the next minute apologizing to it.',
        flavorDe: 'Ein Fehler geht schon, wenn du die nächste Minute damit verbringst, dich bei ihm zu entschuldigen.',
    },

    // ── Earring ───────────────────────────────────────────────────────
    {
        uniqueId: 'stud_of_sudden_insight',
        nameEn: 'Stud of Sudden Insight',
        nameDe: 'Ohrstecker der Plötzlichen Eingebung',
        icon: '💎', slotType: 'earring', archetype: 'intellect',
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 0, int: 85 },
        bonuses: [
            { key: 'spell_damage', value: 15, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'mana_regen', value: 2, en: '+# Mana every 5 Seconds', de: '+# Mana alle 5 Sekunden' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The good ideas come at night. The headaches too.',
        flavorDe: 'Die guten Ideen kommen nachts. Die Kopfschmerzen auch.',
    },
    {
        uniqueId: 'drop_earring_of_dropped_frames',
        nameEn: 'Drop Earring of Dropped Frames',
        nameDe: 'Hängender Ohrring der Ausgelassenen Bilder',
        icon: '🎞️', slotType: 'earring', archetype: 'agility',
        minLevel: 44,
        requirements: { level: 44, str: 0, agi: 165, int: 0 },
        bonuses: [
            { key: 'attack_speed', value: 20, en: '#% increased Attack Speed', de: '#% erhöhte Angriffsgeschwindigkeit' },
            { key: 'dodge', value: 6, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -44, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'You swing so fast reality skips a few frames.',
        flavorDe: 'Du schlägst so schnell, dass die Realität ein paar Bilder auslässt.',
    },
    {
        uniqueId: 'earplug_of_deafening_silence',
        nameEn: 'Earplug of Deafening Silence',
        nameDe: 'Ohropax des Betäubenden Schweigens',
        icon: '🔇', slotType: 'earring', archetype: 'any',
        minLevel: 18,
        requirements: { level: 18, str: 40, agi: 40, int: 0 },
        bonuses: [
            { key: 'chance_to_blind', value: 15, en: '#% chance to Blind on hit', de: '#% Chance, bei Treffern zu blenden' },
            { key: 'focus', value: 15, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'reveal_hint', value: -17, en: '-#% chance to show a Reveal Hint on questions', de: '-#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        flavorEn: 'You hear nothing. Neither does anyone else, ever again.',
        flavorDe: 'Du hörst nichts. Alle anderen ab jetzt auch nicht mehr.',
    },
    {
        uniqueId: 'hoop_of_the_golden_ratio',
        nameEn: 'Hoop of the Golden Ratio',
        nameDe: 'Kreole des Goldenen Schnitts',
        icon: '🥇', slotType: 'earring', archetype: 'any',
        minLevel: 57,
        requirements: { level: 57, str: 90, agi: 90, int: 90 },
        bonuses: [
            { key: 'fate', value: 20, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'crit_multiplier', value: 30, en: '+#% Critical Strike Multiplier', de: '+#% Kritischer Schadensmultiplikator' },
            { key: 'flat_health', value: 77, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' }
        ],
        downsides: [
            { key: 'flat_mana', value: -56, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Perfectly proportioned luck. Which is still luck.',
        flavorDe: 'Perfekt proportioniertes Glück. Was immer noch Glück ist.',
    },
    {
        uniqueId: 'dangling_charm_of_second_guessing',
        nameEn: 'Dangling Charm of Second-Guessing',
        nameDe: 'Baucharm des Zweiten Ratens',
        icon: '🪤', slotType: 'earring', archetype: 'any',
        minLevel: 36,
        requirements: { level: 36, str: 60, agi: 60, int: 60 },
        bonuses: [
            { key: 'mistake_not_count', value: 20, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht zählen' },
            { key: 'flat_health', value: 46, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Are you sure? Are you really sure? Are you—',
        flavorDe: 'Bist du sicher? Ganz sicher? Bist du—',
    },
    {
        uniqueId: 'icepick_stud',
        nameEn: 'Icepick Stud',
        nameDe: 'Eisbohrer-Stecker',
        icon: '🧊', slotType: 'earring', archetype: 'intellect',
        minLevel: 29,
        requirements: { level: 29, str: 0, agi: 55, int: 55 },
        bonuses: [
            { key: 'cold_damage_1', value: 8, en: '+# Minimum Cold Damage', de: '+# Minimaler Kälteschaden' },
            { key: 'cold_damage_2', value: 16, en: '+# Maximum Cold Damage', de: '+# Maximaler Kälteschaden' },
            { key: 'chance_to_freeze', value: 8, en: '#% chance to Freeze', de: '#% Chance auf Einfrieren' }
        ],
        downsides: [
            { key: 'fire_resist', value: -30, en: '-#% Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Worn behind the ear, where the cold ideas enter.',
        flavorDe: 'Getragen hinter dem Ohr, wo die kalten Ideen eindringen.',
    },

    // ── Amulet ────────────────────────────────────────────────────────
    {
        uniqueId: 'pendant_of_pascals_wager',
        nameEn: "Pendant of Pascal's Wager",
        nameDe: 'Anhänger von Pascals Wette',
        icon: '🎲', slotType: 'amulet', archetype: 'any',
        minLevel: 62,
        requirements: { level: 62, str: 80, agi: 80, int: 80 },
        bonuses: [
            { key: 'fate', value: 30, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'warding', value: 80, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'heart_heal', value: 15, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'flat_health', value: -88, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Believe in the drop. You lose nothing either way.',
        flavorDe: 'Glaube an den Drop. Du verlierst so oder so nichts.',
    },
    {
        uniqueId: 'gorget_of_the_gargoyle',
        nameEn: 'Gorget of the Gargoyle',
        nameDe: 'Kragen des Wasserspeiers',
        icon: '🗿', slotType: 'amulet', archetype: 'strength',
        minLevel: 40,
        requirements: { level: 40, str: 152, agi: 0, int: 0 },
        bonuses: [
            { key: 'block_chance', value: 8, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        defenses: { armour: 260, evasion: 0, absorption: 0 },
        downsides: [
            { key: 'attack_speed', value: -13, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'It has not moved in four hundred years. It is not about to start.',
        flavorDe: 'Es hat sich seit vierhundert Jahren nicht bewegt. Es hat auch nicht vor, damit anzufangen.',
    },
    {
        uniqueId: 'amulet_of_endless_questions',
        nameEn: 'Amulet of Endless Questions',
        nameDe: 'Amulett der Endlosen Fragen',
        icon: '❓', slotType: 'amulet', archetype: 'intellect',
        minLevel: 34,
        requirements: { level: 34, str: 0, agi: 0, int: 130 },
        bonuses: [
            { key: 'chance_for_new_question', value: 30, en: '#% chance to get a new Question', de: '#% Chance auf eine neue Frage' },
            { key: 'mana_on_kill', value: 5, en: '+# Mana gained on Kill', de: '+# Mana bei Kill' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -28, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' }
        ],
        flavorEn: 'But why? But why? But why?',
        flavorDe: 'Aber warum? Aber warum? Aber warum?',
    },
    {
        uniqueId: 'heartlockets_of_the_departed',
        nameEn: 'Heartlocket of the Departed',
        nameDe: 'Herzensmedaillon der Verblichenen',
        icon: '🫀', slotType: 'amulet', archetype: 'any',
        minLevel: 26,
        requirements: { level: 26, str: 50, agi: 50, int: 0 },
        bonuses: [
            { key: 'life_on_kill', value: 4, en: '+# Life gained on Kill', de: '+# Leben bei Kill' },
            { key: 'life_regen', value: 2, en: '+# Life per Second', de: '+# Leben pro Sekunde' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'intelligence', value: -26, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'It holds a portrait of no one you remember.',
        flavorDe: 'Es enthält ein Porträt von niemandem, an den du dich erinnerst.',
    },
    {
        uniqueId: 'prism_pendant',
        nameEn: 'Prism Pendant',
        nameDe: 'Prismen-Anhänger',
        icon: '🔷', slotType: 'amulet', archetype: 'intellect',
        minLevel: 58,
        requirements: { level: 58, str: 0, agi: 0, int: 220 },
        bonuses: [
            { key: 'chance_to_convert', value: 20, en: '#% chance to Convert', de: '#% Chance zur Bekehrung' },
            { key: 'inc_spell_damage', value: 25, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_health', value: 78, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'spell_block_chance', value: -17, en: '-#% Spell Block Chance', de: '-#% Zauberblockchance' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Every problem goes in white and comes out seven different colors of worse.',
        flavorDe: 'Jedes Problem geht weiß hinein und kommt in sieben schlechteren Farben heraus.',
    },
    {
        uniqueId: 'noose_of_nerves',
        nameEn: 'Noose of Nerves',
        nameDe: 'Schlinge der Nerven',
        icon: '🪢', slotType: 'amulet', archetype: 'any',
        minLevel: 66,
        requirements: { level: 66, str: 100, agi: 100, int: 50 },
        bonuses: [
            { key: 'crit_chance', value: 25, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 40, en: '+#% Critical Strike Multiplier', de: '+#% Kritischer Schadensmultiplikator' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'heart_heal', value: 15, en: '+# to Heart Heal Amount', de: '+# Herzheilung' }
        ],
        downsides: [
            { key: 'flat_health', value: -138, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Wear it loose. Breathe. Swing anyway.',
        flavorDe: 'Lass es locker sitzen. Atme. Schlage trotzdem zu.',
    },

    // ── Shoulders ─────────────────────────────────────────────────────
    {
        uniqueId: 'epaulettes_of_the_fallen_general',
        nameEn: 'Epaulettes of the Fallen General',
        nameDe: 'Epauletten des Gefallenen Generals',
        icon: '🎖️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 45,
        requirements: { level: 45, str: 170, agi: 0, int: 0 },
        defenses: { armour: 230, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'cleave', value: 30, en: '#% chance to Cleave (hit nearby Monsters)', de: '#% Chance auf Keilschlag (nahe Monster treffen)' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 45, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'dodge', value: -18, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'He ordered charges from the front. Once.',
        flavorDe: 'Er befahl Angriffe von vorn. Einmal.',
    },
    {
        uniqueId: 'yoke_of_titan_taxes',
        nameEn: 'Yoke of Titan Taxes',
        nameDe: 'Joch der Titanensteuern',
        icon: '⛓️', slotType: 'shoulders', archetype: 'strength',
        minLevel: 54,
        requirements: { level: 54, str: 205, agi: 0, int: 0 },
        defenses: { armour: 320, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_health', value: 60, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_armour', value: 90, en: '+# to Armour', de: '+# zu Rüstung' },
            { key: 'warding', value: 150, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'attack_speed', value: -19.5, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'Carrying the weight of the world, plus interest.',
        flavorDe: 'Trägst das Gewicht der Welt. Zuzüglich Zinsen.',
    },
    {
        uniqueId: 'shoulder_pads_of_the_pinball_wizard',
        nameEn: 'Shoulder Pads of the Pinball Wizard',
        nameDe: 'Schulterpolster des Flippermeisters',
        icon: '🎱', slotType: 'shoulders', archetype: 'any',
        minLevel: 31,
        requirements: { level: 31, str: 70, agi: 70, int: 0 },
        defenses: { armour: 160, evasion: 60, absorption: 0 },
        bonuses: [
            { key: 'pushback', value: 0.6, en: '+#s Pushback on hit', de: '+#s Rückstoß bei Treffern' },
            { key: 'splash_damage', value: 25, en: '#% added Splash Damage', de: '#% zusätzlicher Flächenschaden' },
            { key: 'flat_health', value: 41, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Everything bounces. Especially your aim.',
        flavorDe: 'Alles prallt ab. Vor allem deine Zielgenauigkeit.',
    },
    {
        uniqueId: 'mantle_of_molting_feathers',
        nameEn: 'Mantle of Molting Feathers',
        nameDe: 'Mantel der Mausernden Federn',
        icon: '🪶', slotType: 'shoulders', archetype: 'agility',
        minLevel: 23,
        requirements: { level: 23, str: 0, agi: 88, int: 0 },
        defenses: { armour: 0, evasion: 140, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 7, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_armour', value: 35, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Sheds one feather per dodge. It is going bald quickly.',
        flavorDe: 'Verliert eine Feder pro Ausweichmanöver. Es wird schnell kahl.',
    },
    {
        uniqueId: 'burden_of_unasked_questions',
        nameEn: 'Burden of Unasked Questions',
        nameDe: 'Bürde der Ungestellten Fragen',
        icon: '🏋️', slotType: 'shoulders', archetype: 'intellect',
        minLevel: 60,
        requirements: { level: 60, str: 0, agi: 0, int: 228 },
        defenses: { armour: 0, evasion: 0, absorption: 250 },
        bonuses: [
            { key: 'flat_mana', value: 100, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 30, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_health', value: 65, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'mistake_count', value: -1, en: '-# Allowed Mistakes', de: '-# erlaubte Fehler' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Knowledge is heavy. Curiosity is heavier.',
        flavorDe: 'Wissen ist schwer. Neugier ist schwerer.',
    },
    {
        uniqueId: 'pauldrons_of_preemptive_regret',
        nameEn: 'Pauldrons of Preemptive Regret',
        nameDe: 'Schulterplatten des Vorgreifenden Bedauerns',
        icon: '🛡️', slotType: 'shoulders', archetype: 'any',
        minLevel: 49,
        requirements: { level: 49, str: 110, agi: 80, int: 0 },
        defenses: { armour: 180, evasion: 0, absorption: 240 },
        bonuses: [
            { key: 'preemptive_dodge', value: 20, en: '#% Preemptive Dodge', de: '#% Präventives Ausweichen' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_armour', value: 60, en: '+# to Armour', de: '+# zu Rüstung' }
        ],
        downsides: [
            { key: 'focus', value: -26, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'It dodges the hit and apologizes for the inconvenience.',
        flavorDe: 'Weicht dem Treffer aus und entschuldigt sich für die Umstände.',
    },

    // ── Cloak ─────────────────────────────────────────────────────────
    {
        uniqueId: 'cape_of_castling',
        nameEn: 'Cape of Castling',
        nameDe: 'Umhang der Rochade',
        icon: '♟️', slotType: 'cloak', archetype: 'any',
        minLevel: 37,
        requirements: { level: 37, str: 90, agi: 50, int: 0 },
        defenses: { armour: 60, evasion: 150, absorption: 0 },
        bonuses: [
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 10, en: '+#% Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The king moves two squares. So do you, when it matters.',
        flavorDe: 'Der König zieht zwei Felder. Du auch, wenn es darauf ankommt.',
    },
    {
        uniqueId: 'shroud_of_the_sleepwalker',
        nameEn: 'Shroud of the Sleepwalker',
        nameDe: 'Leichentuch des Schlafwandlers',
        icon: '😴', slotType: 'cloak', archetype: 'agility',
        minLevel: 41,
        requirements: { level: 41, str: 0, agi: 155, int: 0 },
        defenses: { armour: 0, evasion: 200, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 12, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 8, en: '+#% chance to Dodge Spells', de: '+#% Zaucherausweichchance' },
            { key: 'flat_health', value: 41, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -44, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'You fight with your eyes closed. Somehow that works.',
        flavorDe: 'Du kämpfst mit geschlossenen Augen. Irgendwie funktioniert es.',
    },
    {
        uniqueId: 'wingsuit_weave',
        nameEn: 'Wingsuit Weave',
        nameDe: 'Fluganzug-Gewebe',
        icon: '🦅', slotType: 'cloak', archetype: 'any',
        minLevel: 27,
        requirements: { level: 27, str: 0, agi: 102, int: 0 },
        defenses: { armour: 0, evasion: 130, absorption: 0 },
        bonuses: [
            { key: 'first_step', value: 1.5, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'dodge', value: 5, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 6, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -72, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Certified for gliding. Landing is your problem.',
        flavorDe: 'Zertifiziert für Gleitflüge. Die Landung ist dein Problem.',
    },
    {
        uniqueId: 'cloak_of_cold_calculus',
        nameEn: 'Cloak of Cold Calculus',
        nameDe: 'Umhang der Kalten Kalkulation',
        icon: '🧊', slotType: 'cloak', archetype: 'intellect',
        minLevel: 47,
        requirements: { level: 47, str: 0, agi: 0, int: 178 },
        defenses: { armour: 0, evasion: 100, absorption: 120 },
        bonuses: [
            { key: 'cold_resist', value: 30, en: '+#% Cold Resistance', de: '+#% Kälteresistenz' },
            { key: 'focus', value: 20, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 47, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'life_regen', value: -2.2, en: '-# Life per Second', de: '-# Leben pro Sekunde' }
        ],
        flavorEn: 'Feelings introduce rounding errors.',
        flavorDe: 'Gefühle verursachen Rundungsfehler.',
    },
    {
        uniqueId: 'vanishing_veil',
        nameEn: 'Vanishing Veil',
        nameDe: 'Schwindender Schleier',
        icon: '🌫️', slotType: 'cloak', archetype: 'agility',
        minLevel: 63,
        requirements: { level: 63, str: 0, agi: 240, int: 0 },
        defenses: { armour: 0, evasion: 260, absorption: 0 },
        bonuses: [
            { key: 'chance_to_blind', value: 20, en: '#% chance to Blind on hit', de: '#% Chance, bei Treffern zu blenden' },
            { key: 'warding', value: 50, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Half seen, half remembered, fully gone by the time it matters.',
        flavorDe: 'Halb gesehen, halb in Erinnerung, ganz weg, wenn es zählt.',
    },
    {
        uniqueId: 'banner_of_the_lost_legion',
        nameEn: 'Banner of the Lost Legion',
        nameDe: 'Banner der Verlorenen Legion',
        icon: '🚩', slotType: 'cloak', archetype: 'strength',
        minLevel: 55,
        requirements: { level: 55, str: 209, agi: 0, int: 0 },
        defenses: { armour: 240, evasion: 0, absorption: 80 },
        bonuses: [
            { key: 'life_on_kill', value: 6, en: '+# Life gained on Kill', de: '+# Leben bei Kill' },
            { key: 'cleave', value: 20, en: '#% chance to Cleave (hit nearby Monsters)', de: '#% Chance auf Keilschlag (nahe Monster treffen)' },
            { key: 'flat_health', value: 75, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' }
        ],
        downsides: [
            { key: 'dodge', value: -13, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The legion never retreated. The legion never arrived either.',
        flavorDe: 'Die Legion ist nie zurückgewichen. Angekommen ist sie auch nie.',
    },

    // ── Chest ─────────────────────────────────────────────────────────
    {
        uniqueId: 'breastplate_of_borrowed_courage',
        nameEn: 'Breastplate of Borrowed Courage',
        nameDe: 'Brustpanzer des Geliehenen Mutes',
        icon: '🦺', slotType: 'chest', archetype: 'strength',
        minLevel: 43,
        requirements: { level: 43, str: 163, agi: 0, int: 0 },
        defenses: { armour: 300, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'block_recovery', value: 35, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'flat_health', value: 80, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' }
        ],
        downsides: [
            { key: 'flat_mana', value: -70, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The courage must be returned by midnight.',
        flavorDe: 'Der Mut muss um Mitternacht zurückgegeben werden.',
    },
    {
        uniqueId: 'sweater_of_static_cling',
        nameEn: 'Sweater of Static Cling',
        nameDe: 'Pullover der Statischen Aufladung',
        icon: '⚡', slotType: 'chest', archetype: 'intellect',
        minLevel: 25,
        requirements: { level: 25, str: 0, agi: 0, int: 95 },
        defenses: { armour: 90, evasion: 40, absorption: 40 },
        bonuses: [
            { key: 'chance_to_shock', value: 18, en: '#% chance to Shock', de: '#% Chance auf Schocken' },
            { key: 'lightning_resist', value: 25, en: '+#% Lightning Resistance', de: '+#% Blitzresistenz' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'spell_dodge', value: -13, en: '-#% chance to Dodge Spells', de: '-#% Zaucherausweichchance' }
        ],
        flavorEn: 'It crackles when removed. Do not remove it indoors.',
        flavorDe: 'Es knistert beim Ausziehen. Zieh es nicht drinnen aus.',
    },
    {
        uniqueId: 'cuirass_of_counted_blessings',
        nameEn: 'Cuirass of Counted Blessings',
        nameDe: 'Kürass der Gezählten Segnungen',
        icon: '🧮', slotType: 'chest', archetype: 'strength',
        minLevel: 59,
        requirements: { level: 59, str: 224, agi: 0, int: 0 },
        defenses: { armour: 380, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'mistake_count', value: 2, en: '+# Allowed Mistakes', de: '+# erlaubte Fehler' },
            { key: 'flat_health', value: 79, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_regen', value: 3, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'inc_physical_damage', value: -34, en: '#% reduced Physical Damage', de: '#% reduzierter physischer Schaden' },
            { key: 'inc_spell_damage', value: -34, en: '#% reduced Spell Damage', de: '#% reduzierter Zauberschaden' }
        ],
        flavorEn: 'Every blessing counted. Every scar tallied twice.',
        flavorDe: 'Jede Segnung gezählt. Jede Narbe doppelt verbucht.',
    },
    {
        uniqueId: 'corset_of_constriction',
        nameEn: 'Corset of Constriction',
        nameDe: 'Korsett der Einschnürung',
        icon: '🎀', slotType: 'chest', archetype: 'any',
        minLevel: 21,
        requirements: { level: 21, str: 80, agi: 0, int: 0 },
        defenses: { armour: 130, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_regen', value: 2, en: '+# Life per Second', de: '+# Leben pro Sekunde' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'inc_armour', value: 20, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'flat_mana', value: -51, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Posture: impeccable. Breathing: negotiable.',
        flavorDe: 'Haltung: einwandfrei. Atmung: verhandelbar.',
    },
    {
        uniqueId: 'hazmat_harness',
        nameEn: 'Hazmat Harness',
        nameDe: 'Schutzanzug-Geschirr',
        icon: '☣️', slotType: 'chest', archetype: 'any',
        minLevel: 51,
        requirements: { level: 51, str: 90, agi: 90, int: 15 },
        defenses: { armour: 220, evasion: 60, absorption: 160 },
        bonuses: [
            { key: 'fire_resist', value: 20, en: '+#% Fire Resistance', de: '+#% Feuerwiderstand' },
            { key: 'cold_resist', value: 20, en: '+#% Cold Resistance', de: '+#% Kälte Resistenz' },
            { key: 'lightning_resist', value: 20, en: '+#% Lightning Resistance', de: '+#% Blitzresistenz' },
            { key: 'shadow_resist', value: 20, en: '+#% Shadow Resistance', de: '+#% Schattenresistenz' }
        ],
        downsides: [
            { key: 'spell_damage', value: -20, en: '-# Spell Damage', de: '-# Zauberschaden' }
        ],
        flavorEn: 'Sealed against everything, including encouragement.',
        flavorDe: 'Abgedichtet gegen alles, Einschließlich Ermunterung.',
    },
    {
        uniqueId: 'jacket_of_jackpot_nerves',
        nameEn: 'Jacket of Jackpot Nerves',
        nameDe: 'Jacke der Jackpot-Nerven',
        icon: '🎰', slotType: 'chest', archetype: 'any',
        minLevel: 65,
        requirements: { level: 65, str: 100, agi: 100, int: 50 },
        defenses: { armour: 180, evasion: 180, absorption: 0 },
        bonuses: [
            { key: 'fate', value: 25, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'life_leech', value: 4, en: '#% of Damage Leeched as Life', de: '#% des Schadens als Leben abgesaugt' },
            { key: 'life_regen', value: 4, en: '+# Life Regeneration per second', de: '+# Lebensregeneration pro Sekunde' },
            { key: 'inc_armour', value: 35, en: '#% increased Armour', de: '#% erhöhte Rüstung' }
        ],
        downsides: [
            { key: 'flat_health', value: -88, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Three sevens line up somewhere. Usually not where you need them.',
        flavorDe: 'Irgendwo stehen drei Siebenen in einer Reihe. Meistens nicht dort, wo du sie brauchst.',
    },

    // ── Bracers ───────────────────────────────────────────────────────
    {
        uniqueId: 'vambraces_of_velocity',
        nameEn: 'Vambraces of Velocity',
        nameDe: 'Armschienen der Geschwindigkeit',
        icon: '🌀', slotType: 'bracers', archetype: 'agility',
        minLevel: 39,
        requirements: { level: 39, str: 0, agi: 148, int: 0 },
        defenses: { armour: 0, evasion: 95, absorption: 0 },
        bonuses: [
            { key: 'attack_speed', value: 22, en: '#% increased Attack Speed', de: '#% erhöhte Angriffsgeschwindigkeit' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'accuracy', value: -35, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Speed is a substitute for skill. Repeatedly, if necessary.',
        flavorDe: 'Geschwindigkeit ersetzt Können. Ggf. wiederholt.',
    },
    {
        uniqueId: 'bindings_of_the_blinkdog',
        nameEn: 'Bindings of the Blinkdog',
        nameDe: 'Bindungen des Blinzelhunds',
        icon: '🐕', slotType: 'bracers', archetype: 'any',
        minLevel: 33,
        requirements: { level: 33, str: 55, agi: 70, int: 0 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'spell_dodge', value: 6, en: '+#% chance to Dodge Spells', de: '+#% Zaucherausweichchance' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -72, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Here one moment. Technically also there.',
        flavorDe: 'Einen Moment hier. Streng genommen auch dort.',
    },
    {
        uniqueId: 'cufflinks_of_compounding_interest',
        nameEn: 'Cufflinks of Compounding Interest',
        nameDe: 'Manschettenknöpfe des Zinseszinses',
        icon: '💰', slotType: 'bracers', archetype: 'intellect',
        minLevel: 56,
        requirements: { level: 56, str: 0, agi: 0, int: 212 },
        defenses: { armour: 0, evasion: 0, absorption: 167 },
        bonuses: [
            { key: 'mana_regen', value: 4, en: '+# Mana every 5 Seconds', de: '+# Mana alle 5 Sekunden' },
            { key: 'mana_on_kill', value: 8, en: '+# Mana gained on Kill', de: '+# Mana bei Kill' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Mana now, mana later, mana forever. Health is a sunk cost.',
        flavorDe: 'Mana jetzt, Mana später, Mana für immer. Leben sind versunkene Kosten.',
    },
    {
        uniqueId: 'wraps_of_wrathful_arithmetic',
        nameEn: 'Wraps of Wrathful Arithmetic',
        nameDe: 'Wickel des Zornigen Rechnens',
        icon: '✖️', slotType: 'bracers', archetype: 'strength',
        minLevel: 29,
        requirements: { level: 29, str: 110, agi: 0, int: 0 },
        defenses: { armour: 85, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'inc_physical_damage', value: 35, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'stagger', value: 25, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'flat_health', value: 29, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'focus', value: -26, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Long division, short temper.',
        flavorDe: 'Schriftliche Division, kurzer Draht.',
    },
    {
        uniqueId: 'bracers_of_bouncing_spells',
        nameEn: 'Bracers of Bouncing Spells',
        nameDe: 'Armschienen der Hüpfenden Zauber',
        icon: '🪃', slotType: 'bracers', archetype: 'intellect',
        minLevel: 61,
        requirements: { level: 61, str: 0, agi: 0, int: 232 },
        defenses: { armour: 0, evasion: 0, absorption: 167 },
        bonuses: [
            { key: 'echo_1', value: 15, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'echo_2', value: 30, en: '#% increased Echo Damage', de: '#% erhöhter Echoschaden' },
            { key: 'flat_health', value: 66, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_mana', value: -70, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Cast once, hit twice, apologize thrice.',
        flavorDe: 'Einmal zaubern, zweifach treffen, dreimal entschuldigen.',
    },
    {
        uniqueId: 'shackles_of_shared_fate',
        nameEn: 'Shackles of Shared Fate',
        nameDe: 'Fesseln des Geteilten Schicksals',
        icon: '🔗', slotType: 'bracers', archetype: 'any',
        minLevel: 68,
        requirements: { level: 68, str: 110, agi: 110, int: 40 },
        defenses: { armour: 222, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'fate', value: 15, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'life_on_kill', value: 5, en: '+# Life gained on Kill', de: '+# Leben bei Kill' },
            { key: 'flat_health', value: 73, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'accuracy', value: -26, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'What hits them, hits you. What misses you, misses them.',
        flavorDe: 'Was sie trifft, trifft dich. Was dich verfehlt, verfehlt sie.',
    },

    // ── Gloves ────────────────────────────────────────────────────────
    {
        uniqueId: 'gauntlets_of_grievous_math',
        nameEn: 'Gauntlets of Grievous Math',
        nameDe: 'Panzerhandschuhe des Greulichen Rechnens',
        icon: '➗', slotType: 'gloves', archetype: 'strength',
        minLevel: 46,
        requirements: { level: 46, str: 175, agi: 0, int: 0 },
        defenses: { armour: 230, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'flat_physical_damage_1', value: 25, en: '+# Minimum Physical Damage', de: '+# Minimaler physischer Schaden' },
            { key: 'flat_physical_damage_2', value: 45, en: '+# Maximum Physical Damage', de: '+# Maximaler physischer Schaden' },
            { key: 'flat_health', value: 46, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'attack_speed', value: -13, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'Carry the one. Then carry the monster.',
        flavorDe: 'Übertrage die Eins. Dann trag das Monster.',
    },
    {
        uniqueId: 'mittens_of_misdirection',
        nameEn: 'Mittens of Misdirection',
        nameDe: 'Fäustlinge der Fehlleitung',
        icon: '🧤', slotType: 'gloves', archetype: 'any',
        minLevel: 19,
        requirements: { level: 19, str: 40, agi: 35, int: 0 },
        defenses: { armour: 62, evasion: 62, absorption: 0 },
        bonuses: [
            { key: 'chance_to_blind', value: 12, en: '#% chance to Blind on hit', de: '#% Chance, bei Treffern zu blenden' },
            { key: 'dodge', value: 5, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'flat_health', value: 33, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Nobody expects the fluffy ones.',
        flavorDe: 'Niemand erwartet die Flauschigen.',
    },
    {
        uniqueId: 'hands_of_the_hourglass_juggler',
        nameEn: 'Hands of the Hourglass Juggler',
        nameDe: 'Hände des Sanduhren-Jongleurs',
        icon: '⏳', slotType: 'gloves', archetype: 'any',
        minLevel: 53,
        requirements: { level: 53, str: 85, agi: 85, int: 30 },
        defenses: { armour: 300, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'time_added', value: 25, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'pushback', value: 0.4, en: '+#s Pushback on hit', de: '+#s Rückstoß bei Treffern' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'life_leech', value: 2, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' }
        ],
        downsides: [
            { key: 'flat_health', value: -70, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Keeps three hours in the air at all times. Drops exactly one.',
        flavorDe: 'Hält ständig drei Stunden in der Luft. Lässt genau eine fallen.',
    },
    {
        uniqueId: 'gloves_of_glacial_grasp',
        nameEn: 'Gloves of Glacial Grasp',
        nameDe: 'Handschuhe des Gletschergriffs',
        icon: '❄️', slotType: 'gloves', archetype: 'intellect',
        minLevel: 35,
        requirements: { level: 35, str: 0, agi: 0, int: 133 },
        defenses: { armour: 0, evasion: 0, absorption: 106 },
        bonuses: [
            { key: 'chance_to_freeze', value: 15, en: '#% chance to Freeze', de: '#% Chance auf Einfrieren' },
            { key: 'cold_damage_1', value: 12, en: '+# Minimum Cold Damage', de: '+# Minimaler Kälteschaden' },
            { key: 'cold_damage_2', value: 24, en: '+# Maximum Cold Damage', de: '+# Maximaler Kälteschaden' }
        ],
        downsides: [
            { key: 'fire_resist', value: -32, en: '-#% Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Handshakes are discouraged.',
        flavorDe: 'Händeschlagen wird nicht empfohlen.',
    },
    {
        uniqueId: 'fists_of_fumbled_fortune',
        nameEn: 'Fists of Fumbled Fortune',
        nameDe: 'Fäuste des Vermasselten Glücks',
        icon: '🍀', slotType: 'gloves', archetype: 'any',
        minLevel: 64,
        requirements: { level: 64, str: 105, agi: 105, int: 30 },
        defenses: { armour: 380, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'fate', value: 35, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'flat_health', value: 69, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'life_leech', value: 2, en: '#% of Damage Dealt Leeched as Life', de: '#% des verursachten Schadens werden als Leben abgezweigt' },
            { key: 'fire_resist', value: 25, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' }
        ],
        downsides: [
            { key: 'accuracy', value: -47, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Lucky punches land eventually. Statistically speaking.',
        flavorDe: 'Glückstreffer landen irgendwann. Rein statistisch.',
    },
    {
        uniqueId: 'conductors_gloves',
        nameEn: "Conductor's Gloves",
        nameDe: 'Dirigenten-Handschuhe',
        icon: '🎼', slotType: 'gloves', archetype: 'intellect',
        minLevel: 58,
        requirements: { level: 58, str: 0, agi: 0, int: 220 },
        defenses: { armour: 0, evasion: 0, absorption: 245 },
        bonuses: [
            { key: 'chain', value: 25, en: '#% chance for Projectiles to Chain', de: '#% Chance, dass Projektile ketten' },
            { key: 'lightning_damage_1', value: 15, en: '+# Minimum Lightning Damage', de: '+# Minimaler Blitzschaden' },
            { key: 'lightning_damage_2', value: 30, en: '+# Maximum Lightning Damage', de: '+# Maximaler Blitzschaden' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -77, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'The orchestra follows the baton. The lightning follows everything.',
        flavorDe: 'Das Orchester folgt dem Taktstock. Der Blitz folgt allem.',
    },

    // ── Belt ──────────────────────────────────────────────────────────
    {
        uniqueId: 'sash_of_siphoned_seconds',
        nameEn: 'Sash of Siphoned Seconds',
        nameDe: 'Schärpe der Abgezweigten Sekunden',
        icon: '⏱️', slotType: 'belt', archetype: 'any',
        minLevel: 50,
        requirements: { level: 50, str: 80, agi: 80, int: 30 },
        defenses: { armour: 178, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'time_added', value: 35, en: '+#s to Puzzle Time', de: '+#s Rätselzeit' },
            { key: 'focus', value: 15, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: 40, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_mana', value: -63, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'It steals time from whoever is not looking. That is always you.',
        flavorDe: 'Es stiehlt Zeit von allen, die nicht hinschauen. Das bist immer du.',
    },
    {
        uniqueId: 'belt_of_bottomless_pockets',
        nameEn: 'Belt of Bottomless Pockets',
        nameDe: 'Gürtel der Bodenlosen Taschen',
        icon: '🕳️', slotType: 'belt', archetype: 'any',
        minLevel: 28,
        requirements: { level: 28, str: 55, agi: 50, int: 0 },
        defenses: { armour: 102, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'mana_on_kill', value: 10, en: '+# Mana gained on Kill', de: '+# Mana bei Kill' },
            { key: 'flat_mana', value: 40, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The pockets go all the way down. Do not reach in.',
        flavorDe: 'Die Taschen gehen ganz nach unten. Fass nicht hinein.',
    },
    {
        uniqueId: 'cummerbund_of_cautious_steps',
        nameEn: 'Cummerbund of Cautious Steps',
        nameDe: 'Kummerbund der Vorsichtigen Schritte',
        icon: '🕺', slotType: 'belt', archetype: 'any',
        minLevel: 44,
        requirements: { level: 44, str: 70, agi: 95, int: 0 },
        defenses: { armour: 178, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'preemptive_dodge', value: 15, en: '#% Preemptive Dodge', de: '#% Präventives Ausweichen' },
            { key: 'block_recovery', value: 25, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -10.4, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'Formal wear for people who expect the floor to betray them.',
        flavorDe: 'Festtagskleidung für Menschen, die vom Boden Verrat erwarten.',
    },
    {
        uniqueId: 'girdle_of_grit',
        nameEn: 'Girdle of Grit',
        nameDe: 'Gürtel des Mumm',
        icon: '🪨', slotType: 'belt', archetype: 'strength',
        minLevel: 32,
        requirements: { level: 32, str: 122, agi: 0, int: 0 },
        defenses: { armour: 102, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'strength', value: 18, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'flat_health', value: 60, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'warding', value: 100, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'intelligence', value: -26, en: '-# to Intelligence', de: '-# zu Intelligenz' }
        ],
        flavorEn: 'Thinking hurts. Lifting does too, but honestly.',
        flavorDe: 'Nachdenken tut weh. Heben auch, aber ehrlich.',
    },
    {
        uniqueId: 'bandolier_of_bad_luck_bombs',
        nameEn: 'Bandolier of Bad Luck Bombs',
        nameDe: 'Bandelier der Pechbomben',
        icon: '💣', slotType: 'belt', archetype: 'any',
        minLevel: 62,
        requirements: { level: 62, str: 95, agi: 95, int: 45 },
        defenses: { armour: 295, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'chance_to_ignite', value: 25, en: '#% chance to Ignite', de: '#% Chance auf Entzünden' },
            { key: 'splash_damage', value: 30, en: '#% added Splash Damage', de: '#% zusätzlicher Flächenschaden' },
            { key: 'flat_health', value: 67, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'cold_resist', value: -32, en: '-#% Cold Resistance', de: '-#% Kälte Resistenz' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Every pouch is a coin flip with a fuse.',
        flavorDe: 'Jede Tasche ist ein Münzwurf mit Zündschnur.',
    },
    {
        uniqueId: 'rope_of_tensioned_patience',
        nameEn: 'Rope of Tensioned Patience',
        nameDe: 'Seil Gespannter Geduld',
        icon: '🪢', slotType: 'belt', archetype: 'strength',
        minLevel: 67,
        requirements: { level: 67, str: 255, agi: 0, int: 0 },
        defenses: { armour: 333, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'channel_1', value: 20, en: '+# Channel Damage per Stack', de: '+# Kanalisationsschaden pro Stapel' },
            { key: 'channel_2', value: 6, en: '+# maximum Channel Stacks', de: '+# maximale Kanalisationsstapel' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'attack_speed', value: -15.6, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Wait. Wait. Now.',
        flavorDe: 'Warten. Warten. Jetzt.',
    },

    // ── Pants ─────────────────────────────────────────────────────────
    {
        uniqueId: 'trousers_of_tireless_strides',
        nameEn: 'Trousers of Tireless Strides',
        nameDe: 'Hose der Unverdrossenen Schritte',
        icon: '👖', slotType: 'pants', archetype: 'strength',
        minLevel: 24,
        requirements: { level: 24, str: 92, agi: 0, int: 0 },
        defenses: { armour: 140, evasion: 0, absorption: 0 },
        bonuses: [
            { key: 'life_regen', value: 3, en: '+# Life per Second', de: '+# Leben pro Sekunde' },
            { key: 'flat_health', value: 50, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 10, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'dodge', value: -11, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'They have walked here before you. And before that, too.',
        flavorDe: 'Sie sind vor dir hierhergelaufen. Und davor auch schon.',
    },
    {
        uniqueId: 'leggings_of_layered_logic',
        nameEn: 'Leggings of Layered Logic',
        nameDe: 'Beinschienen der Geschichteten Logik',
        icon: '🧠', slotType: 'pants', archetype: 'intellect',
        minLevel: 57,
        requirements: { level: 57, str: 0, agi: 0, int: 216 },
        defenses: { armour: 0, evasion: 60, absorption: 180 },
        bonuses: [
            { key: 'arcane_resistance', value: 40, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_health', value: 77, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'strength', value: 20, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'If A implies B, run anyway.',
        flavorDe: 'Wenn A B impliziert, lauf trotzdem.',
    },
    {
        uniqueId: 'breeches_of_bold_bluffs',
        nameEn: 'Breeches of Bold Bluffs',
        nameDe: 'Reiterhosen des Kühnen Bluffs',
        icon: '🃏', slotType: 'pants', archetype: 'any',
        minLevel: 38,
        requirements: { level: 38, str: 70, agi: 75, int: 0 },
        defenses: { armour: 100, evasion: 120, absorption: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 25, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht zählen' },
            { key: 'fate', value: 10, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'strength', value: 15, en: '+# to Strength', de: '+# zu Stärke' }
        ],
        downsides: [
            { key: 'flat_health', value: -77, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Confidence is a stat if nobody checks the sheet.',
        flavorDe: 'Selbstvertrauen ist eine Statistik, solange niemand ins Tabellenblatt schaut.',
    },
    {
        uniqueId: 'pants_of_practical_pockets',
        nameEn: 'Pants of Practical Pockets',
        nameDe: 'Hose der Praktischen Taschen',
        icon: '🧰', slotType: 'pants', archetype: 'any',
        minLevel: 26,
        requirements: { level: 26, str: 50, agi: 50, int: 0 },
        defenses: { armour: 120, evasion: 0, absorption: 40 },
        bonuses: [
            { key: 'flat_mana', value: 50, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'mana_regen', value: 3, en: '+# Mana every 5 Seconds', de: '+# Mana alle 5 Sekunden' },
            { key: 'warding', value: 30, en: '+# Warding', de: '+# Wardschutz' }
        ],
        downsides: [
            { key: 'flat_health', value: -55, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Nine pockets. Each contains exactly one useful thing and lint.',
        flavorDe: 'Neun Taschen. In jeder ist genau etwas Nützliches und Fusseln.',
    },
    {
        uniqueId: 'sweatpants_of_absolute_comfort',
        nameEn: 'Sweatpants of Absolute Comfort',
        nameDe: 'Jogginghose des Absoluten Komforts',
        icon: '🛋️', slotType: 'pants', archetype: 'any',
        minLevel: 16,
        requirements: { level: 16, str: 0, agi: 30, int: 30 },
        defenses: { armour: 0, evasion: 70, absorption: 0 },
        bonuses: [
            { key: 'focus', value: 20, en: '#% reduced Time Penalty from Mistakes', de: '#% reduzierte Zeitstrafe durch Fehler' },
            { key: 'life_regen', value: 2, en: '+# Life per Second', de: '+# Leben pro Sekunde' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'crit_chance', value: -18, en: '-#% Critical Hit Chance', de: '-#% Kritische Trefferchance' }
        ],
        flavorEn: 'Too comfortable for critical thinking.',
        flavorDe: 'Zu bequem für kritisches Denken.',
    },

    // ── Boots ─────────────────────────────────────────────────────────
    {
        uniqueId: 'boots_of_backpedaling',
        nameEn: 'Boots of Backpedaling',
        nameDe: 'Stiefel des Rückwärtsradfahrens',
        icon: '👟', slotType: 'boots', archetype: 'agility',
        minLevel: 36,
        requirements: { level: 36, str: 0, agi: 137, int: 0 },
        defenses: { armour: 40, evasion: 170, absorption: 0 },
        bonuses: [
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' },
            { key: 'first_step', value: 1, en: '+#s Monsters delay Charge-up after Spawning', de: '+#s Monster verzögern Angriffsladen nach Erscheinen' },
            { key: 'flat_health', value: 46, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -10.4, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'Never retreat in the same direction twice.',
        flavorDe: 'Nie zweimal in dieselbe Richtung zurückweichen.',
    },
    {
        uniqueId: 'snowshoes_of_slow_certainty',
        nameEn: 'Snowshoes of Slow Certainty',
        nameDe: 'Schneeschuhe der Langsamen Gewissheit',
        icon: '🎿', slotType: 'boots', archetype: 'strength',
        minLevel: 30,
        requirements: { level: 30, str: 114, agi: 0, int: 0 },
        defenses: { armour: 190, evasion: 0, absorption: 40 },
        bonuses: [
            { key: 'cold_resist', value: 35, en: '+#% Cold Resistance', de: '+#% Kälte Resistenz' },
            { key: 'flat_health', value: 70, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'attack_speed', value: -19.5, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'You will get there. Eventually. Definitely.',
        flavorDe: 'Du kommst an. Irgendwann. Ganz bestimmt.',
    },
    {
        uniqueId: 'wingtip_waders',
        nameEn: 'Wingtip Waders',
        nameDe: 'Flügelspitzen-Watenstiefel',
        icon: '🥾', slotType: 'boots', archetype: 'any',
        minLevel: 48,
        requirements: { level: 48, str: 90, agi: 90, int: 0 },
        defenses: { armour: 120, evasion: 100, absorption: 120 },
        bonuses: [
            { key: 'absorption_regen_rate', value: 25, en: '#% increased Absorption Regeneration Rate', de: '#% erhöhte Absorptionsregenerationsrate' },
            { key: 'faster_absorption_regen_start', value: 3.5, en: '+#s sooner Absorption Regeneration', de: '+#s frühere Absorptionsregeneration' },
            { key: 'flat_health', value: 48, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 8, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'lightning_resist', value: -30, en: '-#% Lightning Resistance', de: '-#% Blitzresistenz' }
        ],
        flavorEn: 'Waterproof up to the promises made in them.',
        flavorDe: 'Wasserdicht bis zu den darin gemachten Versprechen.',
    },
    {
        uniqueId: 'boots_of_blazing_trail',
        nameEn: 'Boots of Blazing Trail',
        nameDe: 'Stiefel der Brennenden Spur',
        icon: '🔥', slotType: 'boots', archetype: 'strength',
        minLevel: 52,
        requirements: { level: 52, str: 198, agi: 0, int: 0 },
        defenses: { armour: 230, evasion: 60, absorption: 0 },
        bonuses: [
            { key: 'chance_to_ignite', value: 20, en: '#% chance to Ignite', de: '#% Chance auf Entzünden' },
            { key: 'attack_speed', value: 10, en: '#% increased Attack Speed', de: '#% erhöhte Angriffsgeschwindigkeit' },
            { key: 'flat_health', value: 72, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'fire_resist', value: -39, en: '-#% Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'You leave a trail. Occasionally it follows you back.',
        flavorDe: 'Du hinterlässt eine Spur. Gelegentlich folgt sie dir zurück.',
    },
    {
        uniqueId: 'moonboots_of_minor_gravity',
        nameEn: 'Moon Boots of Minor Gravity',
        nameDe: 'Mondstiefel der Geringen Schwerkraft',
        icon: '🌙', slotType: 'boots', archetype: 'any',
        minLevel: 42,
        requirements: { level: 42, str: 75, agi: 85, int: 0 },
        defenses: { armour: 110, evasion: 130, absorption: 0 },
        bonuses: [
            { key: 'pushback', value: 0.5, en: '+#s Pushback on hit', de: '+#s Rückstoß bei Treffern' },
            { key: 'grounded_1', value: 30, en: '#% chance to resist being Pushed back', de: '#% Chance, Rückstoß zu widerstehen' },
            { key: 'grounded_2', value: 30, en: '#% reduced Pushback taken', de: '#% reduzierter erlittener Rückstoß' }
        ],
        downsides: [
            { key: 'flat_mana', value: -60, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'One small step, repeatedly, in panic.',
        flavorDe: 'Ein kleiner Schritt, wiederholt, in Panik.',
    },
    {
        uniqueId: 'slippers_of_soft_landings',
        nameEn: 'Slippers of Soft Landings',
        nameDe: 'Pantoffeln der Sanften Landungen',
        icon: '🥿', slotType: 'boots', archetype: 'any',
        minLevel: 69,
        requirements: { level: 69, str: 100, agi: 100, int: 60 },
        defenses: { armour: 90, evasion: 160, absorption: 160 },
        bonuses: [
            { key: 'warding', value: 100, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'preemptive_dodge', value: 18, en: '#% Preemptive Dodge', de: '#% Präventives Ausweichen' },
            { key: 'flat_health', value: 74, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'dodge', value: 10, en: '+#% chance to Dodge Attacks', de: '+#% Ausweichchance' }
        ],
        downsides: [
            { key: 'crit_multiplier', value: -35, en: '-#% Critical Strike Multiplier', de: '-#% Kritischer Schadensmultiplikator' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Nothing hurts. Nothing hits hard either.',
        flavorDe: 'Nichts tut weh. Nichts trifft auch besonders hart.',
    },

    // ── Ring ──────────────────────────────────────────────────────────
    {
        uniqueId: 'signet_of_spiteful_interest',
        nameEn: 'Signet of Spiteful Interest',
        nameDe: 'Siegel des Gehässigen Zinses',
        icon: '💍', slotType: 'ring', archetype: 'intellect',
        minLevel: 34,
        requirements: { level: 34, str: 0, agi: 0, int: 129 },
        bonuses: [
            { key: 'mana_on_mistake', value: 25, en: '+# Mana gained on Mistake', de: '+# Mana bei Fehler' },
            { key: 'flat_mana', value: 30, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Every error pays out. It is rooting for your failure, loudly.',
        flavorDe: 'Jeder Fehler zahlt sich aus. Es wettet laut auf dein Scheitern.',
    },
    {
        uniqueId: 'loop_of_lazy_lightning',
        nameEn: 'Loop of Lazy Lightning',
        nameDe: 'Ring des Bequemen Blitzes',
        icon: '⚡', slotType: 'ring', archetype: 'intellect',
        minLevel: 46,
        requirements: { level: 46, str: 0, agi: 0, int: 175 },
        bonuses: [
            { key: 'chance_to_shock', value: 22, en: '#% chance to Shock', de: '#% Chance auf Schocken' },
            { key: 'lightning_damage_1', value: 14, en: '+# Minimum Lightning Damage', de: '+# Minimaler Blitzschaden' },
            { key: 'lightning_damage_2', value: 28, en: '+# Maximum Lightning Damage', de: '+# Maximaler Blitzschaden' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_health', value: -63, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The shortest path between two points is through you.',
        flavorDe: 'Der kürzeste Weg zwischen zwei Punkten führt durch dich.',
    },
    {
        uniqueId: 'band_of_balanced_bargains',
        nameEn: 'Band of Balanced Bargains',
        nameDe: 'Ring des Ausgeglichenen Handels',
        icon: '⚖️', slotType: 'ring', archetype: 'any',
        minLevel: 20,
        requirements: { level: 20, str: 25, agi: 25, int: 25 },
        bonuses: [
            { key: 'strength', value: 8, en: '+# to Strength', de: '+# zu Stärke' },
            { key: 'agility', value: 8, en: '+# to Agility', de: '+# zu Geschick' },
            { key: 'intelligence', value: 8, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_health', value: -44, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'A little of everything, including regret.',
        flavorDe: 'Ein wenig von allem, Einschließlich Reue.',
    },
    {
        uniqueId: 'ring_of_ruinous_luck',
        nameEn: 'Ring of Ruinous Luck',
        nameDe: 'Ring des Verheerenden Glücks',
        icon: '🎰', slotType: 'ring', archetype: 'any',
        minLevel: 71,
        requirements: { level: 71, str: 110, agi: 110, int: 55 },
        bonuses: [
            { key: 'fate', value: 40, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'accuracy', value: 85, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'fire_resist', value: 30, en: '+#% to Fire Resistance', de: '+#% Feuerwiderstand' }
        ],
        downsides: [
            { key: 'flat_health', value: -112, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Fortune favors the bold, and devours the fragile.',
        flavorDe: 'Das Glück ist dem Mutigen hold — und verschlingt die Zerbrechlichen.',
    },
    {
        uniqueId: 'dial_ring_of_daily_doubles',
        nameEn: 'Dial Ring of Daily Doubles',
        nameDe: 'Zahlenring der Täglichen Doppelfragen',
        icon: '☎️', slotType: 'ring', archetype: 'any',
        minLevel: 60,
        requirements: { level: 60, str: 90, agi: 90, int: 90 },
        bonuses: [
            { key: 'crit_chance', value: 15, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 50, en: '+#% Critical Strike Multiplier', de: '+#% Kritischer Schadensmultiplikator' },
            { key: 'flat_health', value: 65, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_mana', value: -70, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'For double or nothing. Mostly nothing.',
        flavorDe: 'Für alles oder nichts. Meistens nichts.',
    },
    {
        uniqueId: 'circle_of_protection_from_homework',
        nameEn: 'Circle of Protection from Homework',
        nameDe: 'Schutzkreis gegen Hausaufgaben',
        icon: '⭕', slotType: 'ring', archetype: 'any',
        minLevel: 23,
        requirements: { level: 23, str: 40, agi: 0, int: 48 },
        bonuses: [
            { key: 'spell_block_chance', value: 12, en: '+#% Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'arcane_resistance', value: 25, en: '+# Arcane Resistance', de: '+# Arkanwiderstand' },
            { key: 'flat_health', value: 30, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -26, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Ward off essays, hexes, and pop quizzes alike.',
        flavorDe: 'Wehrt Essays, Flüche und Überraschungstests gleichermaßen ab.',
    },

    // ── Arcane ────────────────────────────────────────────────────────
    {
        uniqueId: 'orb_of_obvious_outcomes',
        nameEn: 'Orb of Obvious Outcomes',
        nameDe: 'Kugel der Offensichtlichen Ergebnisse',
        icon: '🔮', slotType: 'arcane', archetype: 'intellect',
        minLevel: 40,
        requirements: { level: 40, str: 0, agi: 0, int: 152 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'reveal_hint', value: 30, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 30, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'chance_for_new_question', value: -28, en: '-#% chance to get a new Question', de: '-#% Chance auf eine neue Frage' }
        ],
        flavorEn: 'It shows you the answer. The answer is usually \u201cthe obvious one.\u201d',
        flavorDe: 'Sie zeigt dir die Antwort. Die Antwort ist meistens „die offensichtliche“.',
    },
    {
        uniqueId: 'grimoire_of_growth_curves',
        nameEn: 'Grimoire of Growth Curves',
        nameDe: 'Grimoire der Wachstumskurven',
        icon: '📈', slotType: 'arcane', archetype: 'intellect',
        minLevel: 55,
        requirements: { level: 55, str: 0, agi: 0, int: 209 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'inc_spell_damage', value: 40, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'mana_regen', value: 4, en: '+# Mana every 5 Seconds', de: '+# Mana alle 5 Sekunden' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Exponential power. Exponentially fragile.',
        flavorDe: 'Exponentielle Macht. Exponentell zerbrechlich.',
    },
    {
        uniqueId: 'crystal_ball_of_crude_guesses',
        nameEn: 'Crystal Ball of Crude Guesses',
        nameDe: 'Kristallkugel der Groben Schätzungen',
        icon: '🔮', slotType: 'arcane', archetype: 'intellect',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 0, int: 92 },
        defenses: { armour: 0, evasion: 0, absorption: 95 },
        bonuses: [
            { key: 'spell_damage', value: 20, en: '+# Spell Damage', de: '+# Zauberschaden' },
            { key: 'flat_mana', value: 30, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'It is 60% sure about everything. That is the whole trick.',
        flavorDe: 'Sie ist sich zu 60 % über alles sicher. Das ist der ganze Trick.',
    },
    {
        uniqueId: 'wand_of_wasted_wonders',
        nameEn: 'Wand of Wasted Wonders',
        nameDe: 'Zauberstab der Vertanen Wunder',
        icon: '🪄', slotType: 'arcane', archetype: 'intellect',
        minLevel: 63,
        requirements: { level: 63, str: 0, agi: 0, int: 239 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
        bonuses: [
            { key: 'echo_1', value: 20, en: '#% chance for Reveals to Echo', de: '#% Chance, dass Aufdeckungen echoen' },
            { key: 'inc_spell_damage', value: 20, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'spell_dodge', value: 10, en: '+#% chance to Dodge Spells', de: '+#% Zauber-Ausweichchance' }
        ],
        downsides: [
            { key: 'flat_mana', value: -72, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'flat_health', value: -45, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Every miracle costs double mana and half dignity.',
        flavorDe: 'Jedes Wunder kostet doppeltes Mana und die Hälfte an Würde.',
    },
    {
        uniqueId: 'tome_of_terminal_tables',
        nameEn: 'Tome of Terminal Tables',
        nameDe: 'Foliant der Finalen Tabellen',
        icon: '📊', slotType: 'arcane', archetype: 'intellect',
        minLevel: 68,
        requirements: { level: 68, str: 0, agi: 0, int: 258 },
        defenses: { armour: 0, evasion: 0, absorption: 520 },
        bonuses: [
            { key: 'chance_for_new_question', value: 45, en: '#% chance to get a new Question', de: '#% Chance auf eine neue Frage' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 40, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'intelligence', value: 20, en: '+# to Intelligence', de: '+# zu Intelligenz' }
        ],
        downsides: [
            { key: 'focus', value: -35, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Appendix A lists every question. Appendix B lists every excuse.',
        flavorDe: 'Anhang A listet jede Frage. Anhang B listet jede Ausrede.',
    },
    {
        uniqueId: 'focus_lens_of_fickle_physics',
        nameEn: 'Focus Lens of Fickle Physics',
        nameDe: 'Fokuslinse der Launischen Physik',
        icon: '🔬', slotType: 'arcane', archetype: 'intellect',
        minLevel: 59,
        requirements: { level: 59, str: 0, agi: 0, int: 224 },
        defenses: { armour: 0, evasion: 0, absorption: 315 },
        bonuses: [
            { key: 'crit_chance', value: 20, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 35, en: '+#% Critical Strike Multiplier', de: '+#% Kritischer Schadensmultiplikator' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'inc_spell_damage', value: 30, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' }
        ],
        downsides: [
            { key: 'spell_dodge', value: -18, en: '-#% chance to Dodge Spells', de: '-#% Zaucherausweichchance' },
            { key: 'flat_health', value: -45, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Observation changes the outcome. Mostly into craters.',
        flavorDe: 'Beobachtung verändert das Ergebnis. Meistens in Kraterform.',
    },

    // ── Talisman ──────────────────────────────────────────────────────
    {
        uniqueId: 'charm_of_cherry_picked_chances',
        nameEn: 'Charm of Cherry-Picked Chances',
        nameDe: 'Talisman der Rosinen Herausgepickten Chancen',
        icon: '🍒', slotType: 'talisman', archetype: 'any',
        minLevel: 45,
        requirements: { level: 45, str: 70, agi: 70, int: 30 },
        bonuses: [
            { key: 'fate', value: 20, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'reveal_hint', value: 15, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'flat_health', value: -70, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The sample size is you.',
        flavorDe: 'Die Stichprobe bist du.',
    },
    {
        uniqueId: 'fetish_of_frozen_fortune',
        nameEn: 'Fetish of Frozen Fortune',
        nameDe: 'Fetisch des Gefrorenen Glücks',
        icon: '🧊', slotType: 'talisman', archetype: 'intellect',
        minLevel: 31,
        requirements: { level: 31, str: 0, agi: 0, int: 118 },
        bonuses: [
            { key: 'chance_to_freeze', value: 18, en: '#% chance to Freeze', de: '#% Chance auf Einfrieren' },
            { key: 'cold_resist', value: 20, en: '+#% Cold Resistance', de: '+#% Kälte Resistenz' },
            { key: 'flat_health', value: 41, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'fire_resist', value: -30, en: '-#% Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Luck preserved at exactly minus seventeen degrees.',
        flavorDe: 'Glück, konserviert bei exakt minus siebzehn Grad.',
    },
    {
        uniqueId: 'talisman_of_tallying_torment',
        nameEn: 'Talisman of Tallying Torment',
        nameDe: 'Talisman der Zählenden Qual',
        icon: '🧾', slotType: 'talisman', archetype: 'any',
        minLevel: 49,
        requirements: { level: 49, str: 80, agi: 80, int: 25 },
        bonuses: [
            { key: 'life_on_kill', value: 5, en: '+# Life gained on Kill', de: '+# Leben bei Kill' },
            { key: 'absorption_on_kill', value: 5, en: '+# Absorption gained on Kill', de: '+# Absorption bei Kill' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 35, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'mana_regen', value: -4.4, en: '-# Mana every 5 Seconds', de: '-# Mana alle 5 Sekunden' }
        ],
        flavorEn: 'It keeps score. You are losing.',
        flavorDe: 'Es führt Buch. Du verlierst.',
    },
    {
        uniqueId: 'hex_doll_of_hostile_takeover',
        nameEn: 'Hex Doll of Hostile Takeover',
        nameDe: 'Hexpuppe der Feindlichen Übernahme',
        icon: '🪆', slotType: 'talisman', archetype: 'intellect',
        minLevel: 61,
        requirements: { level: 61, str: 0, agi: 0, int: 232 },
        bonuses: [
            { key: 'chance_to_convert', value: 25, en: '#% chance to Convert', de: '#% Chance zur Bekehrung' },
            { key: 'inc_spell_damage', value: 15, en: '#% increased Spell Damage', de: '#% erhöhter Zauberschaden' },
            { key: 'flat_mana', value: 55, en: '+# to maximum Mana', de: '+# zu maximalem Mana' },
            { key: 'fate', value: 18, en: '#% increased Fate', de: '#% erhöhtes Schicksal' }
        ],
        downsides: [
            { key: 'flat_health', value: -81, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Why fight the monster when it could work for you?',
        flavorDe: 'Warum das Monster bekämpfen, wenn es für dich arbeiten könnte?',
    },
    {
        uniqueId: 'lucky_rabbits_tonsil',
        nameEn: "Lucky Rabbit's Tonsil",
        nameDe: 'Glücks-Tonsille des Hasen',
        icon: '🐇', slotType: 'talisman', archetype: 'any',
        minLevel: 27,
        requirements: { level: 27, str: 50, agi: 50, int: 0 },
        bonuses: [
            { key: 'mistake_not_count', value: 30, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht zählen' },
            { key: 'flat_health', value: 34, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'flat_mana', value: 22, en: '+# to maximum Mana', de: '+# zu maximalem Mana' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Like the foot, but rarer and considerably weirder.',
        flavorDe: 'Wie das Bein, nur seltener und deutlich seltsamer.',
    },
    {
        uniqueId: 'prayer_beads_of_pending_results',
        nameEn: 'Prayer Beads of Pending Results',
        nameDe: 'Gebetskette der Ausstehenden Ergebnisse',
        icon: '📿', slotType: 'talisman', archetype: 'any',
        minLevel: 66,
        requirements: { level: 66, str: 90, agi: 90, int: 70 },
        bonuses: [
            { key: 'warding', value: 90, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'faster_absorption_regen_start', value: 5, en: '+#s sooner Absorption Regeneration', de: '+#s frühere Absorptionsregeneration' },
            { key: 'flat_health', value: 71, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'fate', value: 18, en: '#% increased Fate', de: '#% erhöhtes Schicksal' }
        ],
        downsides: [
            { key: 'flat_mana', value: -66, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -18, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'One bead per unanswered prayer. It is a long necklace.',
        flavorDe: 'Eine Perle pro unbeantwortetem Gebet. Es ist eine lange Kette.',
    },

    // ── Weapon ────────────────────────────────────────────────────────
    {
        uniqueId: 'ruler_of_measurable_ruin',
        nameEn: 'Ruler of Measurable Ruin',
        nameDe: 'Lineal des Messbaren Verderbens',
        icon: '📏', slotType: 'weapon', archetype: 'strength', hands: 1,
        minLevel: 14,
        requirements: { level: 14, str: 55, agi: 0, int: 0 },
        damage: { min: 43, max: 81 }, attackIntervalSeconds: 3.5,
        bonuses: [
            { key: 'inc_physical_damage', value: 25, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 20, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 6, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'flat_mana', value: -44, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Twelve inches of discipline. Metric on request.',
        flavorDe: 'Zöllig Disziplin. Auf Wunsch metrisch.',
    },
    {
        uniqueId: 'slide_rule_scythe',
        nameEn: 'Slide Rule Scythe',
        nameDe: 'Rechenschieben-Sense',
        icon: '🌾', slotType: 'weapon', archetype: 'strength', hands: 2,
        minLevel: 58,
        requirements: { level: 58, str: 220, agi: 0, int: 0 },
        damage: { min: 460, max: 760 }, attackIntervalSeconds: 10.5,
        bonuses: [
            { key: 'crit_chance', value: 20, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'crit_multiplier', value: 60, en: '+#% Critical Strike Multiplier', de: '+#% Kritischer Schadensmultiplikator' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'flat_health', value: 78, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -40, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Precision instrument. Imprecise targets.',
        flavorDe: 'Präzisionsinstrument. Unpräzise Ziele.',
    },
    {
        uniqueId: 'chalksword_of_corrected_errors',
        nameEn: 'Chalksword of Corrected Errors',
        nameDe: 'Kreideschwert der Korrigierten Fehler',
        icon: '🖍️', slotType: 'weapon', archetype: 'strength', hands: 1,
        minLevel: 44,
        requirements: { level: 44, str: 168, agi: 0, int: 0 },
        damage: { min: 272, max: 453 }, attackIntervalSeconds: 5.0,
        bonuses: [
            { key: 'stagger', value: 45, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'pushback', value: 0.5, en: '+#s Pushback on hit', de: '+#s Rückstoß bei Treffern' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'focus', value: -26, en: '#% increased Time Penalty from Mistakes', de: '#% erhöhte Zeitstrafe durch Fehler' }
        ],
        flavorEn: 'Every swing writes a big red X over something.',
        flavorDe: 'Jeder Hieb schreibt ein großes rotes X über irgendwas.',
    },
    {
        uniqueId: 'abacus_flail',
        nameEn: 'Abacus Flail',
        nameDe: 'Abacus-Dreschflegel',
        icon: '🧮', slotType: 'weapon', archetype: 'strength', hands: 1,
        minLevel: 36,
        requirements: { level: 36, str: 137, agi: 0, int: 0 },
        damage: { min: 236, max: 414 }, attackIntervalSeconds: 4.5,
        bonuses: [
            { key: 'mana_on_kill', value: 8, en: '+# Mana gained on Kill', de: '+# Mana bei Kill' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 40, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'attack_speed', value: -2, en: 'Melee Strikes occur 3s slower', de: 'Nahkampfschläge erfolgen 3s langsamer' }
        ],
        flavorEn: 'Counts your kills out loud. In base twelve.',
        flavorDe: 'Zählt deine Kills laut mit. Im Zwölfersystem.',
    },
    {
        uniqueId: 'protractor_polearm',
        nameEn: 'Protractor Polearm',
        nameDe: 'Winkelmesser-Stangenwaffe',
        icon: '📐', slotType: 'weapon', archetype: 'strength', hands: 2,
        minLevel: 66,
        requirements: { level: 66, str: 250, agi: 0, int: 0 },
        damage: { min: 880, max: 1560 }, attackIntervalSeconds: 11.0,
        bonuses: [
            { key: 'cleave', value: 50, en: '#% chance to Cleave (hit nearby Monsters)', de: '#% Chance auf Keilschlag (nahe Monster treffen)' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'flat_health', value: 71, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'accuracy', value: -48, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Always exactly ninety degrees off target.',
        flavorDe: 'Immer exakt neunzig Grad am Ziel vorbei.',
    },
    {
        uniqueId: 'compass_needle_dirk',
        nameEn: 'Compass Needle Dirk',
        nameDe: 'Kompassnadel-Dolch',
        icon: '🧭', slotType: 'weapon', archetype: 'agility', hands: 1,
        minLevel: 22,
        requirements: { level: 22, str: 0, agi: 85, int: 0 },
        damage: { min: 41, max: 75 }, attackIntervalSeconds: 2.2,
        bonuses: [
            { key: 'pierce', value: 40, en: '#% chance for Projectiles to Pierce', de: '#% Chance, dass Projektile durchdringen' },
            { key: 'attack_speed', value: 0.5, en: 'Melee Strikes occur #s more often', de: 'Nahkampfschläge erfolgen #s häufiger' },
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'flat_health', value: -54, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Points north. Stabs wherever you tell it. Reluctantly.',
        flavorDe: 'Zeigt nach Norden. Sticht wohin du es befiehlst. Widerwillig.',
    },
    {
        uniqueId: 'graders_red_pen',
        nameEn: "Grader's Red Pen",
        nameDe: 'Rotstift des Benoters',
        icon: '🖊️', slotType: 'weapon', archetype: 'any', hands: 1,
        minLevel: 72,
        requirements: { level: 72, str: 120, agi: 120, int: 40 },
        damage: { min: 657, max: 1061 }, attackIntervalSeconds: 5.5,
        bonuses: [
            { key: 'overkill', value: 35, en: '#% increased Overkill Damage transferred to a nearby Monster', de: '#% erhöhter Overkill-Schaden, der auf ein nahes Monster übertragen wird' },
            { key: 'life_leech', value: 5, en: '#% of Damage Leeched as Life', de: '#% des Schadens als Leben abgesaugt' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'accuracy', value: 85, en: '+# Accuracy', de: '+# Präzision' }
        ],
        downsides: [
            { key: 'flat_mana', value: -72, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'Nothing survives peer review.',
        flavorDe: 'Nichts übersteht das Peer-Review.',
    },

    // ── Ranged ────────────────────────────────────────────────────────
    {
        uniqueId: 'spitball_sniper',
        nameEn: 'Spitball Sniper',
        nameDe: 'Spuckballs-Scharfschütze',
        icon: '🎯', slotType: 'ranged', archetype: 'agility',
        minLevel: 12,
        requirements: { level: 12, str: 0, agi: 45, int: 0 },
        damage: { min: 36, max: 66 }, attackIntervalSeconds: 1.8,
        bonuses: [
            { key: 'crit_chance', value: 15, en: '+#% Critical Hit Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 20, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'accuracy', value: -30, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Zero budget. Infinite disrespect.',
        flavorDe: 'Null Budget. Unendliche Respektlosigkeit.',
    },
    {
        uniqueId: 'boomerang_of_returning_regrets',
        nameEn: 'Boomerang of Returning Regrets',
        nameDe: 'Bumerang der Zurückkehrenden Reue',
        icon: '🪃', slotType: 'ranged', archetype: 'agility',
        minLevel: 38,
        requirements: { level: 38, str: 0, agi: 145, int: 0 },
        damage: { min: 158, max: 271 }, attackIntervalSeconds: 3.0,
        bonuses: [
            { key: 'multishot', value: 30, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'crit_chance', value: 8, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' }
        ],
        downsides: [
            { key: 'accuracy', value: -44, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Everything you throw away comes back. Everything.',
        flavorDe: 'Alles, was du wegwirfst, kommt zurück. Alles.',
    },
    {
        uniqueId: 'nerf_crossbow_of_near_misses',
        nameEn: 'Nerf Crossbow of Near Misses',
        nameDe: 'Schaumstoff-Armbrust der Knappen Vorbeischüsse',
        icon: '🏹', slotType: 'ranged', archetype: 'agility',
        minLevel: 54,
        requirements: { level: 54, str: 0, agi: 205, int: 0 },
        damage: { min: 255, max: 419 }, attackIntervalSeconds: 2.8,
        bonuses: [
            { key: 'multishot', value: 60, en: '#% chance to fire an additional Projectile', de: '#% Chance auf ein zusätzliches Projektil' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 30, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'fate', value: 18, en: '#% increased Fate', de: '#% erhöhtes Schicksal' }
        ],
        downsides: [
            { key: 'accuracy', value: -61, en: '-# Accuracy', de: '-# Präzision' }
        ],
        flavorEn: 'Sprays foam in every direction except the right one.',
        flavorDe: 'Versprüht Schaum in alle Richtungen außer der richtigen.',
    },
    {
        uniqueId: 'trebuchet_of_tutoring',
        nameEn: 'Trebuchet of Tutoring',
        nameDe: 'Blide des Nachhilfeunterrichts',
        icon: '🏰', slotType: 'ranged', archetype: 'strength',
        minLevel: 70,
        requirements: { level: 70, str: 266, agi: 0, int: 0 },
        damage: { min: 356, max: 721 }, attackIntervalSeconds: 9.5,
        bonuses: [
            { key: 'stagger', value: 50, en: '#% chance to Stagger Monsters on hit', de: '#% Chance, Monster bei Treffern zu betäuben' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' },
            { key: 'inc_physical_damage', value: 40, en: '#% increased Physical Damage', de: '#% erhöhter physischer Schaden' },
            { key: 'fate', value: 18, en: '#% increased Fate', de: '#% erhöhtes Schicksal' }
        ],
        downsides: [
            { key: 'accuracy', value: -47, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_health', value: -65, en: '-# to maximum Health', de: '-# zu maximalem Leben' }
        ],
        flavorEn: 'The superior siege engine. Also the superior teaching method.',
        flavorDe: 'Die überlegene Belagerungsmaschine. Auch die überlegene Lehrmethode.',
    },
    {
        uniqueId: 'dart_deck_of_doomed_division',
        nameEn: 'Dart Deck of Doomed Division',
        nameDe: 'Pfeildeck der Verlorenen Division',
        icon: '🃏', slotType: 'ranged', archetype: 'agility',
        minLevel: 62,
        requirements: { level: 62, str: 0, agi: 235, int: 0 },
        damage: { min: 486, max: 783 }, attackIntervalSeconds: 3.2,
        bonuses: [
            { key: 'chain', value: 35, en: '#% chance for Projectiles to Chain', de: '#% Chance, dass Projektile ketten' },
            { key: 'chance_to_shock', value: 20, en: '#% chance to Shock', de: '#% Chance auf Schocken' },
            { key: 'accuracy', value: 65, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'crit_chance', value: 10, en: '+#% to Critical Strike Chance', de: '+#% Kritische Trefferchance' }
        ],
        downsides: [
            { key: 'flat_health', value: -84, en: '-# to maximum Health', de: '-# zu maximalem Leben' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Fifty-two cards. All of them sharp. None of them merciful.',
        flavorDe: 'Zweiundfünfzig Karten. Alle scharf. Keine gnädig.',
    },

    // ── Shield ────────────────────────────────────────────────────────
    {
        uniqueId: 'parasol_of_point_defense',
        nameEn: 'Parasol of Point Defense',
        nameDe: 'Sonnenschirm der Punktabwehr',
        icon: '☂️', slotType: 'shield', archetype: 'any',
        minLevel: 39,
        requirements: { level: 39, str: 100, agi: 50, int: 0 },
        defenses: { armour: 200, evasion: 0, absorption: 0 },
        blockChance: 25,
        bonuses: [
            { key: 'block_chance', value: 8, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 8, en: '+#% Spell Block Chance', de: '+#% Zauberblockchance' },
            { key: 'flat_health', value: 49, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'attack_speed', value: -15.6, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' }
        ],
        flavorEn: 'Elegant against rain, arrows, and meteors alike.',
        flavorDe: 'Elegant gegen Regen, Pfeile und Meteore gleichermaßen.',
    },
    {
        uniqueId: 'riot_shield_of_reading_breaks',
        nameEn: 'Riot Shield of Reading Breaks',
        nameDe: 'Kampfchild der Lesepausen',
        icon: '📖', slotType: 'shield', archetype: 'strength',
        minLevel: 47,
        requirements: { level: 47, str: 178, agi: 0, int: 0 },
        defenses: { armour: 280, evasion: 0, absorption: 0 },
        blockChance: 20,
        bonuses: [
            { key: 'flat_health', value: 90, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_recovery', value: 30, en: '#% faster Block Recovery', de: '#% schnellere Blockerholung' },
            { key: 'block_chance', value: 8, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 8, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' }
        ],
        downsides: [
            { key: 'flat_mana', value: -56, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'POLICE line not included. Snack compartment added.',
        flavorDe: 'Absperrband nicht im Lieferumfang. Snackfach hinzugefügt.',
    },
    {
        uniqueId: 'mirrored_manhole_cover',
        nameEn: 'Mirrored Manhole Cover',
        nameDe: 'Spiegelnder Kanaldeckel',
        icon: '🪞', slotType: 'shield', archetype: 'any',
        minLevel: 56,
        requirements: { level: 56, str: 150, agi: 100, int: 0 },
        defenses: { armour: 240, evasion: 0, absorption: 100 },
        blockChance: 18,
        bonuses: [
            { key: 'chance_to_blind', value: 15, en: '#% chance to Blind on hit', de: '#% Chance, bei Treffern zu blenden' },
            { key: 'warding', value: 60, en: '+# Warding', de: '+# Wardschutz' },
            { key: 'flat_health', value: 76, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' }
        ],
        downsides: [
            { key: 'accuracy', value: -33, en: '-# Accuracy', de: '-# Präzision' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Monsters mostly attack their own reflection anyway.',
        flavorDe: 'Monster greifen ohnehin meistens ihr eigenes Spiegelbild an.',
    },
    {
        uniqueId: 'binder_shield_of_bureaucracy',
        nameEn: 'Binder Shield of Bureaucracy',
        nameDe: 'Ordner-Schild der Bürokratie',
        icon: '🗂️', slotType: 'shield', archetype: 'strength',
        minLevel: 65,
        requirements: { level: 65, str: 247, agi: 0, int: 0 },
        defenses: { armour: 420, evasion: 0, absorption: 0 },
        blockChance: 30,
        bonuses: [
            { key: 'mistake_count', value: 1, en: '+# Allowed Mistakes', de: '+# erlaubte Fehler' },
            { key: 'flat_health', value: 70, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'spell_block_chance', value: 10, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' }
        ],
        downsides: [
            { key: 'attack_speed', value: -26, en: '#% reduced Attack Speed', de: '#% reduzierte Angriffsgeschwindigkeit' },
            { key: 'flat_mana', value: -35, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'Form 27-B must be filed before any monster may pass. In triplicate.',
        flavorDe: 'Formular 27-B muss eingereicht werden, bevor ein Monster passieren darf. Dreifach.',
    },
    {
        uniqueId: 'colander_of_collected_hits',
        nameEn: 'Colander of Collected Hits',
        nameDe: 'Durchschlag Gesammelter Treffer',
        icon: '🥅', slotType: 'shield', archetype: 'strength',
        minLevel: 25,
        requirements: { level: 25, str: 95, agi: 0, int: 0 },
        defenses: { armour: 120, evasion: 0, absorption: 0 },
        blockChance: 22,
        bonuses: [
            { key: 'block_chance', value: 10, en: '+#% Block Chance', de: '+#% Blockchance' },
            { key: 'flat_health', value: 32, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'spell_block_chance', value: 6, en: '+#% to Spell Block Chance', de: '+#% Zauberblockchance' }
        ],
        downsides: [
            { key: 'dodge', value: -13, en: '-#% chance to Dodge Attacks', de: '-#% Ausweichchance' }
        ],
        flavorEn: 'Blocks most things. Drains the rest.',
        flavorDe: 'Blockt die meisten Dinge. Den Rest lässt er abtropfen.',
    },

    // ══════════════════════════════════════════════════════════════════
    // ── ZERO-AUTOMARK UNIQUES (QoL-for-power tradeoff) ─────────────────
    // Each carries autoMarkZeroLines:true — empty rows/columns are marked
    // incorrect on level start (see _egApplyUniqueZeroLineAutomark). To pay
    // for that QoL their raw stats run slightly below curve for the level
    // plus a real downside.
    // ══════════════════════════════════════════════════════════════════
    {
        uniqueId: 'blank_slate_band',
        nameEn: 'Blank Slate Band',
        nameDe: 'Ring der Leeren Tafel',
        icon: '⬜', slotType: 'ring', archetype: 'any',
        minLevel: 24,
        requirements: { level: 24, str: 0, agi: 91, int: 0 },
        autoMarkZeroLines: true,
        bonuses: [
            { key: 'accuracy', value: 32, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'flat_health', value: 28, en: '+# to maximum Health', de: '+# zu maximalem Leben' },
            { key: 'mistake_not_count', value: 10, en: '#% chance for Mistakes to not count', de: '#% Chance, dass Fehler nicht gezählt werden' }
        ],
        downsides: [
            { key: 'flat_mana', value: -40, en: '-# to maximum Mana', de: '-# zu maximalem Mana' },
            { key: 'fire_resist', value: -20, en: '-#% to Fire Resistance', de: '-#% Feuerwiderstand' }
        ],
        flavorEn: 'Nothing written, nothing wasted. The empty lines fill themselves.',
        flavorDe: 'Nichts geschrieben, nichts verschwendet. Die leeren Zeilen füllen sich selbst.',
    },

    {
        uniqueId: 'surveyors_final_draft',
        nameEn: "Surveyor's Final Draft",
        nameDe: 'Letzter Entwurf des Landvermessers',
        icon: '📏', slotType: 'amulet', archetype: 'any',
        minLevel: 48,
        requirements: { level: 48, str: 0, agi: 0, int: 182 },
        autoMarkZeroLines: true,
        bonuses: [
            { key: 'intelligence', value: 14, en: '+# to Intelligence', de: '+# zu Intelligenz' },
            { key: 'reveal_hint', value: 12, en: '#% chance to show a Reveal Hint on questions', de: '#% Chance auf einen Aufdeckungshinweis bei Fragen' },
            { key: 'flat_health', value: 44, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -30, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' },
            { key: 'flat_mana', value: -30, en: '-# to maximum Mana', de: '-# zu maximalem Mana' }
        ],
        flavorEn: 'He measured every blank twice, so you would not have to.',
        flavorDe: 'Er vermaß jede Leere zweimal, damit du es nicht musst.',
    },

    {
        uniqueId: 'axiom_of_emptiness',
        nameEn: 'Axiom of Emptiness',
        nameDe: 'Axiom der Leere',
        icon: '🕳️', slotType: 'talisman', archetype: 'any',
        minLevel: 70,
        requirements: { level: 70, str: 0, agi: 0, int: 0 },
        autoMarkZeroLines: true,
        bonuses: [
            { key: 'fate', value: 20, en: '#% increased Fate', de: '#% erhöhtes Schicksal' },
            { key: 'accuracy', value: 60, en: '+# Accuracy', de: '+# Präzision' },
            { key: 'flat_health', value: 80, en: '+# to maximum Health', de: '+# zu maximalem Leben' }
        ],
        downsides: [
            { key: 'time_added', value: -40, en: '-#s to Puzzle Time', de: '-#s Rätselzeit' },
            { key: 'shadow_resist', value: -25, en: '-#% to Shadow Resistance', de: '-#% Schattenwiderstand' }
        ],
        flavorEn: 'Prove nothing fills nothing, and the grid concedes the point.',
        flavorDe: 'Beweise, dass nichts nichts füllt, und das Gitter gibt dir recht.',
    },

];


//========================================================================
//-------------------UNIQUE STAT REQUIREMENT REBALANCE (2026)-------------
//========================================================================
// Zero-req chase uniques were free for any build - now enforce identity.
// Progressive: armor pure 0.60@10->0.85@88, jewelry pure 0.50->0.68, hybrid 0.40->0.55 / 0.32->0.44.
// Keeps starter uniques (minLevel <=10) untouched.
(() => {
    const pureForArmor = (lvl) => { const t=Math.min(1,(lvl-10)/78); const f=0.60+0.25*t; return Math.round(20+(lvl-1)*5*f); };
    const pureForJewelry = (lvl) => { const t=Math.min(1,(lvl-10)/78); const f=0.50+0.18*t; return Math.round(16+(lvl-1)*5*f); };
    const hybridForArmor = (lvl) => { if(lvl<40) return null; return Math.round(20+(lvl-1)*2.75); };
    const hybridForJewelry = (lvl) => { if(lvl<40) return null; return Math.round(16+(lvl-1)*2.20); };
    const JEWELRY = new Set(['ring','earring','amulet','talisman']);
    const ARMOR_SLOTS = new Set(['head','chest','pants','shoulders','cloak','bracers','gloves','boots','belt','weapon','shield','ranged','arcane']);
    for (const u of EG_UNIQUE_ITEMS) {
        const lvl = u.minLevel || 1;
        if (lvl <= 10) continue;
        const cur = u.requirements || { level: lvl, str:0, agi:0, int:0 };
        const hasStat = (cur.str||0)+(cur.agi||0)+(cur.int||0) > 0;
        if (hasStat) {
            // Bump existing pure/hybrid uniques that are too low (<70% of curve)
            const isHybrid = ((cur.str>0?1:0)+(cur.agi>0?1:0)+(cur.int>0?1:0))===2;
            const isTriple = ((cur.str>0?1:0)+(cur.agi>0?1:0)+(cur.int>0?1:0))===3;
            if (isHybrid && !isTriple) {
                const target = (JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl));
                const curPer = Math.max(cur.str||0,cur.agi||0,cur.int||0);
                if (target > curPer) {
                    if (cur.str>0) cur.str = target;
                    if (cur.agi>0) cur.agi = target;
                    if (cur.int>0) cur.int = target;
                }
            } else if (!isHybrid && !isTriple) {
                // pure single-stat
                const target = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
                const curVal = cur.str||cur.agi||cur.int;
                if (target > curVal && curVal>0) {
                    if (cur.str>0) cur.str = target;
                    else if (cur.agi>0) cur.agi = target;
                    else if (cur.int>0) cur.int = target;
                }
            }
            u.requirements = cur;
            continue;
        }
        // Zero-stat -> assign based on power and slot
        // Jewelry any keeps lighter pure, armor/weapons get full pure, high-impact chase gets hybrid/triple
        const isHighPower = lvl >= 55 && (u.slotType === 'amulet' || u.slotType === 'talisman' || u.slotType === 'ring' || u.slotType === 'chest' || u.slotType === 'weapon');
        // Prefer archetype if not any
        let arch = u.archetype;
        if (arch === 'any' || !arch) {
            // Infer from flavor: default to single stat 70% of pure for jewelry flex, so still requires investment but allows off-build with gear
            const target = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
            // Use least-committed: require int for amulet/arcane, agi for ranged/bracers, str for weapon/shield, any for talisman -> pick str for talisman hybrid?
            if (JEWELRY.has(u.slotType)) {
                // jewelry any: give single stat of lowest barrier (agi for generic, but keep as int to push spell builds? Choose agi for universal)
                // Assign to agi for jewelry free-for-all? Instead assign to int for amulet, agi for ring, etc.
                if (u.slotType === 'amulet' || u.slotType === 'arcane') { cur.int = target; }
                else if (u.slotType === 'ring') { cur.agi = target; }
                else if (u.slotType === 'earring') { cur.agi = target; }
                else { cur.int = target; }
            } else {
                // armor any: give str (most common)
                cur.str = target;
            }
        } else if (arch === 'strength') cur.str = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'agility') cur.agi = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'intellect') cur.int = JEWELRY.has(u.slotType) ? pureForJewelry(lvl) : pureForArmor(lvl);
        else if (arch === 'str_agi') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.str=t; cur.agi=t; }
        else if (arch === 'str_int') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.str=t; cur.int=t; }
        else if (arch === 'agi_int') { const t = JEWELRY.has(u.slotType) ? hybridForJewelry(lvl) : hybridForArmor(lvl); cur.agi=t; cur.int=t; }
        cur.level = lvl;
        u.requirements = cur;
    }
})();


//------------------------------------------------------------------------
//-------------------HELPERS----------------------------------------------
//------------------------------------------------------------------------

// Returns the special (non-stat) modifier lines for a unique item or def.
// Currently only the zero-line auto-mark perk. Each entry is { en, de }.
function _egGetUniqueSpecialLines(itemOrDef) {
    if (!itemOrDef) return [];
    // Item instances carry the copied boolean flag (see _egBuildUniqueItem).
    const hasZeroAutomark = !!itemOrDef.autoMarkZeroLines;
    // Defs may also declare explicit specialLines for future perks.
    const extra = Array.isArray(itemOrDef.specialLines) ? itemOrDef.specialLines : [];
    const out = extra
        .filter(s => s && (s.en || s.de))
        .map(s => ({ en: s.en || s.de, de: s.de || s.en }));
    if (hasZeroAutomark && !out.some(s => s.en === EG_UNIQUE_ZERO_AUTOMARK_EN)) {
        out.push({ en: EG_UNIQUE_ZERO_AUTOMARK_EN, de: EG_UNIQUE_ZERO_AUTOMARK_DE });
    }
    return out;
}

// True when any currently equipped unique grants zero-line auto-mark.
function _egHasZeroAutomarkEquipped() {
    try {
        if (typeof _egEquipped === 'undefined' || !_egEquipped) return false;
        return Object.values(_egEquipped).some(it => !!it && !!it.isUnique && !!it.autoMarkZeroLines);
    } catch (e) { return false; }
}

// Unique QoL perk: mark every cell of each all-empty row/column as
// incorrect (grey X → userGrid=2 + systemMarkedGrid) at level start.
// Call AFTER buildGrid() so the DOM exists. Returns the number of cells
// marked. Respects ergodic_field / oracle (which disable all auto-marks).
// Zero lines hold no solution cells, so this can never solve the puzzle
// and intentionally skips checkWin().
function _egApplyUniqueZeroLineAutomark() {
    if (!_egHasZeroAutomarkEquipped()) return 0;
    if (typeof cur === 'undefined' || !cur || !cur.grid) return 0;
    try {
        if (typeof ptHasSkill === 'function' && ptHasSkill('keystone_ergodic_field')) return 0;
    } catch (e) {}
    if (window._oracleActive) return 0;

    const sol = cur.grid;
    const rows = sol.length;
    if (!rows) return 0;
    const cols = sol[0].length;
    if (!cols) return 0;

    const affected = [];
    const markCell = (r, c) => {
        if (sol[r][c] !== 0) return;
        if (typeof wrongGrid !== 'undefined' && wrongGrid[r][c]) return;
        if (typeof userGrid === 'undefined' || userGrid[r][c] === 2) return;
        // Only touch untouched/questioned cells — never overwrite fills.
        if (userGrid[r][c] !== 0 && userGrid[r][c] !== 3) return;
        userGrid[r][c] = 2;
        try { systemMarkedGrid[r][c] = true; } catch (e) {}
        try { renderCell(r, c); } catch (e) {}
        affected.push(`g-${r}-${c}`);
        // Keep intersecting non-zero lines' clue flags consistent; isInitial
        // suppresses reward side-effects (see updClues).
        try { if (typeof updClues === 'function') updClues(r, c, true); } catch (e) {}
    };

    for (let r = 0; r < rows; r++) {
        let empty = true;
        for (let c = 0; c < cols; c++) {
            if (sol[r][c] === 1) { empty = false; break; }
        }
        if (!empty) continue;
        for (let c = 0; c < cols; c++) markCell(r, c);
    }
    for (let c = 0; c < cols; c++) {
        let empty = true;
        for (let r = 0; r < rows; r++) {
            if (sol[r][c] === 1) { empty = false; break; }
        }
        if (!empty) continue;
        for (let r = 0; r < rows; r++) markCell(r, c);
    }

    if (affected.length && typeof _applyCellEffect === 'function') {
        try { _applyCellEffect(affected, 'mark'); } catch (e) {}
    }
    return affected.length;
}

// Localized label for one unique stat line; '#' is replaced by the value
// with an explicit '+' sign for positive numbers.
function _egUniqueStatLabel(stat) {
    const template = (LANG === 'de') ? (stat.de || stat.en) : (stat.en || stat.de);
    const val = Number(stat.value) || 0;
    const str = String(template);
    const signed = val >= 0 ? `+${val}` : `${val}`;
    // Templates historically use '+#' / '-#' while the helper also adds a
    // sign — replacing only '#' would produce "++2" / "--30" (e.g. Pebble
    // of Patience). Handle signed placeholders first.
    if (str.includes('+#') || str.includes('-#')) {
        return str.replace('+#', signed).replace('-#', signed);
    }
    return str.replace('#', signed);
}

// Fallback: derive base defenses / damage from the closest base item
// so uniques without explicit stats still have meaningful base armor / damage
// and are not useless. This also fixes old uniques that were defined without
// a defenses/damage field.
function _egUniqueFallbackDefenses(def) {
    const jewelry = new Set(['ring', 'earring', 'amulet', 'talisman']);
    if (jewelry.has(def.slotType)) return { armour: 0, evasion: 0, absorption: 0 };
    if (typeof EG_ALL_BASE_TYPES === 'undefined' || !Array.isArray(EG_ALL_BASE_TYPES)) return null;
    let candidates = EG_ALL_BASE_TYPES.filter(b => b.slotType === def.slotType);
    if (!candidates.length) return null;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    if (best && best.defenses) return { armour: best.defenses.armour || 0, evasion: best.defenses.evasion || 0, absorption: best.defenses.absorption || 0 };
    return null;
}
function _egUniqueFallbackDamage(def) {
    if (typeof EG_ALL_BASE_TYPES === 'undefined' || !Array.isArray(EG_ALL_BASE_TYPES)) return null;
    let candidates = EG_ALL_BASE_TYPES.filter(b => b.slotType === def.slotType && b.damage);
    if (!candidates.length) return null;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    if (!best || !best.damage) return null;
    const out = { damage: { min: best.damage.min, max: best.damage.max } };
    if (best.attackIntervalSeconds != null) out.attackIntervalSeconds = best.attackIntervalSeconds;
    else if (def.slotType === 'ranged') out.attackIntervalSeconds = 3.0; // sensible default for ranged
    return out;
}
function _egUniqueFallbackBlockChance(def) {
    if (def.slotType !== 'shield') return null;
    if (typeof EG_ALL_BASE_TYPES === 'undefined' || !Array.isArray(EG_ALL_BASE_TYPES)) return null;
    let candidates = EG_ALL_BASE_TYPES.filter(b => b.slotType === 'shield' && b.blockChance != null);
    if (!candidates.length) return 24;
    let sameArch = candidates.filter(b => b.archetype === def.archetype);
    let pool = sameArch.length ? sameArch : candidates;
    let eligible = pool.filter(b => (b.minLevel || 1) <= (def.minLevel || 1));
    if (!eligible.length) eligible = pool;
    let best = eligible.reduce((a, b) => (b.minLevel > a.minLevel ? b : a), eligible[0]);
    return best.blockChance != null ? best.blockChance : 24;
}

// Helper: strenghten downside values to balance new implicits (~30% stronger).
// Keeps ±1 untouched (e.g. -1 mistake_count) to avoid double-harsh penalties.
function _egStrengthenDownsideValue(v) {
    if (v === 0 || Math.abs(v) === 1) return v;
    const factor = 1.30;
    if (Number.isInteger(v)) {
        const scaled = v * factor;
        let r = Math.round(scaled);
        if (r === v) r = v > 0 ? v + 1 : v - 1;
        return r;
    }
    const scaled = v * factor;
    return Math.round(scaled * 10) / 10;
}
function _egBuildUniqueImplicits(def, defenses) {
    try {
        if (typeof _egRollImplicitsForBase !== 'function') return [];
        const syntheticBase = {
            slotType: def.slotType,
            defenses: defenses || def.defenses || { armour: 0, evasion: 0, absorption: 0 },
            requirements: def.requirements || { level: def.minLevel || 1 },
            minLevel: def.minLevel || 1
        };
        const res = _egRollImplicitsForBase(syntheticBase);
        return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
}
// Retroactively heals an already-stashed unique that was saved before
// Two-handed unique weapons (everything else with slotType 'weapon' is 1H).
const EG_UNIQUE_TWO_HANDED_IDS = new Set([
    'worldsplitter', 'doomcallers_maul', 'hammer_of_reasonable_doubt',
    'protractor_polearm', 'slide_rule_scythe',
]);

// Infers 1H/2H for a weapon item without a `hands` field (legacy saves).
// Prefers the unique def, then the base-type table, then a slow-interval heuristic.
function _egInferWeaponHands(item) {
    if (!item || item.slotType !== 'weapon') return null;
    if (typeof EG_UNIQUE_ITEMS !== 'undefined' && item.baseId) {
        const def = EG_UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId);
        if (def && (def.hands === 1 || def.hands === 2)) return def.hands;
        if (def && EG_UNIQUE_TWO_HANDED_IDS.has(def.uniqueId)) return 2;
    }
    if (typeof EG_ALL_BASE_TYPES !== 'undefined' && item.baseId) {
        const base = EG_ALL_BASE_TYPES.find(b => b.id === item.baseId);
        if (base && (base.hands === 1 || base.hands === 2)) return base.hands;
    }
    // Heuristic: very slow swing (>= 9.8s) was a 2H swing in the old system.
    if (typeof item.attackIntervalSeconds === 'number' && item.attackIntervalSeconds >= 9.8) return 2;
    return 1;
}

// base armor/damage was added or before implicits/downside rebalance.
// Mutates `item` in place, returns true if anything was changed.
function _egHealUniqueItem(item) {
    if (!item || !item.isUnique || !item.baseId) return false;
    let changed = false;
    let def = null;
    if (typeof EG_UNIQUE_ITEMS !== 'undefined' && Array.isArray(EG_UNIQUE_ITEMS)) {
        def = EG_UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId) || null;
    }
    // --- defenses ---
    let expDef = null;
    if (def && def.defenses) expDef = def.defenses;
    else if (typeof _egUniqueFallbackDefenses === 'function') {
        try { expDef = _egUniqueFallbackDefenses({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 }); } catch (e) { expDef = null; }
    }
    if (expDef) {
        const cur = item.defenses;
        const missing = !cur || typeof cur.armour !== 'number' || typeof cur.evasion !== 'number' || typeof cur.absorption !== 'number';
        const zeroButExpNonZero = cur && cur.armour === 0 && cur.evasion === 0 && cur.absorption === 0 && (expDef.armour || expDef.evasion || expDef.absorption);
        if (missing || zeroButExpNonZero) {
            item.defenses = { armour: expDef.armour || 0, evasion: expDef.evasion || 0, absorption: expDef.absorption || 0 };
            changed = true;
        }
    }
    // --- damage ---
    let expDmg = null, expInterval = undefined;
    if (def && def.damage) { expDmg = def.damage; expInterval = def.attackIntervalSeconds; }
    else if (typeof _egUniqueFallbackDamage === 'function') {
        try {
            const fb = _egUniqueFallbackDamage({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 });
            if (fb) { expDmg = fb.damage; expInterval = fb.attackIntervalSeconds; }
        } catch (e) {}
    }
    if (expDmg && (!item.damage || typeof item.damage.min !== 'number' || typeof item.damage.max !== 'number')) {
        item.damage = { min: expDmg.min, max: expDmg.max };
        if (expInterval != null) item.attackIntervalSeconds = expInterval;
        changed = true;
    }
    // --- blockChance (shields) ---
    if (item.slotType === 'shield') {
        let expBlock = null;
        if (def && def.blockChance != null) expBlock = def.blockChance;
        else if (typeof _egUniqueFallbackBlockChance === 'function') {
            try { expBlock = _egUniqueFallbackBlockChance({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || 1 }); } catch (e) {}
        }
        if (expBlock != null && (item.blockChance == null || typeof item.blockChance !== 'number')) {
            item.blockChance = expBlock;
            changed = true;
        }
    }
    // --- hands (1H/2H weapons) ---
    if (item.slotType === 'weapon' && (item.hands !== 1 && item.hands !== 2)) {
        if (def && (def.hands === 1 || def.hands === 2)) {
            item.hands = def.hands;
            changed = true;
        } else if (typeof _egInferWeaponHands === 'function') {
            const inferred = _egInferWeaponHands(item);
            if (inferred === 1 || inferred === 2) {
                item.hands = inferred;
                changed = true;
            }
        } else {
            item.hands = 1;
            changed = true;
        }
    }
    // --- implicits (now allowed on uniques) ---
    if (!Array.isArray(item.implicits) || item.implicits.length === 0) {
        const expImps = def ? _egBuildUniqueImplicits(def, item.defenses || expDef) : [];
        // Also try fallback from item itself if no def
        let imps = expImps;
        if ((!imps || !imps.length) && typeof _egRollImplicitsForBase === 'function') {
            try {
                const syn = { slotType: item.slotType, defenses: item.defenses || expDef || {}, requirements: item.requirements || { level: item.itemLevel || 1 }, minLevel: item.itemLevel || 1 };
                imps = _egRollImplicitsForBase(syn) || [];
            } catch (e) { imps = []; }
        }
        if (imps && imps.length) {
            item.implicits = imps;
            changed = true;
        } else if (!Array.isArray(item.implicits)) {
            item.implicits = [];
        }
    }
    // --- unique-only QoL perks (non-stat flags) ---
    if (def && def.autoMarkZeroLines && !item.autoMarkZeroLines) {
        item.autoMarkZeroLines = true;
        changed = true;
    }
    // --- downsides: strengthen to balance new implicits ---
    if (def && Array.isArray(def.downsides) && Array.isArray(item.mods)) {
        for (let i = 0; i < def.downsides.length; i++) {
            const stat = def.downsides[i];
            const expected = _egStrengthenDownsideValue(stat.value);
            const fid = `unique_${def.uniqueId}_down_${i}`;
            const mod = item.mods.find(m => m.familyId === fid && m.isDownside);
            if (!mod || !mod.rolledStats || !mod.rolledStats[0]) continue;
            const curVal = mod.rolledStats[0].value;
            if (curVal !== expected) {
                mod.rolledStats[0].value = expected;
                // rebuild label with new value
                const tmpStat = { ...stat, value: expected };
                mod.rolledStats[0].label = _egUniqueStatLabel(tmpStat);
                // also keep key consistent
                mod.rolledStats[0].key = stat.key;
                changed = true;
            }
        }
    }
    return changed;
}

// Builds the full item object for a unique definition.
function _egBuildUniqueItem(def, monsterLevel) {
    const name = (LANG === 'de') ? (def.nameDe || def.nameEn) : def.nameEn;
    const icon = def.icon || EG_SLOT_ICONS[def.slotType] || '📦';

    const bonusMod = {
        familyId: `unique_${def.uniqueId}`,
        type: 'unique',
        tier: 0,
        rolledStats: def.bonuses.map(stat => ({
            key: stat.key,
            label: _egUniqueStatLabel(stat),
            value: stat.value,
        })),
    };
    const downsideMods = (def.downsides || []).map((stat, i) => {
        const sv = _egStrengthenDownsideValue(stat.value);
        const tmp = { ...stat, value: sv };
        return {
            familyId: `unique_${def.uniqueId}_down_${i}`,
            type: 'unique',
            tier: 0,
            isDownside: true,
            rolledStats: [{
                key: stat.key,
                label: _egUniqueStatLabel(tmp),
                value: sv,
            }],
        };
    });

    // Resolve base stats — use explicit values if present, otherwise fall back
    // to the closest base item so every unique has meaningful armor / damage.
    let defenses = null;
    if (def.defenses) defenses = { ...def.defenses };
    else defenses = _egUniqueFallbackDefenses(def);

    let damage = null;
    let attackIntervalSeconds = undefined;
    if (def.damage) {
        damage = { ...def.damage };
        attackIntervalSeconds = def.attackIntervalSeconds;
    } else {
        const fb = _egUniqueFallbackDamage(def);
        if (fb) {
            damage = fb.damage;
            attackIntervalSeconds = fb.attackIntervalSeconds;
        }
    }

    let blockChance = def.blockChance;
    if (blockChance == null && def.slotType === 'shield') {
        const fb = _egUniqueFallbackBlockChance(def);
        if (fb != null) blockChance = fb;
    }

    const implicits = _egBuildUniqueImplicits(def, defenses);

    return {
        id: `${def.uniqueId}_${Date.now()}_${Math.floor(Math.random() * 10000)}_u`,
        baseId: def.uniqueId,
        name,
        baseName: name,
        icon,
        ...(def.autoMarkZeroLines ? { autoMarkZeroLines: true } : {}),

        category: 'equip',
        slotType: def.slotType,
        archetype: def.archetype || 'any',
        rarity: 'legendary',
        isUnique: true,

        itemLevel: Math.max(def.minLevel, monsterLevel || 1),
        requirements: JSON.parse(JSON.stringify(def.requirements || {})),

        ...(defenses ? { defenses } : {}),
        ...(damage ? { damage, ...(attackIntervalSeconds != null ? { attackIntervalSeconds } : {}) } : {}),
        ...(def.hands ? { hands: def.hands } : (def.slotType === 'weapon' ? { hands: 1 } : {})),
        ...(blockChance != null ? { blockChance } : {}),

        mods: [bonusMod].concat(downsideMods),
        implicits,

        flavorEn: def.flavorEn,
        flavorDe: def.flavorDe,
    };
}


//------------------------------------------------------------------------
//-------------------DROP ROLLER------------------------------------------
//------------------------------------------------------------------------

// Returns a unique item object, or null when this drop is not a unique.
// Called from _egSpawnLootDrop BEFORE the regular generator.
function _egTryGenerateUniqueDrop(monsterLevel = 1) {
    // Active map's loot rarity bonus softens the odds in the player's favor.
    let mult = 1;
    if (typeof _egMapLootRarityWeightMult === 'function') {
        mult = Math.sqrt(Math.max(1, Number(_egMapLootRarityWeightMult()) || 1));
    }
    if (Math.random() > EG_UNIQUE_DROP_CHANCE * mult) return null;

    const eligible = EG_UNIQUE_ITEMS.filter(u => u.minLevel <= monsterLevel);
    if (eligible.length === 0) return null;

    const def = eligible[Math.floor(Math.random() * eligible.length)];
    return _egBuildUniqueItem(def, monsterLevel);
}

// ----------------------------------------------------------------------
// Retroactively heals already-stashed uniques that were saved before
// base armor/damage was added. Runs once after definitions are loaded
// to cover the load-order race where _egLoadHubState ran before this
// file was parsed (hub.js calls _egLoadHubState at file bottom).
// Also healed on every future _egLoadHubState via the hub's own block.
// ----------------------------------------------------------------------
(function _egHealExistingUniqueStashOnLoad() {
    try {
        if (typeof _egHealUniqueItem !== 'function') return;
        let changed = false;
        const healGridState = (grid) => {
            if (!Array.isArray(grid)) return;
            for (let r = 0; r < grid.length; r++) {
                if (!Array.isArray(grid[r])) continue;
                for (let c = 0; c < grid[r].length; c++) {
                    const it = grid[r][c];
                    if (it && it.isUnique && _egHealUniqueItem(it)) changed = true;
                }
            }
        };
        // Heal STATE (persisted) and live _egInventory/_egEquipped if already initialized
        if (typeof STATE !== 'undefined' && STATE) {
            if (Array.isArray(STATE.egInventory)) healGridState(STATE.egInventory);
            if (STATE.egEquipped && typeof STATE.egEquipped === 'object') {
                for (const it of Object.values(STATE.egEquipped)) if (it && it.isUnique && _egHealUniqueItem(it)) changed = true;
            }
            if (STATE.egMapSlotItem && STATE.egMapSlotItem.isUnique && _egHealUniqueItem(STATE.egMapSlotItem)) changed = true;
            if (STATE.egCraftingBenchItem && STATE.egCraftingBenchItem.isUnique && _egHealUniqueItem(STATE.egCraftingBenchItem)) changed = true;
        }
        if (typeof _egInventory !== 'undefined' && Array.isArray(_egInventory)) healGridState(_egInventory);
        if (typeof _egEquipped !== 'undefined' && _egEquipped && typeof _egEquipped === 'object') {
            for (const it of Object.values(_egEquipped)) if (it && it.isUnique && _egHealUniqueItem(it)) changed = true;
        }
        if (typeof _egMapSlotItem !== 'undefined' && _egMapSlotItem && _egMapSlotItem.isUnique && _egHealUniqueItem(_egMapSlotItem)) changed = true;
        if (typeof _egCraftingBenchItem !== 'undefined' && _egCraftingBenchItem && _egCraftingBenchItem.isUnique && _egHealUniqueItem(_egCraftingBenchItem)) changed = true;
        if (changed) {
            if (typeof egSaveHubState === 'function') { try { egSaveHubState(); } catch (e) {} }
            else if (typeof save === 'function') { try { save(); } catch (e) {} }
        }
    } catch (e) { /* ignore load-order */ }
})();
