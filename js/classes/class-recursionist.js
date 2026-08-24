//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS-------------------
//----------------------------RECURSIONIST CLASS-------------------------
//------------------------------------------------------------------------
/*
    Handles all logic for the Recursionist class abilities:
      - Residual: summons a roaming skeleton on a mistake cell that fires
        revealing beams at adjacent correct cells and leaps between mistakes
      - Degrees of Freedom: raises a zombie that wanders the grid and
        challenges the player to correctly fill or mark the cell it haunts
//------------------------------------------------------------------------  
*/


//------------------------------------------------------------------------
// -------------------STATE & CONSTANTS------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Active skeleton instances:
// { id, row, col, remainingSecs, fireIntervalSecs, visited:Set,
//   moveTimeout, fireTimeout, tickInterval, el, jumping, finished }
window._residualSkeletons = [];

// Milliseconds the skeleton needs to walk from one cell to the next
const SKELETON_STEP_MS = 1000;

// Milliseconds the arc jump between two mistakes takes
const SKELETON_JUMP_MS = 700;

// Active DoF zombie instance (single zombie at a time, lasts the whole level):
// { row, col, nextChallengeAt, moveTimeout, el,
//   challenge: null | { row, col, secondsLeft, dwellTimeout,
//                       countdownInterval, pollInterval }, finished }
window._dofZombie = null;

// Zombie movement / challenge timing
const ZOMBIE_STEP_MS = 900;        // ms per wandering step
const ZOMBIE_DWELL_MS = 5000;      // ms the zombie stands still before the countdown
const ZOMBIE_COUNTDOWN_SECS = 10;  // seconds the player has to react
const ZOMBIE_CURSE_RADIUS = 2;     // Chebyshev radius for the fake-mistake reward

// Pause between challenges (ms) — the zombie wanders quietly in between so
// the player can focus on puzzling instead of watching the zombie
const ZOMBIE_CHALLENGE_GRACE_MIN_MS = 25000;
const ZOMBIE_CHALLENGE_GRACE_MAX_MS = 40000;
// Initial quiet period after summoning before the first challenge can start
const ZOMBIE_FIRST_CHALLENGE_DELAY_MS = 12000;

// Tracks cells that were reverted by Degrees of Freedom (used to skip cleanup in renderCell)
window._dofRevertedCells = new Set();


//------------------------------------------------------------------------
// -------------------RESIDUAL SKELETON: ENTRY POINT-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Called when the player activates the Residual skill on a mistake cell.
    Summons a roaming skeleton that walks up and down the mistake's column,
    fires revealing beams at adjacent correct cells, and leaps between
    mistake cells - spawning additional skeletons as it goes.
*/
function _executeResidual(row, col, effect) {

    // Check if the clicked cell is actually a marked mistake
    if (!wrongGrid[row][col]) {
        showToast(t('cls_totem_mistake_only'));
        _refundCooldown('active3'); // active3 is the slot for this skill
        return;
    }

    const { durationSecs, fires, maxSkeletons } = effect;

    showToast(t('cls_residual_summoned')
        .replace('{d}', durationSecs)
        .replace('{f}', fires));
    Audio_Manager.playSFX('residualSummon');

    _spawnResidualSkeleton(_generateSkeletonId(), row, col, durationSecs, fires, null, maxSkeletons);
    trackAchStat('skillResidualUsed');
}

