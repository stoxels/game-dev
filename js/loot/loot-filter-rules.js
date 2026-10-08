import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { LANG, t } from '../translation/translations.js';
import { EG_ALL_BASE_TYPES } from './equipment-base-items.js';
import { EG_SLOT_MOD_TABLE_MAP } from './loot-equipment-mod-tables.js';
import { EG_SHARD_DEFS, _egRollShardForItem, egAddShard } from './loot-shards.js';
import { _egIsActive } from '../combat/combat-state.js';
import { _egLootFilter, _egLoadLootFilter } from './loot-filter-state.js';

//------------------------------------------------------------------------
//-------------------LOOT FILTER MATCHER-----------------------------------
//------------------------------------------------------------------------

// Returns true when every enabled condition in one rule matches an item.
export function _eglfRuleMatches(rule, item) {
    if (rule.slot !== 'any' && item.slotType !== rule.slot) return false;
    if (rule.baseId !== 'any' && item.baseId !== rule.baseId) return false;
    if (rule.maxIlvl > 0 && !(item.itemLevel != null && item.itemLevel <= rule.maxIlvl)) return false;
    if (rule.maxReq > 0) {
        const req = (item.requirements && item.requirements.level != null) ? item.requirements.level : null;
        if (!(req != null && req <= rule.maxReq)) return false;
    }
    const mods = Array.isArray(item.mods) ? item.mods : [];
    if (rule.maxT1 != null && mods.filter(m => m.tier === 1).length > rule.maxT1) return false;
    if (rule.modMode === 'has_t1') {
        const hasT1 = mods.some(m => m.tier === 1 && (!rule.modFamily || m.familyId === rule.modFamily));
        if (!hasT1) return false;
    } else if (rule.modMode === 'not_has' && rule.modFamily && mods.some(m => m.familyId === rule.modFamily)) {
        return false;
    }
    return true;
}

// Returns true when an item is eligible for automatic vendoring.
export function _egLootFilterShouldVendor(item, workingFilter = null) {
    if (!item || item.category !== 'equip') return false;
    if (!_egLootFilter && !workingFilter) _egLoadLootFilter();
    const filter = workingFilter || _egLootFilter;
    if (!filter.enabled || item.noSellValue) return false;
    if (filter.keepUnique && item.isUnique) return false;
    const rules = filter.rules.filter(r => r.enabled);
    return rules.length > 0 && rules.some(rule => _eglfRuleMatches(rule, item));
}

// Returns true when automatic vendoring keeps an item in the stash.
export function _egLootFilterKeeps(item) {
    return !_egLootFilterShouldVendor(item);
}

//------------------------------------------------------------------------
//-------------------LOOT FILTER AUTO-VENDOR------------------------------
//------------------------------------------------------------------------

// Converts a matching pickup into a shard and mirrors it in run currency.
export function _egLootFilterAutoVendor(item) {
    if (!_egLootFilterShouldVendor(item)) return false;
    const shardDef = (item.isUnique && typeof EG_SHARD_DEFS !== 'undefined' && EG_SHARD_DEFS.shard_ancient)
        ? EG_SHARD_DEFS.shard_ancient
        : (typeof _egRollShardForItem === 'function' ? _egRollShardForItem(item) : null);
    if (!shardDef) return false;

    let granted = false;
    try {
        granted = (typeof egAddShard === 'function') ? egAddShard(shardDef.id, 1) : false;
    } catch (e) { granted = false; }
    if (!granted) {
        if (typeof showToast === 'function') {
            globalThis.showToast(t('eg_loot_filter_shard_full').replace('{name}', item.name || '???'), '#f87171');
        }
        return false;
    }

    if (typeof _egRunCurrency !== 'undefined' && Array.isArray(globalThis._egRunCurrency)
        && (typeof _egIsActive !== 'function' || _egIsActive())) {
        const existing = globalThis._egRunCurrency.find(e => e.id === shardDef.id);
        if (existing) existing.count = (existing.count || 1) + 1;
        else globalThis._egRunCurrency.push({
            id: shardDef.id, name: shardDef.name, icon: shardDef.icon,
            description: shardDef.description, count: 1,
        });
    }
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        try { Audio_Manager.playSFX('player_equip_pickup'); } catch (e) {}
    }
    if (typeof showToast === 'function') {
        globalThis.showToast(t('eg_loot_filter_vendored')
            .replace('{name}', item.name || '???')
            .replace('{icon}', shardDef.icon || '◆')
            .replace('{shard}', shardDef.name || '?'), '#f5d98a');
    }
    if (typeof trackAchStat === 'function') try { trackAchStat('egLootFilterVendored', 1); } catch (e) {}
    return true;
}

//------------------------------------------------------------------------
//-------------------RULE EDITOR DATA-------------------------------------
//------------------------------------------------------------------------

// Returns distinct slot types in stable first-seen order.
export function _eglfSlotTypes() {
    const out = [];
    if (typeof EG_ALL_BASE_TYPES !== 'undefined') {
        for (const b of EG_ALL_BASE_TYPES) {
            if (b.slotType && !out.includes(b.slotType)) out.push(b.slotType);
        }
    }
    return out;
}

// Returns base types available for one slot.
export function _eglfBasesForSlot(slot) {
    if (typeof EG_ALL_BASE_TYPES === 'undefined') return [];
    return EG_ALL_BASE_TYPES.filter(b => slot === 'any' || b.slotType === slot);
}

// Returns localized modifier families available for one slot.
export function _eglfModFamiliesForSlot(slot) {
    const out = [];
    if (typeof EG_SLOT_MOD_TABLE_MAP === 'undefined') return out;
    const getter = EG_SLOT_MOD_TABLE_MAP[slot];
    if (!getter) return out;
    let table = null;
    try { table = getter(); } catch (e) { table = null; }
    if (!table) return out;
    const seen = new Set();
    for (const section of ['prefixes', 'suffixes']) {
        const sec = table[section];
        if (!sec) continue;
        for (const familyId of Object.keys(sec)) {
            if (seen.has(familyId)) continue;
            seen.add(familyId);
            const entry = sec[familyId];
            const label = (entry && (typeof LANG === 'string' && LANG === 'de' ? entry.labelDe : entry.label)) || familyId;
            out.push({ id: familyId, label: `${label}` });
        }
    }
    return out;
}

// Returns every modifier family across all slots.
export function _eglfAllModFamilies() {
    const out = [];
    const seen = new Set();
    for (const slot of _eglfSlotTypes()) {
        for (const fam of _eglfModFamiliesForSlot(slot)) {
            if (!seen.has(fam.id)) { seen.add(fam.id); out.push(fam); }
        }
    }
    return out;
}
