//------------------------------------------------------------------------
// PHASE 3 (endgame step): converted to a real ES module. Do not add new
// bare cross-file references - import explicitly or use globalThis.X for
// names still living in the concatenated body. See MIGRATION.md.
//------------------------------------------------------------------------
import { LANG } from '../translation/translations.js';
import { EG_ALL_BASE_TYPES, EG_SLOT_ICONS } from './endgame-equipment-base-items.js';
import { _egRollImplicitsForBase } from './endgame-implicits.js';
import { _egMapLootRarityWeightMult } from './endgame-map-launch.js';
import { _egBuildItemName, _egRollMods } from './endgame-mod-application.js';
import { EG_MOD_TABLE_AMULET } from './endgame-mod-tables-amulet.js';
import { EG_MOD_TABLE_ARCANE } from './endgame-mod-tables-arcane.js';
import { EG_MOD_TABLE_BELT } from './endgame-mod-tables-belt.js';
import { EG_MOD_TABLE_BOOTS } from './endgame-mod-tables-boots.js';
import { EG_MOD_TABLE_BRACERS } from './endgame-mod-tables-bracers.js';
import { EG_MOD_TABLE_CHEST } from './endgame-mod-tables-chest.js';
import { EG_MOD_TABLE_CLOAK } from './endgame-mod-tables-cloak.js';
import { EG_MOD_TABLE_EARRING } from './endgame-mod-tables-earring.js';
import { EG_MOD_TABLE_GLOVES } from './endgame-mod-tables-gloves.js';
import { EG_MOD_TABLE_HEAD } from './endgame-mod-tables-head.js';
import { EG_MOD_TABLE_PANTS } from './endgame-mod-tables-pants.js';
import { EG_MOD_TABLE_RING } from './endgame-mod-tables-ring.js';
import { EG_MOD_TABLE_RANGED, EG_MOD_TABLE_SHIELD } from './endgame-mod-tables-shield.js';
import { EG_MOD_TABLE_SHOULDERS } from './endgame-mod-tables-shoulders.js';
import { EG_MOD_TABLE_TALISMAN } from './endgame-mod-tables-talisman.js';
import { EG_MOD_TABLE_WEAPON_2H } from './endgame-mod-tables-weapon-2h.js';
import { EG_MOD_TABLE_WEAPON1, EG_MOD_TABLE_WEAPON_1H } from './endgame-mod-tables-weapon1.js';

//  endgame-equipment-generator.js
//  Pass 6: mod application + item naming moved to endgame-mod-application.js.
//  This file owns the ROLL PIPELINE only:
//    - rarity ladder config (EG_ITEM_RARITY_TABLE, EG_MOD_CAPS, EG_SLOT_MOD_TABLE_MAP)
//    - weapon mod-table accessor (_egGetModTable + _egGetWeaponModTable + _egCurrentWeaponBase)
//    - rarity + mod-count rollers (_egRollRarity, _egRollModCounts)
//    - main drop generator (_egGenerateEquipmentDrop, overrides base-items)
//
//  Load AFTER endgame-equipment-base-items.js, endgame-mod-name-words.js, all
//  EG_MOD_TABLE_* files AND endgame-mod-application.js.
//
//------------------------------------------------------------------------
//-------------------ENDGAME ITEM GENERATOR-------------------------------
//------------------------------------------------------------------------
// Overrides _egGenerateEquipmentDrop() from endgame-equipment-base-items.js.
// Load this file AFTER endgame-equipment-base-items.js and AFTER all
// EG_MOD_TABLE_* files.
//
// RARITY LADDER:
//   common   (white)  - 0 mods
//   uncommon (green)  - 1–2 mods  (max 1 prefix, max 1 suffix)
//   rare     (blue)   - 3–4 mods  (max 3 prefix, max 3 suffix)
//   epic     (purple) - 5–6 mods  (max 3 prefix, max 3 suffix)
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

export const EG_ITEM_RARITY_TABLE = [
    { rarity: 'common', weight: 550 },
    { rarity: 'uncommon', weight: 290 },
    { rarity: 'rare', weight: 130 },
    { rarity: 'epic', weight: 60 },
];

export const EG_MOD_CAPS = {
    common: { maxPre: 0, maxSuf: 0, maxTotal: 0, minTotal: 0 },
    uncommon: { maxPre: 1, maxSuf: 1, maxTotal: 2, minTotal: 1 },
    rare: { maxPre: 3, maxSuf: 3, maxTotal: 4, minTotal: 3 },
    epic: { maxPre: 3, maxSuf: 3, maxTotal: 6, minTotal: 5 },
};

// Maps every slotType value (from endgame-equipment-base-items.js) to its
// mod table.  weapon1/weapon2/ranged share separate tables because melee,
// off-hand, and ranged have different mod pools.
// NOTE: melee weapons use slotType 'weapon' - 1H rolls WEAPON_1H, 2H rolls
// the harder-hitting WEAPON_2H table (PoE-style). Shields use slotType
// 'shield' (→ SHIELD, a defensive-only derivative of WEAPON2).
export const EG_SLOT_MOD_TABLE_MAP = {
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
    weapon: (base) => _egGetWeaponModTable(base),
    shield: () => EG_MOD_TABLE_SHIELD,    // shields (off-hand only)
    ranged: () => EG_MOD_TABLE_RANGED,
};

