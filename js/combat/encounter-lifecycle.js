//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Encounter lifecycle: start/stop/reset, the combat tick loop hookup,
// spawn timers and the boss stylesheet. The single place an encounter
// begins or ends.

import { _uspClearSupportBuffs } from '../skills/universal-spells.js';
import { _uspBarrierStart, _uspBarrierStop } from '../skills/universal-spell-fx.js';
import { _clearChargedProjectileVisual } from './encounter-charged-shot.js';
import { _buildSpawnList } from './encounter-spawn-rules.js';
import { _clearCampaignLevelFields } from './encounter-campaign-spawns.js';
import { _scheduleMonsterSpawns } from './encounter-spawn-scheduler.js';
import { _ailmentsCleanup, _ailmentsReset } from './combat-ailments.js';
import { _flushPendingRevealProjectiles } from './combat-class-projectiles-reveal.js';
import { _chainCleanup } from './encounter-chain.js';
import { _maybeShowMistakesWarning, _resetAbsorptionBrokenState, _resetLowHealthWarningState, _resetMistakesWarningState } from './encounter-overlays.js';
import { _setHoldEPauseVisual, _tickLoop } from './encounter-tick.js';
import { _hideMonsterPanel, _renderPanel } from './encounter.js';
import { _startPickupSpawner, _stopPickupSpawner } from './combat-grid-pickups-spawner.js';
import { _hazardsCleanup, _hazardsReset } from './combat-hazards-lifecycle.js';
import { _cancelAbsorptionRegen, _computePlayerStats, _getAllEquippedItems } from '../endgame/endgame-player-stats.js';
import { _recentFills } from './combat-state.js';
import { cur } from '../state.js';
import { t } from '../translation/translations.js';



//------------------------------------------------------------------------
//-------------------ENCOUNTER LIFECYCLE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Duration of the gear "stagger" charge-timer pause (pants mod).
export const STAGGER_DURATION_MS = 2500;

// Tick interval for the gear lifeRegen heal (life_regen mod, HP per second).
export const LIFE_REGEN_INTERVAL_MS = 1000;

// Resets all encounter state variables to their initial values.
export function _resetEncounterState() {
    // Reset the low-mistakes banner state for the new puzzle/encounter
    if (typeof _resetMistakesWarningState === 'function') _resetMistakesWarningState();
    // Recent-fill tracker: coordinates from the PREVIOUS puzzle must not
    // survive into this one - a bigger previous grid would leave out-of-bounds
    // [r, c] pairs that boss mechanics (Prior Bomb, Rewrite Fate, Soul Tithe,
    // Pattern Break) index against the new (smaller) userGrid. Boss timers
    // re-validate via _cellInBounds, but the stale entries are still wrong
    // answers for "recent player progress on THIS grid" - drop them.
    _recentFills.length = 0;
    if (typeof _resetLowHealthWarningState === 'function') _resetLowHealthWarningState();
    if (typeof _resetAbsorptionBrokenState === 'function') _resetAbsorptionBrokenState();
    globalThis._encounterActive = true;
    // Encounter clock for timed passive effects (Searing Surge 10s cycle);
    // the tick support shifts it by the length of every pause.
    window._encounterStartAt = Date.now();
    globalThis._targetId = null;
    globalThis._monsters = [];
    // Do NOT clear _pendingRevealQueue here - start-of-puzzle passives
    // queued reveals before _startEncounter and would be lost. Queue is
    // cleared on _stopEncounter or after flushing.
    globalThis._mapDef = cur;
    globalThis._monsterSpawnCounter = 0;
    globalThis._playerAbsorptionCurrent = _computePlayerStats().absorption;
    _cancelAbsorptionRegen();
    if (typeof _ailmentsReset === 'function') _ailmentsReset();
    if (typeof _hazardsReset === 'function') _hazardsReset();
    if (typeof _clearChargedProjectileVisual === 'function') _clearChargedProjectileVisual();

    // Gear: channel / arcane surge streaks restart with each encounter
    globalThis._channelStacks = 0;
    globalThis._arcaneSurgeStreak = 0;
    // Gear: warding - "once per map". Standalone monster levels are their own
    // map, so refresh here; device-map runs refresh only at launch
    // (_egLaunchMapFromDevice) so the save persists across chained puzzles.
    if (!window._egIsMapDeviceRun) globalThis._wardingUsedThisMap = false;

    // First step toast flag reset
    globalThis._firstStepToastShown = false;

    // Hold-parry pause starts released
    if (typeof _holdEPauseActive !== 'undefined') globalThis._holdEPauseActive = false;
    if (typeof _setHoldEPauseVisual === 'function') _setHoldEPauseVisual(false);

    // Manual melee charge starts empty each encounter (Secret-of-Mana-style:
    // every strike spends the bar, so every fight opens at 0%)
    globalThis._playerCurrentCharge = 0;
    globalThis._playerCurrentCharge2 = 0;
    globalThis._pendingMeleeChargePct = null;
    // Reaction strikes (parry / block / dodge windows) never carry over a fight.
    try { if (typeof globalThis.clearUniversalReactions === 'function') globalThis.clearUniversalReactions(); } catch (e) { /* optional */ }
    // ...and no hold carries over either (a stuck hold would root the hero
    // + keep them vulnerable with no finger on the key).
    globalThis._meleeHoldActive = false;
    globalThis._meleeHoldKey = null;
    globalThis._meleeHoldStartAt = 0;
    globalThis._meleeChargeLevel = 0;

    // Initial low-mistakes check - shows the 3/2/1/0 overlay immediately
    // if the map already starts with a tight mistake budget.
    if (typeof _maybeShowMistakesWarning === 'function') _maybeShowMistakesWarning();
}

