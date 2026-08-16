//------------------------------------------------------------------------
//----------------------MATHMAGICIAN SKILLS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Arcane Reveal
const ARCANE_REVEAL_STAGGER_DELAY_MS = 250;   // Delay between each staggered balloon spawn
const ARCANE_REVEAL_BALLOON_BURST_MS = 1600;  // Must match CSS balloon animation duration
const ARCANE_REVEAL_STAR_COUNT = 12;    // Stars spawned per balloon burst explosion
const ARCANE_REVEAL_STAR_MIN_DIST = 400;   // Minimum px travel distance for burst stars
const ARCANE_REVEAL_STAR_MAX_DIST = 400;   // Additional random px added on top of min distance
const ARCANE_REVEAL_STAR_CLEANUP_MS = 1500;  // How long after burst before container is removed
const ARCANE_REVEAL_SPARKLE_LIMIT = 20;    // Max cells that spawn sparkles (prevents overwhelm)
const ARCANE_REVEAL_SPARKLE_COLORS = ['#c39bd3', '#9b59b6', '#a29bfe', '#d6a2e8'];
const ARCANE_REVEAL_SPARKLE_CHARS = ['✦', '✧', '⋆', '★', '◆', '🔮'];

// Absolute Zero
const ABSOLUTE_ZERO_FROST_BONUS_MS = 500;   // Duration bonus per frost passive node
const ABSOLUTE_ZERO_FADE_OUT_MS = 800;   // How long the blizzard overlay fades out
const ABSOLUTE_ZERO_FLOOR_CLEANUP_MS = 500;   // How long before frozen floor is removed after CSS transition

// Blizzard Effect
const BLIZZARD_FLAKE_COUNT = 60;
const BLIZZARD_FLAKE_CHARS = ['❄', '❅', '❆', '✦', '·'];
const BLIZZARD_FLAKE_MIN_SIZE_PX = 10;
const BLIZZARD_FLAKE_MAX_EXTRA_PX = 14;
const BLIZZARD_FLAKE_MIN_DURATION_S = 1.5;
const BLIZZARD_FLAKE_MAX_EXTRA_S = 2;
const BLIZZARD_FLAKE_MAX_DELAY_S = 0.5;


//------------------------------------------------------------------------
//----------------------------UTILITY-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Performs an in-place Durstenfeld shuffle on the given array.
function _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Returns a random element from the given array.
function _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies passive skill bonuses to the base max-reveal count.
// arcane_echo and resonant_reveal each add +1 to the reveal cap.
function _arcaneReveal_calcMaxReveals(baseMax) {
    let max = baseMax;
    if (ptHasSkill('arcane_echo')) max += 1;
    if (ptHasSkill('resonant_reveal')) max += 1;
    return max;
}

// Applies passive skill bonuses to the base radius.
// god_of_math adds +1 to the effective radius.
function _arcaneReveal_calcRadius(baseRadius) {
    return baseRadius + (ptHasSkill('god_of_math') ? 1 : 0);
}

// Separates all cells inside the radius into correct and incorrect candidate pools.
// Returns { correctCandidates, incorrectCandidates }.
function _arcaneReveal_buildCandidatePools(row, col, radius, rows, cols, sol) {
    const correctCandidates = [];
    const incorrectCandidates = [];
    const hasExposure = ptHasSkill('arcane_exposure');

    for (let r = Math.max(0, row - radius); r <= Math.min(rows - 1, row + radius); r++) {
        for (let c = Math.max(0, col - radius); c <= Math.min(cols - 1, col + radius); c++) {
            if (sol[r][c] === 1) {
                correctCandidates.push([r, c]);
            } else if (sol[r][c] === 0 && hasExposure) {
                // Only collect incorrect cells when arcane_exposure passive is active
                incorrectCandidates.push([r, c]);
            }
        }
    }

    return { correctCandidates, incorrectCandidates };
}