// Generates a collision-safe unique ID string for a new skeleton
function _generateSkeletonId() {
    return `skeleton-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}


//------------------------------------------------------------------------
// -------------------RESIDUAL SKELETON: LIFECYCLE-------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Creates a skeleton, adds it to the DOM and the global list, then starts
    its movement loop, fire cycle and 1-second countdown timer.

    visitedKeys (optional): Set of "r-c" strings marking mistakes this
    skeleton must not jump from again (prevents infinite jump loops).
    maxSkeletons (optional): cap on concurrently alive skeletons; child
    spawns are skipped while the cap is reached.
*/
function _spawnResidualSkeleton(id, row, col, durationSecs, fireIntervalSecs, visitedKeys, maxSkeletons = 2) {
    const sk = {
        id,
        row,
        col,
        remainingSecs: durationSecs,
        totalSecs: durationSecs,
        fireIntervalSecs,
        maxSkeletons,
        visited: new Set(visitedKeys || []),
        moveTimeout: null,
        fireTimeout: null,
        tickInterval: null,
        el: null,
        jumping: false,
        finished: false,
    };
    window._residualSkeletons.push(sk);

    sk.el = _createSkeletonElement(sk);
    _skeletonSnapToCell(sk.el, row, col);

    // Movement loop
    _scheduleNextSkeletonMove(sk);

    // First volley after a short summon delay, then every fireIntervalSecs
    sk.fireTimeout = setTimeout(() => _skeletonFireCycle(id), 2000);

    // 1-second countdown shown above the skeleton
    sk.tickInterval = setInterval(() => {
        sk.remainingSecs--;
        _updateSkeletonLabel(sk);
        if (sk.remainingSecs <= 0) _clearSpecificSkeleton(sk.id);
    }, 1000);
}

// Returns the skeleton object with the given id, or undefined if not found
function _findSkeletonById(id) {
    return window._residualSkeletons.find(s => s.id === id);
}

// Returns how many skeletons are currently alive (cap checks for child spawns)
function _countAliveSkeletons() {
    return window._residualSkeletons.length;
}

/*
    Removes a specific skeleton: cancels its timers, fades out its DOM
    element and removes it from the global list.
*/
function _clearSpecificSkeleton(id) {
    const idx = window._residualSkeletons.findIndex(s => s.id === id);
    if (idx === -1) return;

    const sk = window._residualSkeletons[idx];
    if (sk.finished) return;
    sk.finished = true;

    if (sk.moveTimeout) clearTimeout(sk.moveTimeout);
    if (sk.fireTimeout) clearTimeout(sk.fireTimeout);
    if (sk.tickInterval) clearInterval(sk.tickInterval);

    Audio_Manager.playSFX('residualDespawn');
    _removeSkeletonElement(sk.el);

    window._residualSkeletons.splice(idx, 1);
}

// Removes all active skeletons (e.g. on level reset)
function _clearAllResidualSkeletons() {
    if (!window._residualSkeletons || window._residualSkeletons.length === 0) return;
    for (let i = window._residualSkeletons.length - 1; i >= 0; i--) {
        _clearSpecificSkeleton(window._residualSkeletons[i].id);
    }
    window._residualSkeletons = [];
}


//------------------------------------------------------------------------
// -------------------RESIDUAL SKELETON: MOVEMENT & JUMPING---------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Schedules the skeleton's next step; idles while an arc jump is in progress
function _scheduleNextSkeletonMove(sk) {
    sk.moveTimeout = setTimeout(() => {
        if (sk.finished) return;
        if (!sk.jumping) _skeletonStep(sk);
        _scheduleNextSkeletonMove(sk);
    }, SKELETON_STEP_MS);
}

// Moves the skeleton one row up or down within its column, then checks for jumps
function _skeletonStep(sk) {
    if (!cur) return;
    const rows = cur.grid.length;
    if (rows <= 1) { _trySkeletonJump(sk); return; }

    let dr = Math.random() < 0.5 ? -1 : 1;
    let nextRow = sk.row + dr;

    // Bounce off the grid edges
    if (nextRow < 0 || nextRow > rows - 1) nextRow = sk.row - dr;
    if (nextRow === sk.row) { _trySkeletonJump(sk); return; }

    sk.row = nextRow;
    _skeletonSnapToCell(sk.el, sk.row, sk.col);

    // Walking over a mistake may trigger a leap to a distant column
    _trySkeletonJump(sk);
}

/*
    If the skeleton is standing on a mistake cell it hasn't used yet, it
    leaps to a random mistake exactly 2 columns away (any row). On landing,
    an additional skeleton with a fresh 20 s lifetime spawns at that spot.

    The mistake is only marked as visited once a jump actually happens -
    if no target exists yet, the skeleton may jump from it later when new
    mistakes appear in a valid column.
*/
function _trySkeletonJump(sk) {
    if (!cur || !wrongGrid[sk.row] || !wrongGrid[sk.row][sk.col]) return;

    const originKey = `${sk.row}-${sk.col}`;
    if (sk.visited.has(originKey)) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    // Collect candidate mistakes in the columns -2 (one gap column between)
    const candidates = [];
    for (const c of [sk.col - 2, sk.col + 2]) {
        if (c < 0 || c >= cols) continue;
        for (let r = 0; r < rows; r++) {
            if (wrongGrid[r][c] && !sk.visited.has(`${r}-${c}`)) candidates.push({ r, c });
        }
    }
    if (candidates.length === 0) return;

    // A jump is actually happening - consume the origin mistake now
    sk.visited.add(originKey);

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    sk.jumping = true;

    Audio_Manager.playSFX('residualSummon');
    showToast(t('cls_residual_jump'));

    // Switch to the slower arc transition and glide to the target cell
    sk.el.classList.add('skeleton-jump-arc');
    sk.el.style.transition =
        `left ${SKELETON_JUMP_MS}ms ease-in-out, top ${SKELETON_JUMP_MS}ms ease-in-out`;
    _skeletonSnapToCell(sk.el, target.r, target.c);

    setTimeout(() => {
        if (sk.finished) return;
        sk.row = target.r;
        sk.col = target.c;
        // NOTE: the landing mistake is intentionally NOT marked visited.
        // The skeleton may jump from it again once it wanders back over it,
        // which lets it chain onwards through columns with a single mistake.
    }, SKELETON_JUMP_MS + 50);

    setTimeout(() => {
        if (sk.finished) return;
        sk.jumping = false;
        sk.el.classList.remove('skeleton-jump-arc');
        sk.el.style.transition =
            `left ${SKELETON_STEP_MS}ms linear, top ${SKELETON_STEP_MS}ms linear`;

        // Spawn an additional skeleton at the landing point - unless the
        // concurrent-skeleton cap (2/3/4 by rank) is already reached.
        // It inherits the beam interval and cap, and starts with an empty
        // visited set, so it too can jump onwards from the landing mistake.
        if (_countAliveSkeletons() < sk.maxSkeletons) {
            _spawnResidualSkeleton(
                _generateSkeletonId(), target.r, target.c,
                20, sk.fireIntervalSecs, null, sk.maxSkeletons
            );
        }
    }, SKELETON_JUMP_MS + 100);
}


//------------------------------------------------------------------------
// -------------------RESIDUAL SKELETON: BEAM LOGIC-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Repeats the volley every fireIntervalSecs until the skeleton expires
function _skeletonFireCycle(id) {
    const sk = _findSkeletonById(id);
    if (!sk) return;

    _skeletonFireVolley(sk);
    sk.fireTimeout = setTimeout(() => _skeletonFireCycle(id), sk.fireIntervalSecs * 1000);
}

/*
    Fires beams at all adjacent unrevealed correct cells around the
    skeleton. Each beam is slightly staggered for a nicer visual rhythm.
*/
function _skeletonFireVolley(sk) {
    if (!cur) return;

    const targets = _findAdjacentRevealableCells(sk.row, sk.col);
    targets.forEach((target, i) => {
        setTimeout(() => {
            if (sk.finished) return;
            _residualDrawBeam(sk.row, sk.col, target.r, target.c, () => {
                _revealCellFromSkeleton(target.r, target.c);
            });
        }, i * 120);
    });
}

// Scans the 8 neighbours of (row, col) and returns all unrevealed correct cells
function _findAdjacentRevealableCells(row, col) {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const cells = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
            if (sol[r][c] === 1 && !revealedGrid[r][c] && userGrid[r][c] !== 1) {
                cells.push({ r, c });
            }
        }
    }
    return cells;
}

// Applies the reveal to a cell and fires all relevant side-effects
function _revealCellFromSkeleton(r, c) {
    revealedGrid[r][c] = true;
    userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    trackAchStat('residualBeamsFired');
    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});
    checkWin();
}

/*
    Draws a redesigned energy beam from the skeleton to the target cell:
    a gradient glow line with a bright travelling pulse and an expanding
    impact ring on the target. Plays the reveal sound, then fades out.
*/
function _residualDrawBeam(fromRow, fromCol, toRow, toCol, onComplete) {
    Audio_Manager.playSFX('residualReveal');

    const fromEl = document.getElementById(`g-${fromRow}-${fromCol}`);
    const toEl = document.getElementById(`g-${toRow}-${toCol}`);
    if (!fromEl || !toEl) { onComplete(); return; }

    const beamSvg = _buildBeamSvg(fromEl, toEl);
    document.body.appendChild(beamSvg);

    // Reveal cell after travel delay, then fade the whole effect out
    setTimeout(() => {
        onComplete();
        setTimeout(() => _fadeOutElement(beamSvg, 1, 0.06), 700);
    }, 300);
}

// Builds and returns a positioned SVG element containing the full beam effect
function _buildBeamSvg(fromEl, toEl) {
    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    const x1 = fr.left + fr.width / 2;
    const y1 = fr.top + fr.height / 2;
    const x2 = tr.left + tr.width / 2;
    const y2 = tr.top + tr.height / 2;

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('residual-beam-svg');
    svg.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        pointer-events: none; z-index: 9000; overflow: visible;
    `;

    const uid = `beam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Gradient running along the beam direction
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', `${uid}-grad`);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', x1); grad.setAttribute('y1', y1);
    grad.setAttribute('x2', x2); grad.setAttribute('y2', y2);
    [
        ['0%', '#e9d8ff'],
        ['55%', '#bb8fce'],
        ['100%', '#8e44ad'],
    ].forEach(([offset, color]) => {
        const stop = document.createElementNS(svgNS, 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', color);
        grad.appendChild(stop);
    });

    // Soft glow filter for the outer line
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', `${uid}-glow`);
    filter.setAttribute('x', '-40%'); filter.setAttribute('y', '-40%');
    filter.setAttribute('width', '180%'); filter.setAttribute('height', '180%');
    const blur = document.createElementNS(svgNS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    filter.appendChild(blur);

    const defs = document.createElementNS(svgNS, 'defs');
    defs.appendChild(grad);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Outer glow line
    const glowLine = document.createElementNS(svgNS, 'line');
    glowLine.setAttribute('x1', x1); glowLine.setAttribute('y1', y1);
    glowLine.setAttribute('x2', x2); glowLine.setAttribute('y2', y2);
    glowLine.setAttribute('stroke', `url(#${uid}-grad)`);
    glowLine.setAttribute('stroke-width', '7');
    glowLine.setAttribute('stroke-linecap', 'round');
    glowLine.setAttribute('opacity', '0.45');
    glowLine.setAttribute('filter', `url(#${uid}-glow)`);
    svg.appendChild(glowLine);

    // Bright thin core line
    const coreLine = document.createElementNS(svgNS, 'line');
    coreLine.setAttribute('x1', x1); coreLine.setAttribute('y1', y1);
    coreLine.setAttribute('x2', x2); coreLine.setAttribute('y2', y2);
    coreLine.setAttribute('stroke', '#f3e8ff');
    coreLine.setAttribute('stroke-width', '2');
    coreLine.setAttribute('stroke-linecap', 'round');
    svg.appendChild(coreLine);

    // Travelling energy pulse along the beam path
    const pulse = document.createElementNS(svgNS, 'circle');
    pulse.setAttribute('r', '4');
    pulse.setAttribute('fill', '#ffffff');
    pulse.style.filter = 'drop-shadow(0 0 4px #d7bde2)';
    const motion = document.createElementNS(svgNS, 'animateMotion');
    motion.setAttribute('path', `M ${x1} ${y1} L ${x2} ${y2}`);
    motion.setAttribute('dur', '0.3s');
    motion.setAttribute('fill', 'freeze');
    pulse.appendChild(motion);
    svg.appendChild(pulse);

    // Expanding impact ring on the target cell
    const ring = document.createElementNS(svgNS, 'circle');
    ring.setAttribute('cx', x2); ring.setAttribute('cy', y2);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#d7bde2');
    ring.setAttribute('stroke-width', '2');
    ring.setAttribute('r', '2');
    ring.setAttribute('opacity', '0');
    const ringR = document.createElementNS(svgNS, 'animate');
    ringR.setAttribute('attributeName', 'r');
    ringR.setAttribute('from', '2'); ringR.setAttribute('to', '16');
    ringR.setAttribute('begin', '0.25s'); ringR.setAttribute('dur', '0.45s');
    ringR.setAttribute('fill', 'freeze');
    const ringO = document.createElementNS(svgNS, 'animate');
    ringO.setAttribute('attributeName', 'opacity');
    ringO.setAttribute('from', '0.9'); ringO.setAttribute('to', '0');
    ringO.setAttribute('begin', '0.25s'); ringO.setAttribute('dur', '0.45s');
    ringO.setAttribute('fill', 'freeze');
    ring.appendChild(ringR);
    ring.appendChild(ringO);
    svg.appendChild(ring);

    return svg;
}

// Fades an element out by decrementing its opacity each frame, then removes it
function _fadeOutElement(el, startOpacity, step) {
    let opacity = startOpacity;
    const fade = () => {
        opacity -= step;
        el.style.opacity = Math.max(0, opacity);
        if (opacity > 0) requestAnimationFrame(fade);
        else el.remove();
    };
    requestAnimationFrame(fade);
}


//------------------------------------------------------------------------
// -------------------RESIDUAL SKELETON: DOM MANAGEMENT--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates the floating skeleton element: countdown label above, skull below
function _createSkeletonElement(sk) {
    const el = document.createElement('div');
    el.className = 'residual-skeleton';
    el.id = `residual-skeleton-${sk.id}`;
    el.innerHTML = `
        <div class="residual-skeleton-timer">${sk.remainingSecs}s</div>
        <div class="residual-skeleton-icon">💀</div>
    `;
    document.body.appendChild(el);
    return el;
}

// Snaps the skeleton element to the center of a grid cell by coordinates
function _skeletonSnapToCell(el, r, c) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl || !el) return;
    const rect = cellEl.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
}

