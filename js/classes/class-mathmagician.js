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
//-------------------ARCANE REVEAL — CANDIDATE SELECTION------------------
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
function _arcaneReveal_collectCells(row, col, radius, rows, cols, sol, maxReveals) {
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
//-------------------ARCANE REVEAL — ORCHESTRATION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

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

    const affected = _arcaneReveal_collectCells(row, col, effectiveRadius, rows, cols, sol, effectiveMaxReveals);
    const revealedIds = _filterRevealedIds(affected, sol);
    const markedIds = ptHasSkill('arcane_exposure') ? _filterMarkedIds(affected, sol) : [];

    _arcaneReveal_staggeredRevealLoop(revealedIds);
    _arcaneReveal_applyExposureMarks(markedIds);

    Audio_Manager.playSFX('arcaneReveal');
}

//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD — ARCANE BUBBLE VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_DOME_PADDING_PX = 40; // how far the dome bulges past the actual grid edges

// Tracks the pending DOM-removal timeout so a reactivated dome can cancel
// a stale removal scheduled from a previous fade-out.
let _varianceShieldRemovalTimer = null;

// Positions the fixed dome to match the grid's current screen rect,
// using only the corner cells (g-0-0 / g-{lastRow}-{lastCol}) — same
// approach as _fxShieldBorderAdd's _repositionShieldBorder, so clue
// number gutters are never included and zoom/transform can't skew it.

function _varianceShield_reposition() {
    const bubble = document.getElementById('variance-shield-bubble');
    const scaler = document.getElementById('puzzle-scaler');
    if (!bubble || !scaler) return;

    const corners = typeof _fxGetGridCorners === 'function' ? _fxGetGridCorners() : null;
    if (!corners) return;
    const { first, last } = corners;

    // Get bounding rects relative to the viewport
    const fRect = first.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();
    const scalerRect = scaler.getBoundingClientRect();
    const zoom = currentZoom || 1;

    // Calculate dimensions relative to the unscaled puzzle-scaler container
    const pad = VARIANCE_SHIELD_DOME_PADDING_PX;

    const left = ((fRect.left - scalerRect.left) / zoom) - pad;
    const top = ((fRect.top - scalerRect.top) / zoom) - pad;
    const width = ((lRect.right - fRect.left) / zoom) + (pad * 2);
    const height = ((lRect.bottom - fRect.top) / zoom) + (pad * 2);

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.width = `${width}px`;
    bubble.style.height = `${height}px`;
}

// Creates (or re-uses) the dome element, attaches it to <body> as a
// fixed-position overlay tracking the grid, and fades it in.
function _varianceShield_spawnBubble() {

    const existing = document.getElementById('variance-shield-bubble');
    if (existing && (existing.classList.contains('shattering') || existing.classList.contains('vs-pending-impact'))) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    let bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'variance-shield-bubble';
        bubble.innerHTML = `
            <div class="vs-bubble-glow"></div>
            <div class="vs-bubble-glass"></div>
            <div class="vs-bubble-runes"></div>
            <div class="vs-bubble-inner-ring"></div>
            <div class="vs-bubble-rim"></div>
        `;
        // Attach to the scaler (not document.body) so the left/top offsets
        // computed in _varianceShield_reposition() — which are relative to
        // puzzle-scaler — actually land in the right coordinate space.
        const scalerEl = document.getElementById('puzzle-scaler');
        if (scalerEl) {
            if (!scalerEl.style.position || scalerEl.style.position === 'static') {
                scalerEl.style.position = 'relative';
            }
            scalerEl.appendChild(bubble);
        } else {
            document.body.appendChild(bubble); // fallback, shouldn't normally hit
        }

        const wrap = document.getElementById('puzzle-scaler-wrap');
        bubble._reposition = _varianceShield_reposition;
        if (wrap) {
            wrap.addEventListener('scroll', _varianceShield_reposition, { passive: true });
        }
    }

    // Defer to next frame: at level start this can be called while
    // #screen-game is still display:none (class passives apply before
    // _navigateToGameScreen() switches the screen), which makes every
    // getBoundingClientRect() on the grid return zeroes. Waiting a frame
    // guarantees the screen switch has already happened.


    //requestAnimationFrame(_varianceShield_reposition);
    //requestAnimationFrame(() => bubble.classList.add('active'));

    setTimeout(() => {
        if (bubble._reposition) bubble._reposition();
        bubble.classList.add('active');
    }, 50);
}

// Fades the bubble out, cleans up its tracking listeners, and removes it
// once no shield stacks remain.
function _varianceShield_removeBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;
    if (bubble.classList.contains('shattering') || bubble.classList.contains('vs-pending-impact')) return;

    bubble.classList.remove('active');

    if (_varianceShieldRemovalTimer) clearTimeout(_varianceShieldRemovalTimer);
    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el && !el.classList.contains('active')) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, 1000);
}

// Shows/hides the dome based on current shield stack count.
// Call this any time window._classFreeMistakes changes.
function _varianceShield_updateVisibility() {
    if (window._vsSuppressAutoHide) return; // a meteor is currently resolving this exact mistake — don't interfere

    const stacks = window._classFreeMistakes || 0;
    if (STATE.playerClass === 'mathmagician' && stacks > 0) {
        _varianceShield_spawnBubble();
    } else {
        _varianceShield_removeBubble();
    }
}

