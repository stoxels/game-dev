// Mathmagician Absolute Zero: freeze lifecycle, blizzard, and tile overlays.
// The class dispatcher and freeze consumers use the public hooks below.

import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { endTimerFreeze, resetFreezeCorrFills, startTimerFreeze } from '../timer/timer-freeze.js';
import { t } from '../translation/translations.js';
import { buildClassHUD } from './class-hud.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';

// Absolute Zero tuning and blizzard appearance values.
const ABSOLUTE_ZERO_FROST_BONUS_MS = 500;
const ABSOLUTE_ZERO_FADE_OUT_MS = 800;
const ABSOLUTE_ZERO_FLOOR_CLEANUP_MS = 500;
// SUSPECTED DEAD: retained as frozen tuning for the legacy VFX path.
const ABSOLUTE_ZERO_STALAGMITE_GROW_MS = 400;
const ABSOLUTE_ZERO_THAW_MS = 700;
const BLIZZARD_FLAKE_COUNT = 60;
const BLIZZARD_FLAKE_CHARS = ['❄', '❅', '❆', '✦', '·'];
const BLIZZARD_FLAKE_MIN_SIZE_PX = 10;
const BLIZZARD_FLAKE_MAX_EXTRA_PX = 14;
const BLIZZARD_FLAKE_MIN_DURATION_S = 1.5;
const BLIZZARD_FLAKE_MAX_EXTRA_S = 2;
const BLIZZARD_FLAKE_MAX_DELAY_S = 0.5;

// Picks one array item using the game's random source.
function _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO - HELPERS------------------------------
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
// Flag release goes through the shared mechanic (Clock-guarded).
function _arcaneFreeze_end(tick) {
    endTimerFreeze();
    clearInterval(tick);
    buildClassHUD();

    _arcaneFreeze_removeFrozenFloor();
    // Frost tiles are intentionally left in place - they now persist for
    // the rest of the level, just like stalagmites, and only clear via
    // _arcaneFreeze_clearAllFrostAndStalagmites() on win/lose/leave.
}


//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO - BLIZZARD VFX------------------------
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

// _startBlizzardEffect - creates the full blizzard visual overlay for Absolute Zero.
// Spawns a snowflake blizzard and an ice-tint screen wash for the given duration.
export function _startBlizzardEffect(durationMs) {
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
//-------------------ABSOLUTE ZERO - FROZEN TILE VFX----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Persistent per-cell ice: a light frost crust on cells correctly filled
// while Absolute Zero is active, and a large stalagmite on cells where a
// mistake was absorbed by the freeze. Both persist until the freeze ends
// naturally (thaw animation, see _arcaneFreeze_thawAllFrostAndStalagmites)
// or the level ends outright - win, defeat, or leaving via LEVELS
// (instant removal, see _arcaneFreeze_clearAllFrostAndStalagmites).

// Tracks which cells currently carry each overlay type, so cleanup never
// depends on querying the live grid DOM (cells may already be gone by the
// time cleanup runs, e.g. mid screen-transition).
function _arcaneFreeze_resetTileTrackers() {
    window._frostedTileCells = new Set();     // "row-col" keys with persistent frost
    window._stalagmiteTileCells = new Set();  // "row-col" keys with a stalagmite
}

// Adds a light, persistent frost crust to a correctly-filled cell.
// Called from handleCorrectFill() (mouse-button-handlers.js) whenever a
// correct fill lands while window._freezeActive is true.
export function _arcaneFreeze_applyPersistentFrost(row, col) {
    const key = `${row}-${col}`;
    if (!window._frostedTileCells) window._frostedTileCells = new Set();
    if (window._frostedTileCells.has(key)) return; // already frosted

    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'frost-tile-overlay';
    el.appendChild(overlay);

    window._frostedTileCells.add(key);
}

// Spawns a large icy stalagmite on a cell where a mistake was absorbed by
// the freeze. Called from tryAbsorbWithFreeze() (mouse-button-handlers.js).
export function _arcaneFreeze_spawnStalagmite(row, col) {
    const key = `${row}-${col}`;
    if (!window._stalagmiteTileCells) window._stalagmiteTileCells = new Set();
    if (window._stalagmiteTileCells.has(key)) return; // already has one

    const el = document.getElementById(`g-${row}-${col}`);
    if (!el) return;

    if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'stalagmite-tile-overlay';
    el.appendChild(overlay);

    window._stalagmiteTileCells.add(key);
}

// Plays the melt-away transition on every persistently-frosted cell, then
// removes the frost overlays once the animation finishes. Used when
// Absolute Zero expires naturally (see _arcaneFreeze_end).
// NOTE: stalagmites are intentionally NOT cleared here - they persist
// until their specific wrong mark is cleared (see
// _arcaneFreeze_clearStalagmiteIfWrongMarkGone) or the level ends outright
// (see _arcaneFreeze_clearAllFrostAndStalagmites).
// SUSPECTED DEAD: retained for the legacy natural-expiry path; no current caller.
function _arcaneFreeze_thawFrost() {
    const frostCells = window._frostedTileCells || new Set();

    frostCells.forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const el = document.getElementById(`g-${r}-${c}`);
        const overlay = el?.querySelector('.frost-tile-overlay');
        overlay?.classList.add('thawing');
    });

    setTimeout(() => {
        frostCells.forEach(key => {
            const [r, c] = key.split('-').map(Number);
            document.getElementById(`g-${r}-${c}`)?.querySelector('.frost-tile-overlay')?.remove();
        });
        window._frostedTileCells = new Set();
    }, ABSOLUTE_ZERO_THAW_MS);
}

