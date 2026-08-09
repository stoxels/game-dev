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
    // Show an interstitial question first, then begin the 3-2-1 countdown.
    _egShowInterstitialQuestion(() => {
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
    });
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
        showToast('⚠️ No more puzzles available in this pool.');
        return;
    }

    _egChainCurrentGi = nextGi;
    ALL[nextGi].isMonsterLevel = true;
    ALL[nextGi].isChainedPuzzle = true;

    // Snapshot loot still on the grid before buildGrid() destroys the overlays
    const carriedLoot = Array.from(_egLootDrops.values());
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

function _egFindNextChainPuzzleGi() {
    const activeDef = _egMapDef || cur;
    const criteria = (activeDef.puzzlePool && typeof activeDef.puzzlePool === 'object')
        ? activeDef.puzzlePool : {};
    const pool = _egBuildChainPool(criteria);
    if (pool.length === 0) { console.warn('EG chain: no puzzles matched criteria', criteria); return null; }
    return _egPickFromPool(pool, criteria.recentWindow);
}


//------------------------------------------------------------------------
//-------------------ENCOUNTER CHAIN: MAP END (voluntary)----------------
//------------------------------------------------------------------------

// Called only by the Leave Map button after _egCanLeaveMap() returns true.
function _egEndMap() {
    if (!_egEncounterActive) return;
    _egCancelChainCountdown();
    _egFlushRunLootToStash();
    egSaveHubState();
    _egStopEncounter();

    if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar();

    showToast('🏆 Map cleared!');
    setTimeout(() => goToLevelSelect(), 2500);
}


// Called by the Leave Map button in the HUD.
function _egTryLeaveMap() {
    if (!_egCanLeaveMap()) {
        showToast('⚠️ Complete all objectives before leaving!');
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
        return;
    }

    strip.classList.remove('eg-hidden');

    const req = _egGetMapRequirements();
    const rows = [];

    // Monsters (Capped)
    if (req.totalMonsters > 0) {
        const count = Math.min(_egChainKillCount, req.totalMonsters);
        const done = count >= req.totalMonsters;
        rows.push(_egObjItem('⚔️', `${count}/${req.totalMonsters} Monsters`, done));
    }

    // Boss (Simplified format)
    if (req.hasBoss) {
        const done = _egBossDefeated();
        const count = done ? 1 : 0;
        rows.push(_egObjItem('💀', `Boss ${count}/1`, done));
    }

    // Puzzles (Capped)
    if (req.requiredPuzzles > 0) {
        const count = Math.min(_egChainPuzzleSolvedCount, req.requiredPuzzles);
        const done = count >= req.requiredPuzzles;
        rows.push(_egObjItem('🧩', `${count}/${req.requiredPuzzles} Puzzles`, done));
    }

    // Questions (Capped)
    if (req.requiredQuestions > 0) {
        const count = Math.min(_egQuestionsAnswered, req.requiredQuestions);
        const done = count >= req.requiredQuestions;
        rows.push(_egObjItem('❓', `${count}/${req.requiredQuestions} Questions`, done));
    }

    // Loot acquired (Always shows, uses custom helper for tooltip)
    rows.push(_egBuildLootItem());

    const canLeave = _egCanLeaveMap();

    strip.innerHTML = `
        <div class="eg-obj-header">Objectives</div>
        ${rows.join('')}
        <button class="eg-leave-btn ${canLeave ? 'eg-leave-ready' : 'eg-leave-locked'}"
                onclick="_egTryLeaveMap()">
            ${canLeave ? '🏆 Leave Map' : '🔒 Leave Map'}
        </button>`;
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
            const displayName = item.baseName || item.name || 'Unknown Item';
            const icon = item.icon || '📦';

            // Generate the exact same tooltip frame used in your Endgame Hub
            const nestedTooltip = typeof _egBuildTooltipBodyHTML === 'function'
                ? _egBuildTooltipBodyHTML(item)
                : '<div style="padding: 5px;">Tooltip unavailable</div>';

            return `
                <div class="eg-loot-item-row" style="color: ${color};">
                    <span class="eg-loot-item-icon">${icon}</span>${displayName}
                    <div class="eg-nested-tooltip">
                        ${nestedTooltip}
                    </div>
                </div>`;
        }).join('');

        tooltipHTML = `<div class="eg-loot-tooltip">${itemsList}</div>`;
    } else {
        tooltipHTML = `<div class="eg-loot-tooltip" style="color: #888;">No loot acquired yet</div>`;
    }

    return `
        <div class="eg-obj-item eg-loot-container eg-obj-pending">
            📦 Loot Acquired: ${count}
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
        <div style="font-size:1.1rem;color:#aaa;margin-bottom:0.4rem;letter-spacing:.1em;">PUZZLE SOLVED</div>
        <div id="eg-chain-countdown-num" style="font-size:4rem;font-weight:700;color:#fff;line-height:1;">${secs}</div>
        <div style="font-size:0.9rem;color:#888;margin-top:0.5rem;">Next puzzle in…</div>`;
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
    _egChainKillCount = 0;
    _egChainPuzzleSolvedCount = 0;
    _egQuestionsAnswered = 0;
    _egChainCurrentGi = null;
    _egChainRecentGis = [];
    _egBossSpawned = false;
    _egMonsterSpawnCounter = 0;
    _egPuzzleCompleteFired = false;

    _egRunLoot = [];
    // _egLootDrops is cleared by _egStopPickupSpawner via _egStopLootDrops

    // Hide the objectives strip
    const strip = document.getElementById('eg-objectives-strip');
    if (strip) strip.classList.add('eg-hidden');
}