// Starts the combat tick loop at 10Hz.
export function _startTickLoop() {
    if (globalThis._tickInterval) clearInterval(globalThis._tickInterval);
    globalThis._tickInterval = setInterval(_tickLoop, 100);
}

// Pass 5: bosses2.css is no longer a render-blocking <link> in index.html
// (442 KB of boss-FX-only styles - verified no non-boss code uses its
// classes; base monster-card styles live in the eager monsters.css).
// Warm it up once at idle after boot; _startEncounter force-loads it
// synchronously if the warm-up has not landed yet.
export function _attachBossStylesheet() {
    if (document.querySelector('link[data-eg-boss-css]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/endgame/bosses2.css';
    l.setAttribute('data-eg-boss-css', '1');
    document.head.appendChild(l);
}
(function _warmBossStylesheet() {
    if (typeof requestIdleCallback === 'function') globalThis.requestIdleCallback(_attachBossStylesheet, { timeout: 8000 });
    else setTimeout(_attachBossStylesheet, 2500);
})();

// One-time hint (per save) the first time a fight starts with a bow equipped:
// the bow has no fire button, it shoots with every correct reveal.
function _maybeShowBowHint() {
    try {
        if (typeof globalThis._tqIsTutorialActive === 'function' && globalThis._tqIsTutorialActive()) return;
        if (typeof globalThis.hasSeen !== 'function' || globalThis.hasSeen('bow_shoot_hint')) return;
        const hasBow = (_getAllEquippedItems() || []).some(it => it && it.slotType === 'ranged');
        if (!hasBow) return;
        globalThis.markSeen('bow_shoot_hint');
        setTimeout(() => { if (globalThis._encounterActive) globalThis.showToast(t('eg_bow_hint_toast')); }, 1800);
    } catch (e) { /* a hint must never break an encounter */ }
}

// Initialises and begins a full monster encounter for the current level.
// Called from start-level.js or equivalent when cur.isMonsterLevel is true.
export function _startEncounter() {
    _attachBossStylesheet(); // sync fallback in case the idle warm-up has not fired yet
    _resetEncounterState();
    _renderPanel();
    _startTickLoop();
    _startPickupSpawner();
    _scheduleMonsterSpawns(_buildSpawnList());
    _maybeShowBowHint();
    // Absorption starts full, but the shell latches on Barrier casts only - warm the tracker, show nothing yet.
    if (typeof _uspBarrierStart === 'function') { try { _uspBarrierStart(); } catch (e) { /* shell is cosmetic */ } }
    // Flush any auto-reveals that fired before the encounter went live
    // (start-of-puzzle passives run before _startEncounter in start-level.js).
    if (typeof _flushPendingRevealProjectiles === 'function') {
        // Small delay so the first monster has time to spawn and be auto-targeted.
        setTimeout(() => _flushPendingRevealProjectiles(), 650);
    }
}

// Clears all pending spawn timers and resets the timer list.
export function _cancelSpawnTimers() {
    globalThis._spawnTimers.forEach(t => clearTimeout(t));
    globalThis._spawnTimers = [];
}

// Stops the combat tick loop if one is running.
export function _stopTickLoop() {
    if (globalThis._tickInterval) {
        clearInterval(globalThis._tickInterval);
        globalThis._tickInterval = null;
    }
}

// Tears down a running encounter and cleans up all state and DOM.
// Safe to call even if no encounter is active.
export function _stopEncounter() {
    if (window._suppressEncounterStop) return;

    // Campaign: restore the level object we stamped in
    // _prepareCampaignEncounter. _mapDef still points at the level that
    // just ran (cur has already been reassigned by the next startLevel).
    if (typeof _mapDef !== 'undefined' && globalThis._mapDef) {
        _clearCampaignLevelFields(globalThis._mapDef);
    }

    globalThis._encounterActive = false;
    globalThis._monsters = [];
    globalThis._targetId = null;
    if (typeof _pendingRevealQueue !== 'undefined') globalThis._pendingRevealQueue = [];

    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    if (typeof _clearChargedProjectileVisual === 'function') _clearChargedProjectileVisual();
    _stopTickLoop();
    _cancelSpawnTimers();
    _stopPickupSpawner();
    if (typeof _ailmentsCleanup === 'function') _ailmentsCleanup();
    if (typeof _hazardsCleanup === 'function') _hazardsCleanup();
    globalThis._bossCleanupAll();
    _cancelAbsorptionRegen();
    // Support-spell buffs never survive the encounter they were cast in.
    if (typeof _uspClearSupportBuffs === 'function') _uspClearSupportBuffs();
    if (typeof _uspBarrierStop === 'function') _uspBarrierStop();
    if (typeof _resetMistakesWarningState === 'function') _resetMistakesWarningState();
    if (typeof _resetLowHealthWarningState === 'function') _resetLowHealthWarningState();
    if (typeof _resetAbsorptionBrokenState === 'function') _resetAbsorptionBrokenState();
    if (typeof _chainCleanup === 'function') _chainCleanup();
    _hideMonsterPanel();
    if (typeof _holdEPauseActive !== 'undefined') globalThis._holdEPauseActive = false;
    if (typeof _setHoldEPauseVisual === 'function') _setHoldEPauseVisual(false);
    // Drop any in-flight manual swing snapshot with the encounter
    globalThis._playerCurrentCharge = 0;
    globalThis._playerCurrentCharge2 = 0;
    globalThis._pendingMeleeChargePct = null;
}
