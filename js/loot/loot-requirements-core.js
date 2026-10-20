import { t } from '../translation/translations.js';
import { _syncBaseAttributes } from '../hub/hub-leveling.js';
import { STAT_KEY_MAP } from '../combat/combat-player-stats.js';
import { _equipped } from '../hub/hub.js';
import { _checkHandCompatibilityInSlot } from './loot-requirements-weapons.js';

//------------------------------------------------------------------------
//-------------------REQUIREMENTS CORE--------------------------------------
//------------------------------------------------------------------------

// Base character attributes before equipment bonuses.
export const PLAYER_BASE_ATTRIBUTES = {
    level: null,
    str: 20,
    agi: 20,
    int: 20,
};

// Sums additive strength, agility, and intelligence bonuses from gear.
export function _sumAttributeBonuses(items) {
    const totals = { str: 0, agi: 0, int: 0 };
    function collect(list) {
        (Array.isArray(list) ? list : []).forEach(mod => {
            (Array.isArray(mod.rolledStats) ? mod.rolledStats : []).forEach(stat => {
                const entry = typeof STAT_KEY_MAP !== 'undefined' ? STAT_KEY_MAP[stat.key] : null;
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
export function _computeLoadoutAttributes(items) {
    if (typeof _syncBaseAttributes === 'function') {
        try { _syncBaseAttributes(); } catch (e) {}
    }
    const bonus = _sumAttributeBonuses(items);
    return {
        str: PLAYER_BASE_ATTRIBUTES.str + bonus.str,
        agi: PLAYER_BASE_ATTRIBUTES.agi + bonus.agi,
        int: PLAYER_BASE_ATTRIBUTES.int + bonus.int,
    };
}

// Finds every requirement violated by a prospective loadout.
export function _findUnmetRequirements(items) {
    const attrs = _computeLoadoutAttributes(items);
    const unmet = [];
    (items || []).forEach(item => {
        const req = item && item.requirements;
        if (!req) return;
        if (PLAYER_BASE_ATTRIBUTES.level != null
            && (req.level || 0) > 0
            && PLAYER_BASE_ATTRIBUTES.level < req.level) {
            unmet.push({ item, stat: 'level', need: req.level, have: PLAYER_BASE_ATTRIBUTES.level });
        }
        if ((req.str || 0) > 0 && attrs.str < req.str) unmet.push({ item, stat: 'str', need: req.str, have: attrs.str });
        if ((req.agi || 0) > 0 && attrs.agi < req.agi) unmet.push({ item, stat: 'agi', need: req.agi, have: attrs.agi });
        if ((req.int || 0) > 0 && attrs.int < req.int) unmet.push({ item, stat: 'int', need: req.int, have: attrs.int });
    });
    return unmet;
}

// Applies a mutation to a simulated equipped map and checks its requirements.
export function _simulateAndCheck(mutateFn) {
    if (typeof _equipped === 'undefined') return [];
    const sim = {};
    Object.keys(_equipped).forEach(k => { if (_equipped[k]) sim[k] = _equipped[k]; });
    mutateFn(sim);
    return _findUnmetRequirements(Object.values(sim).filter(Boolean));
}

// Allows moves that do not increase the number of violated requirements.
// `baselineFn` (optional) rebuilds the loadout as it stood before the move:
// a drag lifts an equipped item out of _equipped on pickup, so without it
// the "before" count would already be missing that item and pulling it out
// (e.g. a cloak carrying +Int for an amulet) would look harmless.
export function _checkMoveAllowed(mutateFn, baselineFn) {
    const before = _simulateAndCheck(baselineFn || (() => {}));
    const after = _simulateAndCheck(sim => {
        if (baselineFn) baselineFn(sim);
        mutateFn(sim);
    });
    return { ok: after.length <= before.length, missing: after };
}

// Checks whether an item can enter a slot under hand and attribute rules.
// `fromSlot` is the paperdoll slot a dragged item was lifted from (if any).
export function _canEquipInSlot(item, slotId, fromSlot) {
    if (item && item.category === 'equip') {
        const handGate = _checkHandCompatibilityInSlot(item, slotId);
        if (!handGate.ok) return handGate;
    }
    return _checkMoveAllowed(sim => {
        Object.keys(sim).forEach(k => { if (sim[k] === item) delete sim[k]; });
        delete sim[slotId];
        sim[slotId] = item;
    }, fromSlot ? (sim => { if (!sim[fromSlot]) sim[fromSlot] = item; }) : undefined);
}

// Checks whether removing a slot leaves the remaining loadout valid.
export function _checkUnequipSlot(slotId) {
    return _checkMoveAllowed(sim => { delete sim[slotId]; });
}

// Formats one requirement deficit for display.
export function _formatRequirementPart(stat, need) {
    if (stat === 'level') return t('eg_req_level').replace('{n}', need);
    const attrKeys = { str: 'eg_attr_str', agi: 'eg_attr_agi', int: 'eg_attr_int' };
    return `${need} ${t(attrKeys[stat])}`;
}

// Joins unique requirement deficits into localized text.
export function _getUnmetRequirementsText(missing) {
    const seen = {};
    const parts = [];
    (missing || []).forEach(m => {
        const key = `${m.stat}:${m.need - m.have}`;
        if (seen[key]) return;
        seen[key] = true;
        parts.push(_formatRequirementPart(m.stat, m.need - m.have));
    });
    return parts.join(', ');
}
