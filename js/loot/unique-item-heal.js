//------------------------------------------------------------------------
//-------------------UNIQUE ITEM SAVE HEALING-----------------------------
//------------------------------------------------------------------------
// Re-syncs saved unique items with their current definitions, and runs that
// pass once over the stored stash when the page loads.
//------------------------------------------------------------------------

// Logic first: hub-save imports this file, and the module evaluation order
// inside that import cycle must stay what it was when it imported the logic.
import {
    _buildUniqueImplicits,
    _buildUniqueMods,
    _inferWeaponHands,
    _uniqueContentSig,
    _uniqueDownsideValue,
    _uniqueFallbackBlockChance,
    _uniqueFallbackDamage,
    _uniqueFallbackDefenses,
    _uniqueStatLabel,
} from './unique-item-logic.js';
import { STATE } from '../state.js';
import { _equipped, _inventory } from '../hub/hub-stash.js';
import { saveHubState } from '../hub/hub-save.js';
import { _rollImplicitsForBase } from './loot-implicits.js';
import { UNIQUE_ITEMS } from './unique-item-data.js';


//------------------------------------------------------------------------
//-------------------HEAL ONE ITEM----------------------------------------
//------------------------------------------------------------------------

// Brings an already-saved unique up to date with its definition: stat lines,
// requirements, base stats, hands, implicits, perks and downsides. Saves made
// before a rebalance or before base stats existed get fixed here.
// Mutates `item` in place and returns true if anything changed.
export function _healUniqueItem(item) {
    if (!item || !item.isUnique || !item.baseId) return false;
    let changed = false;
    const def = UNIQUE_ITEMS.find(u => u.uniqueId === item.baseId) || null;
    // --- content resync: stat lines / downsides / effects follow the def ---
    // Stashed copies are snapshots; when a unique is rebalanced its saved
    // copies must pick up the new numbers (crafting is blocked on uniques, so
    // the mod list is always exactly what the def says).
    if (def && Array.isArray(def.bonuses) && item.uniqueSig !== _uniqueContentSig(def)) {
        item.mods = _buildUniqueMods(def);
        if (Array.isArray(def.effects) && def.effects.length) item.uniqueEffects = [...def.effects];
        else delete item.uniqueEffects;
        if (def.v2 && def.defenses) item.defenses = { armour: def.defenses.armour || 0, evasion: def.defenses.evasion || 0, absorption: def.defenses.absorption || 0 };
        item.uniqueSig = _uniqueContentSig(def);
        changed = true;
    }
    // --- requirements: re-sync attributes after a requirement rebalance ---
    if (def && def.requirements && item.requirements) {
        for (const k of ['str', 'agi', 'int']) {
            const want = def.requirements[k] || 0;
            if ((item.requirements[k] || 0) !== want) {
                item.requirements[k] = want;
                changed = true;
            }
        }
    }
    // --- defenses ---
    let expDef = null;
    if (def && def.defenses) expDef = def.defenses;
    else {
        try { expDef = _uniqueFallbackDefenses({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 }); } catch (e) { expDef = null; }
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
    else {
        try {
            const fb = _uniqueFallbackDamage({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || (item.requirements && item.requirements.level) || 1 });
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
        else {
            try { expBlock = _uniqueFallbackBlockChance({ slotType: item.slotType, archetype: item.archetype, minLevel: item.itemLevel || 1 }); } catch (e) {}
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
        } else {
            const inferred = _inferWeaponHands(item);
            if (inferred === 1 || inferred === 2) {
                item.hands = inferred;
                changed = true;
            }
        }
    }
    // --- implicits (now allowed on uniques) ---
    if (!Array.isArray(item.implicits) || item.implicits.length === 0) {
        const expImps = def ? _buildUniqueImplicits(def, item.defenses || expDef) : [];
        // Also try fallback from item itself if no def
        let imps = expImps;
        if (!imps || !imps.length) {
            try {
                const syn = { slotType: item.slotType, defenses: item.defenses || expDef || {}, requirements: item.requirements || { level: item.itemLevel || 1 }, minLevel: item.itemLevel || 1 };
                imps = _rollImplicitsForBase(syn) || [];
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
            const expected = _uniqueDownsideValue(def, stat.value);
            const fid = `unique_${def.uniqueId}_down_${i}`;
            const mod = item.mods.find(m => m.familyId === fid && m.isDownside);
            if (!mod || !mod.rolledStats || !mod.rolledStats[0]) continue;
            const curVal = mod.rolledStats[0].value;
            if (curVal !== expected) {
                mod.rolledStats[0].value = expected;
                // rebuild label with new value
                const tmpStat = { ...stat, value: expected };
                mod.rolledStats[0].label = _uniqueStatLabel(tmpStat);
                // also keep key consistent
                mod.rolledStats[0].key = stat.key;
                changed = true;
            }
        }
    }
    return changed;
}


//------------------------------------------------------------------------
//-------------------BOOT-TIME STASH HEAL---------------------------------
//------------------------------------------------------------------------

// Heals uniques already saved in STATE (and the live stash, if it exists yet).
// Deferred to page load because this module evaluates inside an import cycle,
// where the live stash bindings are still uninitialized.
function _bootHealExistingUniqueStash() {
    try {
        let changed = false;
        const healGridState = (grid) => {
            if (!Array.isArray(grid)) return;
            for (let r = 0; r < grid.length; r++) {
                if (!Array.isArray(grid[r])) continue;
                for (let c = 0; c < grid[r].length; c++) {
                    const it = grid[r][c];
                    if (it && it.isUnique && _healUniqueItem(it)) changed = true;
                }
            }
        };
        // Heal STATE (persisted) and live _inventory/_equipped if already initialized
        if (typeof STATE !== 'undefined' && STATE) {
            if (Array.isArray(STATE.egInventory)) healGridState(STATE.egInventory);
            if (STATE.egEquipped && typeof STATE.egEquipped === 'object') {
                for (const it of Object.values(STATE.egEquipped)) if (it && it.isUnique && _healUniqueItem(it)) changed = true;
            }
            if (STATE.egMapSlotItem && STATE.egMapSlotItem.isUnique && _healUniqueItem(STATE.egMapSlotItem)) changed = true;
            if (STATE.egCraftingBenchItem && STATE.egCraftingBenchItem.isUnique && _healUniqueItem(STATE.egCraftingBenchItem)) changed = true;
        }
        if (typeof _inventory !== 'undefined' && Array.isArray(_inventory)) healGridState(_inventory);
        if (typeof _equipped !== 'undefined' && _equipped && typeof _equipped === 'object') {
            for (const it of Object.values(_equipped)) if (it && it.isUnique && _healUniqueItem(it)) changed = true;
        }
        if (typeof _egMapSlotItem !== 'undefined' && globalThis._egMapSlotItem && globalThis._egMapSlotItem.isUnique && _healUniqueItem(globalThis._egMapSlotItem)) changed = true;
        if (typeof _craftingBenchItem !== 'undefined' && globalThis._craftingBenchItem && globalThis._craftingBenchItem.isUnique && _healUniqueItem(globalThis._craftingBenchItem)) changed = true;
        if (changed) {
            try { saveHubState(); } catch (e) {}
        }
    } catch (e) { /* ignore load-order */ }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _bootHealExistingUniqueStash);
} else {
    _bootHealExistingUniqueStash();
}
