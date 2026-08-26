//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN STATE--------------------------------
//------------------------------------------------------------------------

let _egChainCurrentGi = null;
let _egChainKillCount = 0;          // total non-boss monsters killed this run
let _egChainPuzzleSolvedCount = 0;  // how many puzzles solved this run
let _egQuestionsAnswered = 0;       // how many bonus questions answered correctly this run
let _egChainTransitioning = false;
let _egChainCountdownTimer = null;
let _egBossSpawned = false;
let _egMonsterSpawnCounter = 0;
let _egPuzzleCompleteFired = false;
let _egMapClearedShown = false;     // ensures the MAP CLEARED banner fires once per map

// Bonus-loot gains accumulated since the last chain transition screen.
// Consumed (and reset) by _egBuildChainBonusGainHTML so the countdown
// overlay shows exactly what the player earned from the previous puzzle
// and quiz.
let _egPendingPuzzleBonusGain = 0;
let _egPendingQuestionBonusGain = 0;

// Accumulated bonus-loot chance for the current run (0–1). Grows with every
// solved puzzle (scaled by grid size) and every correctly answered question.
let _egBonusLootChance = 0;


//------------------------------------------------------------------------
//-------------------REQUIREMENTS HELPERS---------------------------------
//------------------------------------------------------------------------

// Helper functions for the map objective panel

// Reads the requirements from the original map def.
// totalMonsters: total non-boss kills needed across the whole run (boss spawns at 50%)
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

// Returns true when every requirement on the map is satisfied.
function _egCanLeaveMap() {
    const req = _egGetMapRequirements();

    if (req.totalMonsters > 0 && _egChainKillCount < req.totalMonsters) return false;
    if (req.requiredPuzzles > 0 && _egChainPuzzleSolvedCount < req.requiredPuzzles) return false;
    if (req.requiredQuestions > 0 && _egQuestionsAnswered < req.requiredQuestions) return false;
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

    // Always automatically chain to the next puzzle, the player needs to manually leave the chain
    setTimeout(() => _egStartChainCountdown(), 800);
}

function _egHasBoss() {
    const def = _egMapDef || cur;
    return !!(def.hasBoss || (def.bosses && def.bosses.length > 0));
}