// Updates the remaining-time label above the skeleton
function _updateSkeletonLabel(sk) {
    const label = sk.el?.querySelector('.residual-skeleton-timer');
    if (label) label.textContent = `${Math.max(0, sk.remainingSecs)}s`;
}

// Plays the fade-out animation, then removes the skeleton element
function _removeSkeletonElement(el) {
    if (!el) return;
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(0.3)';
    setTimeout(() => el.remove(), 600);
}

// Public reposition hook - snaps all skeletons instantly back onto their
// current grid cell when the layout moves (resize / zoom / clue toggles)
window._repositionResidualSkeletons = function () {
    window._residualSkeletons.forEach(sk => {
        if (sk.finished || !sk.el) return;
        const prevTransition = sk.el.style.transition;
        sk.el.style.transition = 'none';
        _skeletonSnapToCell(sk.el, sk.row, sk.col);
        void sk.el.offsetWidth; // force reflow so the jump is instant
        requestAnimationFrame(() => { sk.el.style.transition = prevTransition; });
    });
};

window.addEventListener('resize', () => {
    if ((window._residualSkeletons || []).length > 0) {
        window._repositionResidualSkeletons();
    }
}, { passive: true });


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: ZOMBIE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Called when the player activates Degrees of Freedom.
    Raises a zombie on a random free cell (unfilled, unmarked, no mistake).
    The zombie wanders the grid until the level ends. Occasionally it haunts
    a free cell: it dwells for 5 seconds, then a 10 second countdown starts:
      - Player makes the correct click on that cell (fill if the solution
        is 1, mark - if it is 0) - the zombie curses a nearby incorrect
        cell into a mistake cell - without any time penalty and without
        counting towards the player's mistake statistics.
      - Countdown expires - the zombie fills the cell itself. If the
        solution was 0 this counts as a real mistake for the player.
