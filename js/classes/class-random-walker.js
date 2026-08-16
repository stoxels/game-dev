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
const BEAR_STEP_MS_BY_RANK = {
    1: 5000,
    2: 4000,
    3: 3000,
};

// Path generation safety cap — prevents infinite loops on large grids
const BEAR_PATH_EMERGENCY_STOP = 1500;

// Throttle bear reveal sound: only plays once every 8–15 seconds
let _nextBearRevealSoundTime = 0;

// Active bear movement intervals — stored so they can be killed on level end
window._bearIntervals = window._bearIntervals || [];

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
function _createBearElement(icon, stepDurationMs) {
    const el = document.createElement('div');
    el.className = 'random-walker-agent bear-agent';
    el.textContent = icon;
    el.style.cssText = `
        position: fixed;
        font-size: 28px;
        z-index: 1000;
        pointer-events: none;
        transition: left ${stepDurationMs}ms linear, top ${stepDurationMs}ms linear;
        transform: translate(-50%, -50%);
        text-shadow: 0 4px 10px rgba(0,0,0,0.6);
    `;
    document.body.appendChild(el);
    return el;
}

// Plays the bear's fade-out animation, then removes it from the DOM.
function _removeBearElement(bearEl) {
    bearEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    bearEl.style.opacity = '0';
    bearEl.style.transform = 'translate(-50%, -80%) scale(1.5)';
    setTimeout(() => bearEl.remove(), 600);
}

// Starts the step-by-step interval loop that moves a bear along its pre-built path.
// Cleans up the HUD indicator and bear element when the path ends.
function _startBearAnimation(path, icon, stepDurationMs, bearName) {
    if (!path || path.length === 0) return;

    const bearEl = _createBearElement(icon, stepDurationMs);
    const totalSec = Math.ceil((path.length * stepDurationMs) / 1000);
    const hudUid = _spawnWalkerHudIndicator(icon, bearName, totalSec);

    // Place bear and reveal the starting cell immediately
    _agentSnapToCellCenter(bearEl, path[0].r, path[0].c);
    _revealCellForAgent(path[0].r, path[0].c);

    let step = 0;
    const interval = setInterval(() => {
        step++;

        if (step >= path.length) {
            // Path complete — clean up interval, HUD card, and bear visual
            clearInterval(interval);
            window._bearIntervals = window._bearIntervals.filter(id => id !== interval);
            _removeWalkerHudIndicator(hudUid);
            _removeBearElement(bearEl);
            return;
        }

        const target = path[step];
        _agentSnapToCellCenter(bearEl, target.r, target.c);
        _revealCellForAgent(target.r, target.c);
    }, stepDurationMs);

    window._bearIntervals.push(interval);
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
        showToast(`🐻 Browney unleashed!`);
    } else {
        showToast(`🐻 Browney & Wiener unleashed!`);
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
                _startBearAnimation(path1, "🐻", stepDurationMs, "Browney");
                if (path2) _startBearAnimation(path2, "🐼", stepDurationMs, "Wiener");
            },
            null
        );
    } else {
        _startBearAnimation(path1, "🐻", stepDurationMs, "Browney");
        if (path2) _startBearAnimation(path2, "🐼", stepDurationMs, "Wiener");
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

    showToast(`🐶 Drifter Level Up!`);
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
    const hudUid = _spawnWalkerHudIndicator("💥", "Fuse Countdown", 3);

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

        showToast(`💩 Kaboom!`);
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

    showToast(`🐶 Drifter is roaming!`);
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
// For the drifter card (isDrifter=true) it reads the global remaining time
// instead of counting down independently, so it stays in sync with feed bonuses.
function _startHudCardTicker(uniqueId, initialSeconds, isDrifter) {
    let timeRemaining = initialSeconds;

    const tickerInterval = setInterval(() => {
        if (isDrifter) {
            timeRemaining = Math.max(0, Math.floor(window._drifterTimeRemainingSeconds));
        } else {
            timeRemaining--;
        }

        const timerEl = document.getElementById(`${uniqueId}-timer`);
        if (timerEl) timerEl.textContent = `${timeRemaining}s`;

        // Non-drifter cards self-remove when they reach zero
        if (timeRemaining <= 0 && !isDrifter) {
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
}


//------------------------------------------------------------------------
//--------------------GLOBAL END-OF-LEVEL CLEANUP------------------------
//------------------------------------------------------------------------

// Called at the end of every level to stop all active walker agents,
// kill their timers, and wipe their DOM elements from the screen.
window.clearActiveRandomWalkers = function () {
    // Kill all bear movement intervals
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

    // Remove all agent visuals and the HUD panel from the DOM
    document.querySelectorAll('.random-walker-agent').forEach(el => el.remove());
    document.getElementById('walker-hud-panel')?.remove();
};