function _egBossDefeated() {
    if (!_egBossSpawned) return false;
    return !_egMonsters.some(m => m.isBoss);
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


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: COUNTDOWN---------------------------
//------------------------------------------------------------------------

function _egStartChainCountdown() {
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
    const nextGi = _egFindNextChainPuzzleGi();
    if (nextGi === null) {
        showToast(t('eg_no_more_puzzles'));
        return;
    }

    _egChainCurrentGi = nextGi;
    ALL[nextGi].isMonsterLevel = true;
    ALL[nextGi].isChainedPuzzle = true;

    // Snapshot loot still on the grid before buildGrid() destroys the overlays
    const carriedLoot = Array.from(_egLootDrops.values());

    const carriedCurrency = Array.from(_egCurrencyDrops.values());
    _egCurrencyDrops.clear();

    const carriedItems = Array.from(_egItemDrops.values());
    _egItemDrops.clear();                                      

    // Unclaimed map drops are banked straight into the gate map stash
    // instead of being carried across puzzles.
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();

    // Clear the stale map entries — overlays are already gone after buildGrid()
    _egLootDrops.clear();

    const savedMonsters = _egMonsters.slice();
    const savedTargetId = _egTargetId;

    window._egSuppressEncounterStop = true;
    window._egSuppressEncounterStart = true;
    _doStartLevel(nextGi);
    window._egSuppressEncounterStop = false;
    window._egSuppressEncounterStart = false;

    _egMonsters = savedMonsters;
    _egTargetId = savedTargetId;
    _egEncounterActive = true;
    _egPuzzleCompleteFired = false;

    _egRenderPanel();
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
}


// Spawns the boss from the original map def.
function _egSpawnChainBoss() {
    const baseLevel = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;
    let bossList = _egBuildBossSpawnListFromDef(_egMapDef, baseLevel);

    if (bossList.length === 0) {
        const allBossDefs = Object.values(EG_BOSS_DEFS);
        if (allBossDefs.length > 0) {
            const picked = allBossDefs[Math.floor(Math.random() * allBossDefs.length)];
            bossList = [{ id: picked.id, level: _egRollMonsterLevel(baseLevel), isBossSpawn: true }];
        }
    }

    bossList.forEach(entry => {
        setTimeout(() => {
            if (_egIsActive()) _egSpawnMonster(entry.id, entry.level || 1);
        }, 500);
    });
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: PUZZLE POOL CRITERIA---------------
//------------------------------------------------------------------------

let _egChainRecentGis = [];

function _egPuzzlePassesCriteria(level, criteria) {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cells = rows * cols;

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
        _egPuzzlePassesCriteria(level, criteria)
    );

    if (avoidRecent && pool.length > _egChainRecentGis.length) {
        const filtered = pool.filter(level => !_egChainRecentGis.includes(level.gIdx));
        if (filtered.length > 0) pool = filtered;
    }

    return pool;
}

function _egPickFromPool(pool, recentWindow) {
    const picked = pool[Math.floor(Math.random() * pool.length)];
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
function _egPickStoryChainPuzzleGi(criteria) {
    let pool = _egBuildChainPool(criteria);

    if (pool.length === 0 && (criteria.minCells != null || criteria.maxCells != null)) {
        pool = _egBuildChainPool({ ...criteria, minCells: null, maxCells: null });
    }

    if (pool.length === 0) return null;
    return _egPickFromPool(pool, criteria.recentWindow);
}

// Picks one puzzle for a map run, mixing BOTH sources:
//   story levels (filtered by the current criteria) and freshly generated
//   puzzles (symbols / random structures). When the map carries a size
//   mix queue, each pull consumes the next grid-size bucket — small
//   puzzles come first, massive ones close out the run.
function _egPickMapRunPuzzleGi(criteria) {
    const canGenerate = typeof _egCreateGeneratedLevel === 'function';
    const generate = opts => {
        if (!canGenerate) return null;
        return _egCreateGeneratedLevel(opts);
    };

    // ── Bucketed pull (maps with a sizeMix implicit) ────────────────
    const queue = Array.isArray(criteria.sizeQueue) ? criteria.sizeQueue : [];
    if (queue.length > 0) {
        const bucket = queue.shift();   // consumed — shrinks as the run progresses
        const range = (typeof EG_GRID_SIZE_BUCKETS !== 'undefined')
            ? EG_GRID_SIZE_BUCKETS[bucket] : null;

        // Story criteria clone constrained to this bucket's cell window
        const bucketCriteria = { ...criteria };
        if (range) {
            bucketCriteria.minCells = Math.max(criteria.minCells || 0, range[0]);
            bucketCriteria.maxCells = range[1] === Infinity ? null : range[1];
        }

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

    // ── Legacy pull (no size mix): old behaviour ────────────────────
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

// Chance-based bonus equipment loot when completing a map.
// The chance scales with the grid size of each solved puzzle and with
// correct quiz answers this run:
//   puzzles: small +10%, normal +25%, large +50%, massive +75%
//   quiz:    +33% / +33% / +34% for the first three correct answers
const EG_BONUS_LOOT_CHANCE_BY_GRID_SIZE = {
    small: 0.10,
    medium: 0.25,
    large: 0.50,
    massive: 0.75,
};
const EG_BONUS_LOOT_CHANCE_PER_QUESTION = [0.33, 0.33, 0.34];
const EG_BONUS_LOOT_CHANCE_MAX = 1.0;

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

// Returns the current bonus-loot drop chance (0–1) for this run.
function _egGetBonusLootChance() {
    return Math.min(EG_BONUS_LOOT_CHANCE_MAX, _egBonusLootChance);
}

// Rolls for one bonus equipment item on map completion. On success the item
// is pushed into _egRunLoot so it flows through the normal flush-to-stash
// and leave-map summary paths. Must be called BEFORE _egShowLeaveMapTransition()
// so the summary screen includes it, and before _egChainCleanup wipes _egRunLoot.
function _egRollBonusMapLoot() {
    if (Math.random() > _egGetBonusLootChance()) return;
    if (typeof _egGenerateEquipmentDrop !== 'function') return;
    // Don't roll (or promise) an item when the stash can't hold it —
    // _egFlushRunLootToStash would silently drop it otherwise.
    if (typeof _egStashHasFreeSlot === 'function' && !_egStashHasFreeSlot()) return;

    const baseLevel = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;
    const item = _egGenerateEquipmentDrop(baseLevel);
    if (!item) return;

    _egRunLoot.push(item);
    showToast(t('eg_bonus_loot')
        .replace('{icon}', item.icon || '')
        .replace('{name}', item.name), _egRarityToastColor(item.rarity));
}

// Grants the active map's rolled completion reward (4–10× one higher-grade
// orb or essence). Adds it to the real currency/essence stash AND to
// _egRunCurrency so it shows up in the runes & orbs section of the
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

    // Mirror into the transition screen's currency list (aggregated by id).
    const existing = _egRunCurrency.find(e => e.id === def.id);
    if (existing) existing.count += reward.count;
    else _egRunCurrency.push({
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

    // Consume the pending gains — they describe only the previous segment.
    _egPendingPuzzleBonusGain = 0;
    _egPendingQuestionBonusGain = 0;

    if (puzzleGain <= 0 && quizGain <= 0) return '';

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
        </div>`;
}

// Called only by the Leave Map button after _egCanLeaveMap() returns true.
// Called only by the Leave Map button after _egCanLeaveMap() returns true.
function _egEndMap() {
    if (!_egEncounterActive) return;
    _egCancelChainCountdown();

    // Roll for completion bonus loot first — it must land in _egRunLoot
    // before the transition overlay renders its summary.
    _egRollBonusMapLoot();

    // Grant the map's rolled currency completion reward — it must land in
    // the stash and in _egRunCurrency before the summary renders.
    _egGrantMapCompletionReward();

    // Atlas: mark this run's region as cleared and unlock its connected
    // regions (see endgame-atlas.js). Must run before _egChainCleanup
    // clears _egActiveMapItem.
    if (typeof _egAtlasOnMapCompleted === 'function') _egAtlasOnMapCompleted(_egActiveMapItem);

    // Show the overlay FIRST — it sits above the puzzle grid with normal
    // pointer-events, so it blocks every further click the instant this
    // runs, before any of the cleanup below happens.
    _egShowLeaveMapTransition();

    _egFlushRunLootToStash();
    if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
    egSaveHubState();
    _egStopEncounter();

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

function _egUpdateObjectivesHUD() {
    const strip = document.getElementById('eg-objectives-strip');
    if (!strip) return;

    if (!_egIsActive()) {
        strip.classList.add('eg-hidden');
        _egUpdateBonusLootHUD();
        return;
    }

    strip.classList.remove('eg-hidden');
    _egUpdateBonusLootHUD();

    const req = _egGetMapRequirements();
    const rows = [];

    // Monsters (Capped)
    if (req.totalMonsters > 0) {
        const count = Math.min(_egChainKillCount, req.totalMonsters);
        const done = count >= req.totalMonsters;
        rows.push(_egObjItem('⚔️', t('eg_obj_monsters').replace('{k}', count).replace('{t}', req.totalMonsters), done));
    }

    // Mistakes: no longer shown here — the mistake counter in the top-left
    // corner of the puzzle screen displays "x / y" for maps with a limit.

    // Boss (Simplified format)
    if (req.hasBoss) {
        const done = _egBossDefeated();
        const count = done ? 1 : 0;
        rows.push(_egObjItem('💀', t('eg_obj_boss').replace('{k}', count), done));
    }

    // Puzzles (Capped)
    if (req.requiredPuzzles > 0) {
        const count = Math.min(_egChainPuzzleSolvedCount, req.requiredPuzzles);
        const done = count >= req.requiredPuzzles;
        rows.push(_egObjItem('🧩', t('eg_obj_puzzles').replace('{k}', count).replace('{t}', req.requiredPuzzles), done));
    }

    // Questions (Capped)
    if (req.requiredQuestions > 0) {
        const count = Math.min(_egQuestionsAnswered, req.requiredQuestions);
        const done = count >= req.requiredQuestions;
        rows.push(_egObjItem('❓', t('eg_obj_questions').replace('{k}', count).replace('{t}', req.requiredQuestions), done));
    }

    // Loot acquired (Always shows, uses custom helper for tooltip)
    rows.push(_egBuildLootItem());

    const canLeave = _egCanLeaveMap();

    // First time all objectives are complete: big green banner over the grid
    // + a toast message. Fires only once per map.
    if (canLeave && !_egMapClearedShown) {
        _egMapClearedShown = true;
        _egShowMapClearedBanner();
        showToast(t('eg_map_cleared_toast'), '#4ade80');
    }

    strip.innerHTML = `
        <div class="eg-obj-header">
            <span class="eg-obj-title">${t('eg_obj_header')}</span>
            <button class="eg-obj-collapse">−</button>
        </div>
        <div class="eg-obj-body">
            ${rows.join('')}
            <button class="eg-leave-btn ${canLeave ? 'eg-leave-ready' : 'eg-leave-locked'}"
                    onclick="_egTryLeaveMap()">
                ${canLeave ? t('eg_leave_map') : t('eg_leave_map_locked')}
            </button>
        </div>`;

    _egBindObjectivesStripBehaviour(strip);
}

// Shows a big green "MAP CLEARED" text centered over the puzzle grid for
// 3 seconds. Purely cosmetic — pointer-events are disabled via CSS.
function _egShowMapClearedBanner() {
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

//------------------------------------------------------------------------
//-------------------OBJECTIVES HUD: DRAG + MINIMIZE----------------------
//------------------------------------------------------------------------

// localStorage key for the objectives tracker's position and collapsed state.
const EG_OBJ_STRIP_STORAGE_KEY = 'eg_objectives_strip_state';

// Restores a saved { x, y, collapsed } state, clamped to the viewport.
function _egLoadObjectivesStripState() {
    try {
        const raw = localStorage.getItem(EG_OBJ_STRIP_STORAGE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (typeof s.x !== 'number' || typeof s.y !== 'number') return null;
        return {
            x: Math.max(0, Math.min(s.x, window.innerWidth - 120)),
            y: Math.max(0, Math.min(s.y, window.innerHeight - 60)),
            collapsed: !!s.collapsed,
        };
    } catch (_) {
        return null;
    }
}

// Persists the tracker's current position and minimized state.
function _egSaveObjectivesStripState(strip) {
    const rect = strip.getBoundingClientRect();
    try {
        localStorage.setItem(EG_OBJ_STRIP_STORAGE_KEY, JSON.stringify({
            x: rect.left,
            y: rect.top,
            collapsed: strip.classList.contains('eg-collapsed'),
        }));
    } catch (_) { /* storage unavailable — silently ignore */ }
}

// Applies the saved position / collapsed state once per page load.
// The default CSS keeps the panel docked left-center until a saved
// position overrides it.
function _egApplySavedObjectivesStripState(strip) {
    const saved = _egLoadObjectivesStripState();
    if (!saved) return;

    strip.style.left = saved.x + 'px';
    strip.style.top = saved.y + 'px';
    strip.style.transform = 'none';

    if (saved.collapsed) {
        strip.classList.add('eg-collapsed');
        const body = strip.querySelector('.eg-obj-body');
        const btn = strip.querySelector('.eg-obj-collapse');
        if (body) body.style.display = 'none';
        if (btn) btn.textContent = '+';
    }
}

// Wires the drag handle and the minimize button onto the strip.
// Bound once — the guard survives the frequent innerHTML re-renders.
function _egBindObjectivesStripBehaviour(strip) {
    if (!strip.dataset.behaviourBound) {
        strip.dataset.behaviourBound = '1';
        _egApplySavedObjectivesStripState(strip);

        // Minimize / restore toggle.
        strip.addEventListener('click', e => {
            const btn = e.target.closest('.eg-obj-collapse');
            if (!btn) return;
            const body = strip.querySelector('.eg-obj-body');
            const collapsed = strip.classList.toggle('eg-collapsed');
            body.style.display = collapsed ? 'none' : '';
            btn.textContent = collapsed ? '+' : '−';
            _egSaveObjectivesStripState(strip);
        });

        // Dragging by the header title.
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        strip.addEventListener('mousedown', e => {
            if (!e.target.closest('.eg-obj-title')) return;
            isDragging = true;
            const rect = strip.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            strip.classList.add('eg-dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const x = Math.max(0, Math.min(e.clientX - offsetX,
                window.innerWidth - strip.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - offsetY,
                window.innerHeight - strip.offsetHeight));
            strip.style.left = x + 'px';
            strip.style.top = y + 'px';
            strip.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            strip.classList.remove('eg-dragging');
            _egSaveObjectivesStripState(strip);
        });
    }
}

// Helper to build the Loot row with a hover tooltip
// Helper to build the Loot row with a hover tooltip and nested stat tooltips
function _egBuildLootItem() {
    const count = _egRunLoot.length;
    let tooltipHTML = '';

    if (count > 0) {
        // Sync rarity colors exactly with your Endgame Hub RARITY_COLOR_MAP
        const getRarityColor = (rarity) => {
            switch (rarity) {
                case 'uncommon': return '#2ecc71';
                case 'rare': return '#3498db';
                case 'epic': return '#c39bd3';
                case 'legendary': return '#f5b642';
                case 'cursed': return '#e74c3c';
                case 'artifact': return '#f1c40f';
                case 'common':
                default: return '#b0b0b0';
            }
        };

        const itemsList = _egRunLoot.map(item => {
            const color = getRarityColor(item.rarity);

            // Prioritize the base item name, fallback to standard name
            const displayName = item.baseName || item.name || t('eg_unknown_item');

            // Generate the exact same tooltip frame used in your Endgame Hub
            const nestedTooltip = typeof _egBuildTooltipBodyHTML === 'function'
                ? _egBuildTooltipBodyHTML(item)
                : `<div style="padding: 5px;">${t('eg_tooltip_unavailable')}</div>`;

            return `
                <div class="eg-loot-item-row" style="color: ${color};">
                    <span class="eg-loot-item-icon">${EG_ART.html('item', item.baseId, item.icon || '📦')}</span>${displayName}
                    <div class="eg-nested-tooltip">
                        ${nestedTooltip}
                    </div>
                </div>`;
        }).join('');

        tooltipHTML = `<div class="eg-loot-tooltip">${itemsList}</div>`;
    } else {
        tooltipHTML = `<div class="eg-loot-tooltip" style="color: #888;">${t('eg_no_loot_yet')}</div>`;
    }

    return `
        <div class="eg-obj-item eg-loot-container eg-obj-pending">
            📦 ${t('eg_loot_acquired').replace('{n}', count)}
            ${tooltipHTML}
        </div>
    `;
}

function _egObjItem(icon, label, done) {
    const prefix = icon ? `${icon} ` : '';
    return `<div class="eg-obj-item ${done ? 'eg-obj-done' : 'eg-obj-pending'}">${prefix}${label}</div>`;
}



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
    });

    // End of a device-map run: restore the seed level and drop the map's
    // runtime modifiers.
    if (typeof _egCleanupMapRunSeedLevel === 'function') _egCleanupMapRunSeedLevel();

    _egChainKillCount = 0;
    _egChainPuzzleSolvedCount = 0;
    _egQuestionsAnswered = 0;
    _egBonusLootChance = 0;
    _egPendingPuzzleBonusGain = 0;
    _egPendingQuestionBonusGain = 0;
    _egChainCurrentGi = null;
    _egChainRecentGis = [];
    _egBossSpawned = false;
    _egMonsterSpawnCounter = 0;
    _egPuzzleCompleteFired = false;
    _egMapClearedShown = false;

    // Remove a MAP CLEARED banner if one is still on screen
    const banner = document.getElementById('eg-map-cleared-banner');
    if (banner) banner.remove();

    _egRunLoot = [];
    _egRunCurrency = [];
    _egRunItems = [];
    _egRunMaps = [];
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

// Builds the summary rows (equipment loot + regular items + maps + currency).
// Reads the passed-in snapshots — must be called while _egRunLoot /
// _egRunItems / _egRunMaps / _egRunCurrency still hold the run's data.
function _egBuildLeaveMapSummaryHTML(loot, items, maps, currency) {
    const lootHTML = loot.map((item, i) => `
        <div class="eg-leave-summary-chip eg-loot-chip eg-rarity-${item.rarity || 'common'}" data-loot-idx="${i}">
            ${EG_ART.html('item', item.baseId, item.icon || '📦')}
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

    return `
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_loot_acquired').replace('{n}', loot.length)}</div>
            <div class="eg-leave-summary-row">${lootHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
            <div class="eg-leave-summary-hint">${t('eg_leave_sell_hint')}</div>
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
        </div>`;
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

// Ctrl + left-click on an equipment chip inside the leave-map overlay sells
// the item instantly: it is removed from the run loot (and from the stash if
// the flush already placed it there) and grants one rolled orb shard, which
// appears both in the overlay's runes &amp; orbs row and in the real currency
// stash. Returns true when the item was sold.
function _egSellRunLootChip(item, state) {
    if (!item) return false;

    // Remove from the live run loot so _egFlushRunLootToStash skips it.
    const liveIdx = Array.isArray(_egRunLoot) ? _egRunLoot.indexOf(item) : -1;
    if (liveIdx !== -1) _egRunLoot.splice(liveIdx, 1);

    // If the flush already ran, remove the item from the stash by identity.
    let removedFromStash = false;
    for (let r = 0; r < EG_INV_ROWS && !removedFromStash; r++) {
        for (let c = 0; c < EG_INV_COLS && !removedFromStash; c++) {
            if (_egInventory[r][c] === item) {
                _egInventory[r][c] = null;
                if (typeof _egRenderInventoryCell === 'function') _egRenderInventoryCell(r, c);
                removedFromStash = true;
            }
        }
    }
    if (removedFromStash && typeof _egUpdateInvCount === 'function') _egUpdateInvCount();

    // Roll and grant the shard (goes straight into the currency stash).
    const shardDef = _egRollShardForItem(item);
    const granted = egAddShard(shardDef.id, 1);

    // Mirror the gain into the overlay's currency list (aggregated by id).
    const existing = state.currency.find(e => e.id === shardDef.id);
    if (existing) existing.count = (existing.count || 1) + 1;
    else state.currency.push({
        id: shardDef.id,
        name: shardDef.name,
        icon: shardDef.icon,
        description: shardDef.description,
        count: 1,
    });

    // Remove the sold item from the overlay's loot snapshot.
    const idx = state.loot.indexOf(item);
    if (idx !== -1) state.loot.splice(idx, 1);

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('player_equip_pickup');
    }
    showToast(t('eg_sell_item_sold')
        .replace('{name}', item.name || '???')
        .replace('{icon}', shardDef.icon)
        .replace('{shard}', shardDef.name));

    // Persist the sale immediately — egSaveHubState() already ran in
    // _egEndMap before the player had a chance to interact with this overlay.
    if (typeof egSaveHubState === 'function') egSaveHubState();

    if (!granted) showToast(t('eg_map_stash_full'));
    return true;
}

// Ctrl + left-click on a map chip inside the leave-map overlay sells the
// map instantly: it is removed from the run maps (and from the map stash
// if the flush already placed it there) and grants one Horizon Fragment,
// which appears both in the overlay's runes &amp; orbs row and in the real
// currency stash. Returns true when the map was sold.
function _egSellRunMapChip(map, state) {
    if (!map) return false;

    // Remove from the live run maps so _egFlushRunLootToStash skips it.
    const liveIdx = Array.isArray(_egRunMaps) ? _egRunMaps.indexOf(map) : -1;
    if (liveIdx !== -1) _egRunMaps.splice(liveIdx, 1);

    // If the flush already ran, remove the map from the map stash by identity.
    let removedFromStash = false;
    for (let r = 0; r < EG_MAP_STASH_ROWS && !removedFromStash; r++) {
        for (let c = 0; c < EG_MAP_STASH_COLS && !removedFromStash; c++) {
            if (_egMapStash[r][c] === map) {
                _egMapStash[r][c] = null;
                if (typeof _egRenderMapStashCell === 'function') _egRenderMapStashCell(r, c);
                removedFromStash = true;
            }
        }
    }

    // Grant one Horizon Fragment (goes straight into the currency stash).
    const shardDef = EG_SHARD_DEFS.shard_horizon;
    const granted = egAddShard(shardDef.id, 1);

    // Mirror the gain into the overlay's currency list (aggregated by id).
    const existing = state.currency.find(e => e.id === shardDef.id);
    if (existing) existing.count = (existing.count || 1) + 1;
    else state.currency.push({
        id: shardDef.id,
        name: shardDef.name,
        icon: shardDef.icon,
        description: shardDef.description,
        count: 1,
    });

    // Remove the sold map from the overlay's snapshot.
    const idx = state.maps.indexOf(map);
    if (idx !== -1) state.maps.splice(idx, 1);

    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('player_equip_pickup');
    }
    showToast(t('eg_sell_item_sold')
        .replace('{name}', map.name || '???')
        .replace('{icon}', shardDef.icon)
        .replace('{shard}', shardDef.name));

    // Persist the sale immediately — egSaveHubState() already ran in
    // _egEndMap before the player had a chance to interact with this overlay.
    if (typeof egSaveHubState === 'function') egSaveHubState();

    if (!granted) showToast(t('eg_map_stash_full'));
    return true;
}

// Wires loot / item / currency chips to the global floating tooltip engine
// (tooltips-hud.js) plus the ctrl+click sell interaction for loot chips.
// The engine renders into a position:fixed element on document.body, so
// tooltips are never clipped by the panel's overflow-y. Listeners live on
// the panel (delegation), so re-rendering the summary rows is safe.
function _egWireLeaveMapSummaryTooltips(panel, state) {
    const buildFor = (chip) => {
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
        return '';
    };

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

    // Ctrl + left-click on an equipment loot chip → instant sell (random
    // orb shard). Ctrl + left-click on a map chip → instant sell for a
    // Horizon Fragment.
    panel.addEventListener('mousedown', (e) => {
        if (!e.ctrlKey || e.button !== 0) return;
        const chip = e.target.closest('.eg-loot-chip, .eg-map-pickup-chip');
        if (!chip) return;
        e.preventDefault();
        e.stopImmediatePropagation();

        if ('mapIdx' in chip.dataset) {
            const map = state.maps[+chip.dataset.mapIdx];
            if (!map) return;
            _egSellRunMapChip(map, state);
        } else {
            const item = state.loot[+chip.dataset.lootIdx];
            if (!item) return;
            _egSellRunLootChip(item, state);
        }
        hideGameTooltip();
        state.render();
    });
}

// Full-screen blocking overlay. Unlike _egShowChainCountdownOverlay (which
// deliberately uses pointer-events:none so clicks pass through), this one
// keeps normal pointer-events so it swallows every click — that's what
// actually fixes the "puzzle still clickable for 1-2s" issue.
function _egShowLeaveMapTransition() {
    _egInjectLeaveMapTransitionStyles();

    let el = document.getElementById('eg-leave-map-transition');
    if (!el) {
        el = document.createElement('div');
        el.id = 'eg-leave-map-transition';
        el.className = 'eg-leave-map-transition';
        document.body.appendChild(el);
    }

    el.innerHTML = `
        <div class="eg-leave-map-panel">
            <div class="eg-leave-map-title">${t('eg_map_cleared')}</div>
            <div id="eg-leave-summary-container"></div>
            <button class="eg-leave-map-return-btn" id="btn-eg-leave-map-return">${t('eg_return_to_nexus')}</button>
        </div>`;
    el.classList.add('show');

    // Snapshot the run data now — _egStopEncounter() (called by _egEndMap
    // right after this) wipes _egRunLoot/_egRunCurrency via _egChainCleanup.
    const state = {
        loot: [..._egRunLoot],
        items: [..._egRunItems],
        maps: [..._egRunMaps],
        currency: [..._egRunCurrency],
    };

    const panel = el.querySelector('.eg-leave-map-panel') || el;
    const container = document.getElementById('eg-leave-summary-container');
    const render = () => {
        if (container) {
            container.innerHTML = _egBuildLeaveMapSummaryHTML(state.loot, state.items, state.maps, state.currency);
        }
    };
    state.render = render;
    render();

    _egWireLeaveMapSummaryTooltips(panel, state);

    document.getElementById('btn-eg-leave-map-return').onclick = () => {
        _egHideLeaveMapTransition();
        showEndgameNexus();
    };
}

function _egHideLeaveMapTransition() {
    const el = document.getElementById('eg-leave-map-transition');
    if (el) el.classList.remove('show');
    if (typeof hideGameTooltip === 'function') hideGameTooltip();
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
        .eg-leave-summary-count {
            position: absolute; bottom: 1px; right: 2px;
            font-size: 0.6rem; font-weight: 700; color: #f0e6c0;
            text-shadow: 0 0 3px #000, 0 0 6px #000;
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