*/

// Entry point - dispatched from class-abilities.js (instant ability)
function _executeDegreesOfFreedom(row, col, effect) {

    // Replace any existing zombie cleanly
    _clearDoFZombie();

    const spawn = _findZombieSpawnCell();
    if (!spawn) {
        showToast(t('cls_dof_no_space'));
        _refundCooldown('active4');
        return;
    }

    window._dofZombie = {
        row: spawn.r,
        col: spawn.c,
        nextChallengeAt: Date.now() + ZOMBIE_FIRST_CHALLENGE_DELAY_MS,
        moveTimeout: null,
        challenge: null,
        el: null,
        finished: false,
    };
    const zombie = window._dofZombie;

    showToast(t('cls_dof_zombie_summoned'));
    Audio_Manager.playSFX('drifterSummon');
    trackAchStat('skillDoFUsed');

    zombie.el = _createZombieElement(zombie);
    _zombieSnapToCell(zombie.el, zombie.row, zombie.col);

    // Wandering loop - the zombie persists until the level ends
    _scheduleNextZombieMove(zombie);
}

// Returns a random cell that is unfilled, unmarked and not a mistake
function _findZombieSpawnCell() {
    if (!cur) return null;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const candidates = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (_isFreeCellForZombie(r, c)) candidates.push({ r, c });
        }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// A cell the zombie may dwell on: empty in the user grid, no mistake, not revealed
