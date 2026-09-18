import { trackAchStat } from './achievements/achievements.js';
import { areAllWorldLevelsDone, grantClassChangeToken, triggerClassEventIfPending } from './classes/class-ui.js';
import { curMods } from './difficulty-modifiers.js';
import { EG_BOSS_DEFS } from './combat/bosses/boss-framework.js';
import { _egBuildChainPool, _egCanLeaveMap, _egCancelChainCountdown, _egRollBonusMapLoot, _egShowLeaveMapTransition } from './combat/encounter-chain.js';
import { _egEnsureLoseOverlayEndgameUI } from './combat/encounter-overlays.js';
import { _egStopEncounter } from './combat/encounter.js';
import { _egFlushRunLootToStash } from './combat/combat-grid-pickups.js';
import { egSaveHubState } from './endgame/endgame-hub.js';
import { EG_LEVELING_CONFIG, _egAwardXP, _egCalcXpMultiplier, _egCampaignExpectedLevel, _egGetPlayerLevel, _egGetXpForNextLevel, _egGrantCampaignLevelXP } from './endgame/endgame-leveling.js';
import { _egPickMapRunSeedGi } from './endgame/endgame-map-launch.js';
import { _egBankUnclaimedMapDrops } from './loot/loot-maps.js';
import { _egResetQuizDamageBuff } from './endgame/endgame-quiz-buffs.js';
import { WORLDS } from './levels/level-world-data.js';
import { ALL, WORLD_START_GI, isNexusPointLevel, isNexusWorld } from './levels/levels.js';
import { buildInventoryPanel } from './puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { ITEM_DEFS } from './puzzle-items/item-definitions.js';
import { showItemGainPopup, showToast } from './puzzle-mechanics/toasts-and-popups.js';
import { _incDirect, updateQuestStats } from './inference/inference-stats.js';
import { isGatedLevel } from './quiz-exercise/mathgate.js';
import { _wdSyncSpriteToLevel, showWorldDetail } from './screens/screens-world-levels.js';
import { _maybeShowConvergenceModal, goToLevelSelect } from './screens/screens.js';
import { _hidePlayerAvatar, _hidePlayerAvatarSimple } from './sprite/player_sprite.js';
import { save } from './state.js';
import { stopTimer } from './timer/timer.js';
import { t } from './translation/translations.js';
import { STATE } from './state.js';
import { cur } from './state.js';

//------------------------------------------------------------------------
//-------------------CAMPAIGN TRIALS--------------------------------------
//------------------------------------------------------------------------
// Leveling Rework: Convergence Trials + Ascension Trials.
//
//   - CONVERGENCE TRIALS are mini-maps (short encounter chains ending in a
//     boss fight, tuned for lower-level players via the campaign monster
//     level). One per campaign world (Trial 1..13 for worlds 1..13); they
//     need NO map item to enter. Intermediate quiz questions come from the
//     trial's own world. Finishing (Complete Map button, relabelled
//     "Finish Trial") grants a passive point + the convergence modal on
//     first clear. The old 33%/66% convergence puzzle levels are regular
//     puzzle levels now (isConvergenceLevel() always returns false).
//   - ASCENSION TRIALS: every ascension level (final level of a world,
//     except the Nexus Point) is entered as a mini-map chain that ends in a
//     boss fight. Finishing marks the ascension level done, grants the
//     Codex of Completion on first clear and runs the normal
//     world-completion class flow.
//
// Both reuse the endgame encounter-chain machinery verbatim: the trial
// stamps a randomly picked seed story level exactly like
// _egLaunchMapFromDevice() does (isMonsterLevel + isMapRunSeed + run
// params + boss list) and launches it via startLevel(). The only
// differences: no map item is consumed, questions are drawn from the
// trial's world, the leave button is relabelled, and completion grants
// trial rewards instead of atlas progress.
//
// Wiring (typeof-guarded so load order never matters):
//   world map nodes  → _egLaunchCampaignTrial(wi) / ascension via startLevel()
//   startLevel()     → _egMaybeLaunchAscensionTrial() intercepts campaign
//                      ascension levels into _egLaunchAscensionTrial(wi)
//   _egTryLeaveMap() → branches to _egEndCampaignTrial() for trial runs
//   _egPickInterstitialWorldNum() → trial world override (patched in
//                      endgame-encounter-chain.js, reads window._egCampaignTrial)
//   _egChainCleanup()→ _egCleanupCampaignTrialSeed() (patched call site)
//   leave-map return → window._egTrialReturnWi branch (patched call site)
//
// Dependencies (all optional at load time, required at run time):
//   js/levels/levels.js, js/state.js, endgame-encounter-chain.js,
//   endgame-map-launch.js (_egPickMapRunSeedGi), endgame-leveling.js,
//   js/scoring.js (applyConvergenceReward path), js/classes/class-ui.js
//------------------------------------------------------------------------


