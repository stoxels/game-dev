//------------------------------------------------------------------------
// PHASE 4 split (2026-09-16): extracted into a focused module. The original
// path is now a facade that re-exports this module, so existing import sites
// are unaffected. See MIGRATION.md "splitting giants".
//------------------------------------------------------------------------

// Encounter lifecycle: start/stop/reset, the combat tick loop hookup,
// spawn timers and the boss stylesheet. The single place an encounter
// begins or ends.

import { _uspClearSupportBuffs } from '../skills/universal-spells.js';
import { _egClearChargedProjectileVisual } from './encounter-charged-shot.js';
import { _egBuildSpawnList, _egClearCampaignLevelFields, _egScheduleMonsterSpawns } from './encounter-spawn-rules.js';
import { _egAilmentsCleanup, _egAilmentsReset } from './combat-ailments.js';
import { _egFlushPendingRevealProjectiles } from './combat-class-projectiles.js';
import { _egChainCleanup } from './encounter-chain.js';
import { _egMaybeShowMistakesWarning, _egResetAbsorptionBrokenState, _egResetLowHealthWarningState, _egResetMistakesWarningState } from './encounter-overlays.js';
import { _egSetHoldEPauseVisual, _egTickLoop } from './encounter-tick.js';
import { _egHideMonsterPanel, _egRenderPanel } from './encounter.js';
import { _egStartPickupSpawner, _egStopPickupSpawner } from './combat-grid-pickups.js';
import { _egHazardsCleanup, _egHazardsReset } from './combat-hazards.js';
import { _egCancelAbsorptionRegen, _egComputePlayerStats } from '../endgame/endgame-player-stats.js';
import { _egRecentFills } from './combat-state.js';
import { cur } from '../state.js';



//------------------------------------------------------------------------
//-------------------ENCOUNTER LIFECYCLE----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Duration of the gear "stagger" charge-timer pause (pants mod).
export const EG_STAGGER_DURATION_MS = 2500;

// Tick interval for the gear lifeRegen heal (life_regen mod, HP per second).
export const EG_LIFE_REGEN_INTERVAL_MS = 1000;

// Resets all encounter state variables to their initial values.
export function _egResetEncounterState() {
    // Reset the low-mistakes banner state for the new puzzle/encounter
    if (typeof _egResetMistakesWarningState === 'function') _egResetMistakesWarningState();
    // Recent-fill tracker: coordinates from the PREVIOUS puzzle must not
    // survive into this one - a bigger previous grid would leave out-of-bounds
    // [r, c] pairs that boss mechanics (Prior Bomb, Rewrite Fate, Soul Tithe,
    // Pattern Break) index against the new (smaller) userGrid. Boss timers
    // re-validate via _egCellInBounds, but the stale entries are still wrong
    // answers for "recent player progress on THIS grid" - drop them.
    _egRecentFills.length = 0;
    if (typeof _egResetLowHealthWarningState === 'function') _egResetLowHealthWarningState();
    if (typeof _egResetAbsorptionBrokenState === 'function') _egResetAbsorptionBrokenState();
    globalThis._egEncounterActive = true;
    globalThis._egTargetId = null;
    globalThis._egMonsters = [];
    // Do NOT clear _egPendingRevealQueue here - start-of-puzzle passives
    // queued reveals before _egStartEncounter and would be lost. Queue is
    // cleared on _egStopEncounter or after flushing.
    globalThis._egMapDef = cur;
    globalThis._egMonsterSpawnCounter = 0;
    globalThis._egPlayerAbsorptionCurrent = _egComputePlayerStats().absorption;
    _egCancelAbsorptionRegen();
    if (typeof _egAilmentsReset === 'function') _egAilmentsReset();
    if (typeof _egHazardsReset === 'function') _egHazardsReset();
    if (typeof _egClearChargedProjectileVisual === 'function') _egClearChargedProjectileVisual();

    // Gear: channel / arcane surge streaks restart with each encounter
    globalThis._egChannelStacks = 0;
    globalThis._egArcaneSurgeStreak = 0;
    // Gear: warding - "once per map". Standalone monster levels are their own
    // map, so refresh here; device-map runs refresh only at launch
    // (_egLaunchMapFromDevice) so the save persists across chained puzzles.
    if (!window._egIsMapDeviceRun) globalThis._egWardingUsedThisMap = false;

    // First step toast flag reset
    globalThis._egFirstStepToastShown = false;

    // Hold-parry pause starts released
    if (typeof _egHoldEPauseActive !== 'undefined') globalThis._egHoldEPauseActive = false;
    if (typeof _egSetHoldEPauseVisual === 'function') _egSetHoldEPauseVisual(false);

    // Manual melee charge starts empty each encounter (Secret-of-Mana-style:
    // every strike spends the bar, so every fight opens at 0%)
    globalThis._egPlayerCurrentCharge = 0;
    globalThis._egPendingMeleeChargePct = null;
    // ...and no hold carries over either (a stuck hold would root the hero
    // + keep them vulnerable with no finger on the key).
    globalThis._egMeleeHoldActive = false;
    globalThis._egMeleeHoldKey = null;
    globalThis._egMeleeHoldStartAt = 0;
    globalThis._egMeleeChargeLevel = 0;

    // Initial low-mistakes check - shows the 3/2/1/0 overlay immediately
    // if the map already starts with a tight mistake budget.
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
}

