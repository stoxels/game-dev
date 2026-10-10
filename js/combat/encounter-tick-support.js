// Encounter tick-support owner: mistake limits, life regeneration, and
// pause-time coordination for the shared combat tick loop.

import { _egEndMapDefeated } from './encounter-chain.js';
import { _egMaybeShowMistakesWarning } from './encounter-overlays.js';
import { EG_LIFE_REGEN_INTERVAL_MS } from './encounter.js';
import { _egPauseGridDrops, _egResumeGridDrops } from './combat-grid-pickups-spawner.js';
import { _egHasActiveMapMod } from '../endgame/endgame-map-launch.js';
import { t } from '../translation/translations.js';
import { _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egPlayerStatuses, _egPuzzleEffects } from './combat-ailments-state.js';
import { _egIsActive } from './combat-state.js';
import { cur } from '../state.js';

try { Object.defineProperty(globalThis, '_egLastMistakesRemaining', { get() { return _egLastMistakesRemaining; }, set(v) { _egLastMistakesRemaining = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_egLastMistakesWarningShown', { get() { return _egLastMistakesWarningShown; }, set(v) { _egLastMistakesWarningShown = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------MISTAKE LIMITS--------------------------------------
//------------------------------------------------------------------------

// Returns the mistake limit for the current map, including gear bonuses.
export function _egGetMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed - overrides map limit and gear bonuses
    if (typeof curMods !== 'undefined' && globalThis.curMods.hardcore) return 0;
    const def = globalThis._egMapDef || cur;
    if (!def || def.egMaxMistakes == null) return null;
    const gearBonus = (typeof _egComputePlayerStats === 'function')
        ? (_egComputePlayerStats().mistakeCount || 0) : 0;
    return def.egMaxMistakes + gearBonus;
}

// Checks the current mistake count and ends an active map when it passes its limit.
export function _egCheckMistakeLimit() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return;
    // Low-mistakes overlay - fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && globalThis.mistakeCount > max) {
        // Central defeat handler - the player keeps the loot collected so far.
        _egEndMapDefeated(t('eg_map_failed'), t('eg_too_many_mistakes'));
    }
}

// Tracks the last remaining value so repeated HUD refreshes without a
// count change do not re-fire the banner, and increases do not re-trigger it.
let _egLastMistakesWarningShown = null;
let _egLastMistakesRemaining = null;

// Returns the number of mistakes still available on the current map.
export function _egGetMistakesRemaining() {
    const max = _egGetMaxAllowedMistakes();
    if (max == null) return null;
    const curCount = (typeof mistakeCount !== 'undefined') ? globalThis.mistakeCount : 0;
    return max - curCount;
}

// Fallback when timer.js hasn't defined it (e.g. isolated test harness):
// center-grid banners replace each other instead of stacking.
if (typeof _egClearCenterGridBanners !== 'function') {
    var _egClearCenterGridBanners = function (exceptId) {
        var ids = [
            'eg-low-time-warning-banner',
            'eg-mistakes-warning-banner',
            'eg-low-health-warning-banner',
            'eg-absorption-broken-banner',
            'eg-clock-call-banner',
            'eg-boss-arena-available-banner',
            'eg-map-cleared-banner'
        ];
        for (var i = 0; i < ids.length; i++) {
            if (ids[i] === exceptId) continue;
            const banner = document.getElementById(ids[i]);
            if (banner) banner.remove();
        }
    };
}

//------------------------------------------------------------------------
//-------------------LIFE REGENERATION-----------------------------------
//------------------------------------------------------------------------

// Heals the player once per second during an encounter: the flat gear
// lifeRegen bucket (HP per second) PLUS the tree-sourced percentage bucket
// (lifeRegenPct, effects pipeline) scaled by the CURRENT maximum Life, so
// the heal grows with the player's Life pool exactly as advertised.
export let _egLastLifeRegenAt = 0;
export function _egTickLifeRegen() {
    const now = Date.now();
    if (now - _egLastLifeRegenAt < EG_LIFE_REGEN_INTERVAL_MS) return;
    _egLastLifeRegenAt = now;

    const stats = _egComputePlayerStats();
    // Endurance batch: % of Life per second for every live Endurance Charge.
    const regenPct = (stats.lifeRegenPct || 0) + (stats.lifeRegenPerEndurancePct || 0) * (stats.enduranceCharges || 0);
    // Life Regeneration rate (node 111) scales the whole per-second amount.
    const regenRate = 1 + Math.max(0, stats.lifeRegenRatePct || 0) / 100;
    const regen = ((stats.lifeRegen || 0) + (globalThis.playerMaxHP * regenPct) / 100) * regenRate;
    if (regen <= 0 || globalThis.playerCurrentHP <= 0 || globalThis.playerCurrentHP >= globalThis.playerMaxHP) return;

    // Active map run: No Life Regeneration - regeneration is disabled.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration')) return;

    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + regen);
    if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}

//------------------------------------------------------------------------
//-------------------PAUSE TIME COORDINATION-----------------------------
//------------------------------------------------------------------------

// While paused, shifts wall-clock encounter deadlines forward on resume so
// paused encounters do not lose time to real-world timers.
export let _egPauseStartedAt = 0;
export function _egOnPause() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    _egPauseStartedAt = Date.now();
    if (typeof _egPauseGridDrops === 'function') {
        try { _egPauseGridDrops(); } catch (e) {}
    }
}

// Resumes an encounter after shifting monster, status, and shared deadline times.
export function _egOnResume() {
    if (!_egPauseStartedAt) return;
    const delta = Date.now() - _egPauseStartedAt;
    _egPauseStartedAt = 0;
    if (delta <= 0) {
        if (typeof _egResumeGridDrops === 'function') {
            try { _egResumeGridDrops(); } catch (e) {}
        }
        return;
    }
    globalThis._egMonsters.forEach(m => {
        if (m.bossSpawnTime) m.bossSpawnTime += delta;
        if (m.staggeredUntil) m.staggeredUntil += delta;
        if (m.statuses) Object.values(m.statuses).forEach(st => { if (st.until) st.until += delta; });
    });
    if (typeof window._egEncounterStartAt !== 'undefined' && window._egEncounterStartAt) window._egEncounterStartAt += delta;
    if (typeof _egPlayerBlockLockoutUntil !== 'undefined' && globalThis._egPlayerBlockLockoutUntil) globalThis._egPlayerBlockLockoutUntil += delta;
    if (typeof _egLastLifeRegenAt !== 'undefined' && _egLastLifeRegenAt) _egLastLifeRegenAt += delta;
    if (typeof _egPlayerStatuses !== 'undefined' && _egPlayerStatuses) {
        Object.values(_egPlayerStatuses).forEach(st => { if (st.until) st.until += delta; });
    }
    if (typeof _egPuzzleEffects !== 'undefined' && Array.isArray(_egPuzzleEffects)) {
        _egPuzzleEffects.forEach(e => { if (e.until) e.until += delta; });
    }
    if (typeof _egResumeGridDrops === 'function') {
        try { _egResumeGridDrops(); } catch (e) {}
    }
}