// Worlds 0..12 (campaign worlds 1..13) each own one Convergence Trial.
// Trial number = world number (Trial 1 lives in world 1, ...). The Nexus
// World (index 13) has no trial - its finale is the Nexus Point.
export function _egTrialWorlds() {
    if (typeof WORLDS === 'undefined' || !WORLDS) return [];
    const out = [];
    for (let wi = 0; wi < WORLDS.length; wi++) {
        if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) continue;
        if (!WORLDS[wi] || !WORLDS[wi].data || !WORLDS[wi].data.length) continue;
        out.push(wi);
    }
    return out;
}

// Total number of Convergence Trials (drives the convergence modal "x / n").
export function _egTrialCount() {
    return _egTrialWorlds().length;
}

// Trial id for a world index, e.g. 'trial_1'. Stable across saves.
export function _egTrialIdForWorld(wi) {
    return 'trial_' + (wi + 1);
}

// Display name, e.g. 'Convergence Trial 1'.
export function _egTrialName(wi) {
    const label = (typeof t === 'function')
        ? t('eg_trial_name').replace('{n}', wi + 1) : null;
    return (label && label !== 'eg_trial_name') ? label : ('Convergence Trial ' + (wi + 1));
}

// Display name for an ascension trial, e.g. 'Ascension Trial - World 3'.
export function _egAscensionTrialName(wi) {
    const label = (typeof t === 'function')
        ? t('eg_ascension_trial_name').replace('{n}', wi + 1) : null;
    return (label && label !== 'eg_ascension_trial_name')
        ? label : ('Ascension Trial - World ' + (wi + 1));
}

// Global index of the first level of world `wi` (-1 when unknown).
export function _egTrialWorldStartGi(wi) {
    if (typeof WORLD_START_GI !== 'undefined' && WORLD_START_GI[wi] != null) return WORLD_START_GI[wi];
    if (typeof ALL === 'undefined') return -1;
    let gi = 0;
    for (let w = 0; w < wi; w++) {
        if (typeof WORLDS === 'undefined' || !WORLDS[w]) return -1;
        gi += WORLDS[w].data.length;
    }
    return gi;
}

// Monster level for trials in world `wi`.
// Uses the campaign's expected character level at the world's midpoint
// (convergence) or final level (ascension) so the chain + boss fight land
// on-level for a player progressing normally - full XP, fair fight.
export function _egTrialMonsterLevel(wi, atEnd) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    const start = _egTrialWorldStartGi(wi);
    if (world && start >= 0 && typeof _egCampaignExpectedLevel === 'function') {
        const li = atEnd ? (world.data.length - 1) : Math.floor(world.data.length / 2);
        return Math.max(1, Math.round(_egCampaignExpectedLevel(start + li)));
    }
    // Fallback: linear spread of the campaign band across trial worlds.
    const end = (typeof EG_LEVELING_CONFIG !== 'undefined' && EG_LEVELING_CONFIG.campaignEndLevel) || 68;
    const n = Math.max(1, _egTrialCount() || 13);
    const f = atEnd ? ((wi + 1) / n) : ((wi + 0.5) / n);
    return Math.max(1, Math.round(1 + (end - 1) * Math.min(1, Math.max(0, f))));
}

// Deterministic boss pick per world (existing boss fights, reused).
// Convergence and ascension trials in the same world get different bosses.
export function _egTrialBossId(wi, salt) {
    if (typeof EG_BOSS_DEFS === 'undefined' || !EG_BOSS_DEFS) return null;
    const keys = Object.keys(EG_BOSS_DEFS);
    if (!keys.length) return null;
    // Spread neighbouring worlds across the roster (11 is coprime to most
    // roster sizes; modulo keeps it stable even if bosses are added later).
    return keys[Math.abs(wi * 11 + (salt || 0) * 5 + 3) % keys.length];
}

