//----------------------------------------------------------------------
//-------------------ESSENCE STATE + FAMILY REGISTRY--------------------
//----------------------------------------------------------------------

// The essence tab's own state, plus the registry every other essence
// file reads: which modifier families exist, which fixed cell each one
// owns, and whether a family can be applied to a given item.

import {LOCAL_DEFENSE_FAMILY_STATS, _eligibleTiers} from './loot-mod-application.js';
import { SLOT_MOD_TABLE_MAP, _getModTable } from './loot-equipment-mod-tables.js';


//----------------------------------------------------------------------
//--------------------------CONSTANTS & STATE---------------------------
//----------------------------------------------------------------------

// Essence stash dimensions - fixed tab with pre-assigned slots
// (mirrors the Orbs & Shards currency tab). Every essence id has a
// dedicated cell; hovering an empty cell still shows its essence tooltip.
// 12 rows × 8 cols = 96 cells → 95 modifier essences + 1 decorative empty.
export const ESSENCE_ROWS = 12;
export const ESSENCE_COLS = 8;

// Essence stash: 2D grid of stacked essence items (null = empty cell)
export let _essenceStash = Array.from({ length: ESSENCE_ROWS }, () => Array(ESSENCE_COLS).fill(null));

// The grid is also written from outside this file (drag-and-drop moves
// cells, hub-save.js swaps the whole grid on load), so it is re-exposed
// as a live globalThis property whose writes go straight back.
try { Object.defineProperty(globalThis, '_essenceStash', { get() { return _essenceStash; }, set(v) { _essenceStash = v; }, configurable: true }); } catch (e) {}


//----------------------------------------------------------------------
//--------------------PER-MODIFIER ESSENCE REGISTRY---------------------
//----------------------------------------------------------------------


// Complete list of individual modifier families - one essence per family.
export const _ESSENCE_FAMILIES = [
    'absorption_on_kill', 'absorption_regen_rate', 'accuracy', 'agility', 'arcane_surge',
    'attack_speed', 'block_chance', 'block_recovery', 'chain', 'chance_for_new_question', 'chance_to_blind',
    'chance_to_convert', 'chance_to_freeze', 'chance_to_ignite', 'chance_to_shock', 'channel', 'cleave',
    'cold_damage', 'cold_resist', 'crit_chance', 'crit_multiplier', 'deflect', 'deflect_damage', 'dodge', 'echo',
    'faster_absorption_regen_start', 'fate', 'fire_damage', 'fire_resist', 'first_step', 'flat_absorption',
    'flat_armour', 'flat_evasion', 'flat_health', 'flat_mana', 'flat_physical_damage', 'focus', 'grounded',
    'heart_heal', 'healing_power', 'hybrid_armour_absorption', 'hybrid_armour_evasion', 'hybrid_evasion_absorption', 'hybrid_evasion_armour',
    'hybrid_life_absorption', 'hybrid_life_armour', 'hybrid_life_evasion', 'hybrid_mana_absorption', 'hybrid_mana_armour',
    'hybrid_mana_evasion', 'inc_absorption', 'inc_armour', 'inc_evasion', 'inc_health', 'inc_healing_power', 'inc_heart_heal',
    'inc_mana_heal', 'inc_physical_damage', 'inc_spell_damage', 'intelligence', 'life_leech', 'life_on_kill', 'life_regen',
    'lightning_damage', 'lightning_resist', 'mana_heal', 'mana_on_kill', 'mana_on_mistake', 'mana_regen',
    'mana_to_damage', 'mistake_count', 'mistake_not_count', 'movement_speed', 'multishot', 'overkill', 'parry',
    'pierce', 'precision_damage', 'precision_regen', 'preemptive_dodge', 'pushback', 'reveal_hint', 'shadow_damage',
    'shadow_resist', 'shield_bash', 'snipe', 'spell_block_chance', 'spell_damage', 'spell_dodge', 'splash_damage',
    'stagger', 'strength', 'time_added', 'warding',
];

// Visual variety - cycle through a set of emojis so the essences don't all look identical.
// Kept intentionally diverse (hearts, elements, combat, jewelry) but deterministic.
export const _ESSENCE_ICON_CYCLE = [
    '💚', '💙', '❤️', '🧡', '💛', '💜', '🤍', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫', '🟤',
    '🔥', '❄️', '⚡', '🌑', '✨', '⭐', '💫', '🌟', '💠', '🔷', '🔶', '🌀', '🧩', '⚔️', '🛡️', '🏹',
    '🎯', '🔮', '🧪', '💎', '👑', '💍', '🧥', '🥋', '🦾', '🧤', '🔗', '👖', '👢', '📿', '🪬', '🧬',
    '☄️', '🌌', '🌸', '🏺', '🙏', '💀', '🧠', '⚙️', '🔧', '🪞', '🍀', '🎲', '🎰', '🃏', '🀄', '🧿',
    '👁️', '🫀', '🗡️', '🏆', '🌙', '☀️', '🌈', '🍃', '🌿', '🪶', '🦾', '🦿', '🧱', '🏰', '⚗️', '🧲',
    '🔬', '📚', '🎭', '🎨', '🎼', '🎵', '🎶', '🔔', '📯', '⚓', '🧭', '🗺️'
];

