//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//----------------------------RANDOM WALKER CLASS-------------------------
//------------------------------------------------------------------------
// Each ascendency's active skills live here.
// Dispatch is routed from _dispatchAscendencyAbility in class-abilities.js.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//--------------------GLOBAL STATE & CONSTANTS----------------------------
//------------------------------------------------------------------------

// Bear step durations per skill rank (milliseconds per cell move)
// 30 % faster than the original 5000 / 4000 / 3000 values
const BEAR_STEP_MS_BY_RANK = {
    1: 3500,
    2: 2800,
    3: 2100,
};

// Seconds of remaining walk lost per mistake, by Brownian Motion rank
const BEAR_TIME_LOSS_S_BY_RANK = {
    1: 15,
    2: 10,
    3: 5,
};

// Path generation safety cap — prevents infinite loops on large grids
const BEAR_PATH_EMERGENCY_STOP = 1500;

// Throttle bear reveal sound: only plays once every 8–15 seconds
let _nextBearRevealSoundTime = 0;

// Active bear movement intervals — stored so they can be killed on level end
window._bearIntervals = window._bearIntervals || [];

// Live agent-state objects for every currently walking bear
// (path, progress, interval, HUD card). Used by the mistake penalty to
// shorten walks instead of removing the bears outright.
window._activeBearAgents = window._activeBearAgents || [];

// Remaining-time holders for walker HUD cards, keyed by card unique ID
// (drifter / fuse countdown cards). Bear timers now live directly on their
// agent state and are shown above the bear on the grid instead.
window._walkerHudState = window._walkerHudState || {};

// Active HUD timer intervals — each entry is { id, loopId }
window._walkerHudTimers = window._walkerHudTimers || [];


//------------------------------------------------------------------------
//--------------------SHARED CELL HELPERS---------------------------------
//------------------------------------------------------------------------

// Snaps an element to the center of a grid cell by DOM id (e.g. "g-2-4").
function _agentSnapToCellCenter(el, r, c) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl) return;
    const rect = cellEl.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
}

// Reveals a filled cell (value 1) that hasn't been revealed yet.
// Throttles the reveal sound so it doesn't spam on every step.
// Also fires quest tracking and win-check after each reveal attempt.
function _revealCellForAgent(r, c) {
    if (!cur) return;

    const now = Date.now();
    if (now >= _nextBearRevealSoundTime) {
        Audio_Manager.playSFX('browneyReveal');
        const randomDelay = (Math.random() * 7 + 8) * 1000; // 8–15 sec
        _nextBearRevealSoundTime = now + randomDelay;
    }

    const sol = cur.grid;

    if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
        revealedGrid[r][c] = true;
        userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        trackAchStat('tilesRevealed', 1);
        trackAchStat('brownianCellsRevealed');
        _applyCellEffect([`g-${r}-${c}`], 'reveal');

        if (typeof ptHasSkill === 'function' && ptHasSkill('adjacency_matrix')) {
            _adjacencyMatrixRefreshAll();
        }
    }
    // Note: empty-cell auto-marking (value 0) is intentionally disabled here.
    // Lines left as reference in case it's re-enabled:
    //   else if (sol[r][c] === 0 && userGrid[r][c] === 0) {
    //       userGrid[r][c] = 2; renderCell(r, c); _applyCellEffect([...], 'mark');
    //   }

    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    checkWin();
}


//------------------------------------------------------------------------
//--------------------BROWNIAN MOTION — PATH GENERATION------------------
//------------------------------------------------------------------------

// Builds a right-biased random walk path starting from (startR, 0).
// The bear always drifts rightward across the grid, with random vertical steps.
// Returns an array of { r, c } positions from left edge to right edge.
function _buildBearPath(startR, rows, cols) {
    const path = [];
    let r = startR;
    let c = 0;
    let emergencyStop = BEAR_PATH_EMERGENCY_STOP;

    path.push({ r, c });

    while (emergencyStop-- > 0) {
        if (c >= cols - 1) break; // Reached right edge — stop

        const possibleMoves = [];

        // Double-weight rightward movement to guarantee forward progress
        possibleMoves.push({ dr: 0, dc: 1 }, { dr: 0, dc: 1 });

        // Allow up/down only within grid bounds
        if (r > 0) possibleMoves.push({ dr: -1, dc: 0 });
        if (r < rows - 1) possibleMoves.push({ dr: 1, dc: 0 });

        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        r += move.dr;
        c += move.dc;
        path.push({ r, c });
    }

    return path;
}


//------------------------------------------------------------------------
//--------------------BROWNIAN MOTION — BEAR ANIMATION------------------
//------------------------------------------------------------------------