// Chain length grows gently with world index: short trials early (2
// puzzles + 1 question), slightly longer later (3 + 2). Always ends in a
// single boss - the "mini-map" feel.
export function _egTrialChainParams(wi) {
    const late = wi >= 6;
    const veryLate = wi >= 10;
    return {
        requiredPuzzles: late ? 3 : 2,
        requiredQuestions: late ? 2 : 1,
        totalMonsters: Math.min(14, 6 + wi + (veryLate ? 2 : 0)),
        maxMonsters: wi >= 4 ? 4 : 3,
    };
}

// True while the current run is a campaign trial (convergence or
// ascension). Reads the stamp on the level (survives chain transitions
// via _egMapDef) with a window-runtime fallback.
export function _egIsTrialRun() {
    const stamped = (typeof cur !== 'undefined' && cur && cur.campaignTrial)
        || (typeof _egMapDef !== 'undefined' && globalThis._egMapDef && globalThis._egMapDef.campaignTrial)
        || (typeof window !== 'undefined' && window._egCampaignTrial);
    return stamped || null;
}

export function _egIsConvergenceTrialRun() {
    const tr = _egIsTrialRun();
    return (tr && tr.kind === 'convergence') ? tr : null;
}

export function _egIsAscensionTrialRun() {
    const tr = _egIsTrialRun();
    return (tr && tr.kind === 'ascension') ? tr : null;
}

// Trial state guards for new saves / old saves without the arrays.
export function _egEnsureTrialState() {
    if (typeof STATE === 'undefined' || !STATE) return;
    if (!Array.isArray(STATE.trialsDone)) STATE.trialsDone = [];
    if (!Array.isArray(STATE.ascensionTrialsDone)) STATE.ascensionTrialsDone = [];
}

export function _egIsTrialDone(wi) {
    _egEnsureTrialState();
    return STATE.trialsDone.includes(_egTrialIdForWorld(wi));
}

export function _egIsAscensionTrialDone(wi) {
    _egEnsureTrialState();
    return STATE.ascensionTrialsDone.includes('asc_' + (wi + 1));
}

// Trials unlock by clearing the world's two convergence milestone levels
// (the old 33% / 66% rule, see _egTrialTriggerLevels). World 1 Trial 1
// additionally needs the tutorial finished (matches level 1-1).
export function _egIsTrialUnlocked(wi) {
    if (typeof STATE === 'undefined' || !STATE) return false;
    if (wi === 0 && !STATE.tutorialDone) return false;
    const start = _egTrialWorldStartGi(wi);
    if (start < 0 || typeof ALL === 'undefined') return false;
    const triggers = _egTrialTriggerLevels(wi);
    if (!triggers) return false;
    return triggers.every((li) => STATE.done && STATE.done.includes(start + li));
}

