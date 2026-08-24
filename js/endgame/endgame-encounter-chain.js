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

// Chance-based bonus equipment loot when completing a map.
// The chance scales with puzzles solved and questions answered this run:
//   chance = puzzles * 5% + questions * 3%  (capped at 90%)
const EG_BONUS_LOOT_CHANCE_PER_PUZZLE = 0.05;
const EG_BONUS_LOOT_CHANCE_PER_QUESTION = 0.03;
const EG_BONUS_LOOT_CHANCE_MAX = 0.9;

// Returns the current bonus-loot drop chance (0–1) for this run.
function _egGetBonusLootChance() {
    return Math.min(EG_BONUS_LOOT_CHANCE_MAX,
        _egChainPuzzleSolvedCount * EG_BONUS_LOOT_CHANCE_PER_PUZZLE +
        _egQuestionsAnswered * EG_BONUS_LOOT_CHANCE_PER_QUESTION);
}

// Rolls for one bonus equipment item on map completion. On success the item
// is pushed into _egRunLoot so it flows through the normal flush-to-stash
// and leave-map summary paths. Must be called BEFORE _egShowLeaveMapTransition()
// so the summary screen includes it, and before _egChainCleanup wipes _egRunLoot.
function _egRollBonusMapLoot() {
    if (Math.random() > _egGetBonusLootChance()) return;
    if (typeof _egGenerateEquipmentDrop !== 'function') return;

    const baseLevel = (_egMapDef && _egMapDef.monsterLevel) ? _egMapDef.monsterLevel : 1;
    const item = _egGenerateEquipmentDrop(baseLevel);
    if (!item) return;

    _egRunLoot.push(item);
    showToast(t('eg_bonus_loot')
        .replace('{icon}', item.icon || '')
        .replace('{name}', item.name), _egRarityToastColor(item.rarity));
}

// Called only by the Leave Map button after _egCanLeaveMap() returns true.
// Called only by the Leave Map button after _egCanLeaveMap() returns true.
function _egEndMap() {
    if (!_egEncounterActive) return;
    _egCancelChainCountdown();

    // Roll for completion bonus loot first — it must land in _egRunLoot
    // before the transition overlay renders its summary.
    _egRollBonusMapLoot();

    // Show the overlay FIRST — it sits above the puzzle grid with normal
    // pointer-events, so it blocks every further click the instant this
    // runs, before any of the cleanup below happens.
    _egShowLeaveMapTransition();

    _egFlushRunLootToStash();
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
        return;
    }

    strip.classList.remove('eg-hidden');

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
            const icon = item.icon || '📦';

            // Generate the exact same tooltip frame used in your Endgame Hub
            const nestedTooltip = typeof _egBuildTooltipBodyHTML === 'function'
                ? _egBuildTooltipBodyHTML(item)
                : `<div style="padding: 5px;">${t('eg_tooltip_unavailable')}</div>`;

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
    _egChainKillCount = 0;
    _egChainPuzzleSolvedCount = 0;
    _egQuestionsAnswered = 0;
    _egChainCurrentGi = null;
    _egChainRecentGis = [];
    _egBossSpawned = false;
    _egMonsterSpawnCounter = 0;
    _egPuzzleCompleteFired = false;

    _egRunLoot = [];
    _egRunCurrency = [];
    // _egLootDrops is cleared by _egStopPickupSpawner via _egStopLootDrops

    // Hide the objectives strip
    const strip = document.getElementById('eg-objectives-strip');
    if (strip) strip.classList.add('eg-hidden');
}



//------------------------------------------------------------------------
//-------------------LEAVE MAP TRANSITION SCREEN--------------------------
//------------------------------------------------------------------------

// Builds the two summary rows (equipment loot + currency). Reads
// _egRunLoot / _egRunCurrency — must be called BEFORE _egStopEncounter()
// (which clears both via _egChainCleanup) so there's still data to show.
function _egBuildLeaveMapSummaryHTML() {
    const lootHTML = _egRunLoot.map((item, i) => `
        <div class="eg-leave-summary-chip eg-rarity-${item.rarity || 'common'}" data-loot-idx="${i}">
            ${item.icon || '📦'}
        </div>`).join('');

    const currencyHTML = _egRunCurrency.map((entry, i) => `
        <div class="eg-leave-summary-chip eg-rarity-currency" data-currency-idx="${i}">
            ${entry.icon || '💰'}
            ${entry.count > 1 ? `<span class="eg-leave-summary-count">×${entry.count}</span>` : ''}
        </div>`).join('');

    return `
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_loot_acquired').replace('{n}', _egRunLoot.length)}</div>
            <div class="eg-leave-summary-row">${lootHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>
        <div class="eg-leave-summary-section">
            <div class="eg-leave-summary-title">${t('eg_runes_orbs')}</div>
            <div class="eg-leave-summary-row">${currencyHTML || `<span class="eg-leave-summary-empty">${t('eg_no_loot_yet')}</span>`}</div>
        </div>`;
}

// Builds the hover tooltip body for a currency entry (equipment items go
// through _egBuildTooltipBodyHTML instead).
function _egBuildCurrencyTooltipHTML(entry) {
    return `<div class="eg-tt-frame" style="--tt-border:#b59248;">
        <div class="eg-tt-header">
            <div class="eg-tt-icon">${entry.icon || '💰'}</div>
            <div class="eg-tt-name" style="color:#f5d98a;">${entry.name}</div>
        </div>
    </div>`;
}

// Wires loot/currency chips to the global floating tooltip engine
// (tooltips-hud.js). The engine renders into a position:fixed element on
// document.body, so tooltips are never clipped by the panel's overflow-y.
// Reads the passed-in loot/currency snapshots instead of the live arrays,
// because _egChainCleanup wipes them right after this overlay opens.
function _egWireLeaveMapSummaryTooltips(panel, loot, currency) {
    const buildFor = (chip) => {
        if ('lootIdx' in chip.dataset) {
            const item = loot[+chip.dataset.lootIdx];
            return (item && typeof _egBuildTooltipBodyHTML === 'function')
                ? _egBuildTooltipBodyHTML(item) : '';
        }
        if ('currencyIdx' in chip.dataset) {
            const entry = currency[+chip.dataset.currencyIdx];
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
            ${_egBuildLeaveMapSummaryHTML()}
            <button class="eg-leave-map-return-btn" id="btn-eg-leave-map-return">${t('eg_return_to_nexus')}</button>
        </div>`;
    el.classList.add('show');

    // Snapshot the run data now — _egStopEncounter() (called by _egEndMap
    // right after this) wipes _egRunLoot/_egRunCurrency via _egChainCleanup.
    _egWireLeaveMapSummaryTooltips(
        el.querySelector('.eg-leave-map-panel') || el,
        [..._egRunLoot],
        [..._egRunCurrency]
    );

    document.getElementById('btn-eg-leave-map-return').onclick = () => {
        _egHideLeaveMapTransition();
        showEndgameHub();
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