// Creates the floating bear DOM element and sets its initial CSS.
// Layout: remaining-time number on top, bear emoji below.
function _createBearElement(icon, stepDurationMs) {
    const el = document.createElement('div');
    el.className = 'random-walker-agent bear-agent';
    el.style.cssText = `
        position: fixed;
        z-index: 1000;
        pointer-events: none;
        transition: left ${stepDurationMs}ms linear, top ${stepDurationMs}ms linear;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    el.innerHTML = `
        <div class="bear-timer-text" style="font-size:13px;color:#f1c40f;font-family:monospace;font-weight:bold;margin-bottom:2px;text-shadow:0 2px 4px rgba(0,0,0,0.9);"></div>
        <div class="bear-icon" style="font-size:28px;text-shadow:0 4px 10px rgba(0,0,0,0.6);">${icon}</div>
    `;
    document.body.appendChild(el);
    return el;
}

// Updates the remaining-time number shown above the bear's head.
function _updateBearTimerLabel(state) {
    const el = state.bearEl?.querySelector('.bear-timer-text');
    if (el) el.textContent = `${Math.max(0, state.remainingSeconds)}s`;
}

// Plays the bear's fade-out animation, then removes it from the DOM.
function _removeBearElement(bearEl) {
    bearEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    bearEl.style.opacity = '0';
    bearEl.style.transform = 'translate(-50%, -80%) scale(1.5)';
    setTimeout(() => bearEl.remove(), 600);
}

// Starts the step-by-step interval loop that moves a bear along its pre-built path.
// Registers the walk in window._activeBearAgents so mistakes can shorten it.
// Draws the dashed path preview overlay and cleans up everything when the
// path ends. pathColor tints the dashed line (yellow Browney / grey Wiener).
// rank is stored on the agent so the mistake penalty can apply rank-scaled loss.
function _startBearAnimation(path, icon, stepDurationMs, bearName, pathColor, rank) {
    if (!path || path.length === 0) return;

    const bearEl = _createBearElement(icon, stepDurationMs);
    const totalSec = Math.ceil((path.length * stepDurationMs) / 1000);

    const state = {
        path,
        step: 0,          // index of the next cell to move onto
        stepDurationMs,
        rank: rank ?? 1,
        interval: null,
        timerInterval: null,
        remainingSeconds: totalSec,
        bearEl,
        pathColor,
        finished: false,
    };

    // Place bear and reveal the starting cell immediately
    _agentSnapToCellCenter(bearEl, path[0].r, path[0].c);
    _revealCellForAgent(path[0].r, path[0].c);
    _updateBearTimerLabel(state);

    state.interval = setInterval(() => {
        state.step++;

        if (state.step >= state.path.length) {
            // Path complete — clean up interval, timer label, and bear visual
            _finishBearAgent(state);
            return;
        }

        const target = state.path[state.step];
        _agentSnapToCellCenter(bearEl, target.r, target.c);
        _revealCellForAgent(target.r, target.c);
    }, stepDurationMs);

    // 1-second tick for the remaining-time number above the bear's head.
    // Mistakes subtract directly from remainingSeconds (see penalty below).
    state.timerInterval = setInterval(() => {
        state.remainingSeconds--;
        _updateBearTimerLabel(state);
    }, 1000);

    window._activeBearAgents.push(state);
    _redrawBearPathOverlays();
}

// Tears down one bear agent: kills its intervals and removes the bear visual.
// Safe to call multiple times (guarded via finished flag).
function _finishBearAgent(state) {
    if (state.finished) return;
    state.finished = true;

    if (state.interval) clearInterval(state.interval);
    if (state.timerInterval) clearInterval(state.timerInterval);
    window._activeBearAgents = window._activeBearAgents.filter(s => s !== state);

    _removeBearElement(state.bearEl);
    _redrawBearPathOverlays();
}


//------------------------------------------------------------------------
//--------------------BROWNIAN MOTION — MAIN ENTRY-----------------------
//------------------------------------------------------------------------

// Spawns one bear (rank 1–2) or two bears (rank 3) that walk across the grid.
// Each bear follows a right-biased random path and reveals cells as it walks.
function _executeBrownianMotion(row, col, paths, rank) {
    if (!cur) return false;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const stepDurationMs = BEAR_STEP_MS_BY_RANK[rank] ?? BEAR_STEP_MS_BY_RANK[1];

    // Primary bear — Browney
    const startR1 = Math.floor(Math.random() * rows);
    const path1 = _buildBearPath(startR1, rows, cols);

    // Second bear — Wiener (rank 3 / paths > 1 only)
    const startR2 = paths > 1 ? Math.floor(Math.random() * rows) : null;
    const path2 = paths > 1 ? _buildBearPath(startR2, rows, cols) : null;

    if (paths === 1) {
        showToast(t('cls_browney_unleashed'));
    } else {
        showToast(t('cls_browney_wiener_unleashed'));
        trackAchStat('skillBrowneyWienerSummon');
    }

    Audio_Manager.playSFX('browneySummon');

    // Play staff-swing animation on the player avatar (Trix only, other chars no-op)
    if (typeof _playAvatarSwingAnimation === 'function') _playAvatarSwingAnimation();

    // Charge the bear companion sprite to the starting cell, then begin animation
    if (typeof _chargeCompanionToCell === 'function') {
        _chargeCompanionToCell(
            'avatar-companion-brownian',
            path1[0].r, path1[0].c,
            () => {
                _startBearAnimation(path1, "🐻", stepDurationMs, "Browney", "#f1c40f", rank);
                if (path2) _startBearAnimation(path2, "🐼", stepDurationMs, "Wiener", "#95a5a6", rank);
            },
            null
        );
    } else {
        _startBearAnimation(path1, "🐻", stepDurationMs, "Browney", "#f1c40f", rank);
        if (path2) _startBearAnimation(path2, "🐼", stepDurationMs, "Wiener", "#95a5a6", rank);
    }

    return true;
}


//------------------------------------------------------------------------
//--------------------DRIFTER — STATE & DOM HELPERS----------------------
//------------------------------------------------------------------------

// Moves the drifter element to the center of the given grid cell.
function _drifterSnapToCell(el, r, c) {
    _agentSnapToCellCenter(el, r, c);
}

// Returns the adjacent grid cell the drifter should move to next.
// In smart mode, prefers unrevealed filled cells. Falls back to any neighbor.
function _drifterPickNextStep(r, c, rows, cols, smart, sol) {
    const neighbors = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    ]
        .map(n => ({ r: r + n.dr, c: c + n.dc }))
        .filter(n => n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols);

    if (smart) {
        const smartMoves = neighbors.filter(
            n => sol[n.r][n.c] === 1 && !revealedGrid[n.r][n.c] && userGrid[n.r][n.c] !== 1
        );
        if (smartMoves.length > 0) {
            return smartMoves[Math.floor(Math.random() * smartMoves.length)];
        }
    }

    return neighbors[Math.floor(Math.random() * neighbors.length)];
}

// Builds and appends the drifter DOM element (dog icon with level label and XP bar).
function _createDrifterElement(intervalMs) {
    const el = document.createElement('div');
    el.id = 'drifter-agent';
    el.className = 'random-walker-agent drifter-agent';
    el.style.cssText = `
        position: fixed;
        font-size: 28px;
        z-index: 1000;
        pointer-events: none;
        transition: left ${intervalMs}ms linear, top ${intervalMs}ms linear;
        transform: translate(-50%, -50%);
        text-shadow: 0 4px 10px rgba(0,0,0,0.6);
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    el.innerHTML = `
        <div id="drifter-lvl-text" style="font-size:12px;color:#48c9b0;font-family:monospace;font-weight:bold;margin-bottom:2px;">Lv.0</div>
        <div style="width:30px;height:5px;background:rgba(0,0,0,0.7);border:1px solid #48c9b0;border-radius:3px;margin-bottom:4px;overflow:hidden;">
            <div id="drifter-healthbar" style="width:0%;height:100%;background:#1abc9c;transition:width 0.3s;"></div>
        </div>
        <div id="drifter-icon">🐶</div>
        <div id="drifter-timer-text" style="font-size:12px;color:#f1c40f;font-family:monospace;font-weight:bold;margin-top:2px;">${window._drifterTimeRemainingSeconds}s</div>
    `;
    document.body.appendChild(el);
    return el;
}

