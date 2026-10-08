import { save, STATE } from '../state.js';
import { egSaveHubState } from '../endgame/endgame-hub.js';

//------------------------------------------------------------------------
//-------------------LOOT FILTER STATE--------------------------------------
//------------------------------------------------------------------------

// Live filter state. Kept in STATE.egLootFilter:
//   { enabled: bool, keepUnique: bool, rules: [rule, ...] }
export let _egLootFilter = null;

// Rebind the module binding for editor code that commits a working copy.
try { Object.defineProperty(globalThis, '_egLootFilter', { get() { return _egLootFilter; }, set(v) { _egLootFilter = v; }, configurable: true }); } catch (e) {}

// Returns the safe default filter configuration.
export function _eglfDefaultState() {
    return {
        enabled: false,
        keepUnique: true,
        rules: [],
    };
}

// Normalizes one persisted or editor-created rule.
export function _eglfNormaliseRule(raw) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    return {
        id: (typeof r.id === 'string' && r.id) ? r.id : `lf_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        enabled: r.enabled !== false,
        slot: (typeof r.slot === 'string' && r.slot) ? r.slot : 'any',
        baseId: (typeof r.baseId === 'string' && r.baseId) ? r.baseId : 'any',
        maxIlvl: (typeof r.maxIlvl === 'number' && r.maxIlvl > 0) ? Math.floor(r.maxIlvl) : (typeof r.minIlvl === 'number' && r.minIlvl > 0 ? Math.floor(r.minIlvl) : 0),
        maxReq: (typeof r.maxReq === 'number' && r.maxReq > 0) ? Math.floor(r.maxReq) : (typeof r.minReq === 'number' && r.minReq > 0 ? Math.floor(r.minReq) : 0),
        modMode: ['none', 'has_t1', 'not_has'].includes(r.modMode) ? r.modMode : 'none',
        modFamily: (typeof r.modFamily === 'string') ? r.modFamily : '',
        maxT1: (typeof r.maxT1 === 'number' && r.maxT1 >= 0) ? Math.min(6, Math.floor(r.maxT1)) : null,
    };
}

// Normalizes a persisted filter while preserving legacy minimum fields.
export function _eglfNormaliseState(raw) {
    const def = _eglfDefaultState();
    if (!raw || typeof raw !== 'object') return def;
    return {
        enabled: raw.enabled === true,
        keepUnique: raw.keepUnique !== false,
        rules: Array.isArray(raw.rules) ? raw.rules.map(_eglfNormaliseRule) : [],
    };
}

// Loads the filter from the global state, or creates its safe default.
export function _egLoadLootFilter() {
    if (typeof globalThis.STATE !== 'undefined' && globalThis.STATE.egLootFilter) {
        _egLootFilter = _eglfNormaliseState(globalThis.STATE.egLootFilter);
    } else {
        _egLootFilter = _eglfDefaultState();
    }
    return _egLootFilter;
}

// Persists the live filter and refreshes the hub mirror.
export function _egSaveLootFilter() {
    if (typeof STATE !== 'undefined') {
        STATE.egLootFilter = JSON.parse(JSON.stringify(_egLootFilter));
        if (typeof save === 'function') try { save(); } catch (e) {}
    }
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}
}

// Load immediately so run-time claims see the persisted filter.
_egLoadLootFilter();