function _isFreeCellForZombie(r, c) {
    return userGrid[r][c] === 0 && !wrongGrid[r][c] && !revealedGrid[r][c];
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: ZOMBIE LIFECYCLE-----------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates the floating zombie element: countdown label above, 🧟 icon below.
// The label stays empty while idle and only shows numbers during challenges.
function _createZombieElement(zombie) {
    const el = document.createElement('div');
    el.className = 'dof-zombie';
    el.innerHTML = `
        <div class="dof-zombie-timer"></div>
        <div class="dof-zombie-icon">🧟</div>
    `;
    document.body.appendChild(el);
    return el;
}

// Snaps the zombie element to the center of a grid cell by coordinates
function _zombieSnapToCell(el, r, c) {
    const cellEl = document.getElementById(`g-${r}-${c}`);
    if (!cellEl || !el) return;
    const rect = cellEl.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
}

// Tears down the zombie: kills all timers, removes the DOM element
function _clearDoFZombie() {
    const zombie = window._dofZombie;
    if (!zombie) return;
    if (zombie.finished) return;
    zombie.finished = true;

    if (zombie.moveTimeout) clearTimeout(zombie.moveTimeout);
    _endZombieChallenge(zombie);

    Audio_Manager.playSFX('residualDespawn');
    _removeZombieElement(zombie.el);
    window._dofZombie = null;
}

// Plays the fade-out animation, then removes the zombie element
function _removeZombieElement(el) {
    if (!el) return;
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(0.3) rotate(20deg)';
    setTimeout(() => el.remove(), 600);
}

// Public reposition hook - snaps the zombie back onto its cell on layout changes
window._repositionDoFZombie = function () {
    const zombie = window._dofZombie;
    if (!zombie || zombie.finished || !zombie.el) return;
    const prevTransition = zombie.el.style.transition;
    zombie.el.style.transition = 'none';
    _zombieSnapToCell(zombie.el, zombie.row, zombie.col);
    void zombie.el.offsetWidth;
    requestAnimationFrame(() => { zombie.el.style.transition = prevTransition; });
};

window.addEventListener('resize', () => {
    if (window._dofZombie) window._repositionDoFZombie();
}, { passive: true });


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: WANDERING------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Schedules the zombie's next wandering step; stands still during a challenge
function _scheduleNextZombieMove(zombie) {
    zombie.moveTimeout = setTimeout(() => {
        if (zombie.finished) return;
        if (!zombie.challenge) {
            _zombieStep(zombie);
        }
        _scheduleNextZombieMove(zombie);
    }, ZOMBIE_STEP_MS);
}

// Moves the zombie one cell in a random direction (bouncing at edges).
// Arriving on a free cell starts a dwell - countdown challenge there,
// but only after the current challenge grace period has elapsed.
function _zombieStep(zombie) {
    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    const dirs = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    ];
    let next = null;
    for (let tries = 0; tries < 4 && !next; tries++) {
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nr = zombie.row + dir.dr;
        const nc = zombie.col + dir.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) next = { r: nr, c: nc };
    }
    if (!next) return;

    zombie.row = next.r;
    zombie.col = next.c;
    _zombieSnapToCell(zombie.el, zombie.row, zombie.col);

    // Standing on a free cell and rested enough? Linger, then challenge.
    if (Date.now() >= zombie.nextChallengeAt && _isFreeCellForZombie(zombie.row, zombie.col)) {
        _startZombieChallenge(zombie);
    }
}