// Kills all active drifter timers and removes its DOM element.
// Safe to call even if no drifter is currently active.
function _drifterClear() {
    window._drifterActive = false;
    window._drifterCurrPos = null;
    if (window._drifterInterval) { clearTimeout(window._drifterInterval); window._drifterInterval = null; }
    if (window._drifterTimer) { clearInterval(window._drifterTimer); window._drifterTimer = null; }
    if (window._drifterFuseInterval) { clearInterval(window._drifterFuseInterval); window._drifterFuseInterval = null; }
    document.getElementById('drifter-agent')?.remove();
}


//------------------------------------------------------------------------
//--------------------DRIFTER — LEVEL UP LOGIC---------------------------
//------------------------------------------------------------------------

// Returns the number of feed points required to reach the next drifter level.
// Formula: (currentLevel + 1) * 5  → Lv0→1: 5, Lv1→2: 10, Lv2→3: 15 ...
function _drifterXpRequiredForNextLevel(currentLevel) {
    return (currentLevel + 1) * 5;
}

// Triggers the level-up visual and audio effects on the drifter element.
function _drifterPlayLevelUpEffects(newLevel) {
    const drifterEl = document.getElementById('drifter-agent');
    if (drifterEl) {
        // Update CSS transition to reflect the new faster movement speed
        drifterEl.style.transition = `left ${window._drifterCurrentInterval}ms linear, top ${window._drifterCurrentInterval}ms linear`;

        // Quick pop scale animation
        drifterEl.style.transform = 'translate(-50%, -50%) scale(1.4)';
        setTimeout(() => {
            if (drifterEl) drifterEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 200);
    }

    const lvlEl = document.getElementById('drifter-lvl-text');
    if (lvlEl) lvlEl.innerText = `Lv.${newLevel}`;

    showToast(t('cls_drifter_levelup'));
    Audio_Manager.playSFX('drifterLevelUp');
    trackAchStat('drifterLevelUps');
}

// Updates the XP bar fill percentage based on current feed progress vs target.
function _drifterUpdateXpBar() {
    const required = _drifterXpRequiredForNextLevel(window._drifterCharges);
    const bar = document.getElementById('drifter-healthbar');
    if (bar) {
        bar.style.width = `${(window._drifterCurrentFeed / required) * 100}%`;
    }
}

// Public — called externally when the player feeds the drifter a tile reveal.
// Grants bonus lifetime, advances XP, and levels up the drifter if threshold is met.
window.feedDrifter = function () {
    if (!window._drifterActive) return;

    // Each feed point adds a small bonus to the drifter's remaining lifetime
    window._drifterTimeRemainingSeconds += 0.5;

    window._drifterCurrentFeed++;

    // Update the Drifter Timer on the grid when the player feeds Drifter
    const timerTextEl = document.getElementById('drifter-timer-text');
    if (timerTextEl) {
        timerTextEl.innerText = `${Math.max(0, Math.floor(window._drifterTimeRemainingSeconds))}s`;
    }

    const required = _drifterXpRequiredForNextLevel(window._drifterCharges);
    if (window._drifterCurrentFeed >= required) {
        window._drifterCurrentFeed = 0;
        window._drifterCharges++;

        // Each level reduces step interval by 15%, capped at 75% total speedup
        const speedMultiplier = Math.max(0.25, 1 - (window._drifterCharges * 0.15));
        window._drifterCurrentInterval = window._drifterBaseInterval * speedMultiplier;

        _drifterPlayLevelUpEffects(window._drifterCharges);
    }

    _drifterUpdateXpBar();
};


//------------------------------------------------------------------------
//--------------------DRIFTER — EXPLOSION PHASE--------------------------
//------------------------------------------------------------------------

// Strips the drifter's level UI and replaces the icon with a poop emoji
// to signal the incoming explosion.
function _drifterPrepareExplosionVisual(el) {
    document.getElementById('drifter-lvl-text')?.remove();
    document.getElementById('drifter-healthbar')?.parentElement?.remove();
    document.getElementById('drifter-timer-text')?.remove();

    el.style.transition = 'none';

    const iconEl = document.getElementById('drifter-icon');
    if (iconEl) iconEl.innerHTML = "💩";

    return iconEl; // Returned so the fuse countdown can be inserted before it
}

// Builds the fuse countdown label element and inserts it above the poop icon.
function _drifterCreateFuseElement(el, iconEl, initialCount) {
    const fuseEl = document.createElement('div');
    fuseEl.style.cssText = "color:#e74c3c;font-weight:bold;font-size:20px;font-family:monospace;margin-bottom:2px;";
    fuseEl.innerText = String(initialCount);
    if (el.contains(iconEl)) el.insertBefore(fuseEl, iconEl);
    return fuseEl;
}

// Reveals or marks all cells within the explosion radius around (r, c).
// Returns the total number of filled cells that were newly revealed.
function _drifterExplodeCells(r, c, radius, rows, cols) {
    let cellsRevealed = 0;

    for (let i = r - radius; i <= r + radius; i++) {
        for (let j = c - radius; j <= c + radius; j++) {
            if (i < 0 || i >= rows || j < 0 || j >= cols) continue;

            if (cur.grid[i][j] === 1 && !revealedGrid[i][j] && userGrid[i][j] !== 1) {
                revealedGrid[i][j] = true;
                userGrid[i][j] = 1;
                renderCell(i, j);
                updClues(i, j);
                _applyCellEffect([`g-${i}-${j}`], 'reveal');
                cellsRevealed++;
            } else if (cur.grid[i][j] === 0 && userGrid[i][j] === 0) {
                userGrid[i][j] = 2;
                renderCell(i, j);
                _applyCellEffect([`g-${i}-${j}`], 'mark');
            }
        }
    }

    return cellsRevealed;
}

// Fades out and removes the drifter DOM element after the explosion triggers.
function _drifterPlayExplosionAnimation(el) {
    el.style.transform = 'translate(-50%, -50%) scale(2)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
}

// Runs the 3-second fuse countdown, then detonates a radius explosion
// centered on the drifter's last position. Radius = drifter's final level.
function _drifterPoopExplosion(el, r, c, rows, cols) {
    window._drifterActive = false;

    if (!el || !document.body.contains(el)) return;

    const iconEl = _drifterPrepareExplosionVisual(el);
    const fuseEl = _drifterCreateFuseElement(el, iconEl, 3);
    const hudUid = _spawnWalkerHudIndicator("💥", t('cls_fuse_countdown'), 3);

    Audio_Manager.playSFX('drifterPoop');

    let countdown = 3;
    window._drifterFuseInterval = setInterval(() => {
        countdown--;

        if (countdown > 0) {
            if (fuseEl) fuseEl.innerText = String(countdown);
            return;
        }

        // Countdown hit 0 — detonate!
        clearInterval(window._drifterFuseInterval);
        window._drifterFuseInterval = null;
        _removeWalkerHudIndicator(hudUid);

        const radius = window._drifterCharges;
        const cellsRevealed = _drifterExplodeCells(r, c, radius, rows, cols);

        showToast(t('cls_kaboom'));
        Audio_Manager.playSFX('drifterExplosion');
        _drifterPlayExplosionAnimation(el);

        if (cellsRevealed > 0) trackAchStat('tilesRevealed', cellsRevealed);
        questStat_classRevealUsed(cellsRevealed);
        updateQuestStats('classAbilityUsedThisLevel', {});
        checkWin();
    }, 1000);
}


//------------------------------------------------------------------------
//--------------------DRIFTER — ROAMING LOOP-----------------------------
//------------------------------------------------------------------------

// Schedules the next drifter movement step using the current interval speed.
// Recursively reschedules itself until _drifterActive is false.
function _drifterScheduleNextStep(drifterEl, currPos, rows, cols, smartTarget, sol) {
    if (!window._drifterActive) return;

    window._drifterInterval = setTimeout(() => {
        if (!window._drifterActive) return;
        const next = _drifterPickNextStep(currPos.r, currPos.c, rows, cols, smartTarget, sol);
        currPos.r = next.r;
        currPos.c = next.c;

        _drifterSnapToCell(drifterEl, currPos.r, currPos.c);
        _revealCellForAgent(currPos.r, currPos.c);
        Audio_Manager.playSFX('drifterBark');

        _drifterScheduleNextStep(drifterEl, currPos, rows, cols, smartTarget, sol);
    }, window._drifterCurrentInterval);
}

// Starts the 1-second countdown timer that ends the drifter's active roaming phase
// and kicks off the poop explosion once time runs out.
function _drifterStartCountdownTimer(drifterEl, currPos, rows, cols, hudUid) {
    window._drifterTimer = setInterval(() => {
        window._drifterTimeRemainingSeconds--;

        // Update the Drifter Countdown Timer underneath the Icon 
        const timerTextEl = document.getElementById('drifter-timer-text');
        if (timerTextEl) {
            timerTextEl.innerText = `${Math.max(0, Math.floor(window._drifterTimeRemainingSeconds))}s`;
        }

        if (window._drifterTimeRemainingSeconds <= 0) {
            // Stop roaming — but keep the DOM element alive for the explosion phase
            window._drifterActive = false;
            if (window._drifterInterval) { clearTimeout(window._drifterInterval); window._drifterInterval = null; }
            if (window._drifterTimer) { clearInterval(window._drifterTimer); window._drifterTimer = null; }

            _removeWalkerHudIndicator(hudUid);
            _drifterPoopExplosion(drifterEl, currPos.r, currPos.c, rows, cols);
        }
    }, 1000);
}


//------------------------------------------------------------------------
//--------------------DRIFTER — MAIN ENTRY-------------------------------
//------------------------------------------------------------------------

// Summons a roaming drifter dog that walks the grid for `duration` ms,
// revealing cells as it goes. On expiry it explodes in a radius burst.
// `smartTarget` makes it prefer unrevealed filled cells over random movement.
function _executeSummonDrifter(duration, interval, smartTarget) {
    if (!cur) return;
    _drifterClear(); // Kill any pre-existing drifter cleanly

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Initialise global drifter state
    window._drifterActive = true;
    window._drifterCharges = 0;
    window._drifterCurrentFeed = 0;
    window._drifterBaseInterval = interval;
    window._drifterCurrentInterval = interval;
    window._drifterTimeRemainingSeconds = Math.ceil(duration / 1000);

    // Spawn at a random starting cell
    const currPos = {
        r: Math.floor(Math.random() * rows),
        c: Math.floor(Math.random() * cols),
    };
    window._drifterCurrPos = currPos; // kept for resize/zoom re-snapping

    showToast(t('cls_drifter_roaming'));
    Audio_Manager.playSFX('drifterSummon');
    trackAchStat('skillSummonDrifter');

    // Play staff-swing animation on the player avatar (Trix only, other chars no-op)
    if (typeof _playAvatarSwingAnimation === 'function') _playAvatarSwingAnimation();

    const hudUid = _spawnWalkerHudIndicator("🐶", "Drifter", window._drifterTimeRemainingSeconds, true);

    // Charge the dog companion sprite to the starting cell, then begin roaming
    const _beginDrifterRoam = () => {
        const drifterEl = _createDrifterElement(interval);
        _drifterSnapToCell(drifterEl, currPos.r, currPos.c);
        _revealCellForAgent(currPos.r, currPos.c);
        _drifterScheduleNextStep(drifterEl, currPos, rows, cols, smartTarget, sol);
        _drifterStartCountdownTimer(drifterEl, currPos, rows, cols, hudUid);
    };

    if (typeof _chargeCompanionToCell === 'function') {
        _chargeCompanionToCell(
            'avatar-companion-drifter',
            currPos.r, currPos.c,
            () => _beginDrifterRoam(),
            null
        );
    } else {
        _beginDrifterRoam();
    }
}


//------------------------------------------------------------------------
//--------------------HUD TIMER PANEL — HELPERS--------------------------
//------------------------------------------------------------------------

// Returns the walker HUD panel container, creating it if it doesn't exist yet.
function _getOrCreateHudPanel() {
    let container = document.getElementById('walker-hud-panel');
    if (!container) {
        container = document.createElement('div');
        container.id = 'walker-hud-panel';
        container.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 16px;
            z-index: 999;
            display: flex;
            flex-direction: column;
            gap: 6px;
            pointer-events: none;
            font-family: monospace;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Builds and returns the HUD card DOM element for a single active agent.
function _createHudCard(uniqueId, icon, label, initialSeconds) {
    const el = document.createElement('div');
    el.id = uniqueId;
    el.className = 'random-walker-agent';
    el.style.cssText = `
        background: rgba(15, 15, 25, 0.85);
        border: 1px solid #16a085;
        border-left: 4px solid #48c9b0;
        border-radius: 5px;
        padding: 6px 12px;
        font-size: 11px;
        color: #48c9b0;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        backdrop-filter: blur(4px);
        min-width: 130px;
        justify-content: space-between;
        animation: walkerHudSlide 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    `;
    el.innerHTML = `
        <span style="font-weight: bold;">${icon} ${label}</span>
        <span id="${uniqueId}-timer" style="color:#f1c40f;font-weight:bold;font-family:monospace;">${initialSeconds}s</span>
    `;
    return el;
}

// Starts the 1-second tick interval that updates a HUD card's displayed timer.
// The remaining time lives in a holder object inside window._walkerHudState
// (keyed by card ID) so the mistake penalty can shave seconds off it.
// For the drifter card (isDrifter=true) it reads the global remaining time
// instead of counting down independently, so it stays in sync with feed bonuses.
function _startHudCardTicker(uniqueId, initialSeconds, isDrifter) {
    const holder = { timeRemaining: initialSeconds };
    window._walkerHudState[uniqueId] = holder;

    const tickerInterval = setInterval(() => {
        if (isDrifter) {
            holder.timeRemaining = Math.max(0, Math.floor(window._drifterTimeRemainingSeconds));
        } else {
            holder.timeRemaining--;
        }

        const timerEl = document.getElementById(`${uniqueId}-timer`);
        if (timerEl) timerEl.textContent = `${holder.timeRemaining}s`;

        // Non-drifter cards self-remove when they reach zero
        if (holder.timeRemaining <= 0 && !isDrifter) {
            clearInterval(tickerInterval);
            _removeWalkerHudIndicator(uniqueId);
        }
    }, 1000);

    return tickerInterval;
}


//------------------------------------------------------------------------
//--------------------HUD TIMER PANEL — MAIN FUNCTIONS------------------
//------------------------------------------------------------------------

// Spawns a live timer card in the HUD panel for an active agent.
// Returns a unique ID that can later be passed to _removeWalkerHudIndicator.
// Set isDrifter=true to sync the timer with the drifter's globally modified duration.
function _spawnWalkerHudIndicator(icon, label, initialSeconds, isDrifter = false) {
    const container = _getOrCreateHudPanel();

    // Drifter always reuses the same fixed ID so there's never a duplicate card
    const uniqueId = isDrifter
        ? 'hud-walker-drifter-track'
        : `hud-walker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const el = _createHudCard(uniqueId, icon, label, initialSeconds);
    container.appendChild(el);

    const tickerInterval = _startHudCardTicker(uniqueId, initialSeconds, isDrifter);
    window._walkerHudTimers.push({ id: uniqueId, loopId: tickerInterval });

    return uniqueId;
}

// Fades out and removes a HUD card by its ID, and clears its ticker interval.
function _removeWalkerHudIndicator(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.8)';
        setTimeout(() => el.remove(), 200);
    }

    const match = window._walkerHudTimers.find(t => t.id === id);
    if (match) {
        clearInterval(match.loopId);
        window._walkerHudTimers = window._walkerHudTimers.filter(t => t.id !== id);
    }

    delete window._walkerHudState[id];
}


//------------------------------------------------------------------------
//--------------------BEAR PATH PREVIEW OVERLAY--------------------------
//------------------------------------------------------------------------

// Dashed SVG overlay drawn over the grid showing the path each active bear
// will still walk (yellow = Browney, grey = Wiener). On a mistake the cut-off
// tail segment flashes red, wiggles vertically, then fades out.

// Returns the viewport-space bounding box of the puzzle grid cells.
function _getGridCellBounds() {
    if (!cur) return null;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const first = document.getElementById('g-0-0');
    const last = document.getElementById(`g-${rows - 1}-${cols - 1}`);
    if (!first || !last) return null;

    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    return { left: a.left, top: a.top, right: b.right, bottom: b.bottom };
}

// Returns the viewport-space center of a grid cell (or null off-grid).
function _getCellCenterPx(r, c) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl) return null;
    const rect = cellEl.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Creates (once) and returns the fixed-position SVG overlay element.
function _ensureBearPathOverlaySvg() {
    let svg = document.getElementById('bear-path-overlay-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'bear-path-overlay-svg';
        svg.style.cssText = `
            position: fixed;
            z-index: 999;
            pointer-events: none;
            overflow: visible;
        `;
        document.body.appendChild(svg);
    }
    return svg;
}

// Sizes and positions the SVG so its local coordinates match viewport pixels
// inside the grid bounds. Returns the SVG or null when the grid is gone.
function _positionBearPathOverlaySvg() {
    const svg = _ensureBearPathOverlaySvg();
    const bounds = _getGridCellBounds();
    if (!bounds) {
        svg.style.display = 'none';
        return null;
    }

    const w = bounds.right - bounds.left;
    const h = bounds.bottom - bounds.top;

    Object.assign(svg.style, {
        display: 'block',
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${w}px`,
        height: `${h}px`,
    });
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return svg;
}

// Converts path steps to SVG-local polyline points.
function _pathStepsToPoints(steps) {
    const bounds = _getGridCellBounds();
    if (!bounds) return '';

    return steps
        .map(s => _getCellCenterPx(s.r, s.c))
        .filter(p => p)
        .map(p => `${(p.x - bounds.left).toFixed(1)},${(p.y - bounds.top).toFixed(1)}`)
        .join(' ');
}

// Redraws the dashed preview line for every currently walking bear.
// Called on ability cast, after each mistake cut, and whenever the grid
// moves (window resize / zoom / clue-side toggles).
function _redrawBearPathOverlays() {
    const svg = _positionBearPathOverlaySvg();
    if (!svg) return;

    const active = (window._activeBearAgents || []).filter(s => !s.finished);
    if (active.length === 0) {
        svg.style.display = 'none';
        return;
    }

    // Only remove the live preview lines — the temporary red "cut" animations
    // are separate groups that must survive redraws.
    svg.querySelectorAll('polyline[data-role="bear-path"]').forEach(p => p.remove());

    active.forEach(state => {
        const remaining = state.path.slice(Math.max(0, state.step));
        if (remaining.length < 2) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('data-role', 'bear-path');
        line.setAttribute('points', _pathStepsToPoints(remaining));
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', state.pathColor || '#f1c40f');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '7 7');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        line.setAttribute('opacity', '0.85');

        svg.appendChild(line);
    });
}

// Plays the "this part of the path is now gone" animation for a mistake:
// the removed tail is redrawn in red, wiggles up/down for ~0.5 s, then
// fades out and removes itself.
function _playPathCutAnimation(lostSteps, baseColor) {
    const svg = _positionBearPathOverlaySvg();
    if (!svg || !lostSteps || lostSteps.length < 2) return;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-role', 'bear-path-cut');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', _pathStepsToPoints(lostSteps));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#e74c3c');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-dasharray', '7 7');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');

    group.appendChild(line);
    svg.appendChild(group);

    // Wiggle ~0.5 s, then fade; total lifetime 1.1 s
    group.style.animation = 'bearPathCutWiggle 0.25s linear 2, bearPathCutFadeOut 0.6s ease 0.5s forwards';
    setTimeout(() => group.remove(), 1100);
}