// Starts the combat tick loop at 10Hz.
export function _egStartTickLoop() {
    if (globalThis._egTickInterval) clearInterval(globalThis._egTickInterval);
    globalThis._egTickInterval = setInterval(_egTickLoop, 100);
}

// Pass 5: bosses2.css is no longer a render-blocking <link> in index.html
// (442 KB of boss-FX-only styles - verified no non-boss code uses its
// classes; base monster-card styles live in the eager monsters.css).
// Warm it up once at idle after boot; _egStartEncounter force-loads it
// synchronously if the warm-up has not landed yet.
export function _egAttachBossStylesheet() {
    if (document.querySelector('link[data-eg-boss-css]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/endgame/bosses2.css';
    l.setAttribute('data-eg-boss-css', '1');
    document.head.appendChild(l);
}
(function _egWarmBossStylesheet() {
    if (typeof requestIdleCallback === 'function') globalThis.requestIdleCallback(_egAttachBossStylesheet, { timeout: 8000 });
    else setTimeout(_egAttachBossStylesheet, 2500);
})();

// Initialises and begins a full monster encounter for the current level.
// Called from start-level.js or equivalent when cur.isMonsterLevel is true.
export function _egStartEncounter() {
    _egAttachBossStylesheet(); // sync fallback in case the idle warm-up has not fired yet
    _egResetEncounterState();
    _egRenderPanel();
    _egStartTickLoop();
    _egStartPickupSpawner();
    _egScheduleMonsterSpawns(_egBuildSpawnList());
    // Flush any auto-reveals that fired before the encounter went live
    // (start-of-puzzle passives run before _egStartEncounter in start-level.js).
    if (typeof _egFlushPendingRevealProjectiles === 'function') {
        // Small delay so the first monster has time to spawn and be auto-targeted.
        setTimeout(() => _egFlushPendingRevealProjectiles(), 650);
    }
}

// Clears all pending spawn timers and resets the timer list.
export function _egCancelSpawnTimers() {
    globalThis._egSpawnTimers.forEach(t => clearTimeout(t));
    globalThis._egSpawnTimers = [];
}

// Stops the combat tick loop if one is running.
export function _egStopTickLoop() {
    if (globalThis._egTickInterval) {
        clearInterval(globalThis._egTickInterval);
        globalThis._egTickInterval = null;
    }
}

// Tears down a running encounter and cleans up all state and DOM.
// Safe to call even if no encounter is active.
export function _egStopEncounter() {
    if (window._egSuppressEncounterStop) return;

    // Campaign: restore the level object we stamped in
    // _egPrepareCampaignEncounter. _egMapDef still points at the level that
    // just ran (cur has already been reassigned by the next startLevel).
    if (typeof _egMapDef !== 'undefined' && globalThis._egMapDef) {
        _egClearCampaignLevelFields(globalThis._egMapDef);
    }

    globalThis._egEncounterActive = false;
    globalThis._egMonsters = [];
    globalThis._egTargetId = null;
    if (typeof _egPendingRevealQueue !== 'undefined') globalThis._egPendingRevealQueue = [];

    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    if (typeof _egClearChargedProjectileVisual === 'function') _egClearChargedProjectileVisual();
    _egStopTickLoop();
    _egCancelSpawnTimers();
    _egStopPickupSpawner();
    if (typeof _egAilmentsCleanup === 'function') _egAilmentsCleanup();
    if (typeof _egHazardsCleanup === 'function') _egHazardsCleanup();
    globalThis._egBossCleanupAll();
    _egCancelAbsorptionRegen();
    // Support-spell buffs never survive the encounter they were cast in.
    if (typeof _uspClearSupportBuffs === 'function') _uspClearSupportBuffs();
    if (typeof _egResetMistakesWarningState === 'function') _egResetMistakesWarningState();
    if (typeof _egResetLowHealthWarningState === 'function') _egResetLowHealthWarningState();
    if (typeof _egResetAbsorptionBrokenState === 'function') _egResetAbsorptionBrokenState();
    if (typeof _egChainCleanup === 'function') _egChainCleanup();
    _egHideMonsterPanel();
    if (typeof _egHoldEPauseActive !== 'undefined') globalThis._egHoldEPauseActive = false;
    if (typeof _egSetHoldEPauseVisual === 'function') _egSetHoldEPauseVisual(false);
    // Drop any in-flight manual swing snapshot with the encounter
    globalThis._egPlayerCurrentCharge = 0;
    globalThis._egPendingMeleeChargePct = null;
}




//------------------------------------------------------------------------
//-------------------MONSTER ATTACKS (Monster → Player)-------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Flashes the monster's card to signal it is attacking.
export function _egFlashMonsterAttackCard(monster) {
    const card = document.getElementById(`eg-card-${monster.id}`);
    if (!card) return;
    card.classList.remove('eg-flash-attack');
    void card.offsetWidth; // force reflow so the CSS animation restarts
    card.classList.add('eg-flash-attack');
}