// Collects and returns the final list of cell IDs to be affected by Arcane Reveal.
// Correct cells are shuffled and capped at maxReveals; incorrect cells are added in full.
function _arcaneRevealCollectCells(row, col, radius, rows, cols, sol, maxReveals) {
    const { correctCandidates, incorrectCandidates } =
        _arcaneReveal_buildCandidatePools(row, col, radius, rows, cols, sol);

    // Shuffle so the reveal cap picks random cells rather than always top-left
    _shuffleArray(correctCandidates);
    const limitedCorrect = correctCandidates.slice(0, maxReveals);

    const finalCells = [...limitedCorrect, ...incorrectCandidates];

    const affected = [];
    finalCells.forEach(([r, c]) => {
        const id = _resolveCell(r, c, sol);
        if (id) affected.push(id);
    });

    return affected;
}

// Handles all post-burst logic for a single revealed cell:
// visual reveal, sparkles, passive adjacency refresh, stats, and win check.
function _arcaneReveal_onBalloonBurst(id) {
    _applyCellEffect([id], 'reveal');
    _spawnArcaneSparkles([id]);

    if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();

    updateQuestStats('tilesRevealed', { count: 1 });
    trackAchStat('tilesRevealed', 1);
    questStat_classRevealUsed(1);
    updateQuestStats('classAbilityUsedThisLevel', {});

    checkWin();
}

// Staggered loop — spawns one balloon per revealed cell with ARCANE_REVEAL_STAGGER_DELAY_MS
// between each. Each balloon fires _arcaneReveal_onBalloonBurst when it bursts.
function _arcaneReveal_staggeredRevealLoop(revealedIds) {
    revealedIds.forEach((id, index) => {
        setTimeout(() => {
            const [, r, c] = id.split('-').map(Number);
            _spawnArcaneBalloon(r, c, () => _arcaneReveal_onBalloonBurst(id));
        }, index * ARCANE_REVEAL_STAGGER_DELAY_MS);
    });
}