// Fixed assignment: essence id → {r,c}. Mirrors the Orbs & Shards tab.
export const ESSENCE_SLOT_MAP = {};
(function _buildEssenceSlotMap() {
    let idx = 0;
    for (const fam of _ESSENCE_FAMILIES) {
        const id = 'essence_' + fam;
        const r = Math.floor(idx / ESSENCE_COLS);
        const c = idx % ESSENCE_COLS;
        ESSENCE_SLOT_MAP[id] = { r, c };
        idx++;
    }
})();
export const ESSENCE_SLOT_REVERSE = (() => {
    const m = {};
    for (const [id, pos] of Object.entries(ESSENCE_SLOT_MAP)) m[`${pos.r}-${pos.c}`] = id;
    return m;
})();
export function _essenceSlotForId(id) { return ESSENCE_SLOT_MAP[id] || null; }
export function _essenceIdForSlot(r, c) { return ESSENCE_SLOT_REVERSE[`${r}-${c}`] || null; }

export function _essenceCompatibleSlotTypes(familyId) {
    if (typeof SLOT_MOD_TABLE_MAP === 'undefined') return [];
    const slots = [];
    for (const [slotType, getter] of Object.entries(SLOT_MOD_TABLE_MAP)) {
        let tbl = null;
        try { tbl = getter(); } catch (e) { continue; }
        if (!tbl) continue;
        if ((tbl.prefixes && tbl.prefixes[familyId]) || (tbl.suffixes && tbl.suffixes[familyId])) {
            slots.push(slotType);
        }
    }
    return slots;
}
// Lowest item level at which the essence can roll its guaranteed modifier
// (the family's weakest tier), per compatible slot type. Returns
// { min, max } across slot types, or null when no slot can roll it.
export function _essenceItemLevelRange(familyId) {
    let min = Infinity;
    let max = 0;
    for (const slotType of _essenceCompatibleSlotTypes(familyId)) {
        let tbl = null;
        try { tbl = SLOT_MOD_TABLE_MAP[slotType](); } catch (e) { continue; }
        if (!tbl) continue;
        const fam = (tbl.prefixes && tbl.prefixes[familyId]) || (tbl.suffixes && tbl.suffixes[familyId]);
        if (!fam || !fam.tiers || !fam.tiers.length) continue;
        const lowest = Math.min(...fam.tiers.map(t => t.ilvl || 1));
        min = Math.min(min, lowest);
        max = Math.max(max, lowest);
    }
    return Number.isFinite(min) ? { min, max } : null;
}
export function _essenceCanApplyToItem(familyId, item) {
    return _essenceIncompatibilityReason(familyId, item) === null;
}

// Classifies WHY an essence's guaranteed family cannot be applied to an item.
// Returns null when compatible, otherwise one of:
//   'no_mod_table'      - item's slotType has no mod table (unknown/odd base)
//   'family_missing'    - family doesn't exist in the item's slot-type mod table
//                         (e.g. Essence of Block Chance on a non-shield)
//   'needs_armour'      - family is a local armour mod, base has no armour
//   'needs_evasion'     - family is a local evasion mod, base has no evasion
//   'needs_absorption'  - family is a local absorption mod, base has no absorption
//   'needs_armour_evasion' / 'needs_armour_absorption' /
//   'needs_evasion_absorption' - hybrid defence mods, base lacks one/both stats
//   'no_eligible_tier'  - family exists on this slot, but every tier needs a
//                         higher item level than the item has
export function _essenceIncompatibilityReason(familyId, item) {
    if (typeof SLOT_MOD_TABLE_MAP === 'undefined') return 'no_mod_table';
    const modTable = _getModTable(item);
    if (!modTable) return 'no_mod_table';
    const sections = [modTable.prefixes || {}, modTable.suffixes || {}];
    const hasFamily = sections.some(sec => !!sec[familyId]);
    if (!hasFamily) return 'family_missing';
    // Local-defence gate first: a wrong base stat is more informative to the
    // player than tier availability (armour bases are the common failure).
    const neededStats = (typeof LOCAL_DEFENSE_FAMILY_STATS !== 'undefined')
        ? LOCAL_DEFENSE_FAMILY_STATS[familyId] : null;
    if (neededStats) {
        const defenses = item.defenses || {};
        const missing = neededStats.filter(stat => !(defenses[stat] > 0));
        if (missing.length > 0) {
            // LOCAL_DEFENSE_FAMILY_STATS lists stats in canonical order, so
            // the joined key matches one of the dedicated translation keys.
            return 'needs_' + missing.join('_');
        }
    }
    // At least one eligible tier at the item's level?
    for (const sec of sections) {
        const fam = sec[familyId];
        if (!fam) continue;
        const tiers = _eligibleTiers(fam, item.itemLevel || 1);
        if (tiers && tiers.length > 0) return null;
    }
    return 'no_eligible_tier';
}

// Maps classifier reasons to translation keys for the reject messages.
export const ESSENCE_REASON_KEYS = {
    no_mod_table: 'eg_essence_no_mod_table',
    family_missing: 'eg_essence_family_missing',
    needs_armour: 'eg_essence_needs_armour',
    needs_evasion: 'eg_essence_needs_evasion',
    needs_absorption: 'eg_essence_needs_absorption',
    needs_armour_evasion: 'eg_essence_needs_armour_evasion',
    needs_armour_absorption: 'eg_essence_needs_armour_absorption',
    needs_evasion_absorption: 'eg_essence_needs_evasion_absorption',
    no_eligible_tier: 'eg_essence_no_eligible_tier',
};