//------------------------------------------------------------------------
// -------------------DEGREES OF FREEDOM: CHALLENGE------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*
    Challenge lifecycle on a free cell:
      1. Dwell phase (5 s) - zombie stands still, cell must stay free
      2. Countdown phase (10 s) - red countdown above the zombie's head;
         the player must make the correct click on the cell
    Resolution:
      - Correct click  - zombie curses a nearby incorrect cell into a
        mistake cell (no penalty, no player statistics)
      - Expired        - zombie fills the cell itself (mistake if sol is 0)
      - Cell no longer free - challenge silently aborted
*/
function _startZombieChallenge(zombie) {
    const challenge = {
        row: zombie.row,
        col: zombie.col,
        secondsLeft: ZOMBIE_COUNTDOWN_SECS,
        dwellTimeout: null,
        countdownInterval: null,
        pollInterval: null,
    };
    zombie.challenge = challenge;

    // Highlight the haunted cell so the player knows what is being challenged
    const cellEl = document.getElementById(`g-${challenge.row}-${challenge.col}`);
    if (cellEl) cellEl.classList.add('dof-zombie-target');

    // Fast poll: detect a correct player click on the challenged cell.
    // Runs through BOTH phases - an early correct click during the dwell
    // is rewarded just like one made during the countdown.
    challenge.pollInterval = setInterval(() => {
        if (zombie.finished || !zombie.challenge) return;
        _evaluateZombieChallenge(zombie);
    }, 250);

    // Phase 1: dwell
    challenge.dwellTimeout = setTimeout(() => {
        if (zombie.finished || !zombie.challenge) return;

        // Cell changed state during the dwell - move on silently
        if (!_isFreeCellForZombie(challenge.row, challenge.col)) {
            _endZombieChallenge(zombie);
            return;
        }

        // Phase 2: countdown
        zombie.el.classList.add('dof-zombie-counting');
        _updateZombieCountdownLabel(zombie);

        challenge.countdownInterval = setInterval(() => {
            if (zombie.finished || !zombie.challenge) return;
            challenge.secondsLeft--;
            if (challenge.secondsLeft <= 0) {
                _zombieFillCell(zombie);
                return;
            }
            _updateZombieCountdownLabel(zombie);
        }, 1000);
    }, ZOMBIE_DWELL_MS);
}