// Public reposition hook — snaps all agents instantly back onto their current
// grid cell (no glide across a resized layout) and redraws the path overlays.
// Wired to window resize, puzzle zoom and clue-side toggles.
window._repositionRandomWalkerAgents = function () {
    (window._activeBearAgents || []).forEach(state => {
        if (state.finished || !state.bearEl) return;
        const pos = state.path[Math.min(state.step, state.path.length - 1)];
        state.bearEl.style.transition = 'none';
        _agentSnapToCellCenter(state.bearEl, pos.r, pos.c);
        void state.bearEl.offsetWidth; // force reflow so the jump is instant
        requestAnimationFrame(() => {
            state.bearEl.style.transition =
                `left ${state.stepDurationMs}ms linear, top ${state.stepDurationMs}ms linear`;
        });
    });

    if (window._drifterActive && window._drifterCurrPos) {
        const drifterEl = document.getElementById('drifter-agent');
        if (drifterEl) {
            drifterEl.style.transition = 'none';
            _drifterSnapToCell(drifterEl, window._drifterCurrPos.r, window._drifterCurrPos.c);
            void drifterEl.offsetWidth;
            requestAnimationFrame(() => {
                drifterEl.style.transition =
                    `left ${window._drifterCurrentInterval}ms linear, top ${window._drifterCurrentInterval}ms linear`;
            });
        }
    }

    _redrawBearPathOverlays();
};

