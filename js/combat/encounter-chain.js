import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _applyProbabilistPassive, _getPassiveEffect } from '../classes/class-abilities.js';
import { PassiveTracker } from '../probability-tree/probability-tree-tracker.js';
import { _refreshQuestionModalFlag } from '../screens/screens.js';
import { _charmReplaceCarriedDrops, _charmDrops } from '../skills/skill-charms.js';
import { _clearCenterGridBanners, pauseTimer, resumeTimer, stopTimer } from '../timer/timer.js';
import { t } from '../translation/translations.js';
import { GAME_ART } from '../endgame/endgame-art.js';
import { _egAtlasOnMapCompleted, egAtlasMakeRng, egAtlasNodeName } from '../endgame/endgame-atlas.js';
import { showEndgameBossTest } from './combat-boss-test.js';
import { _cleanupBossTestSeedLevel } from './combat-boss-test-launch.js';
import { _flushPendingRevealProjectiles } from './combat-class-projectiles-reveal.js';
import { _tryDropCurrency } from '../loot/loot-currency-drops.js';
import { _resetLowHealthWarningState, _resetMistakesWarningState } from './encounter-overlays.js';
import { _onPause, _onResume } from './encounter-tick-support.js';
import { BOSS_SPAWN_DELAY_MS, _buildBossSpawnListFromDef, _playerTakeDamage, _renderPanel, _rollMonsterLevel, _spawnMonster, _stopEncounter } from './encounter.js';
import { _generateEquipmentDrop } from '../loot/loot-equipment-generator.js';
import { addEssence } from '../loot/loot-essences-stash.js';
import { _addGold } from '../loot/loot-gold.js';
import { _rarityToastColor, _removePickupOverlay } from './combat-grid-pickups.js';
import { _flushRunLootToStash, _replaceCarriedLootDrops, _spawnLootExplosion } from './combat-grid-pickups-loot.js';
import { _replaceCarriedCurrencyDrops } from './combat-grid-pickups-currency.js';
import { _replaceCarriedItemDrops } from './combat-grid-pickups-items.js';
import { _hazardsHideForQuiz, _hazardsShowAfterQuiz } from './combat-hazards-lifecycle.js';
import { addCurrency } from '../endgame/endgame-hub-drag-and-drop.js';
import { _buildTooltipBodyHTML } from '../endgame/endgame-hub-tooltips.js';
import { _equipped, _inventory, saveHubState } from '../endgame/endgame-hub.js';
import { _lootFilterAutoVendor } from '../loot/loot-filter.js';
import { _egActiveMapItem, _egCleanupMapRunSeedLevel, _egGetActiveMapModValue, _egMapQuestionsPerInterstitial } from '../endgame/endgame-map-launch.js';
import { _egBankUnclaimedMapDrops, _egMapDrops, _egReplaceCarriedMapDrops, _egRollAtlasAdjacentBonusDrop } from '../loot/loot-map-drops.js';
import { _egBuildMapTooltipBodyHTML } from '../loot/loot-map-tooltip.js';
import { _egGetCompletionRewardDef } from '../loot/loot-map-completion-reward.js';
import { showEndgameNexus } from '../endgame/endgame-nexus.js';
import { _createGeneratedLevel } from './combat-puzzle-generator.js';
import { _bucketCriteria, _pickStoryChainPuzzleGi, _resetChainRecentGis, _trackChainRecentGi } from './encounter-chain-pool.js';
import { _consumePendingQuizRewardHTML, _resetQuizDamageBuff } from '../endgame/endgame-quiz-buffs.js';
import { _currencyDrops, _isActive, _isCampaignRun, _itemDrops, _lootDrops, _pickups } from './combat-state.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
// Phase 3 step 7: live globalThis accessors for externally-mutated state.
// (derived from write-site audit by dev/scratch/convert-endgame.mjs)
//------------------------------------------------------------------------
try { Object.defineProperty(globalThis, '_bossKilledCount', { get() { return _bossKilledCount; }, set(v) { _bossKilledCount = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_bossPhaseActive', { get() { return _bossPhaseActive; }, set(v) { _bossPhaseActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_bossPhaseQueue', { get() { return _bossPhaseQueue; }, set(v) { _bossPhaseQueue = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_bossTotalCount', { get() { return _bossTotalCount; }, set(v) { _bossTotalCount = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_chainKillCount', { get() { return _chainKillCount; }, set(v) { _chainKillCount = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_monsterSpawnCounter', { get() { return _monsterSpawnCounter; }, set(v) { _monsterSpawnCounter = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN STATE--------------------------------
//------------------------------------------------------------------------

export let _chainCurrentGi = null;
let _chainKillCount = 0;          // total non-boss monsters killed this run
export let _chainPuzzleSolvedCount = 0;  // how many puzzles solved this run
export let _questionsAnswered = 0;       // how many bonus questions answered correctly this run
export let _chainTransitioning = false;
export let _chainCountdownTimer = null;
let _monsterSpawnCounter = 0;
export let _puzzleCompleteFired = false;
export let _mapClearedShown = false;     // ensures the MAP CLEARED banner fires once per map
export let _bossArenaAvailableShown = false; // ensures the BOSS ARENA AVAILABLE banner fires once per map

// ── Boss arena phase ────────────────────────────────────────────────
// Bosses are no longer sprinkled into regular puzzles. Once every other
// objective is done, the player clicks "Enter Boss Arena" in the tracker.
// That ends the current puzzle and starts a chain of small boss-arena
// puzzles - one boss per arena - until every map boss is slain. Only then
// does the Complete Map button unlock.
let _bossPhaseActive = false;     // true once the player entered the arena chain
let _bossPhaseQueue = [];         // spawn list for the remaining arena bosses
let _bossKilledCount = 0;         // bosses slain this run
let _bossTotalCount = 0;          // bosses the map requires (queue length at entry)

// Bonus-loot gains accumulated since the last chain transition screen.
// Consumed (and reset) by _buildChainBonusGainHTML so the countdown
// overlay shows exactly what the player earned from the previous puzzle
// and quiz.
export let _pendingPuzzleBonusGain = 0;
export let _pendingQuestionBonusGain = 0;

// Accumulated bonus-loot chance for the current run (0–5). Grows with every
// solved puzzle (scaled by grid size) and every correctly answered question.
// Cap 5.0 = 500% → up to 5 guaranteed bonus items.
export let _bonusLootChance = 0;


//------------------------------------------------------------------------
//-------------------REQUIREMENTS HELPERS---------------------------------
//------------------------------------------------------------------------

// Helper functions for the map objective panel

// Reads the requirements from the original map def.
// totalMonsters: total non-boss kills needed across the whole run
// requiredPuzzles: how many puzzles must be solved
// requiredQuestions: how many bonus questions must be answered correctly
export function _getMapRequirements() {
    const def = globalThis._mapDef || cur;
    return {
        totalMonsters: (def && def.totalMonsters != null) ? def.totalMonsters : 0,
        requiredPuzzles: (def && def.requiredPuzzles != null) ? def.requiredPuzzles : 0,
        requiredQuestions: (def && def.requiredQuestions != null) ? def.requiredQuestions : 0,
        hasBoss: !!(def && (def.hasBoss || (def.bosses && def.bosses.length > 0))),
    };
}

// Returns true when every non-boss objective (kills, puzzles, questions)
// is satisfied. Gates the "Enter Boss Arena" button on boss maps.
export function _nonBossObjectivesComplete() {
    const req = _getMapRequirements();

    if (req.totalMonsters > 0 && _chainKillCount < req.totalMonsters) return false;
    if (req.requiredPuzzles > 0 && _chainPuzzleSolvedCount < req.requiredPuzzles) return false;
    if (req.requiredQuestions > 0 && _questionsAnswered < req.requiredQuestions) return false;

    return true;
}

// Returns true when every requirement on the map is satisfied.
// On boss maps the player must additionally have entered the boss arena
// chain and slain every boss before the map can be completed.
export function _canLeaveMap() {
    if (!_nonBossObjectivesComplete()) return false;

    const req = _getMapRequirements();
    if (req.hasBoss && !_bossDefeated()) return false;

    return true;
}

// Called from quiz.js to increment the answered-questions counter and refresh the HUD.
export function _onQuestionAnswered() {
    if (!_isActive()) return;
    _questionsAnswered++;
    const gain = BONUS_LOOT_CHANCE_PER_QUESTION[
        Math.min(_questionsAnswered - 1, BONUS_LOOT_CHANCE_PER_QUESTION.length - 1)
    ];
    _bonusLootChance = Math.min(BONUS_LOOT_CHANCE_MAX, _bonusLootChance + gain);
    _pendingQuestionBonusGain += gain;
    _updateObjectivesHUD();
    if (typeof trackAchStat === 'function') try { trackAchStat('egQuizCorrect', 1); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE COMPLETE---------------------
//------------------------------------------------------------------------

// Skip regular STOXELS COMPLETE screen to continue with the next puzzle in the chain
export function _onPuzzleComplete() {
    if (_puzzleCompleteFired) return;
    _puzzleCompleteFired = true;

    Audio_Manager.playSFX('win');

    _chainPuzzleSolvedCount++;
    const gain = _getPuzzleBonusLootGain();
    _bonusLootChance = Math.min(BONUS_LOOT_CHANCE_MAX, _bonusLootChance + gain);
    _pendingPuzzleBonusGain += gain;
    _updateObjectivesHUD();

    // Active map run: Blood Pact - each solved puzzle drains max life.
    if (typeof _egGetActiveMapModValue === 'function' && _isActive()) {
        const pactPct = _egGetActiveMapModValue('map_blood_pact');
        if (pactPct > 0) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
            const dealt = _playerTakeDamage(Math.max(1, Math.round(maxHP * pactPct / 100)), true);
            if (dealt > 0) {
                globalThis.showCombatToast(`🩸 ${t('eg_mm_toast_blood_pact') || 'Blood Pact!'} (-${dealt})`);
            }
        }
    }

    // Map fully cleared (bosses included): stay on the board so the player
    // can collect the loot lying around, then leave via Complete Map.
    // FIX: if the puzzle is completed while loot is still on the board the
    // `dead` flag set in checkWin() freezes the grid and loot becomes
    // unpickable. Instead carry the loot to the next chained puzzle so it
    // remains collectable - the Complete Map button stays available there.
    // The drop may land up to a few hundred ms after the puzzle is marked
    // solved (projectile still in flight for the last kill, or loot
    // explosion stagger), so defer the drop check to catch late spawns.
    // This covers both the boss-arena loot explosion and the regular
    // non-boss case where the last monster is slain simultaneously with
    // the final puzzle fill.
    if (_canLeaveMap()) {
        // Boss testing: single-arena duel - stay on the board so loot can
        // be collected, then leave via Complete Map. Never chain into
        // another puzzle (no quiz interstitial, no countdown).
        if (typeof window !== 'undefined' && window._isBossTestRun) return;
        setTimeout(() => {
            if (!_isActive() || !_canLeaveMap()) return;
            if (document.getElementById('sx-leave-map-overlay')) return;
            const hasPendingDrops = (_lootDrops && _lootDrops.size > 0)
                || (_currencyDrops && _currencyDrops.size > 0)
                || (_itemDrops && _itemDrops.size > 0)
                || (typeof _egMapDrops !== 'undefined' && _egMapDrops.size > 0)
                || (_pickups && _pickups.size > 0);
            const isBossFinale = _bossPhaseActive && _bossDefeated();
            if (hasPendingDrops || isBossFinale) {
                _startChainCountdown();
            }
        }, 800);
        return;
    }

    // Don't queue another puzzle if the Blood Pact (or any other
    // damage) just killed the player - _endMapDefeated already shows
    // the map-failed overlay. Check _isActive (false after defeat) and
    // player HP - do NOT check `dead` because checkWin() sets dead=true
    // on every solved puzzle, not just on death.
    if (typeof _isActive === 'function' && !_isActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && globalThis.playerCurrentHP <= 0) return;

    // Boss arena chain: solving an arena puzzle while a boss is still alive
    // rolls straight into the next arena - no quiz interstitial here.
    if (_bossPhaseActive) {
        _scheduleArenaAdvance();
        return;
    }

    // Always automatically chain to the next puzzle, the player needs to manually leave the chain
    setTimeout(() => {
        if (typeof _isActive === 'function' && !_isActive()) return;
        if (typeof playerCurrentHP !== 'undefined' && globalThis.playerCurrentHP <= 0) return;
        _startChainCountdown();
    }, 800);
}

export function _hasBoss() {
    const def = globalThis._mapDef || cur;
    return !!(def.hasBoss || (def.bosses && def.bosses.length > 0));
}

export function _bossDefeated() {
    const req = _getMapRequirements();
    if (!req.hasBoss) return true;
    if (!_bossPhaseActive || _bossTotalCount === 0) return false;
    return _bossKilledCount >= _bossTotalCount;
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: INTERSTITIAL QUESTION--------------
//------------------------------------------------------------------------

// Shows a quiz question between puzzles. When dismissed (answered or skipped),
// calls onDone() to resume the chain countdown.
export function _showInterstitialQuestion(onDone) {
    window._interstitialDone = function () {
        window._interstitialDone = null;
        document.getElementById('quiz-overlay').classList.remove('show');
        if (typeof _refreshQuestionModalFlag === 'function') _refreshQuestionModalFlag();
        globalThis.currentQuizQuestion = null;
        onDone();
    };

    if (typeof _hazardsHideForQuiz === 'function') {
        try { _hazardsHideForQuiz(); } catch (e) {}
    }

    // Don't rely on def.world - monster levels have no world property.
    // Instead build a pool from ALL worlds that have questions and pick randomly.
    const worldNum = _pickInterstitialWorldNum();
    globalThis.showQuiz(worldNum);
}



// Finds a world number that actually has questions in at least one pool.
// Campaign trial runs always use the TRIAL'S world (spec) when it has
// questions, falling back to the random pick below otherwise.
// Tries BONUS_QUIZ_POOLS and MATH_GATE_POOLS across all worlds.
// Falls back to 1 if nothing is found (getQuizQuestion handles empty pools gracefully).
export function _pickInterstitialWorldNum() {
    // Campaign trial: questions are based on the trial's world.
    try {
        const tr = (typeof _isTrialRun === 'function') ? globalThis._isTrialRun() : null;
        if (tr && tr.quizWorld) {
            const w = Number(tr.quizWorld);
            const hasMC = (typeof BONUS_QUIZ_POOLS !== 'undefined')
                && globalThis.BONUS_QUIZ_POOLS[w] && globalThis.BONUS_QUIZ_POOLS[w].length > 0;
            const hasInput = (typeof MATH_GATE_POOLS !== 'undefined')
                && globalThis.MATH_GATE_POOLS[w] && globalThis.MATH_GATE_POOLS[w].length > 0;
            if (hasMC || hasInput) return w;
        }
    } catch (e) {}
    const candidates = [];

    // Collect every world key that has at least one question
    const allPools = [
        typeof BONUS_QUIZ_POOLS !== 'undefined' ? globalThis.BONUS_QUIZ_POOLS : {},
        typeof MATH_GATE_POOLS !== 'undefined' ? globalThis.MATH_GATE_POOLS : {},
    ];

    allPools.forEach(poolObj => {
        Object.keys(poolObj).forEach(key => {
            const w = parseInt(key, 10);
            if (!isNaN(w) && poolObj[key] && poolObj[key].length > 0) {
                if (!candidates.includes(w)) candidates.push(w);
            }
        });
    });

    if (candidates.length === 0) return 1; // absolute fallback

    // Pick a random world from the candidates so questions are varied
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// Triggers a bonus question immediately, without requiring the current puzzle to be completed.
// Used when all monsters are killed but questions remain. Also available when the
// only remaining objectives are questions + boss defeat (boss arena is gated behind
// questions, so without this the button would never show on boss maps).
export function _triggerQuestionNow() {
    if (!_isActive()) return;
    const req = _getMapRequirements();
    if (req.requiredQuestions === 0) return;
    if (_questionsAnswered >= req.requiredQuestions) return;
    if (req.totalMonsters > 0 && _chainKillCount < req.totalMonsters) return;
    if (req.requiredPuzzles > 0 && _chainPuzzleSolvedCount < req.requiredPuzzles) return;
    // Ignore double-clicks while a question is already open.
    try {
        const qOverlay = document.getElementById('quiz-overlay');
        if (qOverlay && qOverlay.classList.contains('show')) return;
    } catch (e) {}
    if (typeof window._interstitialDone === 'function') return;

    globalThis.showToast(t('eg_trigger_question_toast'), '#7fb8ff');

    // Pause the run while the question is answered (silent pause: no pause
    // overlay, the quiz modal stays visible). The tick loop, boss mechanics,
    // class cooldowns and spawn schedulers already gate on _gamePaused, and
    // pauseTimer() freezes the puzzle clock. _onPause() snapshots grid-drop
    // timers so loot/pickups don't expire behind the quiz.
    // If the player already paused via Escape, keep their pause untouched.
    let _triggerPausedByUs = false;
    try {
        if (typeof _gamePaused !== 'undefined' && !globalThis._gamePaused) {
            if (typeof pauseTimer === 'function') pauseTimer();
            globalThis._gamePaused = true;
            if (typeof _onPause === 'function') {
                try { _onPause(); } catch (e) {}
            }
            _triggerPausedByUs = true;
        }
    } catch (e) {}

    _showInterstitialQuestion(() => {
        if (_triggerPausedByUs) {
            _triggerPausedByUs = false;
            try {
                if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
                    globalThis._gamePaused = false;
                    if (typeof _onResume === 'function') {
                        try { _onResume(); } catch (e) {}
                    }
                }
            } catch (e) {}
            try {
                if (typeof resumeTimer === 'function') resumeTimer();
            } catch (e) {}
        }
        _updateObjectivesHUD();
        if (typeof _hazardsShowAfterQuiz === 'function') {
            try { _hazardsShowAfterQuiz(); } catch (e) {}
        }
    });
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: COUNTDOWN---------------------------
//------------------------------------------------------------------------

export function _startChainCountdown() {
    if (typeof _isActive === 'function' && !_isActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && globalThis.playerCurrentHP <= 0) return;
    // Show the interstitial question(s) first, then begin the 3-2-1 countdown.
    // The active map's "+# additional Quiz Questions per Puzzle" mod raises
    // how many questions must be answered between two puzzles.
    const totalQuestions = (typeof _egMapQuestionsPerInterstitial === 'function')
        ? _egMapQuestionsPerInterstitial() : 1;
    let remaining = Math.max(1, totalQuestions);

    const onAllAnswered = () => {
        _chainTransitioning = true;
        _showChainCountdownOverlay(3);

        let secs = 3;
        _chainCountdownTimer = setInterval(() => {
            secs--;
            if (secs > 0) {
                _updateChainCountdownOverlay(secs);
            } else {
                clearInterval(_chainCountdownTimer);
                _chainCountdownTimer = null;
                _hideChainCountdownOverlay();
                _chainTransitioning = false;
                _loadNextChainPuzzle();
            }
        }, 1000);
    };

    const nextQuestion = () => {
        remaining--;
        if (remaining > 0) {
            _showInterstitialQuestion(nextQuestion);
            return;
        }
        onAllAnswered();
    };

    _showInterstitialQuestion(nextQuestion);
}

export function _cancelChainCountdown() {
    if (_chainCountdownTimer) {
        clearInterval(_chainCountdownTimer);
        _chainCountdownTimer = null;
    }
    _chainTransitioning = false;
    _hideChainCountdownOverlay();
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE LOADING---------------------
//------------------------------------------------------------------------

export function _loadNextChainPuzzle() {
    if (typeof _isActive === 'function' && !_isActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && globalThis.playerCurrentHP <= 0) return;
    const nextGi = _findNextChainPuzzleGi();
    if (nextGi === null) {
        globalThis.showToast(t('eg_no_more_puzzles'));
        return;
    }

    _transitionToChainPuzzle(nextGi, false);
}


// Core chain transition: swaps the current grid for the puzzle at nextGi,
 // carrying loot / currency / items / gold across and keeping monsters,
 // pickup spawner and tick loop alive. Shared by the regular puzzle chain
 // and the boss-arena chain.
export function _transitionToChainPuzzle(nextGi, isBossArena) {
    if (typeof _isActive === 'function' && !_isActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && globalThis.playerCurrentHP <= 0) return;
    _chainCurrentGi = nextGi;
    globalThis.ALL[nextGi].isMonsterLevel = true;
    globalThis.ALL[nextGi].isChainedPuzzle = true;
    if (isBossArena) globalThis.ALL[nextGi].isBossArena = true;

    // Snapshot loot still on the grid before buildGrid() destroys the overlays
    const carriedLoot = Array.from(_lootDrops.values());

    const carriedCurrency = Array.from(_currencyDrops.values());
    _currencyDrops.clear();

    const carriedItems = Array.from(_itemDrops.values());
    _itemDrops.clear();

    // Charm drops ride along with the other carried drops (skill-charms.js).
    const carriedCharms = (typeof _charmDrops !== 'undefined')
        ? Array.from(_charmDrops.values()) : [];
    if (typeof _charmDrops !== 'undefined') _charmDrops.clear();

    const carriedMaps = (typeof _egMapDrops !== 'undefined')
        ? Array.from(_egMapDrops.values()) : [];
    if (typeof _egMapDrops !== 'undefined') _egMapDrops.clear();

    // Clear the stale map entries - overlays are already gone after buildGrid()
    _lootDrops.clear();

    // Discard instant-effect pickups (hearts, mistake eraser, cooldown surge).
    // They apply to the current map only and are never carried across puzzles.
    // Without this they linger as ghost entries in _pickups (encounter stop
    // is suppressed during transitions), blocking new pickup spawns via
    // PICKUP_MAX_ON_BOARD and polluting the eligibility filters below.
    _pickups.forEach((def, key) => _removePickupOverlay(key));
    _pickups.clear();

    // Cancel every pending drop-expiry timer from the old grid. The carried
    // loot/currency/item/gold drops keep their ORIGINAL timers otherwise, and
    // since re-placement reuses the same item objects, a stale timer whose key
    // collides with the new cell would delete the freshly placed drop early.
    globalThis._pickupTimers.forEach(t => clearTimeout(t));
    globalThis._pickupTimers = [];
    // NOTE: _pickupSpawnTimer is intentionally NOT cleared - the spawner's
    // recursive loop must survive the transition (_startEncounter is
    // suppressed for chained puzzles, so nothing would restart it).

    const savedMonsters = globalThis._monsters.slice();
    const savedTargetId = globalThis._targetId;

    window._suppressEncounterStop = true;
    window._suppressEncounterStart = true;
    // Clear per-puzzle passive flags before starting the next puzzle so we can
    // detect whether _doStartLevel actually fired them.
    window._passiveAppliedForGi = null;
    window._classPassiveAppliedForGi = null;
    globalThis._doStartLevel(nextGi);
    window._suppressEncounterStop = false;
    window._suppressEncounterStart = false;

    // Hardened guarantee: every chained puzzle must re-trigger
    // auto-reveal / auto-mark passives, Syla's forest affinity and class
    // passives. _doStartLevel already calls these, but if a future change
    // gates them behind _suppressEncounterStop they would be missed.
    // Re-apply only when the flag shows they did NOT fire for this Gi.
    if (window._passiveAppliedForGi !== nextGi) {
        if (typeof _applyPassiveStartEffects === 'function') globalThis._applyPassiveStartEffects();
        if (typeof _applySylaForestAffinity === 'function') globalThis._applySylaForestAffinity();
        window._passiveAppliedForGi = nextGi;
    }
    // Class passives are delayed (Probabilist Bayesian Insight uses 300ms
    // setTimeout) - verify after that window and re-fire if missed. The
    // re-fire is safe: _applyProbabilistPassive guards internally.
    // Classless: never re-apply any class passive, even on chain puzzles.
    setTimeout(() => {
        if (typeof isClassless === 'function' && globalThis.isClassless()) return;
        if (window._classPassiveAppliedForGi !== nextGi && typeof applyClassPassiveOnLevelStart === 'function') {
            // Note: applyClassPassiveOnLevelStart resets class level state;
            // calling it a second time would wipe the just-applied shield.
            // Only re-apply the probabilist branch which is safe to repeat.
            if (STATE.playerClass === 'probabilist' && typeof _applyProbabilistPassive === 'function') {
                const eff = (typeof _getPassiveEffect === 'function') ? _getPassiveEffect() : { autoMarkCount: 0 };
                if (eff && eff.autoMarkCount) _applyProbabilistPassive(eff);
            }
            window._classPassiveAppliedForGi = nextGi;
        }
    }, 350);

    globalThis._monsters = savedMonsters;
    globalThis._targetId = savedTargetId;
    globalThis._encounterActive = true;
    _puzzleCompleteFired = false;

    // The Snail (and any other boss field effect tied to grid cells): its
    // slimed-cell overlays were destroyed with the old table - clear the
    // stale state so the fresh grid starts clean and the roaming snail
    // slimes the new puzzle from scratch.
    if (typeof _snailOnPuzzleTransition === 'function') globalThis._snailOnPuzzleTransition();

    _renderPanel();
    // Flush any start-of-puzzle reveals that were queued while the grid rebuilt
    if (typeof _flushPendingRevealProjectiles === 'function') {
        setTimeout(() => _flushPendingRevealProjectiles(), 150);
    }
    _updateObjectivesHUD();

    // The BOSS ARENA AVAILABLE banner fires when the last objective is done,
    // right as the puzzle ends - the next puzzle's overlay used to cover it.
    // Show it again once the new puzzle is loaded (only while still pending).
    if (_bossArenaAvailableShown && !_bossDefeated() && !_bossPhaseActive) {
        setTimeout(() => {
            if (_isActive() && _bossArenaAvailableShown && !_bossDefeated() && !_bossPhaseActive) {
                _showBossArenaAvailableBanner();
            }
        }, 1200);
    }

    // Re-place carried loot after the new grid DOM is fully built
    if (carriedLoot.length > 0) {
        setTimeout(() => _replaceCarriedLootDrops(carriedLoot), 400);
    }

    if (carriedCurrency.length > 0) {                                 // ← add
        setTimeout(() => _replaceCarriedCurrencyDrops(carriedCurrency), 400); // ← add
    }

    if (carriedItems.length > 0) {
        setTimeout(() => _replaceCarriedItemDrops(carriedItems), 400);
    }

    if (carriedMaps.length > 0 && typeof _egReplaceCarriedMapDrops === 'function') {
        setTimeout(() => _egReplaceCarriedMapDrops(carriedMaps), 400);
    }

    if (carriedCharms.length > 0 && typeof _charmReplaceCarriedDrops === 'function') {
        setTimeout(() => _charmReplaceCarriedDrops(carriedCharms), 400);
    }

    if (typeof _hazardsShowAfterQuiz === 'function') {
        try { _hazardsShowAfterQuiz(); } catch (e) {}
    }
}


//------------------------------------------------------------------------
//-------------------BOSS ARENA CHAIN-------------------------------------
//------------------------------------------------------------------------

// Max grid dimensions for boss-arena puzzles - kept small so the fight
// feels tight and focused.
export const BOSS_ARENA_MAX_ROWS = 15;
export const BOSS_ARENA_MAX_COLS = 25;


// Called by the "Enter Boss Arena" button in the objective tracker.
// Ends the current puzzle and starts the chain of boss-arena puzzles:
// one arena per remaining map boss, until every boss is slain.
export function _enterBossArena() {
    if (!_isActive()) return;
    if (_bossPhaseActive || _bossDefeated()) return;
    if (!_nonBossObjectivesComplete()) {
        globalThis.showToast(t('eg_objectives_incomplete'));
        return;
    }

    // Roll the full roster of bosses for this map up front.
    const baseLevel = (globalThis._mapDef && globalThis._mapDef.monsterLevel) ? globalThis._mapDef.monsterLevel : 1;
    let queue = _buildBossSpawnListFromDef(globalThis._mapDef, baseLevel);

    if (queue.length === 0) {
        // Map claims hasBoss but defines no list - pick a random boss.
        const allBossDefs = Object.values(globalThis.BOSS_DEFS);
        if (allBossDefs.length > 0) {
            const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
            queue = [{ id: picked.id, level: _rollMonsterLevel(baseLevel), isBossSpawn: true }];
        }
    }

    if (queue.length === 0) return;

    _bossPhaseQueue = queue;
    _bossTotalCount = queue.length;
    _bossKilledCount = 0;
    _bossPhaseActive = true;

    // Dismiss the "available" banner if still visible - arena is now entered
    const availBanner = document.getElementById('sx-boss-arena-available-banner');
    if (availBanner) availBanner.remove();

    Audio_Manager.playSFX('boss_arena_enter');
    globalThis.showToast(t('eg_boss_arena_entered'), '#f5d98a');
    _updateObjectivesHUD();

    _advanceBossArena();
}

// Picks the puzzle for a boss arena. For atlas regions the arena board is
// part of the region's blueprint: seeded from the chain seed + boss index,
// so the same map always fights its boss on the same (comfortably sized,
// never trivially small) grid. Boss puzzles stay small enough that the
// fight stays readable - capped by BOSS_ARENA_MAX_ROWS/COLS and floored
// at BOSS_ARENA_MIN_CELLS so the arena is never a trivial 1-liner.
export const BOSS_ARENA_MIN_CELLS = 36;

export function _findBossArenaPuzzleGi() {
    const activeDef = globalThis._mapDef || cur;
    const pool = (activeDef.puzzlePool && typeof activeDef.puzzlePool === 'object')
        ? activeDef.puzzlePool : {};

    if (typeof _createGeneratedLevel === 'function') {
        const rng = (pool.chainSeed != null && typeof egAtlasMakeRng === 'function')
            ? egAtlasMakeRng((((pool.chainSeed ^ 0x9E3779B9) >>> 0) + (_bossKilledCount * 7919)) >>> 0)
            : null;
        const gi = _createGeneratedLevel({
            mode: pool.genMode || 'mixed',
            tier: pool.genTier || 1,
            maxRows: BOSS_ARENA_MAX_ROWS,
            maxCols: BOSS_ARENA_MAX_COLS,
            minCells: BOSS_ARENA_MIN_CELLS,
            rng,
        });
        if (gi !== null) {
            _trackChainRecentGi(gi);
            return gi;
        }
    }

    return _pickStoryChainPuzzleGi({
        maxRows: BOSS_ARENA_MAX_ROWS,
        maxCols: BOSS_ARENA_MAX_COLS,
        recentWindow: 8,
    });
}

// Loads the next arena puzzle and spawns its boss. No-op once every boss
// of the map is dead - the player stays on the board to collect loot.
export function _advanceBossArena() {
    if (!_bossPhaseActive || !_isActive()) return;
    if (_bossDefeated()) return;   // all bosses dead → stay & collect

    const nextGi = _findBossArenaPuzzleGi();
    if (nextGi === null) {
        globalThis.showToast(t('eg_no_more_puzzles'));
        return;
    }

    _transitionToChainPuzzle(nextGi, true);
    _spawnNextArenaBoss();
}

// Single-flight scheduler for arena advances. A boss dying and the player
// solving the arena grid can fire at nearly the same time - without this
// guard the chain would roll two arenas and duplicate the next boss.
export let _arenaAdvanceTimer = null;

export function _scheduleArenaAdvance() {
    if (_arenaAdvanceTimer) return;
    _arenaAdvanceTimer = setTimeout(() => {
        _arenaAdvanceTimer = null;
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
            // Paused - retry after pause lifts instead of rolling the arena behind the overlay
            const retry = setInterval(() => {
                if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
                clearInterval(retry);
                if (_isActive()) _advanceBossArena();
            }, 200);
            return;
        }
        if (_isActive()) _advanceBossArena();
    }, BOSS_SPAWN_DELAY_MS);
}

// Spawns the next queued boss into the current arena with a dramatic delay.
export function _spawnNextArenaBoss() {
    if (!_bossPhaseActive || !_isActive()) return;

    // Boss arena chain: solving an arena puzzle while the boss is still alive
    // carries the SAME boss to the next grid - do NOT spawn a duplicate
    // (that bug made arena maps impossible to finish). Only spawn when no
    // living boss remains (i.e. the previous boss was just slain).
    if (globalThis._monsters.some(m => m.isBoss)) return;

    const entry = _bossPhaseQueue[_bossKilledCount];
    if (!entry) return;

    // Boss arena entry: play this boss's theme (random one of its tracks).
    // Runs immediately - the spawn itself is delayed below for drama.
    // Carried-boss case above already has its theme playing, so no replay.
    if (typeof Audio_Manager !== 'undefined' && typeof Audio_Manager.playBossBGM === 'function') {
        Audio_Manager.playBossBGM(entry.id);
    }

    const def = globalThis.BOSS_DEFS[entry.id];
    const name = def ? def.name : entry.id;

    setTimeout(() => {
        if (!_isActive()) return;
        if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) {
            // Game is paused - retry after pause instead of spawning behind the overlay
            const retry = setInterval(() => {
                if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
                clearInterval(retry);
                if (!_isActive()) return;
                if (globalThis._monsters.some(m => m.isBoss)) return;
                globalThis.showCombatToast(t('eg_boss_arrived').replace('{name}', name), '#f87171');
                _spawnMonster(entry.id, entry.level || 1, entry.hpMult || 1);
                _updateObjectivesHUD();
            }, 200);
            return;
        }
        if (globalThis._monsters.some(m => m.isBoss)) return;
        globalThis.showCombatToast(t('eg_boss_arrived').replace('{name}', name), '#f87171');
        _spawnMonster(entry.id, entry.level || 1, entry.hpMult || 1);
        _updateObjectivesHUD();
        // Watchdog: if the boss still is not on the field (a refused spawn
        // must never strand the arena), retry a few times.
        let tries = 0;
        const watch = setInterval(() => {
            tries++;
            if (!_isActive() || !_bossPhaseActive || _bossDefeated()
                || globalThis._monsters.some(m => m.isBoss) || tries > 6) {
                clearInterval(watch);
                return;
            }
            if (typeof _gamePaused !== 'undefined' && globalThis._gamePaused) return;
            _spawnMonster(entry.id, entry.level || 1, entry.hpMult || 1);
            _updateObjectivesHUD();
        }, 700);
    }, BOSS_SPAWN_DELAY_MS);
}

// Called when the LAST map boss dies: loot explosion! Rains a pile of
// equipment, currency and gold onto the arena grid as the run's grand
// finale - then flips the tracker to Complete Map mode.
export function _onAllBossesDead() {
    const level = (globalThis._mapDef && globalThis._mapDef.monsterLevel) ? globalThis._mapDef.monsterLevel : 1;

    if (typeof _spawnLootExplosion === 'function') {
        _spawnLootExplosion(level);
    } else {
        // Fallback if grid-pickups ever loses the explosion spawner
        for (let i = 0; i < 3; i++) {
            if (typeof _spawnLootDrop === 'function') globalThis._spawnLootDrop(true, level);
        }
        if (typeof _tryDropCurrency === 'function') _tryDropCurrency(true);
    }

    globalThis.showToast(t('eg_boss_all_slain'), '#4ade80');

    // FIX: the arena puzzle was already solved (grid frozen by checkWin) when
    // the last boss died, e.g. inside the arena-advance delay. The advance
    // timer now no-ops, so nothing would unfreeze the board and the loot
    // explosion would be unpickable. Carry the loot into a fresh puzzle,
    // exactly like the "boss dies, then puzzle solved" path does.
    if (_puzzleCompleteFired) {
        setTimeout(() => {
            if (!_isActive() || !_puzzleCompleteFired) return;
            if (document.getElementById('sx-leave-map-overlay')) return;
            _startChainCountdown();
        }, 800);
    }
}


// Picks one puzzle for a map run. Two modes:
//   ── Blueprint pull (atlas regions) ── the region's chain blueprint fixes
//      every step in advance (same map → same chain, every run): the plan
//      entry decides generated puzzle vs story level, the size queue (from
//      the region's grid mix) fixes the grid size, and the generated grid
//      itself is seeded from the blueprint, so the whole run is
//      deterministic. Modifiers only extend the chain, they never
//      reshuffle it.
//   ── Legacy pull (no blueprint) ── the old random behaviour: 50/50 coin
//      flip between generated and story per step.
export function _pickMapRunPuzzleGi(criteria) {
    const canGenerate = typeof _createGeneratedLevel === 'function';
    const generate = opts => {
        if (!canGenerate) return null;
        return _createGeneratedLevel(opts);
    };

    const plan = Array.isArray(criteria.plan) ? criteria.plan : [];
    const hasBlueprint = plan.length > 0 && criteria.chainSeed != null;

    // ── Deterministic blueprint pull ──────────────────────────────────
    if (hasBlueprint) {
        criteria._planIdx = criteria._planIdx || 0;
        const stepIdx = criteria._planIdx++;
        const source = plan[stepIdx % plan.length] || 'gen';

        // Grid-size bucket for this step (region's size mix, consumed in
        // order - same queue every run of this region).
        const queue = Array.isArray(criteria.sizeQueue) ? criteria.sizeQueue : [];
        const bucket = queue.length > 0 ? queue.shift() : null;
        const stepCriteria = bucket ? _bucketCriteria(criteria, bucket) : criteria;

        const genRng = (typeof egAtlasMakeRng === 'function')
            ? egAtlasMakeRng((criteria.chainSeed + stepIdx * 7919) >>> 0) : null;
        const storyRng = (typeof egAtlasMakeRng === 'function')
            ? egAtlasMakeRng((criteria.chainSeed + stepIdx * 104729 + 17) >>> 0) : null;

        if (source === 'gen') {
            const gi = generate({
                mode: criteria.genMode,
                tier: criteria.genTier,
                minCells: stepCriteria.minCells,
                bucket,
                rng: genRng,
            });
            if (gi !== null) { _trackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        const storyGi = _pickStoryChainPuzzleGi(stepCriteria, storyRng);
        if (storyGi !== null) return storyGi;

        if (source === 'story') {
            const gi = generate({
                mode: criteria.genMode,
                tier: criteria.genTier,
                minCells: stepCriteria.minCells,
                bucket,
                rng: genRng,
            });
            if (gi !== null) { _trackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        // Neither source satisfied this step - take any puzzle instead.
        console.warn('EG chain: blueprint step unsatisfiable, using any puzzle:', source, bucket);
        return _pickStoryChainPuzzleGi(criteria, storyRng);
    }

    // ── Legacy random pull (no size mix / no blueprint) ──────────────
    const queue = Array.isArray(criteria.sizeQueue) ? criteria.sizeQueue : [];
    if (queue.length > 0) {
        const bucket = queue.shift();   // consumed - shrinks as the run progresses
        const bucketCriteria = _bucketCriteria(criteria, bucket);

        // Coin flip which source leads; the other one is the fallback.
        const genFirst = Math.random() < 0.5;

        if (genFirst) {
            const gi = generate({ mode: criteria.genMode, tier: criteria.genTier, minCells: bucketCriteria.minCells, bucket });
            if (gi !== null) { _trackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        const storyGi = _pickStoryChainPuzzleGi(bucketCriteria);
        if (storyGi !== null) return storyGi;

        if (!genFirst) {
            const gi = generate({ mode: criteria.genMode, tier: criteria.genTier, minCells: bucketCriteria.minCells, bucket });
            if (gi !== null) { _trackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        // Neither source had this bucket - take any puzzle instead.
        console.warn('EG chain: size bucket unsatisfiable, using any puzzle:', bucket);
        return _pickStoryChainPuzzleGi(criteria);
    }

    if (criteria.generated) {
        const gi = generate({
            mode: criteria.genMode,
            tier: criteria.genTier,
            minCells: criteria.minCells,
            maxCells: criteria.maxCells,
        });
        if (gi !== null) { _trackChainRecentGi(gi, criteria.recentWindow); return gi; }
        console.warn('EG chain: puzzle generation failed, falling back to story pool');
    }

    return _pickStoryChainPuzzleGi(criteria);
}

export function _findNextChainPuzzleGi() {
    const activeDef = globalThis._mapDef || cur;
    const criteria = (activeDef.puzzlePool && typeof activeDef.puzzlePool === 'object')
        ? activeDef.puzzlePool : {};

    return _pickMapRunPuzzleGi(criteria);
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: MAP END (voluntary)----------------
//------------------------------------------------------------------------

// Chance-based bonus equipment loot when completing a map (cap 500% = up to 5 items).
// The chance scales with the grid size of each solved puzzle and with
// correct quiz answers this run:
//   puzzles: small +10%, normal +25%, large +50%, massive +75%
//   quiz:    +33% / +33% / +34% per correct answer (repeating +34% after three)
export const BONUS_LOOT_CHANCE_BY_GRID_SIZE = {
    small: 0.10,
    medium: 0.25,
    large: 0.50,
    massive: 0.75,
};
export const BONUS_LOOT_CHANCE_PER_QUESTION = [0.33, 0.33, 0.34];
export const BONUS_LOOT_CHANCE_MAX = 5.0;

// Returns the bonus-loot gain (0–1) for solving a puzzle, based on how many
// cells the puzzle's grid has (same buckets as _gridSizeBucket in inference-stats.js).
export function _getPuzzleBonusLootGain() {
    const rows = cur ? cur.grid.length : 0;
    const cols = cur && cur.grid[0] ? cur.grid[0].length : 0;
    const cells = rows * cols;
    if (cells >= 400) return BONUS_LOOT_CHANCE_BY_GRID_SIZE.massive;
    if (cells >= 200) return BONUS_LOOT_CHANCE_BY_GRID_SIZE.large;
    if (cells >= 100) return BONUS_LOOT_CHANCE_BY_GRID_SIZE.medium;
    return BONUS_LOOT_CHANCE_BY_GRID_SIZE.small;
}

// Returns the current bonus-loot drop chance (0–5) for this run.
export function _getBonusLootChance() {
    return Math.min(BONUS_LOOT_CHANCE_MAX, _bonusLootChance);
}

// Rolls for up to 5 bonus equipment items on map completion (cap 500%).
// For total chance C (0–5): floor(C) items are guaranteed, and the
// fractional remainder is a chance for one extra item. E.g. 3.5 → 3
// guaranteed + 50% chance for a 4th. Items are pushed into _runLoot so
// they flow through the normal flush-to-stash and leave-map summary paths.
// Must be called BEFORE _showLeaveMapTransition() and before cleanup.
export function _rollBonusMapLoot() {
    if (typeof _generateEquipmentDrop !== 'function') return;
    const totalChance = _getBonusLootChance();
    if (totalChance <= 0) return;

    const guaranteed = Math.floor(totalChance);
    const remainder = totalChance - guaranteed;

    const baseLevel = (globalThis._mapDef && globalThis._mapDef.monsterLevel) ? globalThis._mapDef.monsterLevel : 1;

    let rolls = guaranteed;
    if (remainder > 0 && Math.random() < remainder) rolls += 1;

    for (let i = 0; i < rolls; i++) {
        const item = _generateEquipmentDrop(baseLevel);
        if (!item) continue;

        // Flag the drop so the leave-map summary can visually mark it (🎁 badge
        // on the chip + "Bonus Loot" line in its tooltip) as the bonus item.
        item.isBonusLoot = true;

        // ── Loot filter ── bonus loot obeys the same auto-vendor rules as
        // normal pickups: rule-matching items are destroyed for a rolled
        // shard (mirrored into the summary's runes & orbs row by the filter)
        // and never reach the run loot bag. A filter failure keeps the item
        // (defensive - same policy as the pickup claim hook).
        if (typeof _lootFilterAutoVendor === 'function') {
            let vendored = false;
            try { vendored = _lootFilterAutoVendor(item); } catch (e) { vendored = false; }
            if (vendored) continue;
        }

        globalThis._runLoot.push(item);
        globalThis.showToast(t('eg_bonus_loot')
            .replace('{icon}', item.icon || '')
            .replace('{name}', item.name), _rarityToastColor(item.rarity));
    }
}

// Grants the active map's rolled completion reward (2–10× one higher-grade
// orb or essence). Adds it to the real currency/essence stash AND to
// _runCurrency / _runEssences so it shows up in the correct section of the
// leave-map transition screen. Must run BEFORE _showLeaveMapTransition()
// renders the summary and before cleanup clears _egActiveMapItem /
// _runCurrency.
export function _grantMapCompletionReward() {
    const mapItem = (typeof _egActiveMapItem !== 'undefined') ? _egActiveMapItem : null;
    const reward = mapItem && mapItem.implicits && mapItem.implicits.completionReward;
    if (!reward || !reward.count) return;

    const def = (typeof _egGetCompletionRewardDef === 'function')
        ? _egGetCompletionRewardDef(reward.id) : null;
    if (!def) return;

    // Essences stack in the essence tab, orbs in the runes & orbs stash.
    const added = def.category === 'essence'
        ? addEssence(def.id, reward.count, def)
        : addCurrency(def.id, reward.count, def);
    if (!added) globalThis.showToast(t('eg_map_stash_full'));

    // Mirror into the transition screen's list (aggregated by id).
    // Essences must go to the essence section, orbs/shards to the orbs section.
    const isEssenceReward = def.category === 'essence' || (def.id && def.id.indexOf('essence_') === 0);
    const targetList = isEssenceReward ? globalThis._runEssences : globalThis._runCurrency;
    const existing = targetList.find(e => e.id === def.id);
    if (existing) existing.count += reward.count;
    else targetList.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        description: def.description,
        count: reward.count,
    });

    Audio_Manager.playSFX('map_reward');
    globalThis.showToast(t('eg_map_reward_granted')
        .replace('{icon}', def.icon || '💰')
        .replace('{n}', reward.count)
        .replace('{name}', def.name), '#f5d98a');

    // Grant innate gold reward for completing the map (on top of currency reward).
    // Base amount scales with map tier and modifier load (difficulty).
    const tier = Math.max(1, mapItem.mapTier || 1);
    const mods = Array.isArray(mapItem.mods) ? mapItem.mods : [];
    const tierFrac = (tier - 1) / 15; // EG_MAX_MAP_TIER - 1
    const modLoad = mods.reduce((s, m) => s + ((Number(m && m.tier) || 1)), 0);
    const modFrac = Math.min(1, modLoad / 12);
    const difficulty = tierFrac * 0.7 + modFrac * 0.3;
    // Base 50-500 gold depending on difficulty, plus small random variance
    const goldAmount = Math.max(50, Math.round(50 + difficulty * 450 + (Math.random() - 0.5) * 100));
    if (typeof _addGold === 'function') {
        _addGold(goldAmount);
        globalThis.showToast(t('eg_map_gold_reward').replace('{n}', goldAmount), '#f5d98a');
    }
}

// Builds the hover-tooltip body for the bonus-loot chance label in the
// corner HUD: explains what bonus loot is and shows the current chance.
export function _buildBonusLootTooltipHTML() {
    const pct = Math.round(_getBonusLootChance() * 100);

    let html = `<strong style="color:#f5d98a">${t('eg_bonus_chance_title')}</strong>`;
    html += `<br>${t('eg_bonus_loot_tooltip')}`;
    html += `<br>${t('eg_bonus_current').replace('{p}', pct)}`;
    return html;
}

// Wires hover tooltip onto the static #sx-bonus-loot-chance element
// (same pattern as the mistake-counter / timer tooltips in tooltips-hud.js).
export function _bindBonusLootHUDTooltip(el) {
    if (!el || el.dataset.bonusTooltipBound) return;
    el.dataset.bonusTooltipBound = '1';
    el.addEventListener('mouseenter', (e) => globalThis.showGameTooltip(_buildBonusLootTooltipHTML(), e));
    el.addEventListener('mousemove', globalThis.moveGameTooltip);
    el.addEventListener('mouseleave', globalThis.hideGameTooltip);
}

// Shows/hides the bonus-loot chance label under the FILL button in the
// top-left corner HUD and refreshes its percentage text.
export function _updateBonusLootHUD() {
    const el = document.getElementById('sx-bonus-loot-chance');
    if (!el) return;

    if (!_isActive()) {
        el.classList.add('hidden');
        return;
    }

    const pct = Math.round(_getBonusLootChance() * 100);
    const val = document.getElementById('sx-bonus-loot-chance-val');
    if (val) val.textContent = t('eg_bonus_chance').replace('{p}', pct);
    _bindBonusLootHUDTooltip(el);
    el.classList.remove('hidden');
}

// Builds the "bonus loot gained from the last puzzle/quiz" line shown in
// the chain countdown transition. Returns '' when nothing was gained, so
// the overlay stays clean on the first transition of a run.
export function _buildChainBonusGainHTML() {
    const puzzleGain = Math.round(_pendingPuzzleBonusGain * 100);
    const quizGain = Math.round(_pendingQuestionBonusGain * 100);
    // Reward (damage buff / heal / mana) granted by the last correct answer
    const quizRewardLine = (typeof _consumePendingQuizRewardHTML === 'function')
        ? _consumePendingQuizRewardHTML() : '';

    // Consume the pending gains - they describe only the previous segment.
    _pendingPuzzleBonusGain = 0;
    _pendingQuestionBonusGain = 0;

    if (puzzleGain <= 0 && quizGain <= 0 && !quizRewardLine) return '';

    const parts = [];
    if (puzzleGain > 0) parts.push(`<span style="color:#7fd67f">+${puzzleGain}%</span> ${t('eg_bonus_src_puzzle')}`);
    if (quizGain > 0) parts.push(`<span style="color:#7fb8ff">+${quizGain}%</span> ${t('eg_bonus_src_quiz')}`);

    const total = Math.round(_getBonusLootChance() * 100);
    return `
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;padding:6px 14px;
                    background:rgba(245,217,138,0.08);border:1px solid rgba(245,217,138,0.35);border-radius:6px;">
            <span>🎁</span>
            <span style="font-size:0.85rem;color:#f5d98a;">${t('eg_bonus_chance_title')}</span>
            <span style="font-size:0.85rem;color:#ccc;">${parts.join('<span style="opacity:.5">·</span>')}</span>
            <span style="font-size:0.85rem;color:#fff;font-weight:700;">${t('eg_bonus_total').replace('{p}', total)}</span>
        </div>
        ${quizRewardLine ? `
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;padding:6px 14px;
                    background:rgba(255,85,51,0.08);border:1px solid rgba(255,85,51,0.35);border-radius:6px;">
            <span style="font-size:0.85rem;color:#ccc;">${quizRewardLine}</span>
        </div>` : ''}`;
}

// Called only by the Leave Map button after _canLeaveMap() returns true.
// Called only by the Leave Map button after _canLeaveMap() returns true.
export function _endMap() {
    if (!globalThis._encounterActive) return;
    _cancelChainCountdown();

    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    // Roll for completion bonus loot first - it must land in _runLoot
    // before the transition overlay renders its summary.
    _rollBonusMapLoot();

    // Grant the map's rolled currency completion reward - it must land in
    // the stash and in _runCurrency before the summary renders.
    _grantMapCompletionReward();

    // Atlas: mark this run's region as cleared and unlock its connected
    // regions (see endgame-atlas.js). Must run before _chainCleanup
    // clears _egActiveMapItem. The result tells the win screen whether
    // this was the very first clear of this atlas region.
    const atlasResult = (typeof _egAtlasOnMapCompleted === 'function')
        ? _egAtlasOnMapCompleted(_egActiveMapItem)
        : null;

    // Atlas completion bonus: independent +1%-per-region roll for one extra
    // adjacent-region map. Must run while _egActiveMapItem is still set and
    // after the atlas clear above (fresh clears count immediately). The
    // bonus map lands in the stash + _runMaps before the summary renders.
    if (typeof _egRollAtlasAdjacentBonusDrop === 'function') {
        try { _egRollAtlasAdjacentBonusDrop(_egActiveMapItem); } catch (e) {}
    }

    // Endgame achievements - map completion
    if (typeof trackAchStat === 'function') try {
        trackAchStat('egMapsCompleted', 1);
        const _mapTierForAch = (_egActiveMapItem && _egActiveMapItem.mapTier) || (globalThis._mapDef && globalThis._mapDef.mapTier) || 0;
        if (_mapTierForAch >= 16) trackAchStat('egMapsT16Completed', 1);
        const _modsForAch = (_egActiveMapItem && Array.isArray(_egActiveMapItem.mods) ? _egActiveMapItem.mods : []);
        if (_modsForAch.length >= 4) trackAchStat('egMapsHeavilyModded', 1);
        const _hasHazardAch = _modsForAch.some(function(m){ return m && m.familyId && String(m.familyId).indexOf('map_hazard_') === 0; });
        if (_hasHazardAch) trackAchStat('egMapsHazardCompleted', 1);
        // Flawless: 0 mistakes made during the entire map run
        const _mistakesForAch = (typeof mistakeCount !== 'undefined') ? globalThis.mistakeCount : 999;
        // Use per-map mistake limit tracking: flawless means mistakeCount didn't increase from start of map
        // We approximate via global mistakeCount == 0 at time of completion check (common case for testing)
        // More accurately, check if mistakeCount still within snapshot - but for achievements we require 0 total mistakes freshly
        // So we check if no mistakes in this session: use _chainPuzzleSolvedCount hasn't had mistakes.
        // Fallback: if global mistakeCount is 0, count as flawless
        if (_mistakesForAch === 0) trackAchStat('egMapsFlawless', 1);
    } catch(e){}

    // Show the overlay FIRST - it sits above the puzzle grid with normal
    // pointer-events, so it blocks every further click the instant this
    // runs, before any of the cleanup below happens.
    _showLeaveMapTransition(atlasResult);

    _flushRunLootToStash();
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
    saveHubState();
    _stopEncounter();
    // Guarantee quiz damage buff is cleared on voluntary map exit even if
    // _stopEncounter was suppressed (e.g. forfeit during chain transition).
    if (typeof _resetQuizDamageBuff === 'function') _resetQuizDamageBuff();

    // Stop the puzzle timer too - otherwise it keeps running behind the
    // overlay and could trigger a time's-up loss while reading the summary.
    if (typeof stopTimer === 'function') stopTimer();

    if (typeof _hidePlayerAvatarSimple === 'function') globalThis._hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') globalThis._hidePlayerAvatar();
}


// Called by the Leave Map button in the HUD.
export function _tryLeaveMap() {
    // Campaign trial runs finish through the trial flow (trial rewards +
    // world-map return) instead of the atlas map flow.
    try {
        if (typeof _isTrialRun === 'function' && globalThis._isTrialRun()
            && typeof _endCampaignTrial === 'function') {
            globalThis._endCampaignTrial();
            return;
        }
    } catch (e) {}
    if (!_canLeaveMap()) {
        globalThis.showToast(t('eg_objectives_incomplete'));
        return;
    }
    _endMap();
}


//------------------------------------------------------------------------
//-------------------OBJECTIVES HUD---------------------------------------
//------------------------------------------------------------------------

// Helper: total bosses required for this map (for HUD display).
export function _getBossTotalForHUD() {
    if (_bossTotalCount > 0) return _bossTotalCount;
    const def = globalThis._mapDef || cur;
    if (!def) return 0;
    if (def.bosses && def.bosses.length > 0) {
        const cap = (def.maxBosses != null && def.maxBosses > 0) ? def.maxBosses : def.bosses.length;
        return Math.min(def.bosses.length, cap);
    }
    if (def.hasBoss) return (def.maxBosses != null && def.maxBosses > 0) ? def.maxBosses : 1;
    return 0;
}

export function _updateObjectivesHUD() {
    const strip = document.getElementById('sx-objectives-strip');
    if (!strip) return;

    // Campaign levels run monsters but have no map objectives - never show
    // the objectives strip for them.
    if (typeof _isCampaignRun === 'function' && _isCampaignRun()) {
        strip.classList.add('sx-hidden');
        if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) PassiveTracker.refreshVisibility();
        return;
    }

    if (!_isActive()) {
        strip.classList.add('sx-hidden');
        _updateBonusLootHUD();
        if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) PassiveTracker.refreshVisibility();
        return;
    }

    strip.classList.remove('sx-hidden');
    _updateBonusLootHUD();
    // Enforce passive tracker hide during endgame if setting enabled
    if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) PassiveTracker.refreshVisibility();

    const req = _getMapRequirements();

    // Build shrinking single-line segments - finished objectives are omitted.
    const segs = [];

    if (req.totalMonsters > 0) {
        const count = Math.min(_chainKillCount, req.totalMonsters);
        if (count < req.totalMonsters) {
            segs.push(`<span class="sx-obj-seg"><span class="sx-obj-seg-val">${count} / ${req.totalMonsters}</span> <span class="sx-obj-seg-label">Monsters</span></span>`);
        }
    }
    if (req.requiredPuzzles > 0) {
        const count = Math.min(_chainPuzzleSolvedCount, req.requiredPuzzles);
        if (count < req.requiredPuzzles) {
            segs.push(`<span class="sx-obj-seg"><span class="sx-obj-seg-val">${count} / ${req.requiredPuzzles}</span> <span class="sx-obj-seg-label">Puzzles</span></span>`);
        }
    }
    if (req.requiredQuestions > 0) {
        const count = Math.min(_questionsAnswered, req.requiredQuestions);
        if (count < req.requiredQuestions) {
            segs.push(`<span class="sx-obj-seg"><span class="sx-obj-seg-val">${count} / ${req.requiredQuestions}</span> <span class="sx-obj-seg-label">Questions</span></span>`);
        }
    }
    if (req.hasBoss && !_bossDefeated()) {
        const bossTotal = _getBossTotalForHUD();
        const bossCount = Math.min(_bossKilledCount, bossTotal || 1);
        // Show boss progress even before arena entry; hide only when all bosses slain.
        if (bossTotal > 0) {
            segs.push(`<span class="sx-obj-seg"><span class="sx-obj-seg-val">${bossCount} / ${bossTotal}</span> <span class="sx-obj-seg-label">Bosses</span></span>`);
        }
    }

    const canLeave = _canLeaveMap();
    const othersDone = _nonBossObjectivesComplete();
    const monstersDone = req.totalMonsters === 0 || _chainKillCount >= req.totalMonsters;
    const puzzlesDone = req.requiredPuzzles === 0 || _chainPuzzleSolvedCount >= req.requiredPuzzles;
    const questionsRemain = req.requiredQuestions > 0 && _questionsAnswered < req.requiredQuestions;
    const nonQuestionObjectivesDone = monstersDone && puzzlesDone;

    // Action button logic - top-center, only when actionable:
    //   boss map + non-boss done + not in arena → Enter Boss Arena
    //   all objectives done                       → Complete Map (highlighted)
    //   non-question objectives done + questions remain → Trigger Question
    //     (also on boss maps when only questions + boss remain, since the
    //      boss arena is gated behind questions and would otherwise never show)
    //   otherwise                                 → no button (just the line)
    let actionHTML = '';
    if (req.hasBoss && !_bossDefeated()) {
        if (!_bossPhaseActive && othersDone) {
            actionHTML = `<button class="sx-obj-action-btn sx-obj-action-boss" onclick="_enterBossArena()">${t('eg_enter_boss_arena')}</button>`;
        } else if (questionsRemain && nonQuestionObjectivesDone) {
            actionHTML = `<button class="sx-obj-action-btn sx-obj-action-question" onclick="_triggerQuestionNow()">${t('eg_trigger_question')}</button>`;
        }
    } else if (canLeave) {
        // Campaign trials relabel the finish button (spec): convergence
        // trials say "Finish Trial", ascension trials their own label.
        let leaveLabel = t('eg_complete_map');
        try {
            if (typeof _isTrialRun === 'function' && globalThis._isTrialRun()) {
                const tr = globalThis._isTrialRun();
                const key = (tr && tr.kind === 'ascension') ? 'eg_finish_ascension' : 'eg_finish_trial';
                const alt = t(key);
                if (alt && alt !== key) leaveLabel = alt;
                else leaveLabel = (tr && tr.kind === 'ascension') ? 'Finish Ascension' : 'Finish Trial';
            }
        } catch (e) {}
        actionHTML = `<button class="sx-obj-action-btn sx-obj-action-complete" onclick="_tryLeaveMap()">${leaveLabel}</button>`;
    } else if (questionsRemain && nonQuestionObjectivesDone) {
        actionHTML = `<button class="sx-obj-action-btn sx-obj-action-question" onclick="_triggerQuestionNow()">${t('eg_trigger_question')}</button>`;
    }

    // First time boss arena becomes available (non-boss done, boss not yet defeated): banner + toast.
    if (req.hasBoss && !_bossDefeated() && !_bossPhaseActive && othersDone && !_bossArenaAvailableShown) {
        _bossArenaAvailableShown = true;
        _showBossArenaAvailableBanner();
        globalThis.showToast(t('eg_boss_arena_available_toast'), '#f87171');
    }

    // First time all objectives are complete: big green banner + toast.
    if (canLeave && !_mapClearedShown) {
        _mapClearedShown = true;
        _showMapClearedBanner();
        Audio_Manager.playSFX('map_complete');
        globalThis.showToast(t(_activeTrialKind() ? 'eg_trial_cleared_toast' : 'eg_map_cleared_toast'), '#4ade80');
    }

    // Render: single pill line (if any segments remain) + optional action button.
    const lineHTML = segs.length > 0 ? `<div class="sx-obj-line">${segs.join('')}</div>` : '';
    const actionsHTML = actionHTML ? `<div class="sx-obj-actions">${actionHTML}</div>` : '';

    // Hide strip entirely when nothing to show (no segs and no button) - avoids empty pill.
    if (!lineHTML && !actionsHTML) {
        strip.innerHTML = '';
        strip.classList.add('sx-hidden');
        return;
    }

    strip.innerHTML = `${lineHTML}${actionsHTML}`;
}

// Kind ('convergence' | 'ascension') of the running campaign trial, else null.
// Campaign trials are not map runs, so their banners must not say "Map".
function _activeTrialKind() {
    try {
        const tr = (typeof _isTrialRun === 'function') ? globalThis._isTrialRun() : null;
        return tr ? (tr.kind || 'convergence') : null;
    } catch (e) { return null; }
}

// Shows a big green "MAP CLEARED" text centered over the puzzle grid for
// 3 seconds. Purely cosmetic - pointer-events are disabled via CSS.
export function _showMapClearedBanner() {
    if (typeof _clearCenterGridBanners === 'function') _clearCenterGridBanners('eg-map-cleared-banner');
    const old = document.getElementById('eg-map-cleared-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-map-cleared-banner';
    const trialKind = _activeTrialKind();
    el.textContent = t(trialKind === 'ascension' ? 'eg_ascension_cleared'
        : trialKind ? 'eg_trial_cleared' : 'eg_map_cleared');
    document.body.appendChild(el);

    // Center the banner over the puzzle grid (fallback: screen center)
    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    setTimeout(() => el.remove(), 3000);
}

// Shows a banner centered over the puzzle grid when the boss arena
// becomes available (all non-boss objectives done). Mirrors the MAP
// CLEARED banner in placement/animation but uses boss-red styling.
export function _showBossArenaAvailableBanner() {
    if (typeof _clearCenterGridBanners === 'function') _clearCenterGridBanners('sx-boss-arena-available-banner');
    const old = document.getElementById('sx-boss-arena-available-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'sx-boss-arena-available-banner';
    el.textContent = t('eg_boss_arena_available');
    document.body.appendChild(el);

    const board = document.getElementById('ptable');
    if (board) {
        const r = board.getBoundingClientRect();
        el.style.left = (r.left + r.width / 2) + 'px';
        el.style.top = (r.top + r.height / 2) + 'px';
    } else {
        el.style.left = '50%';
        el.style.top = '50%';
    }

    setTimeout(() => el.remove(), 3000);
}

//------------------------------------------------------------------------
//-------------------OBJECTIVES HUD: DRAG + MINIMIZE (deprecated)----------
//------------------------------------------------------------------------
// Top-center tracker is no longer draggable/collapsible - stubs kept for
// backward compatibility so old saved state does not throw.

export const OBJ_STRIP_STORAGE_KEY = 'eg_objectives_strip_state';
export function _loadObjectivesStripState() { return null; }
export function _saveObjectivesStripState() {}
export function _applySavedObjectivesStripState() { /* no-op: fixed top-center */ }
export function _bindObjectivesStripBehaviour() { /* no-op: no drag/collapse */ }

// Legacy loot helpers - loot is now tracked in the escape menu; stubs kept for compatibility.
export function _buildLootItem() { return ''; }
export function _objItem() { return ''; }



//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: COUNTDOWN UI-----------------------
//------------------------------------------------------------------------

export function _showChainCountdownOverlay(secs) {
    let el = document.getElementById('sx-chain-countdown');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sx-chain-countdown';
        el.style.cssText = [
            'position:fixed', 'inset:0', 'display:flex',
            'flex-direction:column', 'align-items:center', 'justify-content:center',
            'background:rgba(0,0,0,0.55)', 'z-index:9999',
            'font-family:inherit', 'pointer-events:none',
        ].join(';');
        document.body.appendChild(el);
    }
    el.innerHTML = `
        ${_buildChainBonusGainHTML()}
        <div style="font-size:1.1rem;color:#aaa;margin-bottom:0.4rem;letter-spacing:.1em;">${t('eg_countdown_solved')}</div>
        <div id="sx-chain-countdown-num" style="font-size:4rem;font-weight:700;color:#fff;line-height:1;">${secs}</div>
        <div style="font-size:0.9rem;color:#888;margin-top:0.5rem;">${t('eg_countdown_next')}</div>`;
    el.style.display = 'flex';
}

export function _updateChainCountdownOverlay(secs) {
    const num = document.getElementById('sx-chain-countdown-num');
    if (num) num.textContent = secs;
}

export function _hideChainCountdownOverlay() {
    const el = document.getElementById('sx-chain-countdown');
    if (el) el.style.display = 'none';
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: CLEANUP-----------------------------
//------------------------------------------------------------------------

export function _chainCleanup() {
    _cancelChainCountdown();
    globalThis.ALL.forEach(level => {
        if (level.isChainedPuzzle && level !== cur) {   // <-- don't strip the level about to be retried
            delete level.isMonsterLevel;
            delete level.isChainedPuzzle;
        }
        if (level.isBossArena) delete level.isBossArena;
    });

    // End of a device-map run: restore the seed level and drop the map's
    // runtime modifiers.
    if (typeof _egCleanupMapRunSeedLevel === 'function') _egCleanupMapRunSeedLevel();

    // End of a campaign trial run: restore the stamped seed level.
    if (typeof _cleanupCampaignTrialSeed === 'function') globalThis._cleanupCampaignTrialSeed();

    // End of a boss-test run: restore the stamped seed level.
    if (typeof _cleanupBossTestSeedLevel === 'function') _cleanupBossTestSeedLevel();

    _chainKillCount = 0;
    _chainPuzzleSolvedCount = 0;
    _questionsAnswered = 0;
    // Expire any active quiz reward damage buff
    if (typeof _resetQuizDamageBuff === 'function') _resetQuizDamageBuff();
    _bonusLootChance = 0;
    _pendingPuzzleBonusGain = 0;
    _pendingQuestionBonusGain = 0;
    _chainCurrentGi = null;
    _resetChainRecentGis();
    _monsterSpawnCounter = 0;
    _puzzleCompleteFired = false;
    _mapClearedShown = false;
    _bossArenaAvailableShown = false;
    if (typeof _resetMistakesWarningState === 'function') _resetMistakesWarningState();
    if (typeof _resetLowHealthWarningState === 'function') _resetLowHealthWarningState();

    // Boss arena phase state
    if (_arenaAdvanceTimer) {
        clearTimeout(_arenaAdvanceTimer);
        _arenaAdvanceTimer = null;
    }
    _bossPhaseActive = false;
    _bossPhaseQueue = [];
    _bossKilledCount = 0;
    _bossTotalCount = 0;

    // Remove banners if still on screen (all center-grid types - a stale
    // warning must never survive into the next map)
    if (typeof _clearCenterGridBanners === 'function') _clearCenterGridBanners();
    const banner = document.getElementById('eg-map-cleared-banner');
    if (banner) banner.remove();
    const bossBanner = document.getElementById('sx-boss-arena-available-banner');
    if (bossBanner) bossBanner.remove();
    const mistakesBanner = document.getElementById('sx-mistakes-warning-banner');
    if (mistakesBanner) mistakesBanner.remove();

    globalThis._runLoot = [];
    globalThis._runCurrency = [];
    globalThis._runItems = [];
    globalThis._runMaps = [];
    globalThis._runEssences = [];
    // _lootDrops is cleared by _stopPickupSpawner via _stopLootDrops

    // Hide the objectives strip
    const strip = document.getElementById('sx-objectives-strip');
    if (strip) strip.classList.add('sx-hidden');

    // Hide the bonus-loot chance label in the corner HUD
    _updateBonusLootHUD();
}



//------------------------------------------------------------------------
//-------------------LEAVE MAP TRANSITION SCREEN--------------------------
//------------------------------------------------------------------------

// Builds the summary rows (equipment loot + regular items + maps + currency + essences + gold).
// Reads the passed-in snapshots - must be called while _runLoot /
// _runItems / _runMaps / _runCurrency / _runEssences still hold the run's data.
// Note: since the loot filter auto-vendors rule-matching drops (including
// bonus loot) at pickup, manual Ctrl+click selling was removed from this
// summary - unwanted gear is already converted to shards during the run.
export function _buildLeaveMapSummaryHTML(loot, items, maps, currency, essences, gold = 0) {
    const lootHTML = loot.map((item, i) => `
        <div class="sx-leave-summary-chip sx-loot-chip sx-rarity-${item.rarity || 'common'}" data-loot-idx="${i}">
            ${GAME_ART.html('item', item.baseId, item.icon || '📦')}
            ${item.isBonusLoot ? '<span class="sx-leave-summary-bonus">🎁</span>' : ''}
        </div>`).join('');

    const itemsHTML = items.map((item, i) => `
        <div class="sx-leave-summary-chip sx-item-pickup-chip sx-rarity-${_leaveRarityClass(item.rarity)}" data-item-idx="${i}">
            ${GAME_ART.html('item', item.defId, item.icon || '📦')}
        </div>`).join('');

    const mapsHTML = maps.map((map, i) => `
        <div class="sx-leave-summary-chip eg-map-pickup-chip sx-rarity-${_leaveRarityClass(map.rarity)}" data-map-idx="${i}">
            ${GAME_ART.html('item', GAME_ART.artIdForItem(map), map.icon || '🗺️')}
        </div>`).join('');

    const currencyHTML = currency.map((entry, i) => `
        <div class="sx-leave-summary-chip sx-rarity-currency" data-currency-idx="${i}">
            ${GAME_ART.html('item', entry.id, entry.icon || '💰')}
            ${entry.count > 1 ? `<span class="sx-leave-summary-count">×${entry.count}</span>` : ''}
        </div>`).join('');

    const essencesHTML = essences.map((entry, i) => `
        <div class="sx-leave-summary-chip sx-rarity-essence" data-essence-idx="${i}">
            ${GAME_ART.html('item', entry.id, entry.icon || '🧬')}
            ${entry.count > 1 ? `<span class="sx-leave-summary-count">×${entry.count}</span>` : ''}
        </div>`).join('');

    const goldHTML = gold > 0 ? `
        <div class="sx-leave-summary-chip sx-rarity-gold" data-gold-idx="0">
            ${GAME_ART.html('item', 'gold', '🪙')}
            <span class="sx-leave-summary-count">×${gold.toLocaleString()}</span>
        </div>` : '';

    return `
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_loot_acquired').replace('{n}', loot.length)}</div>
            <div class="sx-leave-summary-row">${lootHTML || `<span class="sx-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_items_acquired').replace('{n}', items.length)}</div>
            <div class="sx-leave-summary-row">${itemsHTML || `<span class="sx-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_maps_acquired').replace('{n}', maps.length)}</div>
            <div class="sx-leave-summary-row">${mapsHTML || `<span class="sx-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_runes_orbs')}</div>
            <div class="sx-leave-summary-row">${currencyHTML || `<span class="sx-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_essences_acquired')}</div>
            <div class="sx-leave-summary-row">${essencesHTML || `<span class="sx-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        ${goldHTML ? `
        <div class="sx-leave-summary-section">
            <div class="sx-leave-summary-title">${t('eg_gold_reward')}</div>
            <div class="sx-leave-summary-row">${goldHTML}</div>
        </div>` : ''}`;
}

// Clamps a rarity string to one that has a border/glow CSS class on the
// summary chips (regular ITEM_DEFS items only use a subset of rarities).
export function _leaveRarityClass(rarity) {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact']
        .includes(rarity) ? rarity : 'common';
}

// Builds the hover tooltip body for a currency / shard entry shown in the
// runes &amp; orbs row - icon, name, rarity line and description, matching
// the hub's currency tooltip frame.
export function _buildCurrencyTooltipHTML(entry) {
    const countLine = entry.count > 1 ? ` <span class="sx-tooltip-count">×${entry.count}</span>` : '';
    return `<div class="sx-tt-frame" style="--tt-border:#b59248;">
        <div class="sx-tt-header">
            <div class="sx-tt-icon">${GAME_ART.html('item', entry.id, entry.icon || '💰')}</div>
            <div class="sx-tt-name" style="color:#f5d98a;">${entry.name || '???'}${countLine}</div>
            <div class="sx-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')}</div>
        </div>
        <div class="sx-tt-section"><div class="sx-tt-desc">${entry.description || ''}</div></div>
    </div>`;
}

// Builds the hover tooltip body for an essence entry shown in the
// essences row - icon, name, rarity line and description, matching
// the hub's essence tooltip frame.
export function _buildEssenceTooltipHTML(entry) {
    const countLine = entry.count > 1 ? ` <span class="sx-tooltip-count">×${entry.count}</span>` : '';
    return `<div class="sx-tt-frame" style="--tt-border:#b59248;">
        <div class="sx-tt-header">
            <div class="sx-tt-icon">${GAME_ART.html('item', entry.id, entry.icon || '🧬')}</div>
            <div class="sx-tt-name" style="color:#f5d98a;">${entry.name || '???'}${countLine}</div>
            <div class="sx-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_essence')}</div>
        </div>
        <div class="sx-tt-section"><div class="sx-tt-desc">${entry.description || ''}</div></div>
    </div>`;
}

// Builds a compact tooltip body for regular items (ITEM_DEFS pickups).
// Pulls the rarity label + localised description straight from ITEM_DEFS
// so the tooltip matches the inventory's item tooltips.
export function _buildLeaveItemTooltipHTML(item) {
    const rc = {
        common: '#b0b0b0', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#9b59b6', legendary: '#f5b642', cursed: '#e74c3c', artifact: '#f1c40f',
    }[_leaveRarityClass(item.rarity)] || '#b0b0b0';

    const def = typeof ITEM_DEFS !== 'undefined' ? globalThis.ITEM_DEFS[item.defId] : null;
    const desc = (def && typeof itemDesc === 'function') ? globalThis.itemDesc(def) : '';

    return `<div class="sx-tt-frame" style="--tt-border:${rc};">
        <div class="sx-tt-header">
            <div class="sx-tt-icon">${GAME_ART.html('item', item.defId, item.icon || '📦')}</div>
            <div class="sx-tt-name" style="color:${rc};">${item.name || '???'}</div>
            <div class="sx-tt-rarity-line" style="color:${rc};">${_leaveRarityLabel(_leaveRarityClass(item.rarity))}</div>
        </div>
        ${desc ? `<div class="sx-tt-section"><div class="sx-tt-desc">${desc}</div></div>` : ''}
    </div>`;
}

// Localised label for the rarities used by regular items - mirrors the
// TT_RARITY_KEYS mapping in _buildTooltipBodyHTML().
export function _leaveRarityLabel(rarity) {
    const keys = {
        common: 'rar_common', uncommon: 'rar_uncommon', rare: 'rar_rare',
        epic: 'eg_rar_epic', legendary: 'rar_legendary', cursed: 'rar_cursed',
        artifact: 'eg_rar_artifact',
    };
    return keys[rarity]
        ? t(keys[rarity])
        : rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

// Builds the tooltip body for a single summary chip (loot / item / map /
// currency) from its data-loot-idx / data-item-idx / data-map-idx /
// data-currency-idx attribute. Shared by the leave-map overlay and the
// endgame pause screen.
export function _buildLeaveChipTooltipHTML(chip, state) {
    if ('lootIdx' in chip.dataset) {
        const item = state.loot[+chip.dataset.lootIdx];
        return (item && typeof _buildTooltipBodyHTML === 'function')
            ? _buildTooltipBodyHTML(item) : '';
    }
    if ('itemIdx' in chip.dataset) {
        const item = state.items[+chip.dataset.itemIdx];
        return item ? _buildLeaveItemTooltipHTML(item) : '';
    }
    if ('mapIdx' in chip.dataset) {
        const map = state.maps[+chip.dataset.mapIdx];
        return (map && typeof _egBuildMapTooltipBodyHTML === 'function')
            ? _egBuildMapTooltipBodyHTML(map) : '';
    }
    if ('currencyIdx' in chip.dataset) {
        const entry = state.currency[+chip.dataset.currencyIdx];
        return entry ? _buildCurrencyTooltipHTML(entry) : '';
    }
    if ('essenceIdx' in chip.dataset) {
        const entry = state.essences[+chip.dataset.essenceIdx];
        return entry ? _buildEssenceTooltipHTML(entry) : '';
    }
    return '';
}

// Wires loot / item / currency chips to the global floating tooltip engine
// (tooltips-hud.js). Read-only: the loot filter auto-vendors rule-matching
// gear during the run, so there is no manual selling on this summary.
// The engine renders into a position:fixed element on document.body, so
// tooltips are never clipped by the panel's overflow-y. Listeners live on
// the panel (delegation), so re-rendering the summary rows is safe.
export function _wireLeaveMapSummaryTooltips(panel, state) {
    const buildFor = (chip) => _buildLeaveChipTooltipHTML(chip, state);

    // Lift the tooltip above this overlay (overlay z-index 10000 > tip 9999)
    const ensureAboveOverlay = () => { globalThis.getGameTooltip().style.zIndex = '10001'; };

    panel.addEventListener('mouseover', (e) => {
        const chip = e.target.closest('.sx-leave-summary-chip');
        if (!chip) return;
        const html = buildFor(chip);
        if (!html) return;
        ensureAboveOverlay();
        globalThis.showGameTooltip(html, e);
    });
    panel.addEventListener('mousemove', (e) => {
        if (e.target.closest('.sx-leave-summary-chip')) globalThis.moveGameTooltip(e);
    });
    panel.addEventListener('mouseout', (e) => {
        if (e.target.closest('.sx-leave-summary-chip')) globalThis.hideGameTooltip();
    });
}

// Endgame variant of the pause screen: renders the run's collected items
// into the pause panel (same chip layout as the win/lose map completion
// summary) and wires read-only hover tooltips - no ctrl+click selling here,
// the pause screen is purely informational.
export function _renderPauseLootSummary() {
    const container = document.getElementById('pause-loot-summary');
    if (!container) return;

    // The chips reuse the leave-map summary styles.
    _injectLeaveMapTransitionStyles();

    // Live view of the current run state - safe to read directly while
    // paused, nothing wipes it until the run actually ends.
    const state = {
        loot: globalThis._runLoot || [],
        items: globalThis._runItems || [],
        maps: globalThis._runMaps || [],
        currency: globalThis._runCurrency || [],
        essences: globalThis._runEssences || [],
        gold: 0,
    };

    container.innerHTML = _buildLeaveMapSummaryHTML(state.loot, state.items, state.maps, state.currency, state.essences, state.gold);

    // Read-only tooltip wiring (mouseover/mousemove/mouseout only). Assigned
    // as on* properties so repeated pauses never stack duplicate listeners.
    container.onmouseover = (e) => {
        const chip = e.target.closest('.sx-leave-summary-chip');
        if (!chip) return;
        const html = _buildLeaveChipTooltipHTML(chip, state);
        if (!html) return;
        // Lift above the pause overlay (z-index 9999).
        globalThis.getGameTooltip().style.zIndex = '10001';
        globalThis.showGameTooltip(html, e);
    };
    container.onmousemove = (e) => {
        if (e.target.closest('.sx-leave-summary-chip')) globalThis.moveGameTooltip(e);
    };
    container.onmouseout = (e) => {
        if (e.target.closest('.sx-leave-summary-chip')) globalThis.hideGameTooltip();
    };
}

// Full-screen blocking overlay. Unlike _showChainCountdownOverlay (which
// deliberately uses pointer-events:none so clicks pass through), this one
// keeps normal pointer-events so it swallows every click - that's what
// actually fixes the "puzzle still clickable for 1-2s" issue.
export function _showLeaveMapTransition(atlasResult, opts) {
    opts = opts || {};
    const failed = !!opts.failed;
    _injectLeaveMapTransitionStyles();

    let el = document.getElementById('sx-leave-map-transition');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sx-leave-map-transition';
        el.className = 'sx-leave-map-transition';
        document.body.appendChild(el);
    }     // Gold badge when this run cleared the region on the Atlas of Statistica
    // for the very first time (win path only).
    const isFirstClear = !failed && !!(atlasResult && atlasResult.firstClear && atlasResult.node);
    let firstClearHTML = '';
    if (isFirstClear) {
        const node = atlasResult.node;
        const tierLabel = t('eg_map_tier_tt').replace('{n}', node.tier);
        firstClearHTML = `<div class="sx-leave-map-first-clear">✨ ${t('eg_atlas_first_clear')
            .replace('{n}', egAtlasNodeName(node))
            .replace('{t}', tierLabel)}</div>`;
    }

    // Failed runs show a reason line (if one was passed) and a green hint
    // that everything collected during the run was kept.
    // Campaign trials (convergence / ascension) are not map-device runs: their
    // leave screen returns to the world map and nothing is "lost" but the try.
    const isTrial = typeof window !== 'undefined' && window._trialReturnWi != null
        && window._trialReturnWi >= 0;
    const titleText = failed
        ? (opts.titleText || t(isTrial ? 'eg_trial_failed' : 'eg_map_failed'))
        : t('eg_map_cleared');
    const subLineHTML = (failed && opts.subText)
        ? `<div class="sx-leave-map-subline">${opts.subText}</div>` : '';
    const keepHintHTML = failed
        ? `<div class="sx-leave-map-keep-hint">${t(isTrial ? 'eg_trial_failed_keep_hint' : 'eg_map_failed_keep_hint')}</div>` : '';

    el.innerHTML = `
        <div class="sx-leave-map-panel ${failed ? 'sx-leave-map-failed' : ''}">
            <div class="sx-leave-map-title ${failed ? 'sx-title-failed' : ''}">${titleText}</div>
            ${subLineHTML}
            ${keepHintHTML}
            ${firstClearHTML}
            <div id="sx-leave-summary-container"></div>
            <button class="sx-leave-map-return-btn" id="btn-eg-leave-map-return">${t(isTrial ? 'eg_return_to_world' : 'eg_return_to_nexus')}</button>
        </div>`;
    el.classList.add('show');

    // Snapshot the run data now - _stopEncounter() (called by _endMap
    // right after this) wipes _runLoot/_runCurrency via _chainCleanup.
    // Compute the gold reward for this map completion (win path only).
    let goldReward = 0;
    if (!failed && typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem) {
        const tier = Math.max(1, _egActiveMapItem.mapTier || 1);
        const mods = Array.isArray(_egActiveMapItem.mods) ? _egActiveMapItem.mods : [];
        const tierFrac = (tier - 1) / 15; // EG_MAX_MAP_TIER - 1
        const modLoad = mods.reduce((s, m) => s + ((Number(m && m.tier) || 1)), 0);
        const modFrac = Math.min(1, modLoad / 12);
        const difficulty = tierFrac * 0.7 + modFrac * 0.3;
        goldReward = Math.max(50, Math.round(50 + difficulty * 450));
    }

    const state = {
        loot: [...globalThis._runLoot],
        items: [...globalThis._runItems],
        maps: [...globalThis._runMaps],
        currency: [...globalThis._runCurrency],
        essences: [...globalThis._runEssences],
        gold: goldReward,
    };

    const panel = el.querySelector('.sx-leave-map-panel') || el;
    const container = document.getElementById('sx-leave-summary-container');
    if (container) {
        container.innerHTML = _buildLeaveMapSummaryHTML(state.loot, state.items, state.maps, state.currency, state.essences, state.gold);
    }
    // Learning panel: whole-map combat statistics (win or defeat).
    if (globalThis.RunStats) globalThis.RunStats.renderInto(failed ? 'map-lose' : 'map-win', el);

    _wireLeaveMapSummaryTooltips(panel, state);

    document.getElementById('btn-eg-leave-map-return').onclick = () => {
        _clearBonusLootFlags();
        _hideLeaveMapTransition();
        window._mapDefeatInProgress = false;
        // Campaign trial (win or defeat): back to the trial's world map.
        // Consumes the return flags; post-trial flows (convergence modal,
        // class event) are served once the world screen is visible.
        try {
            if (typeof _routeTrialReturn === 'function' && globalThis._routeTrialReturn()) {
                if (typeof _servePostTrialFlows === 'function') globalThis._servePostTrialFlows();
                return;
            }
        } catch (e) {}
        // Boss testing: win and defeat both return to the boss selection
        // screen. Captured now (not read lazily) because _stopEncounter
        // already ran. The flag is consumed here so later campaign runs
        // route normally again.
        if (window._isBossTestRun) {
            window._isBossTestRun = false;
            if (typeof showEndgameBossTest === 'function') {
                showEndgameBossTest();
                return;
            }
        }
        showEndgameNexus();
    };
}

// Strips the temporary isBonusLoot marker (🎁 badge + tooltip line) from
// every inventory and equipped item - called once the player leaves the
// map completion screen so the hub character sheet shows clean tooltips.
export function _clearBonusLootFlags() {
    if (typeof _inventory !== 'undefined' && Array.isArray(_inventory)) {
        for (const row of _inventory) {
            for (const item of row) {
                if (item && item.isBonusLoot) delete item.isBonusLoot;
            }
        }
    }
    if (typeof _equipped === 'object' && _equipped) {
        for (const slotId of Object.keys(_equipped)) {
            const item = _equipped[slotId];
            if (item && item.isBonusLoot) delete item.isBonusLoot;
        }
    }
}

export function _hideLeaveMapTransition() {
    const el = document.getElementById('sx-leave-map-transition');
    if (el) el.classList.remove('show');
    if (typeof hideGameTooltip === 'function') globalThis.hideGameTooltip();
}

// Central defeat handler for endgame map runs - called when the player dies
// (HP zero), exceeds the mistake limit, or loses through any other path
// (timer expiry, hardcore fail, golden clock, random walkers, ...).
//
// Unlike a voluntary map completion there is no bonus-loot roll, no
// completion reward and no atlas clear - but the player keeps everything
// already collected during the run: equipment loot is flushed into the stash
// and unclaimed map drops are banked before cleanup wipes the run state.
// (Regular items, maps and currency are persisted live on claim.) The
// consumed map itself is penalty enough. Shows the map-lost variant of the
// leave-map summary screen.
export function _endMapDefeated(titleText, subText) {
    if (!_isActive()) return false;

    // Mark the generic Hardcore path as consumed before cleanup runs. This
    // prevents any queued observer/callback from reopening ov-lose after the
    // map-failed summary has been shown.
    window._mapDefeatInProgress = true;

    if (typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();

    // If a generic defeat opened the lose overlay first, close it.
    const ovLose = document.getElementById('ov-lose');
    if (ovLose) ovLose.classList.remove('show', 'eg-map-failed');

    // Keep the run's collected gear - flush BEFORE any cleanup resets it.
    _flushRunLootToStash();
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
    if (typeof saveHubState === 'function') saveHubState();

    // Map-lost variant of the completion screen - must render BEFORE
    // _stopEncounter wipes the run arrays it snapshots.
    _showLeaveMapTransition(null, { failed: true, titleText, subText });

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('player_defeated');
    }

    globalThis.dead = true;
    _stopEncounter();
    // Guarantee quiz damage buff is cleared on map failure even if
    // _stopEncounter was suppressed.
    if (typeof _resetQuizDamageBuff === 'function') _resetQuizDamageBuff();
    if (typeof stopTimer === 'function') stopTimer();

    if (typeof _stopAvatarWalkAnimation === 'function') globalThis._stopAvatarWalkAnimation();
    if (typeof _hidePlayerAvatarSimple === 'function') globalThis._hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') globalThis._hidePlayerAvatar();
    // Ensure any lingering companion charge animation is torn down
    document.querySelectorAll('.companion-charging').forEach(el => el.classList.remove('companion-charging'));
    return true;
}

// Injects the overlay's CSS once - same pattern as _injectCurrencyStyles
// / _dndInjectStyles, so nothing needs to be added to your .css files.
export function _injectLeaveMapTransitionStyles() {
    if (document.getElementById('sx-leave-map-transition-styles')) return;
    const style = document.createElement('style');
    style.id = 'sx-leave-map-transition-styles';
    style.textContent = `
        .sx-leave-map-transition {
            display: none;
            position: fixed; inset: 0;
            z-index: 10000;
            background: rgba(5,5,15,0.92);
            align-items: center; justify-content: center;
        }
        .sx-leave-map-transition.show { display: flex; }
        .sx-leave-map-panel {
            background: #14141f;
            border: 2px solid #5555aa;
            border-radius: 10px;
            padding: 24px 32px;
            max-width: 640px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            text-align: center;
        }
        .sx-leave-map-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 16px;
            letter-spacing: .05em;
        }
        .sx-leave-map-panel.sx-leave-map-failed { border-color: #aa4455; }
        .sx-leave-map-title.sx-title-failed { color: #ff8080; }
        .sx-leave-map-subline {
            font-size: 0.85rem;
            color: #bbb;
            margin: -8px auto 10px auto;
        }
        .sx-leave-map-keep-hint {
            margin: -4px auto 16px auto;
            padding: 6px 14px;
            display: inline-block;
            font-size: 0.8rem;
            color: #9fe0a0;
            background: rgba(80, 200, 120, 0.08);
            border: 1px solid rgba(80, 200, 120, 0.45);
            border-radius: 999px;
        }
        .sx-leave-map-first-clear {
            margin: -8px auto 16px auto;
            padding: 6px 14px;
            display: inline-block;
            font-size: 0.85rem;
            font-weight: 700;
            color: #f5d98a;
            background: rgba(245, 217, 138, 0.08);
            border: 1px solid rgba(245, 217, 138, 0.55);
            border-radius: 999px;
            text-shadow: 0 0 6px rgba(245, 217, 138, 0.4);
        }
        .sx-leave-summary-section { margin-bottom: 18px; }
        .sx-leave-summary-title {
            font-size: 0.85rem;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: .08em;
            margin-bottom: 8px;
            text-align: left;
        }
        .sx-leave-summary-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            min-height: 40px;
        }
        .sx-leave-summary-empty { color: #666; font-size: 0.85rem; font-style: italic; }
        .sx-leave-summary-hint {
            font-size: 0.72rem;
            color: #777;
            text-align: left;
            margin-top: 6px;
        }
        .sx-loot-chip { cursor: pointer; }
        .sx-loot-chip:hover { filter: brightness(1.4); }
        .sx-leave-summary-chip {
            position: relative;
            width: 42px; height: 42px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 6px;
            font-size: 1.3rem;
        }
        .sx-leave-summary-chip img.sx-art-img { width: 86%; height: 86%; object-fit: contain; }
        .sx-leave-summary-chip.sx-rarity-uncommon { border-color: #2ecc71; }
        .sx-leave-summary-chip.sx-rarity-rare { border-color: #3498db; }
        .sx-leave-summary-chip.sx-rarity-epic { border-color: #9b59b6; }
        .sx-leave-summary-chip.sx-rarity-legendary { border-color: #f39c12; }
        .sx-leave-summary-chip.sx-rarity-cursed { border-color: #e74c3c; }
        .sx-leave-summary-chip.sx-rarity-artifact { border-color: #f1c40f; }
        .sx-leave-summary-chip.sx-rarity-currency { border-color: #b59248; }
        .sx-leave-summary-chip.sx-rarity-essence { border-color: #b59248; }
        .sx-leave-summary-chip.sx-rarity-gold { border-color: #f5d98a; background: rgba(245, 217, 138, 0.15); }
        .sx-leave-summary-count {
            position: absolute; bottom: 1px; right: 2px;
            font-size: 0.6rem; font-weight: 700; color: #f0e6c0;
            text-shadow: 0 0 3px #000, 0 0 6px #000;
            pointer-events: none;
        }
        .sx-leave-summary-bonus {
            position: absolute; top: -7px; right: -7px;
            width: 18px; height: 18px;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.65rem; line-height: 1;
            background: #2a2413;
            border: 1px solid #f5d98a;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(245, 217, 138, 0.55);
            pointer-events: none;
        }
        .sx-leave-summary-tooltip {
            display: none;
            position: absolute;
            bottom: 100%; left: 50%;
            transform: translateX(-50%);
            margin-bottom: 6px;
            z-index: 10001;
            white-space: normal;
        }
        .sx-leave-summary-chip:hover .sx-leave-summary-tooltip { display: block; }
        .sx-leave-map-return-btn {
            margin-top: 8px;
            padding: 10px 24px;
            font-weight: 700;
            letter-spacing: .05em;
            background: #5555aa;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
        }
        .sx-leave-map-return-btn:hover { background: #6c6cc9; }
    `;
    document.head.appendChild(style);
}