// Shows the red countdown number above the zombie's head
function _updateZombieCountdownLabel(zombie) {
    const label = zombie.el?.querySelector('.dof-zombie-timer');
    if (label) label.textContent = `${Math.max(0, zombie.challenge.secondsLeft)}s`;
}

/*
    Checks the challenged cell's state:
      - No longer free (player marked/filled/misfilled it) - abort.
        A misfill already cost the player a real mistake through the
        normal click pipeline, so no extra handling is needed.
      - Correctly filled (sol 1) or correctly marked - (sol 0) - reward.
*/
function _evaluateZombieChallenge(zombie) {
    const { row, col } = zombie.challenge;
    const sol = cur.grid[row][col];

    if (!_isZombieChallengeResolvedState(row, col, sol)) {
        if (!_isFreeCellForZombie(row, col)) {
            // Player touched the cell incorrectly - challenge is off
            _endZombieChallenge(zombie);
        }
        return;
    }

    // Correct click!
    Audio_Manager.playSFX('questRewardClaimed');
    _zombieCurseNearbyCell(zombie, row, col);
    _endZombieChallenge(zombie);
}

// Returns true when the cell is in the state the player was supposed to create
function _isZombieChallengeResolvedState(row, col, sol) {
    if (sol === 1) return userGrid[row][col] === 1;
    return userGrid[row][col] === 2;
}