// The two convergence milestone level indices (0-based li inside the world)
// that gate this world's Convergence Trial - the classic 33% / 66% formula
// used by the pre-Leveling-Rework convergence levels (last level excluded).
// Returns null for worlds without a trial (Nexus World / empty data).
export function _egTrialTriggerLevels(wi) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    if (!world || !world.data || world.data.length < 2) return null;
    if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) return null;
    const len = world.data.length;
    const c1 = Math.floor((len - 1) * (1 / 3));
    const c2 = Math.floor((len - 1) * (2 / 3));
    if (c1 === c2) return null;
    return [c1, c2];
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// Stamps a seed story level with trial run parameters and launches it.
// Mirrors _egLaunchMapFromDevice() minus the map-item consumption.
export function _egLaunchTrialRun(wi, kind) {
    if (typeof startLevel !== 'function' || typeof ALL === 'undefined' || !ALL.length) return false;
    if (typeof _egPickMapRunSeedGi !== 'function' && typeof _egBuildChainPool !== 'function') return false;

    const chain = _egTrialChainParams(wi);
    const monsterLevel = _egTrialMonsterLevel(wi, kind === 'ascension');
    const bossId = _egTrialBossId(wi, kind === 'ascension' ? 1 : 0);
    const trialId = kind === 'convergence' ? _egTrialIdForWorld(wi) : ('asc_' + (wi + 1));
    const stamp = {
        kind, wi, trialId,
        name: kind === 'convergence' ? _egTrialName(wi) : _egAscensionTrialName(wi),
        monsterLevel,
        // Quiz questions come from the trial's own world (spec).
        quizWorld: wi + 1,
    };

    const baseline = {
        monsterLevel,
        maxMonsters: chain.maxMonsters,
        totalMonsters: chain.totalMonsters,
        hasBoss: true,
        maxBosses: 1,
        requiredPuzzles: chain.requiredPuzzles,
        requiredQuestions: chain.requiredQuestions,
        egTimeLimit: 1200,
        egMaxMistakes: 10,
        puzzlePool: { generated: true, genMode: 'mixed' },
    };

    let gi = null;
    try {
        gi = _egPickMapRunSeedGi(baseline);
    } catch (e) { gi = null; }
    if (gi === null || gi === undefined) {
        // Fallback: any non-gated story level.
        let pool = [];
        try { pool = _egBuildChainPool(baseline.puzzlePool || {}); } catch (e) { pool = []; }
        if (typeof isGatedLevel === 'function') pool = pool.filter(l => !isGatedLevel(l.gIdx));
        if (!pool.length) {
            if (typeof showToast === 'function') showToast('No puzzles available for trial.');
            return false;
        }
        gi = pool[Math.floor(Math.random() * pool.length)].gIdx;
    }

    const level = ALL[gi];
    if (!level) return false;

    // Runtime descriptor (restored landing info + trial kind for HUD/labels).
    window._egCampaignTrial = stamp;
    // Return routing for the leave-map screen (survives _egChainCleanup;
    // consumed by the return-button branch).
    window._egTrialReturnWi = wi;
    window._egTrialReturnKind = kind;
    window._egIsMapDeviceRun = false;

    level.isMonsterLevel = true;
    level.isMapRunSeed = true;
    window._egMapRunSeedGi = gi;
    level.monsterLevel = baseline.monsterLevel;
    level.maxMonsters = baseline.maxMonsters;
    level.totalMonsters = baseline.totalMonsters;
    level.hasBoss = baseline.hasBoss;
    level.maxBosses = baseline.maxBosses;
    if (bossId) level.bosses = [{ id: bossId }];
    else delete level.bosses;
    level.requiredPuzzles = baseline.requiredPuzzles;
    level.requiredQuestions = baseline.requiredQuestions;
    level.puzzlePool = baseline.puzzlePool;
    level.egTimeLimit = baseline.egTimeLimit;
    level.egMaxMistakes = baseline.egMaxMistakes;
    level.campaignTrial = stamp;

    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') _egEnsureLoseOverlayEndgameUI();

    window._egMapDeviceLaunching = true;
    try {
        if (typeof showToast === 'function') showToast('⚔ ' + stamp.name);
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsLaunched', 1); } catch (e) {}
        globalThis.startLevel(gi);
    } finally {
        window._egMapDeviceLaunching = false;
    }
    return true;
}

export function _egLaunchCampaignTrial(wi) {
    return _egLaunchTrialRun(wi, 'convergence');
}

export function _egLaunchAscensionTrial(wi) {
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    if (!world) return false;
    return _egLaunchTrialRun(wi, 'ascension');
}

// startLevel() hook: campaign ascension levels (final level of a world,
// except the Nexus Point) start their ascension trial chain instead of the
// plain puzzle. Returns true when it launched a trial (caller must abort
// the normal start). Never hijacks stamped/chain/suppressed launches.
export function _egMaybeLaunchAscensionTrial(gi) {
    try {
        if (typeof ALL === 'undefined' || !ALL[gi]) return false;
        const level = ALL[gi];
        if (!level || level.world == null || level.li == null) return false;
        // Already a stamped run (trial/map/boss-test seed, chain puzzle,
        // arena, campaign pack): never re-route.
        if (level.isMapRunSeed || level.isChainedPuzzle || level.isBossArena
            || level.campaignTrial || level.campaignMonsters
            || level.isTestMapSeed || level.isBossTestSeed) return false;
        if (typeof window !== 'undefined' && window
            && (window._egMapDeviceLaunching || window._egIsMapDeviceRun
                || window._egIsBossTestRun || window._egSuppressEncounterStart)) return false;
        const wi = level.world - 1;
        const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
        if (!world || !world.data || !world.data.length) return false;
        // Final level of a non-Nexus world = ascension level.
        if (level.li !== world.data.length) return false;
        if (typeof isNexusPointLevel === 'function' && isNexusPointLevel(wi, level.li - 1)) return false;
        return _egLaunchAscensionTrial(wi);
    } catch (e) { return false; }
}