function _varianceShield_playCometImpact(impactPoint) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    const impact = document.createElement('div');
    impact.className = 'vs-comet-impact';

    if (impactPoint) {
        const rect = bubble.getBoundingClientRect();
        impact.style.left = `${impactPoint.x - rect.left}px`;
        impact.style.top = `${impactPoint.y - rect.top}px`;
    } else {
        const rad = Math.random() * Math.PI * 2;
        const radiusX = bubble.offsetWidth / 2;
        const radiusY = bubble.offsetHeight / 2;
        impact.style.left = `calc(50% + ${Math.cos(rad) * radiusX}px)`;
        impact.style.top = `calc(50% + ${Math.sin(rad) * radiusY}px)`;
    }

    bubble.appendChild(impact);
    setTimeout(() => impact.remove(), 500);
}



//------------------------------------------------------------------------
//-------------------VARIANCE SHIELD — METEOR IMPACT VFX------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const VARIANCE_SHIELD_METEOR_FLIGHT_MS = 1100;    // Time for meteor to travel from offscreen to the bubble
const VARIANCE_SHIELD_METEOR_OFFSCREEN_PX = 150; // How far past the viewport edge the meteor starts
const VARIANCE_SHIELD_SHATTER_MS = 650;          // Duration of the bubble shatter animation before removal

// Picks a random point just outside one of the four viewport edges.
function _varianceShield_pickMeteorStart() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
    switch (edge) {
        case 0: return { x: Math.random() * w, y: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        case 1: return { x: w + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
        case 2: return { x: Math.random() * w, y: h + VARIANCE_SHIELD_METEOR_OFFSCREEN_PX };
        default: return { x: -VARIANCE_SHIELD_METEOR_OFFSCREEN_PX, y: Math.random() * h };
    }
}

// Spawns a meteor flying in from offscreen toward the bubble's current
// on-screen center, then fires onImpact once it arrives.
function _varianceShield_spawnMeteor(onImpact) {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) { if (onImpact) onImpact(null); return; }

    const rect = bubble.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const start = _varianceShield_pickMeteorStart();

    const angleRad = Math.atan2(targetY - start.y, targetX - start.x);
    const angleDeg = angleRad * (180 / Math.PI);

    const meteor = document.createElement('div');
    meteor.className = 'vs-meteor';
    meteor.style.left = `${targetX}px`;
    meteor.style.top = `${targetY}px`;
    meteor.style.setProperty('--start-x', `${start.x - targetX}px`);
    meteor.style.setProperty('--start-y', `${start.y - targetY}px`);
    meteor.style.setProperty('--travel-angle', `${angleDeg}deg`);
    meteor.style.animationDuration = `${VARIANCE_SHIELD_METEOR_FLIGHT_MS}ms`;

    document.body.appendChild(meteor);

    setTimeout(() => {
        meteor.remove();
        if (onImpact) onImpact({ x: targetX, y: targetY });
    }, VARIANCE_SHIELD_METEOR_FLIGHT_MS);
}

// Plays the bubble-shatter animation (used when the last shield stack breaks),
// then removes the bubble from the DOM once the animation finishes.
function _varianceShield_shatterBubble() {
    const bubble = document.getElementById('variance-shield-bubble');
    if (!bubble) return;

    if (_varianceShieldRemovalTimer) {
        clearTimeout(_varianceShieldRemovalTimer);
        _varianceShieldRemovalTimer = null;
    }

    bubble.classList.remove('active');
    bubble.classList.add('shattering');

    _varianceShieldRemovalTimer = setTimeout(() => {
        const el = document.getElementById('variance-shield-bubble');
        if (el) {
            const wrap = document.getElementById('puzzle-scaler-wrap');
            if (el._reposition) {
                if (wrap) {
                    wrap.removeEventListener('scroll', el._reposition);
                    wrap.removeEventListener('wheel', el._reposition);
                }
                window.removeEventListener('resize', el._reposition);
            }
            el.remove();
        }
        _varianceShieldRemovalTimer = null;
    }, VARIANCE_SHIELD_SHATTER_MS);
}

// _varianceShield_absorbMistake — call this from game.js at the exact
// moment a free mistake is consumed by the shield (i.e. right where
// window._classFreeMistakes gets decremented), INSTEAD of calling
// _varianceShield_updateVisibility() at that spot. Flies a meteor in
// from offscreen, flashes an impact where it hits, and shatters the
// bubble if that was the last stack.
function _varianceShield_absorbMistake() {
    const stacksRemaining = window._classFreeMistakes || 0;
    const bubble = document.getElementById('variance-shield-bubble');

    if (bubble) bubble.classList.add('vs-pending-impact');

    _varianceShield_spawnMeteor((impactPoint) => {
        if (bubble) bubble.classList.remove('vs-pending-impact');
        window._vsSuppressAutoHide = false; // meteor resolved — outside visibility syncs can run again

        _varianceShield_playCometImpact(impactPoint);

        if (stacksRemaining <= 0) {
            _varianceShield_shatterBubble();
        }
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
function _arcaneFreeze_startCountdown(totalSecs) {
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
function _arcaneFreeze_end(tick) {
    timerFrozen = false;
    window._freezeActive = false;

    clearInterval(tick);
    updTimer();
    buildClassHUD();

    _arcaneFreeze_removeFrozenFloor();
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


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO — MAIN FUNCTION------------------------
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

    const tick = _arcaneFreeze_startCountdown(secs);
    setTimeout(() => _arcaneFreeze_end(tick), effectiveDuration);
}