// Returns the melee mod table for the base currently being rolled:
// two-handed weapons roll the harder-hitting WEAPON_2H pool, everything
// else (1H main-hand + 1H off-hand dual-wield) rolls WEAPON_1H.
export function _egGetWeaponModTable(base) {
    const b = base || _egCurrentWeaponBase || null;
    const hands = b ? (b.hands === 2 ? 2 : 1) : 1;
    try {
        if (hands === 2 && typeof EG_MOD_TABLE_WEAPON_2H !== 'undefined') return EG_MOD_TABLE_WEAPON_2H;
        if (typeof EG_MOD_TABLE_WEAPON_1H !== 'undefined') return EG_MOD_TABLE_WEAPON_1H;
        return EG_MOD_TABLE_WEAPON1;
    } catch (e) {
        return (typeof EG_MOD_TABLE_WEAPON1 !== 'undefined') ? EG_MOD_TABLE_WEAPON1 : null;
    }
}

// Set around the mod-roll so _egGetWeaponModTable can see the base even when
// called via the slot map without arguments (essences / crafting paths).
export let _egCurrentWeaponBase = null;


//------------------------------------------------------------------------
//-------------------MOD TABLE ACCESSOR-----------------------------------
//------------------------------------------------------------------------
// Returns the correct mod table object for a given base item.

export function _egGetModTable(base) {
    if (base && base.slotType === 'weapon') _egCurrentWeaponBase = base;
    const getter = EG_SLOT_MOD_TABLE_MAP[base.slotType];
    if (!getter) return null;
    try { return getter(base); }
    catch (e) { return null; }  // table constant not yet defined - safe fallback
}


//------------------------------------------------------------------------
//-------------------RARITY ROLLER----------------------------------------
//------------------------------------------------------------------------

export function _egRollRarity() {
    // Active map's loot rarity bonus boosts non-common weights during runs.
    const rarMult = (typeof _egMapLootRarityWeightMult === 'function')
        ? _egMapLootRarityWeightMult() : 1;
    const weighted = EG_ITEM_RARITY_TABLE.map(e => ({
        rarity: e.rarity,
        weight: e.rarity === 'common' ? e.weight : e.weight * rarMult,
    }));
    const total = weighted.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
        roll -= entry.weight;
        if (roll <= 0) return entry.rarity;
    }
    return 'common';
}


//------------------------------------------------------------------------
//-------------------MOD COUNT ROLLER-------------------------------------
//------------------------------------------------------------------------
// Returns { prefixCount, suffixCount } for the given rarity.

export function _egRollModCounts(rarity) {
    const cap = EG_MOD_CAPS[rarity];
    if (!cap || cap.maxTotal === 0) return { prefixCount: 0, suffixCount: 0 };

    if (rarity === 'uncommon') {
        const roll = Math.random();
        if (roll < 0.34) return { prefixCount: 1, suffixCount: 0 };
        if (roll < 0.67) return { prefixCount: 0, suffixCount: 1 };
        return { prefixCount: 1, suffixCount: 1 };
    }

    // rare / epic: roll a total count in [minTotal, maxTotal], then distribute
    // (rare always has at least 3 mods, epic at least 5)
    const minTotal = cap.minTotal != null ? cap.minTotal : 1;
    const span = Math.max(1, cap.maxTotal - minTotal + 1);
    const total = minTotal + Math.floor(Math.random() * span);
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
//-------------------MAIN DROP GENERATOR (OVERRIDE)-----------------------
//------------------------------------------------------------------------
// Signature matches the original in endgame-equipment-base-items.js.

export function _egGenerateEquipmentDrop(monsterLevel = 1) {

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
        ? _egRollMods(prefixCount, suffixCount, modTable, monsterLevel, base.defenses)
        : [];

    // ── 6. Build display name ────────────────────────────────────────
    const baseName = (LANG === 'de' && base.nameDe) ? base.nameDe : base.name;
    const name = _egBuildItemName(baseName, rarity, mods);

    // ── 6b. Roll implicit(s) - scaled by base required level (not item level) ──
    let implicits = [];
    try {
        if (typeof _egRollImplicitsForBase === 'function') {
            implicits = _egRollImplicitsForBase(base) || [];
        }
    } catch (e) { implicits = []; }

    // ── 7. Assemble item object ──────────────────────────────────────
    return {
        id: `${base.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        baseId: base.id,
        name,
        baseName,
        icon: base.icon || EG_SLOT_ICONS[base.slotType] || '📦',

        category: 'equip',
        slotType: base.slotType,
        archetype: base.archetype,
        rarity,

        itemLevel: monsterLevel,
        requirements: { ...base.requirements },
        defenses: { ...base.defenses },

        ...(base.damage ? { damage: { ...base.damage }, attackIntervalSeconds: base.attackIntervalSeconds } : {}),
        ...(base.hands ? { hands: base.hands } : {}),
        ...(base.blockChance ? { blockChance: base.blockChance } : {}),

        mods,
        implicits,
    };
}
