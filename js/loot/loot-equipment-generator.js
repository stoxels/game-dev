//----------------------------------------------------------------------
//-----------------------EQUIPMENT DROP GENERATOR-----------------------
//----------------------------------------------------------------------

// The roll pipeline: the rarity ladder config, the rarity and mod-count
// rollers, and the assembler that turns those rolls into an item. Which
// mod table a base rolls from lives in loot-equipment-mod-tables.js.

import { LANG } from '../translation/translations.js';
import { _egMapLootRarityWeightMult } from '../endgame/endgame-map-launch.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { EG_SLOT_ICONS } from './equipment-slot-icons.js';
import { _egGetModTable } from './loot-equipment-mod-tables.js';
import { _egRollImplicitsForBase } from './loot-implicits.js';
import {_egBuildItemName} from './loot-mod-naming.js';
import {_egRollMods} from './loot-mod-application.js';


//----------------------------------------------------------------------
//----------------------------RARITY LADDER-----------------------------
//----------------------------------------------------------------------

// The rarity weights an item rolls against, and how many modifiers
// each rarity may carry:
//   common   (white)  - 0 mods
//   uncommon (green)  - 1-2 mods  (max 1 prefix, max 1 suffix)
//   rare     (blue)   - 3-4 mods  (max 3 prefix, max 3 suffix)
//   epic     (purple) - 5-6 mods  (max 3 prefix, max 3 suffix)
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


//----------------------------------------------------------------------
//----------------------------RARITY ROLLER-----------------------------
//----------------------------------------------------------------------

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


//----------------------------------------------------------------------
//---------------------------MOD COUNT ROLLER---------------------------
//----------------------------------------------------------------------

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


//----------------------------------------------------------------------
//-------------------------MAIN DROP GENERATOR--------------------------
//----------------------------------------------------------------------

// Picks a base type the monster is high enough for, rolls rarity, mods
// and implicits off it, and assembles the finished item object.
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
