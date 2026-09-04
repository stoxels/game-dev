//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN STATE--------------------------------
//------------------------------------------------------------------------

let _egChainCurrentGi = null;
let _egChainKillCount = 0;          // total non-boss monsters killed this run
let _egChainPuzzleSolvedCount = 0;  // how many puzzles solved this run
let _egQuestionsAnswered = 0;       // how many bonus questions answered correctly this run
let _egChainTransitioning = false;
let _egChainCountdownTimer = null;
let _egMonsterSpawnCounter = 0;
let _egPuzzleCompleteFired = false;
let _egMapClearedShown = false;     // ensures the MAP CLEARED banner fires once per map
let _egBossArenaAvailableShown = false; // ensures the BOSS ARENA AVAILABLE banner fires once per map

// ── Boss arena phase ────────────────────────────────────────────────
// Bosses are no longer sprinkled into regular puzzles. Once every other
// objective is done, the player clicks "Enter Boss Arena" in the tracker.
// That ends the current puzzle and starts a chain of small boss-arena
// puzzles — one boss per arena — until every map boss is slain. Only then
// does the Complete Map button unlock.
let _egBossPhaseActive = false;     // true once the player entered the arena chain
let _egBossPhaseQueue = [];         // spawn list for the remaining arena bosses
let _egBossKilledCount = 0;         // bosses slain this run
let _egBossTotalCount = 0;          // bosses the map requires (queue length at entry)

// Bonus-loot gains accumulated since the last chain transition screen.
// Consumed (and reset) by _egBuildChainBonusGainHTML so the countdown
// overlay shows exactly what the player earned from the previous puzzle
// and quiz.
let _egPendingPuzzleBonusGain = 0;
let _egPendingQuestionBonusGain = 0;

// Accumulated bonus-loot chance for the current run (0–5). Grows with every
// solved puzzle (scaled by grid size) and every correctly answered question.
// Cap 5.0 = 500% → up to 5 guaranteed bonus items.
let _egBonusLootChance = 0;


//------------------------------------------------------------------------
//-------------------REQUIREMENTS HELPERS---------------------------------
//------------------------------------------------------------------------

// Helper functions for the map objective panel

// Reads the requirements from the original map def.
// totalMonsters: total non-boss kills needed across the whole run
// requiredPuzzles: how many puzzles must be solved
// requiredQuestions: how many bonus questions must be answered correctly
function _egGetMapRequirements() {
    const def = _egMapDef || cur;
    return {
        totalMonsters: (def && def.totalMonsters != null) ? def.totalMonsters : 0,
        requiredPuzzles: (def && def.requiredPuzzles != null) ? def.requiredPuzzles : 0,
        requiredQuestions: (def && def.requiredQuestions != null) ? def.requiredQuestions : 0,
        hasBoss: !!(def && (def.hasBoss || (def.bosses && def.bosses.length > 0))),
    };
}

// Returns true when every non-boss objective (kills, puzzles, questions)
// is satisfied. Gates the "Enter Boss Arena" button on boss maps.
function _egNonBossObjectivesComplete() {
    const req = _egGetMapRequirements();

    if (req.totalMonsters > 0 && _egChainKillCount < req.totalMonsters) return false;
    if (req.requiredPuzzles > 0 && _egChainPuzzleSolvedCount < req.requiredPuzzles) return false;
    if (req.requiredQuestions > 0 && _egQuestionsAnswered < req.requiredQuestions) return false;

    return true;
}

// Returns true when every requirement on the map is satisfied.
// On boss maps the player must additionally have entered the boss arena
// chain and slain every boss before the map can be completed.
function _egCanLeaveMap() {
    if (!_egNonBossObjectivesComplete()) return false;

    const req = _egGetMapRequirements();
    if (req.hasBoss && !_egBossDefeated()) return false;

    return true;
}

// Called from quiz.js to increment the answered-questions counter and refresh the HUD.
function _egOnQuestionAnswered() {
    if (!_egIsActive()) return;
    _egQuestionsAnswered++;
    const gain = EG_BONUS_LOOT_CHANCE_PER_QUESTION[
        Math.min(_egQuestionsAnswered - 1, EG_BONUS_LOOT_CHANCE_PER_QUESTION.length - 1)
    ];
    _egBonusLootChance = Math.min(EG_BONUS_LOOT_CHANCE_MAX, _egBonusLootChance + gain);
    _egPendingQuestionBonusGain += gain;
    _egUpdateObjectivesHUD();
    if (typeof trackAchStat === 'function') try { trackAchStat('egQuizCorrect', 1); } catch (e) {}
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE COMPLETE---------------------
//------------------------------------------------------------------------

// Skip regular STOXELS COMPLETE screen to continue with the next puzzle in the chain
function _egOnPuzzleComplete() {
    if (_egPuzzleCompleteFired) return;
    _egPuzzleCompleteFired = true;

    Audio_Manager.playSFX('win');

    _egChainPuzzleSolvedCount++;
    const gain = _egGetPuzzleBonusLootGain();
    _egBonusLootChance = Math.min(EG_BONUS_LOOT_CHANCE_MAX, _egBonusLootChance + gain);
    _egPendingPuzzleBonusGain += gain;
    _egUpdateObjectivesHUD();

    // Active map run: Blood Pact — each solved puzzle drains max life.
    if (typeof _egGetActiveMapModValue === 'function' && _egIsActive()) {
        const pactPct = _egGetActiveMapModValue('map_blood_pact');
        if (pactPct > 0) {
            const maxHP = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
            const dealt = _egPlayerTakeDamage(Math.max(1, Math.round(maxHP * pactPct / 100)), true);
            if (dealt > 0) {
                showToast(`🩸 ${t('eg_mm_toast_blood_pact') || 'Blood Pact!'} (-${dealt})`);
            }
        }
    }

    // Map fully cleared (bosses included): stay on the board so the player
    // can collect the loot lying around, then leave via Complete Map.
    // FIX: if the puzzle is completed while loot is still on the board the
    // `dead` flag set in checkWin() freezes the grid and loot becomes
    // unpickable. Instead carry the loot to the next chained puzzle so it
    // remains collectable — the Complete Map button stays available there.
    // The drop may land up to a few hundred ms after the puzzle is marked
    // solved (projectile still in flight for the last kill, or loot
    // explosion stagger), so defer the drop check to catch late spawns.
    // This covers both the boss-arena loot explosion and the regular
    // non-boss case where the last monster is slain simultaneously with
    // the final puzzle fill.
    if (_egCanLeaveMap()) {
        // Boss testing: single-arena duel — stay on the board so loot can
        // be collected, then leave via Complete Map. Never chain into
        // another puzzle (no quiz interstitial, no countdown).
        if (typeof window !== 'undefined' && window._egIsBossTestRun) return;
        setTimeout(() => {
            if (!_egIsActive() || !_egCanLeaveMap()) return;
            if (document.getElementById('eg-leave-map-overlay')) return;
            const hasPendingDrops = (_egLootDrops && _egLootDrops.size > 0)
                || (_egCurrencyDrops && _egCurrencyDrops.size > 0)
                || (_egItemDrops && _egItemDrops.size > 0)
                || (typeof _egMapDrops !== 'undefined' && _egMapDrops.size > 0)
                || (_egPickups && _egPickups.size > 0);
            const isBossFinale = _egBossPhaseActive && _egBossDefeated();
            if (hasPendingDrops || isBossFinale) {
                _egStartChainCountdown();
            }
        }, 800);
        return;
    }

    // Don't queue another puzzle if the Blood Pact (or any other
    // damage) just killed the player — _egEndMapDefeated already shows
    // the map-failed overlay. Check _egIsActive (false after defeat) and
    // player HP — do NOT check `dead` because checkWin() sets dead=true
    // on every solved puzzle, not just on death.
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && playerCurrentHP <= 0) return;

    // Boss arena chain: solving an arena puzzle while a boss is still alive
    // rolls straight into the next arena — no quiz interstitial here.
    if (_egBossPhaseActive) {
        _egScheduleArenaAdvance();
        return;
    }

    // Always automatically chain to the next puzzle, the player needs to manually leave the chain
    setTimeout(() => {
        if (typeof _egIsActive === 'function' && !_egIsActive()) return;
        if (typeof playerCurrentHP !== 'undefined' && playerCurrentHP <= 0) return;
        _egStartChainCountdown();
    }, 800);
}

function _egHasBoss() {
    const def = _egMapDef || cur;
    return !!(def.hasBoss || (def.bosses && def.bosses.length > 0));
}