// Absolute Zero: if a cell's stalagmite (from a mistake made during a
// freeze) is still present but the wrong mark itself has since been
// cleared by some other system (mistake eraser item, undo, etc.), thaw
// and remove just that one stalagmite. Called from renderCell() in
// grid.js on every render, so it works no matter what cleared the mark.
export function _arcaneFreeze_clearStalagmiteIfWrongMarkGone(row, col) {
    if (!window._stalagmiteTileCells) return;
    const key = `${row}-${col}`;
    if (!window._stalagmiteTileCells.has(key)) return;
    if (globalThis.wrongGrid[row][col]) return; // still wrong - keep the stalagmite

    const el = document.getElementById(`g-${row}-${col}`);
    const overlay = el?.querySelector('.stalagmite-tile-overlay');
    if (overlay) {
        overlay.classList.add('thawing');
        setTimeout(() => overlay.remove(), ABSOLUTE_ZERO_THAW_MS);
    }
    window._stalagmiteTileCells.delete(key);
}

// Instantly strips every frost/stalagmite overlay with no animation.
// Called whenever the level ends outright - win, defeat, or the player
// leaving through the LEVELS button - so nothing lingers into the next
// level or the overlay screens.
export function _arcaneFreeze_clearAllFrostAndStalagmites() {
    document.querySelectorAll('.frost-tile-overlay, .stalagmite-tile-overlay')
        .forEach(el => el.remove());
    _arcaneFreeze_resetTileTrackers();
}




//------------------------------------------------------------------------
//-------------------ABSOLUTE ZERO - MAIN FUNCTION------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _executeArcaneFreeze - main entry point for the Absolute Zero ability.
// Freezes the game timer for durationMs (modified by passives).
// While frozen, wrong fills cost zero time (window._freezeActive flag).
export function _executeArcaneFreeze(durationMs) {
    const effectiveDuration = _arcaneFreeze_calcDuration(durationMs);

    // Set freeze state flags via the shared timer-freeze mechanic. The
    // freezeActive flag drives this class's frozen-floor / frozen-resilience
    // fill intercepts, so the cast must carry it. Overlay stays on (matches
    // the item cast); the blizzard + frozen floor below are the extras.
    startTimerFreeze(effectiveDuration, { freezeActive: true });
    // Tracks correct fills during freeze (for frozen_resilience passive);
    // the counter itself is owned by the timer-freeze mechanic.
    resetFreezeCorrFills();

    _arcaneFreeze_resetTileTrackers(); 

    _arcaneFreeze_spawnFrozenFloor();
    _startBlizzardEffect(effectiveDuration);

    const secs = Math.ceil(effectiveDuration / 1000);
    globalThis.showToast(t('cls_absolute_zero').replace('{n}', secs));
    Audio_Manager.playSFX('absoluteZero');

    // Track clutch freezes (used when timer is critically low)
    if (globalThis.timerSecs <= 10) trackAchStat('freezeClutches');

    const tick = _arcaneFreeze_startCountdown(secs);
    setTimeout(() => _arcaneFreeze_end(tick), effectiveDuration);
}