//------------------------------------------------------------------------
//-------------------COMPLETION--------------------------------------------
//------------------------------------------------------------------------

// Convergence Trial first-clear reward: +1 passive point (same pool the
// level-ups feed; the tree itself is wired separately) + convergence modal.
export function _egGrantConvergenceTrialReward(wi) {
    _egEnsureTrialState();
    const id = _egTrialIdForWorld(wi);
    const isFirstClear = !STATE.trialsDone.includes(id);
    if (isFirstClear) {
        STATE.trialsDone.push(id);
        STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + 1;
        if (typeof _incDirect === 'function') try { _incDirect('lifetimePassivePointsObtained', 1); } catch (e) {}
        // Trials are the new convergence milestones - keep the Inference
        // ledger's convergence counter moving (legacy levels no longer feed it).
        if (typeof _incDirect === 'function') try { _incDirect('convergenceLevels', 1); } catch (e) {}
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsCompleted', 1); } catch (e) {}
        // Reuse the legacy trail so old saves/modals/achievements keep working.
        if (!Array.isArray(STATE.convergenceDone)) STATE.convergenceDone = [];
        window._pendingConvergenceModal = true;
    }
    // Flat completion XP on top of kill XP: one first-clear share of the
    // trial level's requirement (replays: reduced share), PoE-banded.
    if (typeof _egAwardXP === 'function' && typeof _egGetXpForNextLevel === 'function') {
        try {
            const c = (typeof EG_LEVELING_CONFIG !== 'undefined') ? EG_LEVELING_CONFIG : {};
            const refLevel = Math.max(1, _egTrialMonsterLevel(wi, false));
            const frac = (c.campaignFirstClearFraction || 0.22) * (isFirstClear ? 1 : (c.campaignReplayFraction || 0.35));
            let mult = 1;
            if (typeof _egCalcXpMultiplier === 'function' && typeof _egGetPlayerLevel === 'function') {
                mult = _egCalcXpMultiplier(_egGetPlayerLevel(), refLevel);
            }
            _egAwardXP(Math.max(1, Math.round(_egGetXpForNextLevel(refLevel) * frac * mult)));
        } catch (e) {}
    }
    if (typeof save === 'function') save();
    return isFirstClear;
}

// Ascension Trial finish: the world's ascension level counts as cleared
// (marks STATE.done so world progress/map view stay correct), grants the
// Codex of Completion on first clear, pays the ascension level's campaign
// XP, and runs the normal world-completion class flow (class select /
// upgrade / ascendency, or the Nexus class-change token).
export function _egGrantAscensionTrialReward(wi) {
    _egEnsureTrialState();
    const world = (typeof WORLDS !== 'undefined' && WORLDS) ? WORLDS[wi] : null;
    const key = 'asc_' + (wi + 1);
    const isFirstClear = !STATE.ascensionTrialsDone.includes(key);
    let ascGi = -1;
    if (world) {
        const start = _egTrialWorldStartGi(wi);
        if (start >= 0) ascGi = start + world.data.length - 1;
    }
    const wasDone = ascGi >= 0 && STATE.done && STATE.done.includes(ascGi);
    if (ascGi >= 0 && !wasDone) {
        STATE.done.push(ascGi);
        if (typeof _wdSyncSpriteToLevel === 'function') try { _wdSyncSpriteToLevel(ascGi); } catch (e) {}
    }
    if (isFirstClear) {
        STATE.ascensionTrialsDone.push(key);
        // Codex of Completion (same artifact as the old ascension clear).
        try {
            if (typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS['artifactComplete']
                && STATE && Array.isArray(STATE.inventory)
                && !(typeof curMods !== 'undefined' && curMods && curMods.ironman)) {
                STATE.inventory.push({
                    defId: 'artifactComplete',
                    uid: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2),
                });
                if (typeof buildInventoryPanel === 'function') try { buildInventoryPanel(); } catch (e) {}
                if (typeof showItemGainPopup === 'function') try { showItemGainPopup('artifactComplete'); } catch (e) {}
            }
        } catch (e) {}
        if (typeof trackAchStat === 'function') try { trackAchStat('egMapsCompleted', 1); } catch (e) {}
    }
    // Campaign XP for the ascension level itself (first clear / replay).
    if (ascGi >= 0 && typeof _egGrantCampaignLevelXP === 'function') {
        try {
            const keepCur = (typeof cur !== 'undefined') ? cur : null;
            if (typeof ALL !== 'undefined' && ALL[ascGi]) {
                // _egGrantCampaignLevelXP guards on `cur`: point it at the
                // ascension level briefly (trial seeds are map seeds, which
                // the guard would reject).
                try { globalThis.cur = ALL[ascGi]; } catch (e) {}
                _egGrantCampaignLevelXP(ascGi, !wasDone);
                try { globalThis.cur = keepCur; } catch (e) {}
            }
        } catch (e) {}
    }
    // World-completion class flow (mirrors checkWorldCompletion in
    // class-ui.js but for the explicit world - `cur` is a trial seed here).
    try {
        if (world && typeof areAllWorldLevelsDone === 'function' && areAllWorldLevelsDone(wi, world)) {
            if (!STATE.classWorldsCompleted) STATE.classWorldsCompleted = [];
            if (!STATE.classWorldsCompleted.includes(wi)) {
                if (typeof isNexusWorld === 'function' && isNexusWorld(wi)) {
                    if (typeof grantClassChangeToken === 'function') grantClassChangeToken(wi);
                    else { STATE.classWorldsCompleted.push(wi); if (typeof save === 'function') save(); }
                } else {
                    STATE._pendingClassEvent = true;
                    STATE._lastClassWorld = wi;
                    if (typeof save === 'function') save();
                }
            }
        } else if (typeof save === 'function') save();
    } catch (e) { try { if (typeof save === 'function') save(); } catch (e2) {} }
    return isFirstClear;
}