function _egBossDefeated() {
    const req = _egGetMapRequirements();
    if (!req.hasBoss) return true;
    if (!_egBossPhaseActive || _egBossTotalCount === 0) return false;
    return _egBossKilledCount >= _egBossTotalCount;
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: INTERSTITIAL QUESTION--------------
//------------------------------------------------------------------------

// Shows a quiz question between puzzles. When dismissed (answered or skipped),
// calls onDone() to resume the chain countdown.
function _egShowInterstitialQuestion(onDone) {
    window._egInterstitialDone = function () {
        window._egInterstitialDone = null;
        document.getElementById('quiz-overlay').classList.remove('show');
        currentQuizQuestion = null;
        onDone();
    };

    if (typeof _egHazardsHideForQuiz === 'function') {
        try { _egHazardsHideForQuiz(); } catch (e) {}
    }

    // Don't rely on def.world — monster levels have no world property.
    // Instead build a pool from ALL worlds that have questions and pick randomly.
    const worldNum = _egPickInterstitialWorldNum();
    showQuiz(worldNum);
}



// Finds a world number that actually has questions in at least one pool.
// Tries BONUS_QUIZ_POOLS and MATH_GATE_POOLS across all worlds.
// Falls back to 1 if nothing is found (getQuizQuestion handles empty pools gracefully).
function _egPickInterstitialWorldNum() {
    const candidates = [];

    // Collect every world key that has at least one question
    const allPools = [
        typeof BONUS_QUIZ_POOLS !== 'undefined' ? BONUS_QUIZ_POOLS : {},
        typeof MATH_GATE_POOLS !== 'undefined' ? MATH_GATE_POOLS : {},
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
function _egTriggerQuestionNow() {
    if (!_egIsActive()) return;
    const req = _egGetMapRequirements();
    if (req.requiredQuestions === 0) return;
    if (_egQuestionsAnswered >= req.requiredQuestions) return;
    if (req.totalMonsters > 0 && _egChainKillCount < req.totalMonsters) return;
    if (req.requiredPuzzles > 0 && _egChainPuzzleSolvedCount < req.requiredPuzzles) return;

    showToast(t('eg_trigger_question_toast'), '#7fb8ff');
    _egShowInterstitialQuestion(() => {
        _egUpdateObjectivesHUD();
        if (typeof _egHazardsShowAfterQuiz === 'function') {
            try { _egHazardsShowAfterQuiz(); } catch (e) {}
        }
    });
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: COUNTDOWN---------------------------
//------------------------------------------------------------------------

function _egStartChainCountdown() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && playerCurrentHP <= 0) return;
    // Show the interstitial question(s) first, then begin the 3-2-1 countdown.
    // The active map's "+# additional Quiz Questions per Puzzle" mod raises
    // how many questions must be answered between two puzzles.
    const totalQuestions = (typeof _egMapQuestionsPerInterstitial === 'function')
        ? _egMapQuestionsPerInterstitial() : 1;
    let remaining = Math.max(1, totalQuestions);

    const onAllAnswered = () => {
        _egChainTransitioning = true;
        _egShowChainCountdownOverlay(3);

        let secs = 3;
        _egChainCountdownTimer = setInterval(() => {
            secs--;
            if (secs > 0) {
                _egUpdateChainCountdownOverlay(secs);
            } else {
                clearInterval(_egChainCountdownTimer);
                _egChainCountdownTimer = null;
                _egHideChainCountdownOverlay();
                _egChainTransitioning = false;
                _egLoadNextChainPuzzle();
            }
        }, 1000);
    };

    const nextQuestion = () => {
        remaining--;
        if (remaining > 0) {
            _egShowInterstitialQuestion(nextQuestion);
            return;
        }
        onAllAnswered();
    };

    _egShowInterstitialQuestion(nextQuestion);
}

function _egCancelChainCountdown() {
    if (_egChainCountdownTimer) {
        clearInterval(_egChainCountdownTimer);
        _egChainCountdownTimer = null;
    }
    _egChainTransitioning = false;
    _egHideChainCountdownOverlay();
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE LOADING---------------------
//------------------------------------------------------------------------

function _egLoadNextChainPuzzle() {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && playerCurrentHP <= 0) return;
    const nextGi = _egFindNextChainPuzzleGi();
    if (nextGi === null) {
        showToast(t('eg_no_more_puzzles'));
        return;
    }

    _egTransitionToChainPuzzle(nextGi, false);
}


// Core chain transition: swaps the current grid for the puzzle at nextGi,
 // carrying loot / currency / items / gold across and keeping monsters,
 // pickup spawner and tick loop alive. Shared by the regular puzzle chain
 // and the boss-arena chain.
function _egTransitionToChainPuzzle(nextGi, isBossArena) {
    if (typeof _egIsActive === 'function' && !_egIsActive()) return;
    if (typeof playerCurrentHP !== 'undefined' && playerCurrentHP <= 0) return;
    _egChainCurrentGi = nextGi;
    ALL[nextGi].isMonsterLevel = true;
    ALL[nextGi].isChainedPuzzle = true;
    if (isBossArena) ALL[nextGi].isBossArena = true;

    // Snapshot loot still on the grid before buildGrid() destroys the overlays
    const carriedLoot = Array.from(_egLootDrops.values());

    const carriedCurrency = Array.from(_egCurrencyDrops.values());
    _egCurrencyDrops.clear();

    const carriedItems = Array.from(_egItemDrops.values());
    _egItemDrops.clear();

    const carriedMaps = (typeof _egMapDrops !== 'undefined')
        ? Array.from(_egMapDrops.values()) : [];
    if (typeof _egMapDrops !== 'undefined') _egMapDrops.clear();

    // Clear the stale map entries — overlays are already gone after buildGrid()
    _egLootDrops.clear();

    // Discard instant-effect pickups (hearts, mistake eraser, cooldown surge).
    // They apply to the current map only and are never carried across puzzles.
    // Without this they linger as ghost entries in _egPickups (encounter stop
    // is suppressed during transitions), blocking new pickup spawns via
    // EG_PICKUP_MAX_ON_BOARD and polluting the eligibility filters below.
    _egPickups.forEach((def, key) => _egRemovePickupOverlay(key));
    _egPickups.clear();

    // Cancel every pending drop-expiry timer from the old grid. The carried
    // loot/currency/item/gold drops keep their ORIGINAL timers otherwise, and
    // since re-placement reuses the same item objects, a stale timer whose key
    // collides with the new cell would delete the freshly placed drop early.
    _egPickupTimers.forEach(t => clearTimeout(t));
    _egPickupTimers = [];
    // NOTE: _egPickupSpawnTimer is intentionally NOT cleared — the spawner's
    // recursive loop must survive the transition (_egStartEncounter is
    // suppressed for chained puzzles, so nothing would restart it).

    const savedMonsters = _egMonsters.slice();
    const savedTargetId = _egTargetId;

    window._egSuppressEncounterStop = true;
    window._egSuppressEncounterStart = true;
    // Clear per-puzzle passive flags before starting the next puzzle so we can
    // detect whether _doStartLevel actually fired them.
    window._egPassiveAppliedForGi = null;
    window._egClassPassiveAppliedForGi = null;
    _doStartLevel(nextGi);
    window._egSuppressEncounterStop = false;
    window._egSuppressEncounterStart = false;

    // Hardened guarantee: every chained puzzle must re-trigger
    // auto-reveal / auto-mark passives, Syla's forest affinity and class
    // passives. _doStartLevel already calls these, but if a future change
    // gates them behind _egSuppressEncounterStop they would be missed.
    // Re-apply only when the flag shows they did NOT fire for this Gi.
    if (window._egPassiveAppliedForGi !== nextGi) {
        if (typeof _applyPassiveStartEffects === 'function') _applyPassiveStartEffects();
        if (typeof _applySylaForestAffinity === 'function') _applySylaForestAffinity();
        window._egPassiveAppliedForGi = nextGi;
    }
    // Class passives are delayed (Probabilist Bayesian Insight uses 300ms
    // setTimeout) — verify after that window and re-fire if missed. The
    // re-fire is safe: _applyProbabilistPassive guards internally.
    // Classless: never re-apply any class passive, even on chain puzzles.
    setTimeout(() => {
        if (typeof isClassless === 'function' && isClassless()) return;
        if (window._egClassPassiveAppliedForGi !== nextGi && typeof applyClassPassiveOnLevelStart === 'function') {
            // Note: applyClassPassiveOnLevelStart resets class level state;
            // calling it a second time would wipe the just-applied shield.
            // Only re-apply the probabilist branch which is safe to repeat.
            if (STATE.playerClass === 'probabilist' && typeof _applyProbabilistPassive === 'function') {
                const eff = (typeof _getPassiveEffect === 'function') ? _getPassiveEffect() : { autoMarkCount: 0 };
                if (eff && eff.autoMarkCount) _applyProbabilistPassive(eff);
            }
            window._egClassPassiveAppliedForGi = nextGi;
        }
    }, 350);

    _egMonsters = savedMonsters;
    _egTargetId = savedTargetId;
    _egEncounterActive = true;
    _egPuzzleCompleteFired = false;

    _egRenderPanel();
    // Flush any start-of-puzzle reveals that were queued while the grid rebuilt
    if (typeof _egFlushPendingRevealProjectiles === 'function') {
        setTimeout(() => _egFlushPendingRevealProjectiles(), 150);
    }
    _egUpdateObjectivesHUD();

    // Re-place carried loot after the new grid DOM is fully built
    if (carriedLoot.length > 0) {
        setTimeout(() => _egReplaceCarriedLootDrops(carriedLoot), 400);
    }

    if (carriedCurrency.length > 0) {                                 // ← add
        setTimeout(() => _egReplaceCarriedCurrencyDrops(carriedCurrency), 400); // ← add
    }

    if (carriedItems.length > 0) {
        setTimeout(() => _egReplaceCarriedItemDrops(carriedItems), 400);
    }

    if (carriedMaps.length > 0 && typeof _egReplaceCarriedMapDrops === 'function') {
        setTimeout(() => _egReplaceCarriedMapDrops(carriedMaps), 400);
    }

    if (typeof _egHazardsShowAfterQuiz === 'function') {
        try { _egHazardsShowAfterQuiz(); } catch (e) {}
    }
}


//------------------------------------------------------------------------
//-------------------BOSS ARENA CHAIN-------------------------------------
//------------------------------------------------------------------------

// Max grid dimensions for boss-arena puzzles — kept small so the fight
// feels tight and focused.
const EG_BOSS_ARENA_MAX_ROWS = 15;
const EG_BOSS_ARENA_MAX_COLS = 25;


// Called by the "Enter Boss Arena" button in the objective tracker.
// Ends the current puzzle and starts the chain of boss-arena puzzles:
// one arena per remaining map boss, until every boss is slain.
function _egEnterBossArena() {
    if (!_egIsActive()) return;
    if (_egBossPhaseActive || _egBossDefeated()) return;
    if (!_egNonBossObjectivesComplete()) {
        showToast(t('eg_objectives_incomplete'));
        return;
    }

    // Roll the full roster of bosses for this map up front.
    const baseLevel = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;
    let queue = _egBuildBossSpawnListFromDef(_egMapDef, baseLevel);

    if (queue.length === 0) {
        // Map claims hasBoss but defines no list — pick a random boss.
        const allBossDefs = Object.values(EG_BOSS_DEFS);
        if (allBossDefs.length > 0) {
            const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
            queue = [{ id: picked.id, level: _egRollMonsterLevel(baseLevel), isBossSpawn: true }];
        }
    }

    if (queue.length === 0) return;

    _egBossPhaseQueue = queue;
    _egBossTotalCount = queue.length;
    _egBossKilledCount = 0;
    _egBossPhaseActive = true;

    // Dismiss the "available" banner if still visible — arena is now entered
    const availBanner = document.getElementById('eg-boss-arena-available-banner');
    if (availBanner) availBanner.remove();

    showToast(t('eg_boss_arena_entered'), '#f5d98a');
    _egUpdateObjectivesHUD();

    _egAdvanceBossArena();
}

// Picks the puzzle for a boss arena. For atlas regions the arena board is
// part of the region's blueprint: seeded from the chain seed + boss index,
// so the same map always fights its boss on the same (comfortably sized,
// never trivially small) grid. Boss puzzles stay small enough that the
// fight stays readable — capped by EG_BOSS_ARENA_MAX_ROWS/COLS and floored
// at EG_BOSS_ARENA_MIN_CELLS so the arena is never a trivial 1-liner.
const EG_BOSS_ARENA_MIN_CELLS = 36;

function _egFindBossArenaPuzzleGi() {
    const activeDef = _egMapDef || cur;
    const pool = (activeDef.puzzlePool && typeof activeDef.puzzlePool === 'object')
        ? activeDef.puzzlePool : {};

    if (typeof _egCreateGeneratedLevel === 'function') {
        const rng = (pool.chainSeed != null && typeof egAtlasMakeRng === 'function')
            ? egAtlasMakeRng((((pool.chainSeed ^ 0x9E3779B9) >>> 0) + (_egBossKilledCount * 7919)) >>> 0)
            : null;
        const gi = _egCreateGeneratedLevel({
            mode: pool.genMode || 'mixed',
            tier: pool.genTier || 1,
            maxRows: EG_BOSS_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_ARENA_MAX_COLS,
            minCells: EG_BOSS_ARENA_MIN_CELLS,
            rng,
        });
        if (gi !== null) {
            _egTrackChainRecentGi(gi);
            return gi;
        }
    }

    return _egPickStoryChainPuzzleGi({
        maxRows: EG_BOSS_ARENA_MAX_ROWS,
        maxCols: EG_BOSS_ARENA_MAX_COLS,
        recentWindow: 8,
    });
}

// Loads the next arena puzzle and spawns its boss. No-op once every boss
// of the map is dead — the player stays on the board to collect loot.
function _egAdvanceBossArena() {
    if (!_egBossPhaseActive || !_egIsActive()) return;
    if (_egBossDefeated()) return;   // all bosses dead → stay & collect

    const nextGi = _egFindBossArenaPuzzleGi();
    if (nextGi === null) {
        showToast(t('eg_no_more_puzzles'));
        return;
    }

    _egTransitionToChainPuzzle(nextGi, true);
    _egSpawnNextArenaBoss();
}

// Single-flight scheduler for arena advances. A boss dying and the player
// solving the arena grid can fire at nearly the same time — without this
// guard the chain would roll two arenas and duplicate the next boss.
let _egArenaAdvanceTimer = null;

function _egScheduleArenaAdvance() {
    if (_egArenaAdvanceTimer) return;
    _egArenaAdvanceTimer = setTimeout(() => {
        _egArenaAdvanceTimer = null;
        if (typeof _gamePaused !== 'undefined' && _gamePaused) {
            // Paused — retry after pause lifts instead of rolling the arena behind the overlay
            const retry = setInterval(() => {
                if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
                clearInterval(retry);
                if (_egIsActive()) _egAdvanceBossArena();
            }, 200);
            return;
        }
        if (_egIsActive()) _egAdvanceBossArena();
    }, EG_BOSS_SPAWN_DELAY_MS);
}

// Spawns the next queued boss into the current arena with a dramatic delay.
function _egSpawnNextArenaBoss() {
    if (!_egBossPhaseActive || !_egIsActive()) return;

    // Boss arena chain: solving an arena puzzle while the boss is still alive
    // carries the SAME boss to the next grid — do NOT spawn a duplicate
    // (that bug made arena maps impossible to finish). Only spawn when no
    // living boss remains (i.e. the previous boss was just slain).
    if (_egMonsters.some(m => m.isBoss)) return;

    const entry = _egBossPhaseQueue[_egBossKilledCount];
    if (!entry) return;

    const def = EG_BOSS_DEFS[entry.id];
    const name = def ? def.name : entry.id;

    setTimeout(() => {
        if (!_egIsActive()) return;
        if (typeof _gamePaused !== 'undefined' && _gamePaused) {
            // Game is paused — retry after pause instead of spawning behind the overlay
            const retry = setInterval(() => {
                if (typeof _gamePaused !== 'undefined' && _gamePaused) return;
                clearInterval(retry);
                if (!_egIsActive()) return;
                if (_egMonsters.some(m => m.isBoss)) return;
                showToast(t('eg_boss_arrived').replace('{name}', name), '#f87171');
                _egSpawnMonster(entry.id, entry.level || 1, entry.hpMult || 1);
                _egUpdateObjectivesHUD();
            }, 200);
            return;
        }
        if (_egMonsters.some(m => m.isBoss)) return;
        showToast(t('eg_boss_arrived').replace('{name}', name), '#f87171');
        _egSpawnMonster(entry.id, entry.level || 1, entry.hpMult || 1);
        _egUpdateObjectivesHUD();
    }, EG_BOSS_SPAWN_DELAY_MS);
}

// Called when the LAST map boss dies: loot explosion! Rains a pile of
// equipment, currency and gold onto the arena grid as the run's grand
// finale — then flips the tracker to Complete Map mode.
function _egOnAllBossesDead() {
    const level = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;

    if (typeof _egSpawnLootExplosion === 'function') {
        _egSpawnLootExplosion(level);
    } else {
        // Fallback if grid-pickups ever loses the explosion spawner
        for (let i = 0; i < 3; i++) {
            if (typeof _egSpawnLootDrop === 'function') _egSpawnLootDrop(true, level);
        }
        if (typeof _egTryDropCurrency === 'function') _egTryDropCurrency(true);
    }

    showToast(t('eg_boss_all_slain'), '#4ade80');

}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE POOL CRITERIA---------------
//------------------------------------------------------------------------

let _egChainRecentGis = [];

// ── Encounter-chain size caps (playability) ──────────────────────────
// 15×30 is the widest comfortable map; 20 rows is allowed only when
// columns stay ≤20. Anything beyond those on either axis, or tall+wide
// (>15 rows && >20 cols), is too large for a fun chain step.
const EG_CHAIN_MAX_ROWS = 20;
const EG_CHAIN_MAX_COLS = 30;
const EG_CHAIN_TALL_ROW_THRESHOLD = 15;
const EG_CHAIN_MAX_COLS_WHEN_TALL = 20;

function _egChainPuzzleSizeAllowed(rows, cols) {
    if (rows > EG_CHAIN_MAX_ROWS || cols > EG_CHAIN_MAX_COLS) return false;
    if (rows > EG_CHAIN_TALL_ROW_THRESHOLD && cols > EG_CHAIN_MAX_COLS_WHEN_TALL) return false;
    return true;
}

function _egPuzzlePassesCriteria(level, criteria) {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cells = rows * cols;

    // Global encounter-chain cap: keep chains fun, never pick mega grids.
    if (!_egChainPuzzleSizeAllowed(rows, cols)) return false;

    if (criteria.minCells != null && cells < criteria.minCells) return false;
    if (criteria.maxCells != null && cells > criteria.maxCells) return false;
    if (criteria.minRows != null && rows < criteria.minRows) return false;
    if (criteria.maxRows != null && rows > criteria.maxRows) return false;
    if (criteria.minCols != null && cols < criteria.minCols) return false;
    if (criteria.maxCols != null && cols > criteria.maxCols) return false;

    if (criteria.worlds != null && !criteria.worlds.includes(level.world)) return false;
    if (criteria.excludeWorlds != null && criteria.excludeWorlds.includes(level.world)) return false;

    return true;
}

function _egBuildChainPool(criteria) {
    const avoidRecent = criteria.avoidRecent !== false;
    const window = criteria.recentWindow || 8;

    let pool = ALL.filter(level =>
        !level.isEndgameSandbox &&
        !level.isGeneratedPuzzle &&  // generated levels are launched directly
        !level.requiredKills &&
        !level.totalMonsters &&      // also exclude other map-starter levels
        !(typeof isGatedLevel === 'function' && isGatedLevel(level.gIdx)) &&  // math gates are campaign-only
        _egPuzzlePassesCriteria(level, criteria)
    );

    if (avoidRecent && pool.length > _egChainRecentGis.length) {
        const filtered = pool.filter(level => !_egChainRecentGis.includes(level.gIdx));
        if (filtered.length > 0) pool = filtered;
    }

    return pool;
}

// Picks from the pool; an optional seeded PRNG (chain blueprints) makes
// the pick deterministic for a given pool state.
function _egPickFromPool(pool, recentWindow, rng) {
    const R = rng || Math.random;
    const picked = pool[Math.floor(R() * pool.length)];
    _egChainRecentGis.push(picked.gIdx);
    if (_egChainRecentGis.length > (recentWindow || 8)) _egChainRecentGis.shift();
    return picked.gIdx;
}

function _egTrackChainRecentGi(gi, recentWindow) {
    _egChainRecentGis.push(gi);
    if (_egChainRecentGis.length > (recentWindow || 8)) {
        _egChainRecentGis.shift();
    }
}

// Picks from the story pool honouring the given criteria; relaxes pure
// size filters when nothing qualifies so the chain never stalls.
// `rng` (optional seeded PRNG) makes the pick deterministic.
function _egPickStoryChainPuzzleGi(criteria, rng) {
    let pool = _egBuildChainPool(criteria);

    if (pool.length === 0 && (criteria.minCells != null || criteria.maxCells != null)) {
        pool = _egBuildChainPool({ ...criteria, minCells: null, maxCells: null });
    }

    if (pool.length === 0) return null;
    return _egPickFromPool(pool, criteria.recentWindow, rng);
}

// Clones the chain criteria with a grid-size bucket's cell window applied.
function _egBucketCriteria(criteria, bucket) {
    const range = (typeof EG_GRID_SIZE_BUCKETS !== 'undefined')
        ? EG_GRID_SIZE_BUCKETS[bucket] : null;
    const c = { ...criteria };
    if (range) {
        c.minCells = Math.max(criteria.minCells || 0, range[0]);
        c.maxCells = range[1] === Infinity ? null : range[1];
    }
    return c;
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
function _egPickMapRunPuzzleGi(criteria) {
    const canGenerate = typeof _egCreateGeneratedLevel === 'function';
    const generate = opts => {
        if (!canGenerate) return null;
        return _egCreateGeneratedLevel(opts);
    };

    const plan = Array.isArray(criteria.plan) ? criteria.plan : [];
    const hasBlueprint = plan.length > 0 && criteria.chainSeed != null;

    // ── Deterministic blueprint pull ──────────────────────────────────
    if (hasBlueprint) {
        criteria._planIdx = criteria._planIdx || 0;
        const stepIdx = criteria._planIdx++;
        const source = plan[stepIdx % plan.length] || 'gen';

        // Grid-size bucket for this step (region's size mix, consumed in
        // order — same queue every run of this region).
        const queue = Array.isArray(criteria.sizeQueue) ? criteria.sizeQueue : [];
        const bucket = queue.length > 0 ? queue.shift() : null;
        const stepCriteria = bucket ? _egBucketCriteria(criteria, bucket) : criteria;

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
            if (gi !== null) { _egTrackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        const storyGi = _egPickStoryChainPuzzleGi(stepCriteria, storyRng);
        if (storyGi !== null) return storyGi;

        if (source === 'story') {
            const gi = generate({
                mode: criteria.genMode,
                tier: criteria.genTier,
                minCells: stepCriteria.minCells,
                bucket,
                rng: genRng,
            });
            if (gi !== null) { _egTrackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        // Neither source satisfied this step — take any puzzle instead.
        console.warn('EG chain: blueprint step unsatisfiable, using any puzzle:', source, bucket);
        return _egPickStoryChainPuzzleGi(criteria, storyRng);
    }

    // ── Legacy random pull (no size mix / no blueprint) ──────────────
    const queue = Array.isArray(criteria.sizeQueue) ? criteria.sizeQueue : [];
    if (queue.length > 0) {
        const bucket = queue.shift();   // consumed — shrinks as the run progresses
        const bucketCriteria = _egBucketCriteria(criteria, bucket);

        // Coin flip which source leads; the other one is the fallback.
        const genFirst = Math.random() < 0.5;

        if (genFirst) {
            const gi = generate({ mode: criteria.genMode, tier: criteria.genTier, minCells: bucketCriteria.minCells, bucket });
            if (gi !== null) { _egTrackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        const storyGi = _egPickStoryChainPuzzleGi(bucketCriteria);
        if (storyGi !== null) return storyGi;

        if (!genFirst) {
            const gi = generate({ mode: criteria.genMode, tier: criteria.genTier, minCells: bucketCriteria.minCells, bucket });
            if (gi !== null) { _egTrackChainRecentGi(gi, criteria.recentWindow); return gi; }
        }

        // Neither source had this bucket — take any puzzle instead.
        console.warn('EG chain: size bucket unsatisfiable, using any puzzle:', bucket);
        return _egPickStoryChainPuzzleGi(criteria);
    }

    if (criteria.generated) {
        const gi = generate({
            mode: criteria.genMode,
            tier: criteria.genTier,
            minCells: criteria.minCells,
        });
        if (gi !== null) { _egTrackChainRecentGi(gi, criteria.recentWindow); return gi; }
        console.warn('EG chain: puzzle generation failed, falling back to story pool');
    }

    return _egPickStoryChainPuzzleGi(criteria);
}

function _egFindNextChainPuzzleGi() {
    const activeDef = _egMapDef || cur;
    const criteria = (activeDef.puzzlePool && typeof activeDef.puzzlePool === 'object')
        ? activeDef.puzzlePool : {};

    return _egPickMapRunPuzzleGi(criteria);
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: MAP END (voluntary)----------------
//------------------------------------------------------------------------

// Chance-based bonus equipment loot when completing a map (cap 500% = up to 5 items).
// The chance scales with the grid size of each solved puzzle and with
// correct quiz answers this run:
//   puzzles: small +10%, normal +25%, large +50%, massive +75%
//   quiz:    +33% / +33% / +34% per correct answer (repeating +34% after three)
const EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE = {
    small: 0.10,
    medium: 0.25,
    large: 0.50,
    massive: 0.75,
};
const EG_BONUS_LOOT_CHANCE_PER_QUESTION = [0.33, 0.33, 0.34];
const EG_BONUS_LOOT_CHANCE_MAX = 5.0;

// Returns the bonus-loot gain (0–1) for solving a puzzle, based on how many
// cells the puzzle's grid has (same buckets as _gridSizeBucket in quests-stats.js).
function _egGetPuzzleBonusLootGain() {
    const rows = cur ? cur.grid.length : 0;
    const cols = cur && cur.grid[0] ? cur.grid[0].length : 0;
    const cells = rows * cols;
    if (cells >= 400) return EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE.massive;
    if (cells >= 200) return EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE.large;
    if (cells >= 100) return EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE.medium;
    return EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE.small;
}

// Returns the current bonus-loot drop chance (0–5) for this run.
function _egGetBonusLootChance() {
    return Math.min(EG_BONUS_LOOT_CHANCE_MAX, _egBonusLootChance);
}

// Rolls for up to 5 bonus equipment items on map completion (cap 500%).
// For total chance C (0–5): floor(C) items are guaranteed, and the
// fractional remainder is a chance for one extra item. E.g. 3.5 → 3
// guaranteed + 50% chance for a 4th. Items are pushed into _egRunLoot so
// they flow through the normal flush-to-stash and leave-map summary paths.
// Must be called BEFORE _egShowLeaveMapTransition() and before cleanup.
function _egRollBonusMapLoot() {
    if (typeof _egGenerateEquipmentDrop !== 'function') return;
    const totalChance = _egGetBonusLootChance();
    if (totalChance <= 0) return;

    const guaranteed = Math.floor(totalChance);
    const remainder = totalChance - guaranteed;

    const baseLevel = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;

    let rolls = guaranteed;
    if (remainder > 0 && Math.random() < remainder) rolls += 1;

    for (let i = 0; i < rolls; i++) {
        const item = _egGenerateEquipmentDrop(baseLevel);
        if (!item) continue;

        // Flag the drop so the leave-map summary can visually mark it (🎁 badge
        // on the chip + "Bonus Loot" line in its tooltip) as the bonus item.
        item.isBonusLoot = true;

        // ── Loot filter ── bonus loot obeys the same auto-vendor rules as
        // normal pickups: rule-matching items are destroyed for a rolled
        // shard (mirrored into the summary's runes & orbs row by the filter)
        // and never reach the run loot bag. A filter failure keeps the item
        // (defensive — same policy as the pickup claim hook).
        if (typeof _egLootFilterAutoVendor === 'function') {
            let vendored = false;
            try { vendored = _egLootFilterAutoVendor(item); } catch (e) { vendored = false; }
            if (vendored) continue;
        }

        _egRunLoot.push(item);
        showToast(t('eg_bonus_loot')
            .replace('{icon}', item.icon || '')
            .replace('{name}', item.name), _egRarityToastColor(item.rarity));
    }
}

// Grants the active map's rolled completion reward (2–10× one higher-grade
// orb or essence). Adds it to the real currency/essence stash AND to
// _egRunCurrency / _egRunEssences so it shows up in the correct section of the
// leave-map transition screen. Must run BEFORE _egShowLeaveMapTransition()
// renders the summary and before cleanup clears _egActiveMapItem /
// _egRunCurrency.
function _egGrantMapCompletionReward() {
    const mapItem = (typeof _egActiveMapItem !== 'undefined') ? _egActiveMapItem : null;
    const reward = mapItem && mapItem.implicits && mapItem.implicits.completionReward;
    if (!reward || !reward.count) return;

    const def = (typeof _egGetCompletionRewardDef === 'function')
        ? _egGetCompletionRewardDef(reward.id) : null;
    if (!def) return;

    // Essences stack in the essence tab, orbs in the runes & orbs stash.
    const added = def.category === 'essence'
        ? egAddEssence(def.id, reward.count, def)
        : egAddCurrency(def.id, reward.count, def);
    if (!added) showToast(t('eg_map_stash_full'));

    // Mirror into the transition screen's list (aggregated by id).
    // Essences must go to the essence section, orbs/shards to the orbs section.
    const isEssenceReward = def.category === 'essence' || (def.id && def.id.indexOf('essence_') === 0);
    const targetList = isEssenceReward ? _egRunEssences : _egRunCurrency;
    const existing = targetList.find(e => e.id === def.id);
    if (existing) existing.count += reward.count;
    else targetList.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        description: def.description,
        count: reward.count,
    });

    showToast(t('eg_map_reward_granted')
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
    if (typeof egGetGold === 'function' && typeof _egAddGold === 'function') {
        _egAddGold(goldAmount);
        showToast(t('eg_map_gold_reward').replace('{n}', goldAmount), '#f5d98a');
    }
}

// Builds the hover-tooltip body for the bonus-loot chance label in the
// corner HUD: explains what bonus loot is and shows the current chance.
function _egBuildBonusLootTooltipHTML() {
    const pct = Math.round(_egGetBonusLootChance() * 100);

    let html = `<strong style="color:#f5d98a">${t('eg_bonus_chance_title')}</strong>`;
    html += `<br>${t('eg_bonus_loot_tooltip')}`;
    html += `<br>${t('eg_bonus_current').replace('{p}', pct)}`;
    return html;
}

// Wires hover tooltip onto the static #eg-bonus-loot-chance element
// (same pattern as the mistake-counter / timer tooltips in tooltips-hud.js).
function _egBindBonusLootHUDTooltip(el) {
    if (!el || el.dataset.bonusTooltipBound) return;
    el.dataset.bonusTooltipBound = '1';
    el.addEventListener('mouseenter', (e) => showGameTooltip(_egBuildBonusLootTooltipHTML(), e));
    el.addEventListener('mousemove', moveGameTooltip);
    el.addEventListener('mouseleave', hideGameTooltip);
}

// Shows/hides the bonus-loot chance label under the FILL button in the
// top-left corner HUD and refreshes its percentage text.
function _egUpdateBonusLootHUD() {
    const el = document.getElementById('eg-bonus-loot-chance');
    if (!el) return;

    if (!_egIsActive()) {
        el.classList.add('hidden');
        return;
    }

    const pct = Math.round(_egGetBonusLootChance() * 100);
    const val = document.getElementById('eg-bonus-loot-chance-val');
    if (val) val.textContent = t('eg_bonus_chance').replace('{p}', pct);
    _egBindBonusLootHUDTooltip(el);
    el.classList.remove('hidden');
}

// Builds the "bonus loot gained from the last puzzle/quiz" line shown in
// the chain countdown transition. Returns '' when nothing was gained, so
// the overlay stays clean on the first transition of a run.
function _egBuildChainBonusGainHTML() {
    const puzzleGain = Math.round(_egPendingPuzzleBonusGain * 100);
    const quizGain = Math.round(_egPendingQuestionBonusGain * 100);
    // Reward (damage buff / heal / mana) granted by the last correct answer
    const quizRewardLine = (typeof _egConsumePendingQuizRewardHTML === 'function')
        ? _egConsumePendingQuizRewardHTML() : '';

    // Consume the pending gains — they describe only the previous segment.
    _egPendingPuzzleBonusGain = 0;
    _egPendingQuestionBonusGain = 0;

    if (puzzleGain <= 0 && quizGain <= 0 && !quizRewardLine) return '';

    const parts = [];
    if (puzzleGain > 0) parts.push(`<span style="color:#7fd67f">+${puzzleGain}%</span> ${t('eg_bonus_src_puzzle')}`);
    if (quizGain > 0) parts.push(`<span style="color:#7fb8ff">+${quizGain}%</span> ${t('eg_bonus_src_quiz')}`);

    const total = Math.round(_egGetBonusLootChance() * 100);
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

// Called only by the Leave Map button after _egCanLeaveMap() returns true.
// Called only by the Leave Map button after _egCanLeaveMap() returns true.
function _egEndMap() {
    if (!_egEncounterActive) return;
    _egCancelChainCountdown();

    if (typeof clearActiveRandomWalkers === 'function') clearActiveRandomWalkers();

    // Roll for completion bonus loot first — it must land in _egRunLoot
    // before the transition overlay renders its summary.
    _egRollBonusMapLoot();

    // Grant the map's rolled currency completion reward — it must land in
    // the stash and in _egRunCurrency before the summary renders.
    _egGrantMapCompletionReward();

    // Atlas: mark this run's region as cleared and unlock its connected
    // regions (see endgame-atlas.js). Must run before _egChainCleanup
    // clears _egActiveMapItem. The result tells the win screen whether
    // this was the very first clear of this atlas region.
    const atlasResult = (typeof _egAtlasOnMapCompleted === 'function')
        ? _egAtlasOnMapCompleted(_egActiveMapItem)
        : null;

    // Endgame achievements — map completion
    if (typeof trackAchStat === 'function') try {
        trackAchStat('egMapsCompleted', 1);
        const _egMapTierForAch = (_egActiveMapItem && _egActiveMapItem.mapTier) || (_egMapDef && _egMapDef.mapTier) || 0;
        if (_egMapTierForAch >= 16) trackAchStat('egMapsT16Completed', 1);
        const _egModsForAch = (_egActiveMapItem && Array.isArray(_egActiveMapItem.mods) ? _egActiveMapItem.mods : []);
        if (_egModsForAch.length >= 4) trackAchStat('egMapsHeavilyModded', 1);
        const _egHasHazardAch = _egModsForAch.some(function(m){ return m && m.familyId && String(m.familyId).indexOf('map_hazard_') === 0; });
        if (_egHasHazardAch) trackAchStat('egMapsHazardCompleted', 1);
        // Flawless: 0 mistakes made during the entire map run
        const _egMistakesForAch = (typeof mistakeCount !== 'undefined') ? mistakeCount : 999;
        // Use per-map mistake limit tracking: flawless means mistakeCount didn't increase from start of map
        // We approximate via global mistakeCount == 0 at time of completion check (common case for testing)
        // More accurately, check if mistakeCount still within snapshot — but for achievements we require 0 total mistakes freshly
        // So we check if no mistakes in this session: use _egChainPuzzleSolvedCount hasn't had mistakes.
        // Fallback: if global mistakeCount is 0, count as flawless
        if (_egMistakesForAch === 0) trackAchStat('egMapsFlawless', 1);
    } catch(e){}

    // Show the overlay FIRST — it sits above the puzzle grid with normal
    // pointer-events, so it blocks every further click the instant this
    // runs, before any of the cleanup below happens.
    _egShowLeaveMapTransition(atlasResult);

    _egFlushRunLootToStash();
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
    egSaveHubState();
    _egStopEncounter();
    // Guarantee quiz damage buff is cleared on voluntary map exit even if
    // _egStopEncounter was suppressed (e.g. forfeit during chain transition).
    if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();

    // Stop the puzzle timer too — otherwise it keeps running behind the
    // overlay and could trigger a time's-up loss while reading the summary.
    if (typeof stopTimer === 'function') stopTimer();

    if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar();
}


// Called by the Leave Map button in the HUD.
function _egTryLeaveMap() {
    if (!_egCanLeaveMap()) {
        showToast(t('eg_objectives_incomplete'));
        return;
    }
    _egEndMap();
}


//------------------------------------------------------------------------
//-------------------OBJECTIVES HUD---------------------------------------
//------------------------------------------------------------------------

// Helper: total bosses required for this map (for HUD display).
function _egGetBossTotalForHUD() {
    if (_egBossTotalCount > 0) return _egBossTotalCount;
    const def = _egMapDef || cur;
    if (!def) return 0;
    if (def.bosses && def.bosses.length > 0) {
        const cap = (def.maxBosses != null && def.maxBosses > 0) ? def.maxBosses : def.bosses.length;
        return Math.min(def.bosses.length, cap);
    }
    if (def.hasBoss) return (def.maxBosses != null && def.maxBosses > 0) ? def.maxBosses : 1;
    return 0;
}

function _egUpdateObjectivesHUD() {
    const strip = document.getElementById('eg-objectives-strip');
    if (!strip) return;

    if (!_egIsActive()) {
        strip.classList.add('eg-hidden');
        _egUpdateBonusLootHUD();
        if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) PassiveTracker.refreshVisibility();
        return;
    }

    strip.classList.remove('eg-hidden');
    _egUpdateBonusLootHUD();
    // Enforce passive tracker hide during endgame if setting enabled
    if (typeof PassiveTracker !== 'undefined' && PassiveTracker.refreshVisibility) PassiveTracker.refreshVisibility();

    const req = _egGetMapRequirements();

    // Build shrinking single-line segments — finished objectives are omitted.
    const segs = [];

    if (req.totalMonsters > 0) {
        const count = Math.min(_egChainKillCount, req.totalMonsters);
        if (count < req.totalMonsters) {
            segs.push(`<span class="eg-obj-seg"><span class="eg-obj-seg-val">${count} / ${req.totalMonsters}</span> <span class="eg-obj-seg-label">Monsters</span></span>`);
        }
    }
    if (req.requiredPuzzles > 0) {
        const count = Math.min(_egChainPuzzleSolvedCount, req.requiredPuzzles);
        if (count < req.requiredPuzzles) {
            segs.push(`<span class="eg-obj-seg"><span class="eg-obj-seg-val">${count} / ${req.requiredPuzzles}</span> <span class="eg-obj-seg-label">Puzzles</span></span>`);
        }
    }
    if (req.requiredQuestions > 0) {
        const count = Math.min(_egQuestionsAnswered, req.requiredQuestions);
        if (count < req.requiredQuestions) {
            segs.push(`<span class="eg-obj-seg"><span class="eg-obj-seg-val">${count} / ${req.requiredQuestions}</span> <span class="eg-obj-seg-label">Questions</span></span>`);
        }
    }
    if (req.hasBoss && !_egBossDefeated()) {
        const bossTotal = _egGetBossTotalForHUD();
        const bossCount = Math.min(_egBossKilledCount, bossTotal || 1);
        // Show boss progress even before arena entry; hide only when all bosses slain.
        if (bossTotal > 0) {
            segs.push(`<span class="eg-obj-seg"><span class="eg-obj-seg-val">${bossCount} / ${bossTotal}</span> <span class="eg-obj-seg-label">Bosses</span></span>`);
        }
    }

    const canLeave = _egCanLeaveMap();
    const othersDone = _egNonBossObjectivesComplete();
    const monstersDone = req.totalMonsters === 0 || _egChainKillCount >= req.totalMonsters;
    const puzzlesDone = req.requiredPuzzles === 0 || _egChainPuzzleSolvedCount >= req.requiredPuzzles;
    const questionsRemain = req.requiredQuestions > 0 && _egQuestionsAnswered < req.requiredQuestions;
    const nonQuestionObjectivesDone = monstersDone && puzzlesDone;

    // Action button logic — top-center, only when actionable:
    //   boss map + non-boss done + not in arena → Enter Boss Arena
    //   all objectives done                       → Complete Map (highlighted)
    //   non-question objectives done + questions remain → Trigger Question
    //     (also on boss maps when only questions + boss remain, since the
    //      boss arena is gated behind questions and would otherwise never show)
    //   otherwise                                 → no button (just the line)
    let actionHTML = '';
    if (req.hasBoss && !_egBossDefeated()) {
        if (!_egBossPhaseActive && othersDone) {
            actionHTML = `<button class="eg-obj-action-btn eg-obj-action-boss" onclick="_egEnterBossArena()">${t('eg_enter_boss_arena')}</button>`;
        } else if (questionsRemain && nonQuestionObjectivesDone) {
            actionHTML = `<button class="eg-obj-action-btn eg-obj-action-question" onclick="_egTriggerQuestionNow()">${t('eg_trigger_question')}</button>`;
        }
    } else if (canLeave) {
        actionHTML = `<button class="eg-obj-action-btn eg-obj-action-complete" onclick="_egTryLeaveMap()">${t('eg_complete_map')}</button>`;
    } else if (questionsRemain && nonQuestionObjectivesDone) {
        actionHTML = `<button class="eg-obj-action-btn eg-obj-action-question" onclick="_egTriggerQuestionNow()">${t('eg_trigger_question')}</button>`;
    }

    // First time boss arena becomes available (non-boss done, boss not yet defeated): banner + toast.
    if (req.hasBoss && !_egBossDefeated() && !_egBossPhaseActive && othersDone && !_egBossArenaAvailableShown) {
        _egBossArenaAvailableShown = true;
        _egShowBossArenaAvailableBanner();
        showToast(t('eg_boss_arena_available_toast'), '#f87171');
    }

    // First time all objectives are complete: big green banner + toast.
    if (canLeave && !_egMapClearedShown) {
        _egMapClearedShown = true;
        _egShowMapClearedBanner();
        showToast(t('eg_map_cleared_toast'), '#4ade80');
    }

    // Render: single pill line (if any segments remain) + optional action button.
    const lineHTML = segs.length > 0 ? `<div class="eg-obj-line">${segs.join('')}</div>` : '';
    const actionsHTML = actionHTML ? `<div class="eg-obj-actions">${actionHTML}</div>` : '';

    // Hide strip entirely when nothing to show (no segs and no button) — avoids empty pill.
    if (!lineHTML && !actionsHTML) {
        strip.innerHTML = '';
        strip.classList.add('eg-hidden');
        return;
    }

    strip.innerHTML = `${lineHTML}${actionsHTML}`;
}

// Shows a big green "MAP CLEARED" text centered over the puzzle grid for
// 3 seconds. Purely cosmetic — pointer-events are disabled via CSS.
function _egShowMapClearedBanner() {
    if (typeof _egClearCenterGridBanners === 'function') _egClearCenterGridBanners('eg-map-cleared-banner');
    const old = document.getElementById('eg-map-cleared-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-map-cleared-banner';
    el.textContent = t('eg_map_cleared');
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
function _egShowBossArenaAvailableBanner() {
    if (typeof _egClearCenterGridBanners === 'function') _egClearCenterGridBanners('eg-boss-arena-available-banner');
    const old = document.getElementById('eg-boss-arena-available-banner');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'eg-boss-arena-available-banner';
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
// Top-center tracker is no longer draggable/collapsible — stubs kept for
// backward compatibility so old saved state does not throw.

const EG_OBJ_STRIP_STORAGE_KEY = 'eg_objectives_strip_state';
function _egLoadObjectivesStripState() { return null; }
function _egSaveObjectivesStripState() {}
function _egApplySavedObjectivesStripState() { /* no-op: fixed top-center */ }
function _egBindObjectivesStripBehaviour() { /* no-op: no drag/collapse */ }

// Legacy loot helpers — loot is now tracked in the escape menu; stubs kept for compatibility.
function _egBuildLootItem() { return ''; }
function _egObjItem() { return ''; }



//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: COUNTDOWN UI-----------------------
//------------------------------------------------------------------------

function _egShowChainCountdownOverlay(secs) {
    let el = document.getElementById('eg-chain-countdown');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-chain-countdown';
        el.style.cssText = [
            'position:fixed', 'inset:0', 'display:flex',
            'flex-direction:column', 'align-items:center', 'justify-content:center',
            'background:rgba(0,0,0,0.55)', 'z-index:9999',
            'font-family:inherit', 'pointer-events:none',
        ].join(';');
        document.body.appendChild(el);
    }
    el.innerHTML = `
        ${_egBuildChainBonusGainHTML()}
        <div style="font-size:1.1rem;color:#aaa;margin-bottom:0.4rem;letter-spacing:.1em;">${t('eg_countdown_solved')}</div>
        <div id="eg-chain-countdown-num" style="font-size:4rem;font-weight:700;color:#fff;line-height:1;">${secs}</div>
        <div style="font-size:0.9rem;color:#888;margin-top:0.5rem;">${t('eg_countdown_next')}</div>`;
    el.style.display = 'flex';
}

function _egUpdateChainCountdownOverlay(secs) {
    const num = document.getElementById('eg-chain-countdown-num');
    if (num) num.textContent = secs;
}

function _egHideChainCountdownOverlay() {
    const el = document.getElementById('eg-chain-countdown');
    if (el) el.style.display = 'none';
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: CLEANUP-----------------------------
//------------------------------------------------------------------------

function _egChainCleanup() {
    _egCancelChainCountdown();
    ALL.forEach(level => {
        if (level.isChainedPuzzle && level !== cur) {   // <-- don't strip the level about to be retried
            delete level.isMonsterLevel;
            delete level.isChainedPuzzle;
        }
        if (level.isBossArena) delete level.isBossArena;
    });

    // End of a device-map run: restore the seed level and drop the map's
    // runtime modifiers.
    if (typeof _egCleanupMapRunSeedLevel === 'function') _egCleanupMapRunSeedLevel();

    // End of a boss-test run: restore the stamped seed level.
    if (typeof _egCleanupBossTestSeedLevel === 'function') _egCleanupBossTestSeedLevel();

    _egChainKillCount = 0;
    _egChainPuzzleSolvedCount = 0;
    _egQuestionsAnswered = 0;
    // Expire any active quiz reward damage buff
    if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();
    _egBonusLootChance = 0;
    _egPendingPuzzleBonusGain = 0;
    _egPendingQuestionBonusGain = 0;
    _egChainCurrentGi = null;
    _egChainRecentGis = [];
    _egMonsterSpawnCounter = 0;
    _egPuzzleCompleteFired = false;
    _egMapClearedShown = false;
    _egBossArenaAvailableShown = false;
    if (typeof _egResetMistakesWarningState === 'function') _egResetMistakesWarningState();
    if (typeof _egResetLowHealthWarningState === 'function') _egResetLowHealthWarningState();

    // Boss arena phase state
    if (_egArenaAdvanceTimer) {
        clearTimeout(_egArenaAdvanceTimer);
        _egArenaAdvanceTimer = null;
    }
    _egBossPhaseActive = false;
    _egBossPhaseQueue = [];
    _egBossKilledCount = 0;
    _egBossTotalCount = 0;

    // Remove banners if still on screen (all center-grid types — a stale
    // warning must never survive into the next map)
    if (typeof _egClearCenterGridBanners === 'function') _egClearCenterGridBanners();
    const banner = document.getElementById('eg-map-cleared-banner');
    if (banner) banner.remove();
    const bossBanner = document.getElementById('eg-boss-arena-available-banner');
    if (bossBanner) bossBanner.remove();
    const mistakesBanner = document.getElementById('eg-mistakes-warning-banner');
    if (mistakesBanner) mistakesBanner.remove();

    _egRunLoot = [];
    _egRunCurrency = [];
    _egRunItems = [];
    _egRunMaps = [];
    _egRunEssences = [];
    // _egLootDrops is cleared by _egStopPickupSpawner via _egStopLootDrops

    // Hide the objectives strip
    const strip = document.getElementById('eg-objectives-strip');
    if (strip) strip.classList.add('eg-hidden');

    // Hide the bonus-loot chance label in the corner HUD
    _egUpdateBonusLootHUD();
}



//------------------------------------------------------------------------
//-------------------LEAVE MAP TRANSITION SCREEN--------------------------
//------------------------------------------------------------------------

// Builds the summary rows (equipment loot + regular items + maps + currency + essences + gold).
// Reads the passed-in snapshots — must be called while _egRunLoot /
// _egRunItems / _egRunMaps / _egRunCurrency / _egRunEssences still hold the run's data.
// Note: since the loot filter auto-vendors rule-matching drops (including
// bonus loot) at pickup, manual Ctrl+click selling was removed from this
// summary — unwanted gear is already converted to shards during the run.
function _egBuildLeaveMapSummaryHTML(loot, items, maps, currency, essences, gold = 0) {
    const lootHTML = loot.map((item, i) => `
        <div class="eg-leave-summary-chip eg-loot-chip eg-rarity-${item.rarity || 'common'}" data-loot-idx="${i}">
            ${EG_ART.html('item', item.baseId, item.icon || '📦')}
            ${item.isBonusLoot ? '<span class="eg-leave-summary-bonus">🎁</span>' : ''}
        </div>`).join('');

    const itemsHTML = items.map((item, i) => `
        <div class="eg-leave-summary-chip eg-item-pickup-chip eg-rarity-${_egLeaveRarityClass(item.rarity)}" data-item-idx="${i}">
            ${item.icon || '📦'}
        </div>`).join('');

    const mapsHTML = maps.map((map, i) => `
        <div class="eg-leave-summary-chip eg-map-pickup-chip eg-rarity-${_egLeaveRarityClass(map.rarity)}" data-map-idx="${i}">
            ${map.icon || '🗺️'}
        </div>`).join('');

    const currencyHTML = currency.map((entry, i) => `
        <div class="eg-leave-summary-chip eg-rarity-currency" data-currency-idx="${i}">
            ${entry.icon || '💰'}
            ${entry.count > 1 ? `<span class="eg-leave-summary-count">×${entry.count}</span>` : ''}
        </div>`).join('');

    const essencesHTML = essences.map((entry, i) => `
        <div class="eg-leave-summary-chip eg-rarity-essence" data-essence-idx="${i}">
            ${entry.icon || '🧬'}
            ${entry.count > 1 ? `<span class="eg-leave-summary-count">×${entry.count}</span>` : ''}
        </div>`).join('');

    const goldHTML = gold > 0 ? `
        <div class="eg-leave-summary-chip eg-rarity-gold" data-gold-idx="0">
            🪙
            <span class="eg-leave-summary-count">×${gold.toLocaleString()}</span>
        </div>` : '';

    return `
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_loot_acquired').replace('{n}', loot.length)}</div>
            <div class="eg-leave-summary-row">${lootHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_items_acquired').replace('{n}', items.length)}</div>
            <div class="eg-leave-summary-row">${itemsHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_maps_acquired').replace('{n}', maps.length)}</div>
            <div class="eg-leave-summary-row">${mapsHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_runes_orbs')}</div>
            <div class="eg-leave-summary-row">${currencyHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_essences_acquired')}</div>
            <div class="eg-leave-summary-row">${essencesHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        ${goldHTML ? `
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_gold_reward')}</div>
            <div class="eg-leave-summary-row">${goldHTML}</div>
        </div>` : ''}`;
}

// Clamps a rarity string to one that has a border/glow CSS class on the
// summary chips (regular ITEM_DEFS items only use a subset of rarities).
function _egLeaveRarityClass(rarity) {
    return ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cursed', 'artifact']
        .includes(rarity) ? rarity : 'common';
}

// Builds the hover tooltip body for a currency / shard entry shown in the
// runes &amp; orbs row — icon, name, rarity line and description, matching
// the hub's currency tooltip frame.
function _egBuildCurrencyTooltipHTML(entry) {
    const countLine = entry.count > 1 ? ` <span class="eg-tooltip-count">×${entry.count}</span>` : '';
    return `<div class="eg-tt-frame" style="--tt-border:#b59248;">
        <div class="eg-tt-header">
            <div class="eg-tt-icon">${entry.icon || '💰'}</div>
            <div class="eg-tt-name" style="color:#f5d98a;">${entry.name || '???'}${countLine}</div>
            <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_currency')}</div>
        </div>
        <div class="eg-tt-section"><div class="eg-tt-desc">${entry.description || ''}</div></div>
    </div>`;
}

// Builds the hover tooltip body for an essence entry shown in the
// essences row — icon, name, rarity line and description, matching
// the hub's essence tooltip frame.
function _egBuildEssenceTooltipHTML(entry) {
    const countLine = entry.count > 1 ? ` <span class="eg-tooltip-count">×${entry.count}</span>` : '';
    return `<div class="eg-tt-frame" style="--tt-border:#b59248;">
        <div class="eg-tt-header">
            <div class="eg-tt-icon">${entry.icon || '🧬'}</div>
            <div class="eg-tt-name" style="color:#f5d98a;">${entry.name || '???'}${countLine}</div>
            <div class="eg-tt-rarity-line" style="color:#b59248;">${t('eg_rarity_essence')}</div>
        </div>
        <div class="eg-tt-section"><div class="eg-tt-desc">${entry.description || ''}</div></div>
    </div>`;
}

// Builds a compact tooltip body for regular items (ITEM_DEFS pickups).
// Pulls the rarity label + localised description straight from ITEM_DEFS
// so the tooltip matches the inventory's item tooltips.
function _egBuildLeaveItemTooltipHTML(item) {
    const rc = {
        common: '#b0b0b0', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#9b59b6', legendary: '#f5b642', cursed: '#e74c3c', artifact: '#f1c40f',
    }[_egLeaveRarityClass(item.rarity)] || '#b0b0b0';

    const def = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS[item.defId] : null;
    const desc = (def && typeof itemDesc === 'function') ? itemDesc(def) : '';

    return `<div class="eg-tt-frame" style="--tt-border:${rc};">
        <div class="eg-tt-header">
            <div class="eg-tt-icon">${item.icon || '📦'}</div>
            <div class="eg-tt-name" style="color:${rc};">${item.name || '???'}</div>
            <div class="eg-tt-rarity-line" style="color:${rc};">${_egLeaveRarityLabel(_egLeaveRarityClass(item.rarity))}</div>
        </div>
        ${desc ? `<div class="eg-tt-section"><div class="eg-tt-desc">${desc}</div></div>` : ''}
    </div>`;
}

// Localised label for the rarities used by regular items — mirrors the
// EG_TT_RARITY_KEYS mapping in _egBuildTooltipBodyHTML().
function _egLeaveRarityLabel(rarity) {
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
function _egBuildLeaveChipTooltipHTML(chip, state) {
    if ('lootIdx' in chip.dataset) {
        const item = state.loot[+chip.dataset.lootIdx];
        return (item && typeof _egBuildTooltipBodyHTML === 'function')
            ? _egBuildTooltipBodyHTML(item) : '';
    }
    if ('itemIdx' in chip.dataset) {
        const item = state.items[+chip.dataset.itemIdx];
        return item ? _egBuildLeaveItemTooltipHTML(item) : '';
    }
    if ('mapIdx' in chip.dataset) {
        const map = state.maps[+chip.dataset.mapIdx];
        return (map && typeof _egBuildMapTooltipBodyHTML === 'function')
            ? _egBuildMapTooltipBodyHTML(map) : '';
    }
    if ('currencyIdx' in chip.dataset) {
        const entry = state.currency[+chip.dataset.currencyIdx];
        return entry ? _egBuildCurrencyTooltipHTML(entry) : '';
    }
    if ('essenceIdx' in chip.dataset) {
        const entry = state.essences[+chip.dataset.essenceIdx];
        return entry ? _egBuildEssenceTooltipHTML(entry) : '';
    }
    return '';
}

// Wires loot / item / currency chips to the global floating tooltip engine
// (tooltips-hud.js). Read-only: the loot filter auto-vendors rule-matching
// gear during the run, so there is no manual selling on this summary.
// The engine renders into a position:fixed element on document.body, so
// tooltips are never clipped by the panel's overflow-y. Listeners live on
// the panel (delegation), so re-rendering the summary rows is safe.
function _egWireLeaveMapSummaryTooltips(panel, state) {
    const buildFor = (chip) => _egBuildLeaveChipTooltipHTML(chip, state);

    // Lift the tooltip above this overlay (overlay z-index 10000 > tip 9999)
    const ensureAboveOverlay = () => { getGameTooltip().style.zIndex = '10001'; };

    panel.addEventListener('mouseover', (e) => {
        const chip = e.target.closest('.eg-leave-summary-chip');
        if (!chip) return;
        const html = buildFor(chip);
        if (!html) return;
        ensureAboveOverlay();
        showGameTooltip(html, e);
    });
    panel.addEventListener('mousemove', (e) => {
        if (e.target.closest('.eg-leave-summary-chip')) moveGameTooltip(e);
    });
    panel.addEventListener('mouseout', (e) => {
        if (e.target.closest('.eg-leave-summary-chip')) hideGameTooltip();
    });
}

// Endgame variant of the pause screen: renders the run's collected items
// into the pause panel (same chip layout as the win/lose map completion
// summary) and wires read-only hover tooltips — no ctrl+click selling here,
// the pause screen is purely informational.
function _egRenderPauseLootSummary() {
    const container = document.getElementById('pause-loot-summary');
    if (!container) return;

    // The chips reuse the leave-map summary styles.
    _egInjectLeaveMapTransitionStyles();

    // Live view of the current run state — safe to read directly while
    // paused, nothing wipes it until the run actually ends.
    const state = {
        loot: _egRunLoot || [],
        items: _egRunItems || [],
        maps: _egRunMaps || [],
        currency: _egRunCurrency || [],
        essences: _egRunEssences || [],
        gold: 0,
    };

    container.innerHTML = _egBuildLeaveMapSummaryHTML(state.loot, state.items, state.maps, state.currency, state.essences, state.gold);

    // Read-only tooltip wiring (mouseover/mousemove/mouseout only). Assigned
    // as on* properties so repeated pauses never stack duplicate listeners.
    container.onmouseover = (e) => {
        const chip = e.target.closest('.eg-leave-summary-chip');
        if (!chip) return;
        const html = _egBuildLeaveChipTooltipHTML(chip, state);
        if (!html) return;
        // Lift above the pause overlay (z-index 9999).
        getGameTooltip().style.zIndex = '10001';
        showGameTooltip(html, e);
    };
    container.onmousemove = (e) => {
        if (e.target.closest('.eg-leave-summary-chip')) moveGameTooltip(e);
    };
    container.onmouseout = (e) => {
        if (e.target.closest('.eg-leave-summary-chip')) hideGameTooltip();
    };
}

// Full-screen blocking overlay. Unlike _egShowChainCountdownOverlay (which
// deliberately uses pointer-events:none so clicks pass through), this one
// keeps normal pointer-events so it swallows every click — that's what
// actually fixes the "puzzle still clickable for 1-2s" issue.
function _egShowLeaveMapTransition(atlasResult, opts) {
    opts = opts || {};
    const failed = !!opts.failed;
    _egInjectLeaveMapTransitionStyles();

    let el = document.getElementById('eg-leave-map-transition');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-leave-map-transition';
        el.className = 'eg-leave-map-transition';
        document.body.appendChild(el);
    }     // Gold badge when this run cleared the region on the Atlas of Statistica
    // for the very first time (win path only).
    const isFirstClear = !failed && !!(atlasResult && atlasResult.firstClear && atlasResult.node);
    let firstClearHTML = '';
    if (isFirstClear) {
        const node = atlasResult.node;
        const tierLabel = t('eg_map_tier_tt').replace('{n}', node.tier);
        firstClearHTML = `<div class="eg-leave-map-first-clear">✨ ${t('eg_atlas_first_clear')
            .replace('{n}', egAtlasNodeName(node))
            .replace('{t}', tierLabel)}</div>`;
    }

    // Failed runs show a reason line (if one was passed) and a green hint
    // that everything collected during the run was kept.
    const titleText = failed ? (opts.titleText || t('eg_map_failed')) : t('eg_map_cleared');
    const subLineHTML = (failed && opts.subText)
        ? `<div class="eg-leave-map-subline">${opts.subText}</div>` : '';
    const keepHintHTML = failed
        ? `<div class="eg-leave-map-keep-hint">${t('eg_map_failed_keep_hint')}</div>` : '';

    el.innerHTML = `
        <div class="eg-leave-map-panel ${failed ? 'eg-leave-map-failed' : ''}">
            <div class="eg-leave-map-title ${failed ? 'eg-title-failed' : ''}">${titleText}</div>
            ${subLineHTML}
            ${keepHintHTML}
            ${firstClearHTML}
            <div id="eg-leave-summary-container"></div>
            <button class="eg-leave-map-return-btn" id="btn-eg-leave-map-return">${t('eg_return_to_nexus')}</button>
        </div>`;
    el.classList.add('show');

    // Snapshot the run data now — _egStopEncounter() (called by _egEndMap
    // right after this) wipes _egRunLoot/_egRunCurrency via _egChainCleanup.
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
        loot: [..._egRunLoot],
        items: [..._egRunItems],
        maps: [..._egRunMaps],
        currency: [..._egRunCurrency],
        essences: [..._egRunEssences],
        gold: goldReward,
    };

    const panel = el.querySelector('.eg-leave-map-panel') || el;
    const container = document.getElementById('eg-leave-summary-container');
    if (container) {
        container.innerHTML = _egBuildLeaveMapSummaryHTML(state.loot, state.items, state.maps, state.currency, state.essences, state.gold);
    }

    _egWireLeaveMapSummaryTooltips(panel, state);

    document.getElementById('btn-eg-leave-map-return').onclick = () => {
        _egClearBonusLootFlags();
        _egHideLeaveMapTransition();
        window._egMapDefeatInProgress = false;
        // Boss testing: win and defeat both return to the boss selection
        // screen. Captured now (not read lazily) because _egStopEncounter
        // already ran. The flag is consumed here so later campaign runs
        // route normally again.
        if (window._egIsBossTestRun) {
            window._egIsBossTestRun = false;
            if (typeof showEndgameBossTest === 'function') {
                showEndgameBossTest();
                return;
            }
        }
        showEndgameNexus();
    };
}

// Strips the temporary isBonusLoot marker (🎁 badge + tooltip line) from
// every inventory and equipped item — called once the player leaves the
// map completion screen so the hub character sheet shows clean tooltips.
function _egClearBonusLootFlags() {
    if (typeof _egInventory !== 'undefined' && Array.isArray(_egInventory)) {
        for (const row of _egInventory) {
            for (const item of row) {
                if (item && item.isBonusLoot) delete item.isBonusLoot;
            }
        }
    }
    if (typeof _egEquipped === 'object' && _egEquipped) {
        for (const slotId of Object.keys(_egEquipped)) {
            const item = _egEquipped[slotId];
            if (item && item.isBonusLoot) delete item.isBonusLoot;
        }
    }
}

function _egHideLeaveMapTransition() {
    const el = document.getElementById('eg-leave-map-transition');
    if (el) el.classList.remove('show');
    if (typeof hideGameTooltip === 'function') hideGameTooltip();
}

// Central defeat handler for endgame map runs — called when the player dies
// (HP zero), exceeds the mistake limit, or loses through any other path
// (timer expiry, hardcore fail, golden clock, random walkers, ...).
//
// Unlike a voluntary map completion there is no bonus-loot roll, no
// completion reward and no atlas clear — but the player keeps everything
// already collected during the run: equipment loot is flushed into the stash
// and unclaimed map drops are banked before cleanup wipes the run state.
// (Regular items, maps and currency are persisted live on claim.) The
// consumed map itself is penalty enough. Shows the map-lost variant of the
// leave-map summary screen.
function _egEndMapDefeated(titleText, subText) {
    if (!_egIsActive()) return false;

    // Mark the generic Hardcore path as consumed before cleanup runs. This
    // prevents any queued observer/callback from reopening ov-lose after the
    // map-failed summary has been shown.
    window._egMapDefeatInProgress = true;

    if (typeof clearActiveRandomWalkers === 'function') clearActiveRandomWalkers();

    // If a generic defeat opened the lose overlay first, close it.
    const ovLose = document.getElementById('ov-lose');
    if (ovLose) ovLose.classList.remove('show', 'eg-map-failed');

    // Keep the run's collected gear — flush BEFORE any cleanup resets it.
    _egFlushRunLootToStash();
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
    if (typeof egSaveHubState === 'function') egSaveHubState();

    // Map-lost variant of the completion screen — must render BEFORE
    // _egStopEncounter wipes the run arrays it snapshots.
    _egShowLeaveMapTransition(null, { failed: true, titleText, subText });

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('player_defeated');
    }

    dead = true;
    _egStopEncounter();
    // Guarantee quiz damage buff is cleared on map failure even if
    // _egStopEncounter was suppressed.
    if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();
    if (typeof stopTimer === 'function') stopTimer();

    if (typeof _stopAvatarWalkAnimation === 'function') _stopAvatarWalkAnimation();
    if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar();
    // Ensure any lingering companion charge animation is torn down
    document.querySelectorAll('.companion-charging').forEach(el => el.classList.remove('companion-charging'));
    return true;
}

// Injects the overlay's CSS once — same pattern as _egInjectCurrencyStyles
// / _dndInjectStyles, so nothing needs to be added to your .css files.
function _egInjectLeaveMapTransitionStyles() {
    if (document.getElementById('eg-leave-map-transition-styles')) return;
    const style = document.createElement('style');
    style.id = 'eg-leave-map-transition-styles';
    style.textContent = `
        .eg-leave-map-transition {
            display: none;
            position: fixed; inset: 0;
            z-index: 10000;
            background: rgba(5,5,15,0.92);
            align-items: center; justify-content: center;
        }
        .eg-leave-map-transition.show { display: flex; }
        .eg-leave-map-panel {
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
        .eg-leave-map-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 16px;
            letter-spacing: .05em;
        }
        .eg-leave-map-panel.eg-leave-map-failed { border-color: #aa4455; }
        .eg-leave-map-title.eg-title-failed { color: #ff8080; }
        .eg-leave-map-subline {
            font-size: 0.85rem;
            color: #bbb;
            margin: -8px auto 10px auto;
        }
        .eg-leave-map-keep-hint {
            margin: -4px auto 16px auto;
            padding: 6px 14px;
            display: inline-block;
            font-size: 0.8rem;
            color: #9fe0a0;
            background: rgba(80, 200, 120, 0.08);
            border: 1px solid rgba(80, 200, 120, 0.45);
            border-radius: 999px;
        }
        .eg-leave-map-first-clear {
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
        .eg-leave-summary-section { margin-bottom: 18px; }
        .eg-leave-summary-title {
            font-size: 0.85rem;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: .08em;
            margin-bottom: 8px;
            text-align: left;
        }
        .eg-leave-summary-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            min-height: 40px;
        }
        .eg-leave-summary-empty { color: #666; font-size: 0.85rem; font-style: italic; }
        .eg-leave-summary-hint {
            font-size: 0.72rem;
            color: #777;
            text-align: left;
            margin-top: 6px;
        }
        .eg-loot-chip { cursor: pointer; }
        .eg-loot-chip:hover { filter: brightness(1.4); }
        .eg-leave-summary-chip {
            position: relative;
            width: 42px; height: 42px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 6px;
            font-size: 1.3rem;
        }
        .eg-leave-summary-chip.eg-rarity-uncommon { border-color: #2ecc71; }
        .eg-leave-summary-chip.eg-rarity-rare { border-color: #3498db; }
        .eg-leave-summary-chip.eg-rarity-epic { border-color: #9b59b6; }
        .eg-leave-summary-chip.eg-rarity-legendary { border-color: #f39c12; }
        .eg-leave-summary-chip.eg-rarity-cursed { border-color: #e74c3c; }
        .eg-leave-summary-chip.eg-rarity-artifact { border-color: #f1c40f; }
        .eg-leave-summary-chip.eg-rarity-currency { border-color: #b59248; }
        .eg-leave-summary-chip.eg-rarity-essence { border-color: #b59248; }
        .eg-leave-summary-chip.eg-rarity-gold { border-color: #f5d98a; background: rgba(245, 217, 138, 0.15); }
        .eg-leave-summary-count {
            position: absolute; bottom: 1px; right: 2px;
            font-size: 0.6rem; font-weight: 700; color: #f0e6c0;
            text-shadow: 0 0 3px #000, 0 0 6px #000;
            pointer-events: none;
        }
        .eg-leave-summary-bonus {
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
        .eg-leave-summary-tooltip {
            display: none;
            position: absolute;
            bottom: 100%; left: 50%;
            transform: translateX(-50%);
            margin-bottom: 6px;
            z-index: 10001;
            white-space: normal;
        }
        .eg-leave-summary-chip:hover .eg-leave-summary-tooltip { display: block; }
        .eg-leave-map-return-btn {
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
        .eg-leave-map-return-btn:hover { background: #6c6cc9; }
    `;
    document.head.appendChild(style);
}