window.addEventListener('resize', () => {
    // Only react while walkers are actually on the grid — avoids spawning
    // the overlay SVG on menu screens.
    if ((window._activeBearAgents || []).length > 0 || window._drifterActive) {
        window._repositionRandomWalkerAgents();
    }
}, { passive: true });


//------------------------------------------------------------------------
//--------------------MISTAKE PENALTY------------------------------------
//------------------------------------------------------------------------

// Public — called on every real (unabsorbed) player mistake. Instead of
// fleeing outright, active walkers lose remaining time:
//   Browney / Wiener lose 15s (rank 1), 10s (rank 2) or 5s (rank 3) each,
//   Drifter loses 5 seconds of roaming time.
window.penalizeRandomWalkersOnMistake = function () {
    const DRIFTER_TIME_LOSS_S = 5;

    // Bears — chop steps worth ~N s off the END of each active walk, so
    // the bear simply stops earlier instead of skipping cells mid-path.
    // The removed tail flashes red on the path preview, then fades out.
    // Loss is rank-scaled: 15s / 10s / 5s for rank 1 / 2 / 3.
    (window._activeBearAgents || []).slice().forEach(state => {
        const bearLoss = BEAR_TIME_LOSS_S_BY_RANK[state.rank] ?? BEAR_TIME_LOSS_S_BY_RANK[1];
        const remainingSteps = state.path.length - state.step - 1; // steps after the current one
        const stepsToCut = Math.ceil((bearLoss * 1000) / state.stepDurationMs);

        if (remainingSteps <= stepsToCut) {
            // Not enough walk left to survive the penalty — the entire
            // remaining tail is lost and the bear heads home early.
            // Finish first, then animate: the cut animation re-shows the
            // overlay even when this was the last active bear.
            const lostTail = state.path.slice(state.step + 1);
            _finishBearAgent(state);
            if (lostTail.length > 1) _playPathCutAnimation(lostTail, state.pathColor);
            return;
        }

        const lostTail = state.path.splice(state.path.length - stepsToCut, stepsToCut);
        _playPathCutAnimation(lostTail, state.pathColor);

        state.remainingSeconds = Math.max(0, state.remainingSeconds - bearLoss);
        _updateBearTimerLabel(state);
        _redrawBearPathOverlays();
    });

    // Drifter — shave 5 s off its remaining roaming time. If that drains
    // the timer completely, its own countdown triggers the explosion.
    if (window._drifterActive) {
        window._drifterTimeRemainingSeconds = Math.max(0, window._drifterTimeRemainingSeconds - DRIFTER_TIME_LOSS_S);

        const timerTextEl = document.getElementById('drifter-timer-text');
        if (timerTextEl) {
            timerTextEl.innerText = `${Math.max(0, Math.floor(window._drifterTimeRemainingSeconds))}s`;
        }
    }
};


//------------------------------------------------------------------------
//--------------------GLOBAL END-OF-LEVEL CLEANUP------------------------
//------------------------------------------------------------------------

// Called at the end of every level to stop all active walker agents,
// kill their timers, and wipe their DOM elements from the screen.
window.clearActiveRandomWalkers = function () {
    // Tear down all walking bears (interval + HUD card + visual)
    (window._activeBearAgents || []).slice().forEach(_finishBearAgent);
    window._activeBearAgents = [];

    // Legacy interval list kept for safety — should already be empty
    if (window._bearIntervals?.length > 0) {
        window._bearIntervals.forEach(id => clearInterval(id));
        window._bearIntervals = [];
    }

    // Kill all HUD ticker intervals
    if (window._walkerHudTimers?.length > 0) {
        window._walkerHudTimers.forEach(hud => clearInterval(hud.loopId));
        window._walkerHudTimers = [];
    }

    // Shut down drifter (including any active fuse countdown)
    _drifterClear();

    // Remove all agent visuals, the path preview overlay and the HUD panel
    document.querySelectorAll('.random-walker-agent').forEach(el => el.remove());
    document.getElementById('bear-path-overlay-svg')?.remove();
    document.getElementById('walker-hud-panel')?.remove();
};