/*
    Countdown expired - the zombie fills the cell itself.
    sol 1: free correct fill for the player.
    sol 0: routed through the normal wrong-fill pipeline, so shields /
    freeze can absorb it and otherwise it counts as a real player mistake.
*/
function _zombieFillCell(zombie) {
    const { row, col } = zombie.challenge;
    const sol = cur.grid[row][col];

    _endZombieChallenge(zombie);

    if (sol === 1) {
        userGrid[row][col] = 1;
        systemMarkedGrid[row][col] = false;
        renderCell(row, col);
        updClues(row, col);
        Audio_Manager.playSFX('cellFill');
        showToast(t('cls_dof_zombie_filled'));
        checkWin();
    } else {
        showToast(t('cls_dof_zombie_wrong'));
        if (typeof handleWrongFill === 'function') {
            handleWrongFill(row, col); // full mistake pipeline (absorbs, penalty, game-over)
        } else {
            wrongGrid[row][col] = true;
            renderCell(row, col);
        }
    }
}

/*
    Reward: curses one nearby incorrect cell (solution 0 - marked or
    unmarked) into a mistake cell. This does NOT apply a time penalty and
    does NOT count towards the player's mistake statistics - it simply
    fabricates an additional jump node for the Residual skeletons.
*/
function _zombieCurseNearbyCell(zombie, row, col) {
    if (!cur) return;
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;
    const candidates = [];

    for (let r = Math.max(0, row - ZOMBIE_CURSE_RADIUS); r <= Math.min(rows - 1, row + ZOMBIE_CURSE_RADIUS); r++) {
        for (let c = Math.max(0, col - ZOMBIE_CURSE_RADIUS); c <= Math.min(cols - 1, col + ZOMBIE_CURSE_RADIUS); c++) {
            if (r === row && c === col) continue;
            if (cur.grid[r][c] !== 0) continue;           // must be an incorrect cell
            if (wrongGrid[r][c]) continue;                // already a mistake
            if (userGrid[r][c] === 1) continue;           // filled (would be a real mistake)
            candidates.push({ r, c });
        }
    }
    if (candidates.length === 0) {
        showToast(t('cls_dof_curse_none'));
        return;
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];

    // Fabricate the mistake - deliberately bypasses applyPenalty/mistakeCount.
    // IMPORTANT: only wrongGrid is set (exactly like a real player wrong-fill,
    // which also leaves userGrid untouched). userGrid must NOT become 1 here,
    // otherwise isPuzzleSolved() sees a filled cell on a sol=0 cell and the
    // level can never be completed.
    wrongGrid[target.r][target.c] = true;
    systemMarkedGrid[target.r][target.c] = false;
    renderCell(target.r, target.c);

    Audio_Manager.playSFX('dofBurn');
    showToast(t('cls_dof_curse'));
}

// Ends the current challenge: clears its timers and visual state, then
// schedules a random quiet wandering period before the next challenge so
// the player is not pressured back-to-back.
function _endZombieChallenge(zombie) {
    const challenge = zombie.challenge;
    if (!challenge) return;

    if (challenge.dwellTimeout) clearTimeout(challenge.dwellTimeout);
    if (challenge.countdownInterval) clearInterval(challenge.countdownInterval);
    if (challenge.pollInterval) clearInterval(challenge.pollInterval);

    const cellEl = document.getElementById(`g-${challenge.row}-${challenge.col}`);
    if (cellEl) cellEl.classList.remove('dof-zombie-target');

    zombie.challenge = null;
    if (zombie.el) {
        zombie.el.classList.remove('dof-zombie-counting');
        // Clear the countdown number so no stale "1s" stays above its head
        const label = zombie.el.querySelector('.dof-zombie-timer');
        if (label) label.textContent = '';
    }

    const graceMs = ZOMBIE_CHALLENGE_GRACE_MIN_MS
        + Math.random() * (ZOMBIE_CHALLENGE_GRACE_MAX_MS - ZOMBIE_CHALLENGE_GRACE_MIN_MS);
    zombie.nextChallengeAt = Date.now() + graceMs;
}


//------------------------------------------------------------------------
// -------------------RESET HANDLER----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Called on level start/reset - clears all active Recursionist state
function resetRecursionistState() {
    _clearAllResidualSkeletons();
    _clearDoFZombie();
}
