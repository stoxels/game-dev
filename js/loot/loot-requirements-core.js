import { t } from '../translation/translations.js';
import { _egSyncBaseAttributes } from '../endgame/endgame-leveling.js';
import { EG_STAT_KEY_MAP } from '../endgame/endgame-player-stats.js';
import { _egEquipped } from '../endgame/endgame-hub.js';
import { _egCheckHandCompatibilityInSlot } from './loot-requirements-weapons.js';

//------------------------------------------------------------------------
//-------------------REQUIREMENTS CORE--------------------------------------
//------------------------------------------------------------------------

// Base character attributes before equipment bonuses.
export const EG_PLAYER_BASE_ATTRIBUTES = {
    level: null,
    str: 20,
    agi: 20,
    int: 20,
};

// Sums additive strength, agility, and intelligence bonuses from gear.
export function _egSumAttributeBonuses(items) {
    const totals = { str: 0, agi: 0, int: 0 };
    function collect(list) {
        (Array.isArray(list) ? list : []).forEach(mod => {
            (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
                const entry = typeof EG_STAT_KEY_MAP !== 'undefined' ? EG_STAT_KEY_MAP[stat.key] : null;
                if (!entry || entry.mode !== 'add' || stat.value == null) return;
                const val = Number(stat.value) || 0;
                if (entry.bucket === 'strength') totals.str += val;
                else if (entry.bucket === 'agility') totals.agi += val;
                else if (entry.bucket === 'intelligence') totals.int += val;
            });
        });
    }
    (items || []).forEach(item => {
        collect(item.mods);
        collect(item.implicits);
    });
    return totals;
}

// Computes attributes available to a prospective loadout.
export function _egComputeLoadoutAttributes(items) {
    if (typeof _egSyncBaseAttributes === 'function') {
        try { _egSyncBaseAttributes(); } catch (e) {}
    }
    const bonus = _egSumAttributeBonuses(items);
    return {
        str: EG_PLAYER_BASE_ATTRIBUTES.str + bonus.str,
        agi: EG_PLAYER_BASE_ATTRIBUTES.agi + bonus.agi,
        int: EG_PLAYER_BASE_ATTRIBUTES.int + bonus.int,
    };
}

// Finds every requirement violated by a prospective loadout.
export function _egFindUnmetRequirements(items) {
    const attrs = _egComputeLoadoutAttributes(items);
    const unmet = [];
    (items || []).forEach(item => {
        const req = item && item.requirements;
        if (!req) return;
        if (EG_PLAYER_BASE_ATTRIBUTES.level != null
            && (req.level || 0) > 0
            && EG_PLAYER_BASE_ATTRIBUTES.level < req.level) {
            unmet.push({ item, stat: 'level', need: req.level, have: EG_PLAYER_BASE_ATTRIBUTES.level });
        }
        if ((req.str || 0) > 0 && attrs.str < req.str) unmet.push({ item, stat: 'str', need: req.str, have: attrs.str });
        if ((req.agi || 0) > 0 && attrs.agi < req.agi) unmet.push({ item, stat: 'agi', need: req.agi, have: attrs.agi });
        if ((req.int || 0) > 0 && attrs.int < req.int) unmet.push({ item, stat: 'int', need: req.int, have: attrs.int });
    });
    return unmet;
}

// Applies a mutation to a simulated equipped map and checks its requirements.
export function _egSimulateAndCheck(mutateFn) {
    if (typeof _egEquipped === 'undefined') return [];
    const sim = {};
    Object.keys(_egEquipped).forEach(k => { if (_egEquipped[k]) sim[k] = _egEquipped[k]; });
    mutateFn(sim);
    return _egFindUnmetRequirements(Object.values(sim).filter(Boolean));
}

// Allows moves that do not increase the number of violated requirements.
export function _egCheckMoveAllowed(mutateFn) {
    const before = _egSimulateAndCheck(() => {});
    const after = _egSimulateAndCheck(mutateFn);
    return { ok: after.length <= before.length, missing: after };
}

// Checks whether an item can enter a slot under hand and attribute rules.
export function _egCanEquipInSlot(item, slotId) {
    if (item && item.category === 'equip') {
        const handGate = _egCheckHandCompatibilityInSlot(item, slotId);
        if (!handGate.ok) return handGate;
    }
    return _egCheckMoveAllowed(sim => {
        Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
        delete sim[slotId];
        sim[slotId] = item;
    });
}

// Checks whether removing a slot leaves the remaining loadout valid.
export function _egCheckUnequipSlot(slotId) {
    return _egCheckMoveAllowed(sim => { delete sim[slotId]; });
}

// Formats one requirement deficit for display.
export function _egFormatRequirementPart(stat, need) {
    if (stat === 'level') return t('eg_req_level').replace('{n}', need);
    const attrKeys = { str: 'eg_attr_str', agi: 'eg_attr_agi', int: 'eg_attr_int' };
    return `${need} ${t(attrKeys[stat])}`;
}

// Joins unique requirement deficits into localized text.
export function _egGetUnmetRequirementsText(missing) {
    const seen = {};
    const parts = [];
    (missing || []).forEach(m => {
        const key = `${m.stat}:${m.need - m.have}`;
        if (seen[key]) return;
        seen[key] = true;
        parts.push(_egFormatRequirementPart(m.stat, m.need - m.have));
    });
    return parts.join(', ');
}
