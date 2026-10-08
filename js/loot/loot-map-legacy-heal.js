import { _egIsTieredMapStash, _egMapStash } from '../endgame/endgame-hub.js';
import { STATE } from '../state.js';
import { _egRollMapBossStatus } from './loot-map-implicit-parts.js';
import { _egRollMapImplicits } from './loot-map-implicits.js';

//----------------------------------------------------------------------
//-----------------------LEGACY MAP BOSS HEALING------------------------
//----------------------------------------------------------------------

// Older saves stored maps without `implicits.hasBoss` - and maps created
// before the "every map ends in a boss fight" rule may have it baked as
// false. Patch every persisted map so the boss fight is guaranteed: maps
// without implicits roll fresh ones (boss always present), and a baked
// hasBoss:false is upgraded to true (maxBosses 1).

export function _egHealMapBossImplicits(map) {
    if (!map || typeof map !== 'object') return map;
    if (!map.implicits || typeof map.implicits !== 'object') {
        map.implicits = _egRollMapImplicits(map);
        return map;
    }
    if (map.implicits.hasBoss == null) {
        const bossStatus = _egRollMapBossStatus(map);
        map.implicits.hasBoss = bossStatus.hasBoss;
        map.implicits.maxBosses = bossStatus.maxBosses;
    } else if (!map.implicits.hasBoss) {
        // Migration: the current design guarantees a boss in every map.
        map.implicits.hasBoss = true;
        map.implicits.maxBosses = Math.max(1, map.implicits.maxBosses || 1);
    }
    return map;
}

export function _egMigrateMapBossImplicits() {
    try {
        if (typeof _egMapStash !== 'undefined' && Array.isArray(_egMapStash)) {
            // tiered check
            const isTiered = (typeof _egIsTieredMapStash === 'function' && _egIsTieredMapStash(_egMapStash));
            if (isTiered) {
                for (let ti = 0; ti < _egMapStash.length; ti++) {
                    const tierGrid = _egMapStash[ti];
                    if (!Array.isArray(tierGrid)) continue;
                    for (let r = 0; r < tierGrid.length; r++) {
                        if (!Array.isArray(tierGrid[r])) continue;
                        for (let c = 0; c < tierGrid[r].length; c++) {
                            const it = tierGrid[r][c];
                            if (it && it.category === 'map') _egHealMapBossImplicits(it);
                        }
                    }
                }
            } else {
                for (let r = 0; r < _egMapStash.length; r++) {
                    if (!Array.isArray(_egMapStash[r])) continue;
                    for (let c = 0; c < _egMapStash[r].length; c++) {
                        const it = _egMapStash[r][c];
                        if (it && it.category === 'map') _egHealMapBossImplicits(it);
                    }
                }
            }
        }
        if (typeof _egMapSlotItem !== 'undefined' && globalThis._egMapSlotItem && globalThis._egMapSlotItem.category === 'map') {
            _egHealMapBossImplicits(globalThis._egMapSlotItem);
        }
        // Also patch the hub state's saved copy so next save is clean.
        if (typeof STATE !== 'undefined' && STATE) {
            const stash = STATE.egMapStash;
            if (Array.isArray(stash)) {
                const isTieredS = (typeof _egIsTieredMapStash === 'function' && _egIsTieredMapStash(stash));
                if (isTieredS) {
                    stash.forEach(tierGrid => {
                        if (!Array.isArray(tierGrid)) return;
                        tierGrid.forEach(row => {
                            if (!Array.isArray(row)) return;
                            row.forEach(it => { if (it && it.category === 'map') _egHealMapBossImplicits(it); });
                        });
                    });
                } else {
                    stash.forEach(row => {
                        if (!Array.isArray(row)) return;
                        row.forEach(it => { if (it && it.category === 'map') _egHealMapBossImplicits(it); });
                    });
                }
            }
            if (STATE.egMapSlotItem && STATE.egMapSlotItem.category === 'map') {
                _egHealMapBossImplicits(STATE.egMapSlotItem);
            }
        }
    } catch (e) { /* ignore migration errors */ }
}
// Module era: maps.js evaluates inside an import cycle, so running the boss-
// implicit migration HERE would read uninitialized bindings (_egMapStash via
// the hub cycle - typeof THROWS on TDZ bindings) and silently skip, leaving
// legacy saves unhealed. Classic order (maps dead last) always ran it fully.
// Defer to DOMContentLoaded: everything is initialized, still before any user
// interaction (established step-5 passive-tree pattern). Migration first,
// then the hub-save patch setup - same order as the classic bottom.
function _egBootHealMapBossImplicits() {
    _egMigrateMapBossImplicits();
    // Wrap future loads so slot switches also heal.
    // NOTE (module era): _egLoadHubState is NOT imported here, so the bare
    // typeof guard would always be false (module scope has no access to the
    // concatenated/global scope). Read it as a globalThis member instead:
    // hub.js exposes a live write-through accessor for exactly this, so the
    // patch below propagates to import-based callers too.
    try {
        if (typeof globalThis._egLoadHubState === 'function' && !globalThis._egLoadHubState._bossPatched) {
            const orig = globalThis._egLoadHubState;
            const patched = function() {
                const ret = orig.apply(this, arguments);
                try { _egMigrateMapBossImplicits(); } catch (e) {}
                return ret;
            };
            patched._bossPatched = true;
            // Preserve the patched flag on the original for idempotency checks
            orig._bossPatched = true;
            globalThis._egLoadHubState = patched;
        }
    } catch (e) { /* ignore */ }
}
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', _egBootHealMapBossImplicits);
} else {
    _egBootHealMapBossImplicits();
}
