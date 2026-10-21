// Encounter tick-support owner: mistake limits, life regeneration, and
// pause-time coordination for the shared combat tick loop.

import { _endMapDefeated } from './encounter-chain.js';
import { _maybeShowMistakesWarning } from './encounter-overlays.js';
import { LIFE_REGEN_INTERVAL_MS } from './encounter.js';
import { _pauseGridDrops, _resumeGridDrops } from './combat-grid-pickups-spawner.js';
import { _egHasActiveMapMod } from '../endgame/endgame-map-launch.js';
import { t } from '../translation/translations.js';
import { _computePlayerStats } from './combat-player-stats.js';
import { _playerStatuses, _puzzleEffects } from './combat-ailments-state.js';
import { _isActive } from './combat-state.js';
import { cur } from '../state.js';

try { Object.defineProperty(globalThis, '_lastMistakesRemaining', { get() { return _lastMistakesRemaining; }, set(v) { _lastMistakesRemaining = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_lastMistakesWarningShown', { get() { return _lastMistakesWarningShown; }, set(v) { _lastMistakesWarningShown = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------MISTAKE LIMITS--------------------------------------
//------------------------------------------------------------------------

// Returns the mistake limit for the current map, including gear bonuses.
export function _getMaxAllowedMistakes() {
    // Hardcore: no mistake is allowed - overrides map limit and gear bonuses
    if (typeof curMods !== 'undefined' && globalThis.curMods.hardcore) return 0;
    const def = globalThis._mapDef || cur;
    if (!def || def.chainMaxMistakes == null) return null;
    const gearBonus = (typeof _computePlayerStats === 'function')
        ? (_computePlayerStats().mistakeCount || 0) : 0;
    const total = def.chainMaxMistakes + gearBonus;
    // Negative tree bonuses (keystone trade-offs) never drop the limit below 1.
    return gearBonus < 0 ? Math.max(1, total) : total;
}

// Checks the current mistake count and ends an active map when it passes its limit.
export function _checkMistakeLimit() {
    const max = _getMaxAllowedMistakes();
    if (max == null) return;
    // Low-mistakes overlay - fires when only 3/2/1/0 remain (deduped inside)
    if (typeof _maybeShowMistakesWarning === 'function') _maybeShowMistakesWarning();
    if (typeof mistakeCount !== 'undefined' && globalThis.mistakeCount > max) {
        // Central defeat handler - the player keeps the loot collected so far.
        _endMapDefeated(t('eg_map_failed'), t('eg_too_many_mistakes'));
    }
}

// Tracks the last remaining value so repeated HUD refreshes without a
// count change do not re-fire the banner, and increases do not re-trigger it.
let _lastMistakesWarningShown = null;
let _lastMistakesRemaining = null;

// Returns the number of mistakes still available on the current map.
export function _getMistakesRemaining() {
    const max = _getMaxAllowedMistakes();
    if (max == null) return null;
    const curCount = (typeof mistakeCount !== 'undefined') ? globalThis.mistakeCount : 0;
    return max - curCount;
}

// Fallback when timer.js hasn't defined it (e.g. isolated test harness):
// center-grid banners replace each other instead of stacking.
if (typeof _clearCenterGridBanners !== 'function') {
    var _clearCenterGridBanners = function (exceptId) {
        var ids = [
            'sx-low-time-warning-banner',
            'sx-mistakes-warning-banner',
            'sx-low-health-warning-banner',
            'sx-absorption-broken-banner',
            'sx-clock-call-banner',
            'sx-boss-arena-available-banner',
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
export let _lastLifeRegenAt = 0;
let _lastLifePulseAt = 0;
const LIFE_REGEN_CHUNK_MS = 3000;
let _lastMainRegenAt = 0;
// Life regeneration tick (at most once per interval): applies regen, Life
// Recoup draining and related stats to the player's life.
export function _tickLifeRegen() {
    const now = Date.now();
    if (now - _lastLifeRegenAt < LIFE_REGEN_INTERVAL_MS) return;
    _lastLifeRegenAt = now;

    const stats = _computePlayerStats();
    // Life Recoup: the pool of recouped damage drains with a ~4s time
    // constant (a quarter of what is left per second).
    if (globalThis._recoupStamp === globalThis._encounterStartAt && (Number(globalThis._recoupPool) || 0) > 0) {
        const drip = Math.min(globalThis._recoupPool, Math.max(1, globalThis._recoupPool * LIFE_REGEN_INTERVAL_MS / 4000));
        globalThis._recoupPool -= drip;
        if (globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP
            && !(typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration'))) {
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(drip) : (drip)));
            if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }
    // Endurance batch: % of Life per second for every live Endurance Charge.
    // Surge of Vigour (tree): every 4 seconds a share of max Life is regenerated.
    if ((stats.lifePulsePct || 0) > 0 && now - _lastLifePulseAt >= 4000) {
        _lastLifePulseAt = now;
        if (globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP
            && !(typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration'))) {
            globalThis._healSilent = false; // Surge of Vigour pulses are worth a number
            globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(globalThis.playerMaxHP * stats.lifePulsePct / 100) : (globalThis.playerMaxHP * stats.lifePulsePct / 100)));
            if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
        }
    }
    // Brink of Death (tree): extra regeneration while on Low Life (<=35%).
    const lowLifeRegen = ((stats.lowLifeRegenPct || 0) > 0 && globalThis.playerMaxHP > 0
        && globalThis.playerCurrentHP <= globalThis.playerMaxHP * 0.35) ? stats.lowLifeRegenPct : 0;
    const regenPct = (stats.lifeRegenPct || 0) + lowLifeRegen + (stats.lifeRegenPerEndurancePct || 0) * (stats.enduranceCharges || 0);
    // Life Regeneration rate (node 111) scales the whole per-second amount.
    // regen_low_time (tree): faster regeneration while below 25% of the level's
    // starting timer (snapshot written by the passive-tree timer patch).
    const startTimer = Number(globalThis._levelStartTimerSecs) || 0;
    const lowTime = startTimer > 0 && (Number(globalThis.timerSecs) || 0) < startTimer * 0.25;
    const regenRate = 1 + (Math.max(0, stats.lifeRegenRatePct || 0) + (lowTime ? Math.max(0, stats.regenLowTimePct || 0) : 0)) / 100;
    // "Less" Life Regeneration rate (Vital Conduit keystone): a multiplier
    // after every increase.
    const regenLess = Math.max(0, 1 - Math.max(0, stats.lifeRegenLessPct || 0) / 100);
    // Life Regeneration lands in one chunk every LIFE_REGEN_CHUNK_MS (the
    // per-second rate times the chunk length), not as a trickle every second.
    const regenDue = now - _lastMainRegenAt >= LIFE_REGEN_CHUNK_MS;
    if (regenDue) _lastMainRegenAt = now;
    const regen = regenDue
        ? ((stats.lifeRegen || 0) + (globalThis.playerMaxHP * regenPct) / 100) * regenRate * regenLess * (LIFE_REGEN_CHUNK_MS / 1000)
        : 0;
    // The Agnostic: while not on full Life, a share of max Mana per second is sacrificed
    // to recover that much Life.
    if ((stats.manaToLifePct || 0) > 0 && globalThis.playerCurrentHP > 0 && globalThis.playerCurrentHP < globalThis.playerMaxHP
        && (Number(globalThis.playerCurrentMana) || 0) > 0 && (Number(globalThis.playerMaxMana) || 0) > 0) {
        const dtS = LIFE_REGEN_INTERVAL_MS / 1000;
        const spend = Math.min(globalThis.playerCurrentMana, Math.max(1, globalThis.playerMaxMana * stats.manaToLifePct / 100 * dtS));
        globalThis.playerCurrentMana = Math.max(0, Math.round(globalThis.playerCurrentMana - spend));
        globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + spend);
        if (typeof globalThis.updateClassHUDManaBar === 'function') globalThis.updateClassHUDManaBar();
        if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
    }
    // Zealot's Oath: Life Regeneration refills Absorption instead of Life.
    if ((stats.lifeRegenToAbsorption || 0) > 0) {
        const absMax = Number(stats.absorption) || 0;
        if (regen > 0 && absMax > 0 && !(typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration'))) {
            globalThis._playerAbsorptionCurrent = Math.min(absMax, (Number(globalThis._playerAbsorptionCurrent) || 0) + regen);
        }
        return;
    }
    if (regen <= 0 || globalThis.playerCurrentHP <= 0 || globalThis.playerCurrentHP >= globalThis.playerMaxHP) return;

    // Active map run: No Life Regeneration - regeneration is disabled.
    if (typeof _egHasActiveMapMod === 'function' && _egHasActiveMapMod('map_no_regeneration')) return;

    globalThis.playerCurrentHP = Math.min(globalThis.playerMaxHP, globalThis.playerCurrentHP + (globalThis._lifeGain ? globalThis._lifeGain(regen) : (regen)));
    if (typeof _renderPlayerHealth === 'function') globalThis._renderPlayerHealth();
}

//------------------------------------------------------------------------
//-------------------PAUSE TIME COORDINATION-----------------------------
//------------------------------------------------------------------------

// While paused, shifts wall-clock encounter deadlines forward on resume so
// paused encounters do not lose time to real-world timers.
export let _pauseStartedAt = 0;

// Flying projectiles and monster-spell effects run on Web Animations, which
// keep going behind the pause menu (and fire their on-arrival hit + sound).
// Freeze them on pause, thaw only what we froze on resume.
const _frozenFlightAnims = new Set();
// Pauses running projectile and spell animations (used while the game is
// paused).
function _freezeFlightFx() {
    try {
        document.getAnimations().forEach(a => {
            const el = a.effect && a.effect.target;
            if (a.playState === 'running' && el && el.closest && el.closest('.sx-projectile, .ms-fx')) {
                a.pause();
                _frozenFlightAnims.add(a);
            }
        });
    } catch (e) { /* cosmetic */ }
}
// Resumes the animations paused by _freezeFlightFx.
function _thawFlightFx() {
    _frozenFlightAnims.forEach(a => { try { a.play(); } catch (e) { /* already finished */ } });
    _frozenFlightAnims.clear();
}

// Called when the game pauses: records the pause start, freezes flight
// effects and pauses grid drops.
export function _onPause() {
    if (typeof _isActive === 'function' && !_isActive()) return;
    _pauseStartedAt = Date.now();
    _freezeFlightFx();
    if (typeof _pauseGridDrops === 'function') {
        try { _pauseGridDrops(); } catch (e) {}
    }
}

// Resumes an encounter after shifting monster, status, and shared deadline times.
export function _onResume() {
    _thawFlightFx();
    if (!_pauseStartedAt) return;
    const delta = Date.now() - _pauseStartedAt;
    _pauseStartedAt = 0;
    if (delta <= 0) {
        if (typeof _resumeGridDrops === 'function') {
            try { _resumeGridDrops(); } catch (e) {}
        }
        return;
    }
    globalThis._monsters.forEach(m => {
        if (m.bossSpawnTime) m.bossSpawnTime += delta;
        if (m.staggeredUntil) m.staggeredUntil += delta;
        if (m.statuses) Object.values(m.statuses).forEach(st => { if (st.until) st.until += delta; });
    });
    if (typeof window._encounterStartAt !== 'undefined' && window._encounterStartAt) window._encounterStartAt += delta;
    if (typeof _playerBlockLockoutUntil !== 'undefined' && globalThis._playerBlockLockoutUntil) globalThis._playerBlockLockoutUntil += delta;
    if (typeof _lastLifeRegenAt !== 'undefined' && _lastLifeRegenAt) _lastLifeRegenAt += delta;
    if (_lastMainRegenAt) _lastMainRegenAt += delta;
    if (typeof _playerStatuses !== 'undefined' && _playerStatuses) {
        Object.values(_playerStatuses).forEach(st => { if (st.until) st.until += delta; });
    }
    if (typeof _puzzleEffects !== 'undefined' && Array.isArray(_puzzleEffects)) {
        _puzzleEffects.forEach(e => { if (e.until) e.until += delta; });
    }
    if (typeof _resumeGridDrops === 'function') {
        try { _resumeGridDrops(); } catch (e) {}
    }
}