// Trial win path - trimmed sibling of _egEndMap(): bonus-loot roll, leave
// summary, loot flush, cleanup, then trial rewards + trial return routing.
// No atlas progress, no map completion reward (no map item was consumed).
export function _egEndCampaignTrial() {
    const tr = _egIsTrialRun();
    if (!tr) return false;
    if (typeof _egEncounterActive !== 'undefined' && !globalThis._egEncounterActive) return false;
    // Same gate as the map flow: objectives (kills / puzzles / questions +
    // boss) must all be done before the trial can be finished.
    if (typeof _egCanLeaveMap === 'function' && !_egCanLeaveMap()) {
        if (typeof showToast === 'function') {
            const msg = (typeof t === 'function') ? t('eg_objectives_incomplete') : null;
            showToast((msg && msg !== 'eg_objectives_incomplete') ? msg : 'Objectives incomplete');
        }
        return false;
    }
    if (typeof _egCancelChainCountdown === 'function') _egCancelChainCountdown();
    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    if (typeof _egRollBonusMapLoot === 'function') try { _egRollBonusMapLoot(); } catch (e) {}

    if (typeof trackAchStat === 'function') {
        try {
            if (typeof mistakeCount !== 'undefined' && globalThis.mistakeCount === 0) trackAchStat('egMapsFlawless', 1);
        } catch (e) {}
    }

    // Summary FIRST (blocks grid clicks instantly), mirroring _egEndMap.
    if (typeof _egShowLeaveMapTransition === 'function') _egShowLeaveMapTransition(null);
    _egRetitleLeaveMapTransition(tr);

    if (typeof _egFlushRunLootToStash === 'function') try { _egFlushRunLootToStash(); } catch (e) {}
    if (typeof _egBankUnclaimedMapDrops === 'function') try { _egBankUnclaimedMapDrops(); } catch (e) {}
    if (typeof egSaveHubState === 'function') try { egSaveHubState(); } catch (e) {}

    // Trial rewards (also saves).
    if (tr.kind === 'convergence') _egGrantConvergenceTrialReward(tr.wi);
    else _egGrantAscensionTrialReward(tr.wi);

    if (typeof _egStopEncounter === 'function') try { _egStopEncounter(); } catch (e) {}
    if (typeof _egResetQuizDamageBuff === 'function') try { _egResetQuizDamageBuff(); } catch (e) {}
    if (typeof stopTimer === 'function') try { stopTimer(); } catch (e) {}
    if (typeof _hidePlayerAvatarSimple === 'function') try { _hidePlayerAvatarSimple(); } catch (e) {}
    if (typeof _hidePlayerAvatar === 'function') try { _hidePlayerAvatar(); } catch (e) {}
    if (typeof updateQuestStats === 'function') {
        try {
            updateQuestStats('trialComplete', { trialId: tr.trialId, kind: tr.kind, wi: tr.wi });
        } catch (e) {}
    }
    return true;
}