// Applies arcane_exposure passive: marks all incorrect cells in the affected list.
// Only runs when the arcane_exposure passive node is active.
function _arcaneReveal_applyExposureMarks(markedIds) {
    if (markedIds.length === 0) return;

    markedIds.forEach(id => {
        const [, r, c] = id.split('-').map(Number);
        if (userGrid[r][c] === 0) {
            userGrid[r][c] = 2;
            renderCell(r, c);
            questStat_classMarkUsed(1);
        }
    });

    _applyCellEffect(markedIds, 'mark');
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — MAIN FUNCTION-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneReveal — main entry point for the Arcane Reveal ability.
// Reveals up to maxReveals correct cells within radius steps of (row, col),
// including diagonals. Passive nodes can extend radius and reveal cap.
function _executeArcaneReveal(row, col, radius, maxReveals = 4) {
    if (!cur) return;

    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;

    const effectiveMaxReveals = _arcaneReveal_calcMaxReveals(maxReveals);
    const effectiveRadius = _arcaneReveal_calcRadius(radius);

    const affected = _arcaneRevealCollectCells(row, col, effectiveRadius, rows, cols, sol, effectiveMaxReveals);
    const revealedIds = _filterRevealedIds(affected, sol);
    const markedIds = ptHasSkill('arcane_exposure') ? _filterMarkedIds(affected, sol) : [];

    _arcaneReveal_staggeredRevealLoop(revealedIds);
    _arcaneReveal_applyExposureMarks(markedIds);

    Audio_Manager.playSFX('arcaneReveal');
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — BALLOON VFX--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Attempts to locate the DOM element for a grid cell using multiple fallback
// strategies. Returns the element or null if none is found.
function _arcaneReveal_findCellElement(row, col) {
    return (
        document.getElementById(`g-${row}-${col}`) ||
        document.querySelector(`#game-grid [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-board [id$="-${row}-${col}"]`) ||
        document.querySelector(`.grid-cell[id$="-${row}-${col}"]`) ||
        document.querySelector(`.tile[id$="-${row}-${col}"]`) ||
        document.querySelector(`.cell[id$="-${row}-${col}"]`) ||
        document.getElementById(`${row}-${col}`)
    );
}

// Creates a single burst star element with randomised angle, distance, and delay.
function _arcaneReveal_createBurstStar() {
    const star = document.createElement('div');
    star.className = 'arcane-exploding-star';
    star.innerHTML = '✦';

    star.style.setProperty('--angle', `${Math.random() * 360}deg`);
    star.style.setProperty('--distance', `${ARCANE_REVEAL_STAR_MIN_DIST + Math.random() * ARCANE_REVEAL_STAR_MAX_DIST}px`);
    star.style.setProperty('--delay', `${Math.random() * 0.15}s`);

    return star;
}

// Appends all burst stars to the container, removes the balloon, then
// schedules the entire container for cleanup after stars have flown.
function _arcaneReveal_runBurstSequence(balloon, container, onBurstCallback) {
    if (onBurstCallback) onBurstCallback();

    for (let i = 0; i < ARCANE_REVEAL_STAR_COUNT; i++) {
        container.appendChild(_arcaneReveal_createBurstStar());
    }

    balloon.remove();

    setTimeout(() => container.remove(), ARCANE_REVEAL_STAR_CLEANUP_MS);
}

// Builds and attaches the balloon DOM structure to the cell element,
// then schedules the burst sequence after ARCANE_REVEAL_BALLOON_BURST_MS.
function _attachBalloon(element, onBurstCallback) {
    element.style.position = 'relative';
    element.style.overflow = 'visible';

    const container = document.createElement('div');
    container.className = 'balloon-effect-container';

    const balloon = document.createElement('div');
    balloon.className = 'arcane-balloon';

    container.appendChild(balloon);
    element.appendChild(container);

    setTimeout(
        () => _arcaneReveal_runBurstSequence(balloon, container, onBurstCallback),
        ARCANE_REVEAL_BALLOON_BURST_MS
    );
}

// Entry point for spawning a rising balloon on a grid cell.
// Resolves the cell DOM element and delegates to _attachBalloon.
// If the element cannot be found, the burst callback is still fired immediately.
function _spawnArcaneBalloon(row, col, onBurstCallback) {
    const cellElement = _arcaneReveal_findCellElement(row, col);

    if (!cellElement) {
        console.error(`🔮 Arcane Reveal: Could not find grid element for cell (${row}, ${col})`);
        if (onBurstCallback) onBurstCallback();
        return;
    }

    _attachBalloon(cellElement, onBurstCallback);
}


//------------------------------------------------------------------------
//-------------------ARCANE REVEAL — SPARKLE VFX--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single sparkle element positioned within the scaler at (cx, cy)
// with slight random offsets, a random colour, and a random burst duration.
function _arcaneReveal_createSparkleElement(cx, cy) {
    const sp = document.createElement('div');
    sp.className = 'arcane-sparkle';
    sp.textContent = _randomFrom(ARCANE_REVEAL_SPARKLE_CHARS);
    sp.style.cssText = `
        position: absolute;
        left: ${cx + (Math.random() - 0.5) * 28}px;
        top:  ${cy + (Math.random() - 0.5) * 20}px;
        color: ${_randomFrom(ARCANE_REVEAL_SPARKLE_COLORS)};
        font-size: 16px;
        pointer-events: none;
        z-index: 310;
        user-select: none;
        animation: sparkle-burst ${0.5 + Math.random() * 0.4}s ease-out forwards;
    `;
    return sp;
}

// Spawns a small cluster of sparkles for a single cell ID, positioned inside
// the puzzle-scaler element and offset from the cell centre.
function _arcaneReveal_spawnSparklesForCell(cellId, index, wrap, wrapRect, zoom) {
    const el = document.getElementById(cellId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = (rect.left + rect.width / 2 - wrapRect.left) / zoom;
    const cy = (rect.top + rect.height / 2 - wrapRect.top) / zoom;

    const count = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < count; j++) {
        setTimeout(() => {
            const sp = _arcaneReveal_createSparkleElement(cx, cy);
            wrap.appendChild(sp);
            setTimeout(() => sp.remove(), 900);
        }, index * 18 + j * 40);
    }
}

// Spawns sparkle emojis rising from each revealed cell.
// Capped at ARCANE_REVEAL_SPARKLE_LIMIT cells to avoid visual overwhelm.
function _spawnArcaneSparkles(cellIds) {
    const wrap = document.getElementById('puzzle-scaler');
    if (!wrap) return;

    // Ensure the scaler element acts as a positioning context
    if (!wrap.style.position || wrap.style.position === 'static') {
        wrap.style.position = 'relative';
    }

    const wrapRect = wrap.getBoundingClientRect();
    const zoom = currentZoom || 1;

    cellIds.slice(0, ARCANE_REVEAL_SPARKLE_LIMIT).forEach((id, i) => {
        _arcaneReveal_spawnSparklesForCell(id, i, wrap, wrapRect, zoom);
    });
}


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Calculates the effective freeze duration after applying passive bonuses.
// prolonged_frost and deep_freeze each add ABSOLUTE_ZERO_FROST_BONUS_MS.
function _arcaneFreeze_calcDuration(baseDurationMs) {
    let duration = baseDurationMs;
    if (ptHasSkill('prolonged_frost')) duration += ABSOLUTE_ZERO_FROST_BONUS_MS;
    if (ptHasSkill('deep_freeze')) duration += ABSOLUTE_ZERO_FROST_BONUS_MS;
    return duration;
}

// Creates (or re-uses) the frozen floor DOM element and activates it.
// Forces a reflow so the CSS transition fires correctly from its initial state.
function _arcaneFreeze_spawnFrozenFloor() {
    let frozenFloor = document.getElementById('ability-frozen-floor');
    if (!frozenFloor) {
        frozenFloor = document.createElement('div');
        frozenFloor.id = 'ability-frozen-floor';
        document.body.appendChild(frozenFloor);
    }

    void frozenFloor.offsetWidth; // Force reflow so the transition fires from the start
    frozenFloor.classList.add('active');
}

// Smoothly removes the frozen floor element by stripping the active class
// and waiting for the CSS transition to finish before removing from DOM.
function _arcaneFreeze_removeFrozenFloor() {
    const frozenFloor = document.getElementById('ability-frozen-floor');
    if (!frozenFloor) return;

    frozenFloor.classList.remove('active');
    setTimeout(() => {
        // Double-check it's still inactive before removing (safety guard)
        if (frozenFloor && !frozenFloor.classList.contains('active')) {
            frozenFloor.remove();
        }
    }, ABSOLUTE_ZERO_FLOOR_CLEANUP_MS);
}

// Starts the freeze countdown ticker, updating the timer display every second.
// Returns the interval handle so it can be cleared when the freeze ends.
function _arcaneFreezeStartCountdown(totalSecs) {
    let remaining = totalSecs;
    const interval = setInterval(() => {
        remaining--;
        const el = document.getElementById('timer-val');
        if (el) el.textContent = `❄️ ${remaining}s`;
        if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return interval;
}

// Restores normal game timer state and cleans up all freeze visuals.
function _arcaneFreezeEnd(tick) {
    timerFrozen = false;
    window._freezeActive = false;

    clearInterval(tick);
    updTimer();
    buildClassHUD();

    _arcaneFreeze_removeFrozenFloor();
}


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — MAIN FUNCTION-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneFreeze — main entry point for the Absolute Zero ability.
// Freezes the game timer for durationMs (modified by passives).
// While frozen, wrong fills cost zero time (window._freezeActive flag).
function _executeArcaneFreeze(durationMs) {
    const effectiveDuration = _arcaneFreeze_calcDuration(durationMs);

    // Set freeze state flags
    timerFrozen = true;
    window._freezeActive = true;
    window._freezeCorrFills = 0; // Tracks correct fills during freeze (for frozen_resilience passive)

    _arcaneFreeze_spawnFrozenFloor();
    _startBlizzardEffect(effectiveDuration);
    updTimer();

    const secs = Math.ceil(effectiveDuration / 1000);
    showToast(`🔮 Absolute Zero! ${secs}s!`);
    Audio_Manager.playSFX('absoluteZero');

    // Track clutch freezes (used when timer is critically low)
    if (timerSecs <= 10) trackAchStat('freezeClutches');

    const tick = _arcaneFreezeStartCountdown(secs);
    setTimeout(() => _arcaneFreezeEnd(tick), effectiveDuration);
}


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — BLIZZARD VFX------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Creates a single randomised snowflake element for the blizzard overlay.
function _blizzard_createFlake(overlay) {
    const flake = document.createElement('div');
    flake.className = 'blizzard-flake';
    flake.textContent = _randomFrom(BLIZZARD_FLAKE_CHARS);

    flake.style.left = (Math.random() * 100) + 'vw';
    flake.style.fontSize = (BLIZZARD_FLAKE_MIN_SIZE_PX + Math.random() * BLIZZARD_FLAKE_MAX_EXTRA_PX) + 'px';
    flake.style.animationDuration = (BLIZZARD_FLAKE_MIN_DURATION_S + Math.random() * BLIZZARD_FLAKE_MAX_EXTRA_S) + 's';
    flake.style.animationDelay = (Math.random() * BLIZZARD_FLAKE_MAX_DELAY_S) + 's';

    overlay.appendChild(flake);
}

// Starts a spaced interval that spawns BLIZZARD_FLAKE_COUNT flakes over durationMs,
// then clears itself when all flakes have been spawned.
function _blizzard_startSpawnLoop(overlay, durationMs) {
    const spawnInterval = durationMs / BLIZZARD_FLAKE_COUNT;
    let spawned = 0;

    const spawnTimer = setInterval(() => {
        if (spawned >= BLIZZARD_FLAKE_COUNT) {
            clearInterval(spawnTimer);
            return;
        }
        spawned++;
        _blizzard_createFlake(overlay);
    }, spawnInterval);
}

// Fades out and removes the overlay and tint elements after durationMs.
function _blizzard_scheduleFadeOut(overlay, tint, durationMs) {
    setTimeout(() => {
        overlay.style.transition = `opacity ${ABSOLUTE_ZERO_FADE_OUT_MS}ms`;
        tint.style.transition = `opacity ${ABSOLUTE_ZERO_FADE_OUT_MS}ms`;
        overlay.style.opacity = '0';
        tint.style.opacity = '0';

        setTimeout(() => {
            overlay.remove();
            tint.remove();
        }, ABSOLUTE_ZERO_FADE_OUT_MS);
    }, durationMs);
}

// _startBlizzardEffect — creates the full blizzard visual overlay for Absolute Zero.
// Spawns a snowflake blizzard and an ice-tint screen wash for the given duration.
function _startBlizzardEffect(durationMs) {
    // Clear any leftover blizzard from a previous cast
    document.getElementById('ability-blizzard-overlay')?.remove();
    document.getElementById('ability-ice-tint')?.remove();

    const tint = document.createElement('div');
    tint.id = 'ability-ice-tint';
    document.body.appendChild(tint);

    const overlay = document.createElement('div');
    overlay.id = 'ability-blizzard-overlay';
    document.body.appendChild(overlay);

    _blizzard_startSpawnLoop(overlay, durationMs);
    _blizzard_scheduleFadeOut(overlay, tint, durationMs);
}