// Swaps the leave-map summary title/return button to trial wording after
// _egShowLeaveMapTransition() rendered the default map texts.
export function _egRetitleLeaveMapTransition(tr) {
    try {
        const titleEl = document.querySelector('#eg-leave-map-transition .eg-leave-map-title');
        if (titleEl) {
            const key = tr.kind === 'convergence' ? 'eg_trial_complete_title' : 'eg_ascension_trial_complete_title';
            let label = (typeof t === 'function') ? t(key) : null;
            if (!label || label === key) label = tr.kind === 'convergence' ? 'TRIAL COMPLETE' : 'ASCENSION COMPLETE';
            titleEl.textContent = label + ' - ' + tr.name;
        }
        const btn = document.getElementById('btn-eg-leave-map-return');
        if (btn) {
            let label = (typeof t === 'function') ? t('eg_return_to_world') : null;
            if (!label || label === 'eg_return_to_world') label = 'Return to World Map';
            btn.textContent = label;
        }
    } catch (e) {}
}

// Strips trial stamps off the seed level + clears run state. Called from
// _egChainCleanup() (patched call site, typeof-guarded).
// Keeps window._egTrialReturnWi/_egTrialReturnKind: the leave-map return
// button consumes them AFTER cleanup already ran.
export function _egCleanupCampaignTrialSeed() {
    if (typeof window !== 'undefined' && window._egMapDeviceLaunching) return;
    const seedGi = (typeof window !== 'undefined') ? window._egMapRunSeedGi : null;
    const hadTrial = !!(typeof window !== 'undefined' && window._egCampaignTrial);
    if (typeof window !== 'undefined') window._egCampaignTrial = null;
    if (seedGi == null) return;
    if (typeof ALL === 'undefined' || !ALL[seedGi]) return;
    const level = ALL[seedGi];
    if (!level || level === (typeof cur !== 'undefined' ? cur : null)) return;
    // Only touch levels that actually carried a trial (map-device seeds are
    // restored by _egCleanupMapRunSeedLevel; chained leftovers by the loop).
    if (!level.campaignTrial && !hadTrial) return;
    delete level.campaignTrial;
}

// Return routing for trial runs: back to the trial's world map. Consumes
// the return flags, then serves the standard post-navigation flows
// (convergence modal → class event), mirroring goToLevelSelect().
// Falls back to false (caller routes normally).
export function _egRouteTrialReturn() {
    if (typeof window === 'undefined') return false;
    const wi = window._egTrialReturnWi;
    if (wi == null || wi < 0) return false;
    window._egTrialReturnWi = null;
    window._egTrialReturnKind = null;
    window._egCampaignTrial = null;
    try {
        if (typeof showWorldDetail === 'function') {
            showWorldDetail(wi);
            setTimeout(() => {
                try {
                    if (typeof _maybeShowConvergenceModal === 'function') {
                        _maybeShowConvergenceModal(() => {
                            if (typeof triggerClassEventIfPending === 'function') {
                                try { triggerClassEventIfPending(); } catch (e) {}
                            }
                        });
                    } else if (typeof triggerClassEventIfPending === 'function') {
                        try { triggerClassEventIfPending(); } catch (e) {}
                    }
                } catch (e) {}
            }, 350);
            return true;
        }
    } catch (e) {}
    try {
        if (typeof goToLevelSelect === 'function') { goToLevelSelect(); return true; }
    } catch (e) {}
    return false;
}

// Serves pending post-trial flows after the world screen is visible:
// convergence modal first, then the class event (ascension trials).
export function _egServePostTrialFlows() {
    try {
        // The world-detail routing already serves the modal → class-event
        // chain; this is only a backstop for non-standard return paths.
        // Never fire the class event while the convergence modal is up.
        if (typeof triggerClassEventIfPending === 'function'
            && !window._pendingConvergenceModal) {
            setTimeout(() => {
                try {
                    if (!window._pendingConvergenceModal) triggerClassEventIfPending();
                } catch (e) {}
            }, 900);
        }
    } catch (e) {}
}
