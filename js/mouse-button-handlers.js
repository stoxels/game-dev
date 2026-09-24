import { trackAchStat } from './achievements/achievements.js';
import { revealTiles } from './puzzle-mechanics/grid-actions.js';
import { Audio_Manager } from './audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell, updClues } from './grid.js';
import { applyPenalty } from './penalty.js';
import { save } from './state.js';
import { stopTimer } from './timer/timer.js';
import { addTimeSecs, previewGainSecs, subtractTimeSecs } from './timer/timer-adjust.js';
import { t } from './translation/translations.js';
import { _countAdjacentPrefillRun, dragCounterApply, dragCounterClear } from './mouse-over.js';
import { ptHasSkill } from './probability-tree/probability-tree-state-points.js';
import { _incDirect, questStat_confidenceIntervalIgnored, questStat_hasManuallyFilledCell, questStat_sampleEfficiencyReveal } from './inference/inference-stats.js';
import { PassiveTracker } from './probability-tree/probability-tree-tracker.js';
import { _binomialBurstOnCorrectFill, _frequentistsBurdenOnCorrectFill, _gamblersRuinOnCorrectFill, _getBayesianBonus, _resetBayesianBonus } from './probability-tree/probability-tree-special-nodes-logic.js';
import { STATE } from './state.js';
import { cur } from './state.js';
import { _escapeToastHtml, puzzleItemIconHtml, showHtmlToast } from './puzzle-mechanics/toasts-and-popups.js';

// Live accessors preserve bridge reads and write-through patch seams.
try { Object.defineProperty(globalThis, 'dragAxis', { get() { return dragAxis; }, set(v) { dragAxis = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'touchpadMarkModeActive', { get() { return touchpadMarkModeActive; }, set(v) { touchpadMarkModeActive = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'checkSpecialIntercepts', { get() { return checkSpecialIntercepts; }, set(v) { checkSpecialIntercepts = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'applyRealMistake', { get() { return applyRealMistake; }, set(v) { applyRealMistake = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'fireCorrectFillHooks', { get() { return fireCorrectFillHooks; }, set(v) { fireCorrectFillHooks = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
try { Object.defineProperty(globalThis, 'checkStreakBonus', { get() { return checkStreakBonus; }, set(v) { checkStreakBonus = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
try { Object.defineProperty(globalThis, 'resolveRightClickValue', { get() { return resolveRightClickValue; }, set(v) { resolveRightClickValue = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
try { Object.defineProperty(globalThis, 'tryAbsorbWithShield', { get() { return tryAbsorbWithShield; }, set(v) { tryAbsorbWithShield = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
try { Object.defineProperty(globalThis, 'tryAbsorbWithConfidenceInterval', { get() { return tryAbsorbWithConfidenceInterval; }, set(v) { tryAbsorbWithConfidenceInterval = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
try { Object.defineProperty(globalThis, 'handleLuckyTileClaim', { get() { return handleLuckyTileClaim; }, set(v) { handleLuckyTileClaim = v; }, configurable: true }); } catch (e) {} // PHASE3-SHIM write-through: passive-tree-expansion patch()
// mouse-button-handlers.js
// Handles all mouse interactions with the nonogram grid:
// clicking, right-clicking, dragging, and releasing.


//------------------------------------------------------------------------
//----------------------------STATE VARIABLES-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// The value being painted during the current drag stroke:
//   0 = erase, 1 = fill (left-click), 2 = mark with ✕ (right-click), 3 = question mark
export let pval = 0;

// Which mouse button started the current stroke: 0 = left, 2 = right
let mbtn = 0;

// The cell where the current drag began (-1 when not dragging)
export let dragStartRow = -1;
export let dragStartCol = -1;

// Cells already counted toward the current stroke's displayed number,
// so re-dragging back over the same cell doesn't double/triple count it.
// SUSPECTED DEAD: this and the following stroke counters are written but never read.
let dragCountedCells = new Set();

// The axis the drag is locked to once the player moves: 'row', 'col', or null (undecided)
let dragAxis = null;

// How many cells have been correctly filled in the current left-click drag stroke
let dragStrokeCount = 0;

// How many already-correct cells are contiguous with the drag-start cell,
// along the row axis and the column axis respectively (computed at cellDown).
let dragPrefillRow = 0;
let dragPrefillCol = 0;

// Whether the prefill offset has already been folded into dragStrokeCount
// for the current stroke (only ever applied once, on first real movement).
let dragPrefillApplied = false;

// The pre-fill count folded into the current stroke's display total.
// Starts as a best guess (max of row/col prefill) on the start cell,
// then gets locked to the correct axis once the drag direction resolves.
let dragPrefillOffset = 0;

// When true (Touchpad Mode active), left-click behaves like a right-click (mark),
// and right-click behaves like a left-click (fill). Toggled via the in-game button,
// only available when SETTINGS.touchpadModeEnabled is true.
let touchpadMarkModeActive = false;


//------------------------------------------------------------------------
//----------------------------SHARED HELPERS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the current level is an endgame sandbox or monster level.
// Used to guard all _eg* hook calls throughout this file.
export function isEndgameLevel() {
    if (!cur) return false;
    return cur.isEndgameSandbox || cur.isMonsterLevel;
}

// Endgame: discards any pickup, loot drop, or currency drop sitting on a
// cell. Shared by the real-mistake path and the wrong-fill path in
// applyCell(), both of which need to invalidate a cell's drop the same way.
function _egDiscardAllDrops(row, col) {
    if (!isEndgameLevel()) return;
    if (typeof globalThis._egDiscardPickup === 'function') globalThis._egDiscardPickup(row, col);
    if (typeof globalThis._egDiscardLootDrop === 'function') globalThis._egDiscardLootDrop(row, col);
    if (typeof globalThis._egDiscardCurrencyDrop === 'function') globalThis._egDiscardCurrencyDrop(row, col);
    if (typeof globalThis._egDiscardItemDrop === 'function') globalThis._egDiscardItemDrop(row, col);
    if (typeof globalThis._egDiscardMapDrop === 'function') globalThis._egDiscardMapDrop(row, col);
    if (typeof globalThis._egDiscardGoldDrop === 'function') globalThis._egDiscardGoldDrop(row, col);
    if (typeof globalThis._charmDiscardDrop === 'function') globalThis._charmDiscardDrop(row, col);
}

// Endgame: claims any pickup, loot drop, or currency drop sitting on a
// cell. Shared by the correct-fill path and the right-click-mark path in
// applyCell(), both of which claim drops on an empty-solution cell.
export function _egCheckAllClaims(row, col) {
    if (!isEndgameLevel()) return;
    if (typeof globalThis._egCheckPickupClaim === 'function') globalThis._egCheckPickupClaim(row, col);
    if (typeof globalThis._egCheckLootClaim === 'function') globalThis._egCheckLootClaim(row, col);
    if (typeof globalThis._egCheckCurrencyDropClaim === 'function') globalThis._egCheckCurrencyDropClaim(row, col);
    if (typeof globalThis._egCheckItemDropClaim === 'function') globalThis._egCheckItemDropClaim(row, col);
    if (typeof globalThis._egCheckMapDropClaim === 'function') globalThis._egCheckMapDropClaim(row, col);
    if (typeof globalThis._egCheckGoldDropClaim === 'function') globalThis._egCheckGoldDropClaim(row, col);
    if (typeof globalThis._charmCheckClaim === 'function') globalThis._charmCheckClaim(row, col);
}


//------------------------------------------------------------------------
//------------------SPECIAL INTERCEPT HELPERS-----------------------------
//------------------------------------------------------------------------
// These helpers handle intercepts that must fire BEFORE any normal fill
// logic. Each returns true if it consumed the click (caller should return).
//------------------------------------------------------------------------

// If the cell is boss-corrupted, dispel it instead of filling.
// The player must click again afterward to actually fill.
// Frozen cells simply reject the click until they thaw.
function checkBossCorruptionIntercept(row, col) {
    // Slimed cells (The Snail) block ALL interaction until swept clean -
    // checked first so a slimed cell can never be clicked around.
    if (typeof globalThis._egSnailIsCellSlimed === 'function' && globalThis._egSnailIsCellSlimed(row, col)) {
        globalThis.showToast(t('eg_snail_slimed_blocked'));
        return true;
    }
    if (typeof globalThis._egIsCellCorrupted === 'function' && globalThis._egIsCellCorrupted(row, col)) {
        globalThis._egDispelCorruption(row, col);
        return true;
    }
    if (typeof globalThis._egIsCellFrozen === 'function' && globalThis._egIsCellFrozen(row, col)) {
        globalThis.showToast(t('eg_cell_frozen'));
        return true;
    }
    return false;
}

// If a Bayesian trap is waiting for placement, route the click there.
function checkBayesianTrapIntercept(row, col) {
    if (typeof globalThis._bayesTrapPlacementClick === 'function' && globalThis._bayesTrapPlacementClick(row, col)) {
        return true;
    }
    return false;
}

// If an active class ability is armed, execute it and consume the click.
function checkActiveAbilityIntercept(row, col) {
    if (globalThis.activeAbilityMode) {
        if (pval === 1 || mbtn === 0) {
            globalThis.executeActiveAbility(row, col);
        }
        return true;
    }
    return false;
}

// Elemental ailment puzzle effects (endgame): clicks on icy cells may slip
// onto a random adjacent cell. See endgame-ailments.js.
function checkElementalAilmentIntercept(row, col) {
    if (typeof globalThis._egPuzzleIceRedirect === 'function' && globalThis._egPuzzleIceRedirect(row, col)) {
        return true;
    }
    return false;
}

// Runs all special intercepts in priority order.
// Returns true if any intercept consumed the click.
function checkSpecialIntercepts(row, col) {
    // The Marksman's Arrow Gauntlet seals the grid: no fills/marks while
    // the bows hold the arena, so a stray click can't take a mistake or
    // start a new puzzle mid-set-piece (boss-marksman.js).
    if (typeof globalThis._egMarksGauntletActive === 'function' && globalThis._egMarksGauntletActive()) {
        if (typeof globalThis._egMarksGauntletGridLockToast === 'function') globalThis._egMarksGauntletGridLockToast();
        return true;
    }
    // The Sprout's garden: prune vines off cells, keep out of the bramble
    // ring, disturb pollen dust at your peril (boss-sprout.js).
    if (typeof globalThis._egSproutCellIntercept === 'function' && globalThis._egSproutCellIntercept(row, col)) return true;
    if (checkBossCorruptionIntercept(row, col)) return true;
    if (checkBayesianTrapIntercept(row, col)) return true;
    if (checkActiveAbilityIntercept(row, col)) return true;
    if (checkElementalAilmentIntercept(row, col)) return true;
    return false;
}


//------------------------------------------------------------------------
//---------------------CELL GUARD HELPERS---------------------------------
//------------------------------------------------------------------------
// These helpers check conditions that make a cell click a no-op.
// Each returns true if the click should be silently ignored.
//------------------------------------------------------------------------

// No-op: cell already holds the value we would paint.
function isCellAlreadyDesiredValue(row, col) {
    return globalThis.userGrid[row][col] === pval;
}

// No-op: a mark/erase stroke cannot touch a correctly solved cell.
// Uses pval (the resolved paint value for this stroke) instead of mbtn,
// so this also works correctly in Touchpad Mode, where a "mark" stroke
// can be driven by the left mouse button.
function isRightClickOnCorrectCell(row, col) {
    return pval !== 1 && globalThis.userGrid[row][col] === 1 && cur.grid[row][col] === 1;
}

// No-op: cannot erase a cell that was revealed by an item.
function isEraseOnRevealedCell(row, col) {
    return globalThis.revealedGrid[row][col] && pval === 0;
}

// No-op: with "Protect Marked Cells" enabled, a fill stroke (single click
// or drag-paint) cannot paint over a cell currently marked with ✕ - whether
// the player marked it themselves or it was marked by an item, passive, or
// ability effect (both share userGrid state 2; systemMarkedGrid only affects
// styling, not this check).
function isPaintingOverMarkedCell(row, col) {
    return globalThis.SETTINGS.protectMarkedCells && pval === 1 && globalThis.userGrid[row][col] === 2;
}

// Runs all cell guards. Returns true if the click should be ignored.
function checkCellGuards(row, col) {
    if (isCellAlreadyDesiredValue(row, col)) return true;
    if (isRightClickOnCorrectCell(row, col)) return true;
    if (isEraseOnRevealedCell(row, col)) return true;
    if (isPaintingOverMarkedCell(row, col)) return true;
    return false;
}


//------------------------------------------------------------------------
//-------------------WRONG FILL ABSORPTION HELPERS-----------------------
//------------------------------------------------------------------------
// These helpers try to absorb a wrong left-click fill before it costs the
// player time. Each returns true if the mistake was absorbed (no penalty).
//------------------------------------------------------------------------

// Freeze: mark wrong visually but charge no time.
function tryAbsorbWithFreeze(row, col) {
    if (!window._freezeActive) return false;
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;
    globalThis.wrongGrid[row][col] = true;
    renderCell(row, col);
    globalThis.showToast(t('cg_frozen_no_penalty'));
    if (typeof globalThis._arcaneFreeze_spawnStalagmite === 'function') {
        globalThis._arcaneFreeze_spawnStalagmite(row, col);     // ← add this line
    }
    return true;
}

// Shield: absorb the mistake, consume one shield charge.
function tryAbsorbWithShield(row, col) {
    if (!globalThis.shieldActive) return false;
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;

    globalThis.wrongGrid[row][col] = true;
    renderCell(row, col);

    globalThis.absorbedMistakes++;
    if ((window._shieldExtraCharges || 0) > 0) {
        window._shieldExtraCharges--;
    } else {
        globalThis.shieldActive = false;
    }
    globalThis.showToast(t('pen_shield'));
    globalThis.playShieldBreakEffect(row, col);
    Audio_Manager.playSFX('shield_break');
    return true;
}

// Class passive (e.g. Mathmagician): penalty multiplier of 0 means fully absorbed.
function tryAbsorbWithClassPassive(row, col) {
    if (ptHasSkill('keystone_null_hypothesis') || ptHasSkill('keystone_asymptotic_mastery')) return false;
    // Suppress any shield-visibility sync (e.g. inside getClassPenaltyMultiplier)
    // from hiding the bubble before we know this was absorbed, and before the
    // meteor VFX gets a chance to play.
    window._vsSuppressAutoHide = true;

    const penMult = globalThis.getClassPenaltyMultiplier();

    if (penMult !== 0) {
        window._vsSuppressAutoHide = false;
        return false;
    }

    globalThis.wrongGrid[row][col] = true;
    renderCell(row, col);
    globalThis.showToast(t('pen_shield'));

    if (typeof globalThis._varianceShield_absorbMistake === 'function') {
        globalThis._varianceShield_absorbMistake(); // clears the suppress flag itself once the meteor resolves
    } else {
        window._vsSuppressAutoHide = false;
    }

    return true;
}

// Confidence Interval grace window: absorb the mistake if the window is open.
function tryAbsorbWithConfidenceInterval(row, col) {
    if (!globalThis._confidenceIntervalActive) return false;

    globalThis._confidenceIntervalActive = false;
    globalThis._confidenceIntervalUsed = true;     // prevent two CI absorbs back-to-back
    globalThis.absorbedMistakes++;
    questStat_confidenceIntervalIgnored();
    globalThis.wrongGrid[row][col] = true;
    renderCell(row, col);
    globalThis.consecutiveCorrectFills = 0;        // CI absorption also breaks the correct-fill streak
    window.LEVEL_FLAGS.streakBonusFills = 0;
    if (typeof globalThis.PassiveTracker !== 'undefined') PassiveTracker.onStreakReset();
    globalThis.showToast(`📐 ${t('cg_ci_absorb')}`);
    return true;
}

// Tries all absorb paths in order.
// Returns true if the mistake was fully absorbed and no penalty should fire.
function tryAbsorbMistake(row, col) {
    const absorbed = tryAbsorbWithFreeze(row, col)
        || tryAbsorbWithShield(row, col)
        || tryAbsorbWithClassPassive(row, col)
        || tryAbsorbWithConfidenceInterval(row, col);

    if (absorbed && typeof globalThis.triggerBanter === 'function') {
        globalThis.triggerBanter('mistake_absorbed');
    }
    return absorbed;
}


//------------------------------------------------------------------------
//-------------------REAL MISTAKE CONSEQUENCE HELPERS--------------------
//------------------------------------------------------------------------
// These helpers fire after absorption fails - the mistake is real and
// costs the player. Run them in order inside applyRealMistake().
//------------------------------------------------------------------------

// Visually mark the cell wrong, play the error sound, deduct time, and
// discard any endgame drop the mistake invalidates.
function markCellWrongAndPenalize(row, col) {
    globalThis.wrongGrid[row][col] = true;
    renderCell(row, col);
    Audio_Manager.playSFX('cellWrong');
    applyPenalty(row, col);

    _egDiscardAllDrops(row, col);
}

// Reset consecutive-fill streaks and notify passive systems.
function breakFillStreaksOnMistake() {
    globalThis.consecutiveCorrectFills = 0;    // sample_efficiency skill: streak reset
    window.LEVEL_FLAGS.streakBonusFills = 0;          // streak_bonus skill: streak reset

    // Endgame gear: arcane surge streak + channel stacks break on a mistake
    if (typeof globalThis._egOnMistake === 'function') globalThis._egOnMistake();

    if (typeof globalThis.PassiveTracker !== 'undefined') PassiveTracker.onMistake();

    // Animals no longer flee outright on a real mistake - instead they lose
    // remaining time (Browney/Wiener −20 s each, Drifter −5 s)
    if (typeof window.penalizeRandomWalkersOnMistake === 'function') {
        window.penalizeRandomWalkersOnMistake();
    }


}

// Open (or reset) the Confidence Interval grace window after a real mistake.
// The window gives the player a brief period where the NEXT mistake is absorbed.
function openConfidenceIntervalGraceWindow() {
    if (ptHasSkill('confidence_interval_1') && !globalThis._confidenceIntervalUsed) {
        let windowSecs = 1;
        if (ptHasSkill('confidence_interval_2')) windowSecs++;
        if (ptHasSkill('confidence_interval_3')) windowSecs++;
        globalThis._confidenceIntervalActive = true;
        // Soft green glow marks the forgiveness window while it is open
        if (typeof globalThis.playConfidenceIntervalEffect === 'function') {
            globalThis.playConfidenceIntervalEffect(windowSecs * 1000);
        }
        setTimeout(() => { globalThis._confidenceIntervalActive = false; }, windowSecs * 1000);
    } else {
        // Reset the "just used" flag so the window can open again next mistake
        globalThis._confidenceIntervalUsed = false;
    }
}

// Golden Clock: decrement its mistake budget and trigger game-over if exhausted.
// Returns true if the clock fired a game-over (caller should return).
function checkGoldenClockAfterMistake() {
    if (!window.LEVEL_FLAGS.goldenClockActive) return false;

    window.LEVEL_FLAGS.goldenClockMistakesLeft = (window.LEVEL_FLAGS.goldenClockMistakesLeft || 0) - 1;

    // Canonical counter format (keeps the "x / y" endgame layout) + clock suffix
    if (typeof globalThis._setMistakeCounterText === 'function') {
        globalThis._setMistakeCounterText(` 🕰️${window.LEVEL_FLAGS.goldenClockMistakesLeft}`);
    } else {
        const mcEl = document.getElementById('mistake-counter');
        if (mcEl) mcEl.textContent = `✗ ${globalThis.mistakeCount} 🕰️${window.LEVEL_FLAGS.goldenClockMistakesLeft}`;
    }

    if (window.LEVEL_FLAGS.goldenClockMistakesLeft <= 0) {
        window.LEVEL_FLAGS.goldenClockActive = false;
        globalThis.dead = true;
        stopTimer();
        window.LEVEL_FLAGS.lastFailedGi = cur.gIdx;
        if (typeof globalThis._arcaneFreeze_clearAllFrostAndStalagmites === 'function') {
            globalThis._arcaneFreeze_clearAllFrostAndStalagmites();
        }
        document.getElementById('lose-title').textContent = t('ov_lose');
        document.getElementById('lose-sub').textContent = t('cg_golden_clock_fail');
        document.getElementById('ov-lose').classList.add('show');
        return true;    // game over - caller must return
    }
    return false;
}

// Hardcore mode: any real mistake ends the run immediately.
// Returns true if hardcore game-over was triggered (caller should return).
function checkHardcoreAfterMistake() {
    if (!globalThis.curMods.hardcore) return false;

    // Endgame maps have their own defeat summary. Do not open the generic
    // Hardcore overlay first; its mutation observer would otherwise race
    // with the map-failed transition and reopen the overlay on return.
    if (typeof globalThis._egIsActive === 'function' && globalThis._egIsActive() &&
        typeof globalThis._egEndMapDefeated === 'function') {
        globalThis._egEndMapDefeated(t('hc_fail_title'), t('hc_fail_sub'));
        return true;
    }

    globalThis.dead = true;
    stopTimer();
    window.LEVEL_FLAGS.lastFailedGi = cur.gIdx;    // bounceback achievement needs this
    if (typeof globalThis._arcaneFreeze_clearAllFrostAndStalagmites === 'function') {
        globalThis._arcaneFreeze_clearAllFrostAndStalagmites();
    }
    document.getElementById('lose-title').textContent = t('hc_fail_title');
    document.getElementById('lose-sub').textContent = t('hc_fail_sub');
    document.getElementById('ov-lose').classList.add('show');
    return true;
}

// Orchestrates all consequences of a real (unabsorbed) wrong fill.
// Returns true if a game-over was triggered (caller must return immediately).
function applyRealMistake(row, col) {
    markCellWrongAndPenalize(row, col);
    breakFillStreaksOnMistake();
    openConfidenceIntervalGraceWindow();
    if (checkGoldenClockAfterMistake()) return true;
    if (checkHardcoreAfterMistake()) return true;
    return false;
}

// Full wrong-fill flow: first try absorption, then apply real consequences.
// Returns true if the caller (applyCell) should stop processing this cell.
export function handleWrongFill(row, col) {
    // Try to absorb the mistake with a shield, freeze, class passive, or CI window
    if (tryAbsorbMistake(row, col)) return true;

    // No absorption - apply real penalty and check for game-over
    return applyRealMistake(row, col);
}


//------------------------------------------------------------------------
//-------------------LUCKY TILE CLAIM HELPERS----------------------------
//------------------------------------------------------------------------
// Helpers for right-click marking a lucky tile: item rewards,
// bonus item chance (generous_fortune), and covariance_shift reveals.
//------------------------------------------------------------------------

// Picks a primary item reward and optionally a bonus item (generous_fortune skill).
// Pushes both into inventory and returns the composed toast message.
// Returns null item IDs if Apex Collector suppresses the drop.
function claimLuckyTileItems() {
    const wonItemId = globalThis.pickLuckyItem();
    const grantedIds = [];
    let toastMsg;

    if (wonItemId) {
        const newItem = {
            uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            defId: wonItemId
        };
        STATE.inventory.push(newItem);

        const def = globalThis.ITEM_DEFS[wonItemId];
        toastMsg = t('cg_lucky_tile_found').replace('{x}', `${puzzleItemIconHtml(def)} ${_escapeToastHtml(globalThis.itemName(def))}`);
        grantedIds.push(wonItemId);
    } else {
        toastMsg = t('cg_lucky_tile_found').replace('{x}', t('cg_lucky_tile_suppressed'));
    }

    // generous_fortune (192-194): each node adds a stacking bonus-item chance
    const bonusChance = (ptHasSkill('generous_fortune_1') ? 0.10 : 0)
        + (ptHasSkill('generous_fortune_2') ? 0.15 : 0)
        + (ptHasSkill('generous_fortune_3') ? 0.25 : 0);

    if (bonusChance > 0 && Math.random() < bonusChance) {
        const bonusItemId = globalThis.pickLuckyItem();
        if (bonusItemId) {
            const bonusItem = {
                uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                defId: bonusItemId
            };
            STATE.inventory.push(bonusItem);
            const bonusDef = globalThis.ITEM_DEFS[bonusItemId];
            toastMsg += ` + ${puzzleItemIconHtml(bonusDef)} ${_escapeToastHtml(globalThis.itemName(bonusDef))}`;
            grantedIds.push(bonusItemId);
        }
    }

    return { toastMsg, grantedIds };
}

// Applies the keystone_variance_collapse downside: claiming a lucky tile
// costs the player 10 minutes. Appends a warning to the toast message.
// The lucky-tile toast renders as HTML (item art images), so the note is
// escaped before appending.
function applyVarianceCollapsePenalty(toastMsg) {
    if (!ptHasSkill('keystone_variance_collapse')) return toastMsg;
    subtractTimeSecs(600);
    return toastMsg + ` ${_escapeToastHtml(t('cg_variance_collapse_note'))}`;
}

// covariance_shift (261-263): after a lucky tile is claimed, reveal 1–3
// unrevealed correct cells from the same row or column.
function applyCovarianceShiftReveal(row, col) {
    if (window.LEVEL_FLAGS.oracleActive) return;
    if (!ptHasSkill('covariance_shift_1')) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    const sol = cur.grid;
    const cols = sol[0].length;
    const rows = sol.length;

    const revealCount = ptHasSkill('covariance_shift_3') ? 3
        : ptHasSkill('covariance_shift_2') ? 2
            : 1;

    // Gather unrevealed correct cells in the same row and column
    const pool = [];
    for (let c = 0; c < cols; c++)
        if (sol[row][c] === 1 && globalThis.userGrid[row][c] !== 1 && !globalThis.revealedGrid[row][c])
            pool.push([row, c]);
    for (let r = 0; r < rows; r++)
        if (r !== row && sol[r][col] === 1 && globalThis.userGrid[r][col] !== 1 && !globalThis.revealedGrid[r][col])
            pool.push([r, col]);

    globalThis.shuffle(pool);

    const affected = [];
    pool.slice(0, revealCount).forEach(([r, c]) => {
        globalThis.revealedGrid[r][c] = true;
        globalThis.userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        affected.push(`g-${r}-${c}`);
    });

    if (affected.length > 0) {
        if (typeof globalThis._applyCellEffect === 'function') {
            globalThis._applyCellEffect(affected, 'reveal');
            if (ptHasSkill('adjacency_matrix')) _adjacencyMatrixRefreshAll();
        }
        globalThis.checkWin();
    }
}

// Orchestrates the full lucky tile claim: removes the tile, grants items,
// applies any keystones, saves state, and triggers covariance_shift reveals.
function handleLuckyTileClaim(row, col) {
    // Only fires when right-clicking an unclaimed lucky tile
    if (pval !== 2 || !globalThis.luckyTiles || !globalThis.luckyTiles.has(`${row}-${col}`)) return;

    globalThis.luckyRewardClaimed++;
    trackAchStat('luckyTilesFound');
    Audio_Manager.playSFX('luckyTileActivate');
    globalThis.luckyTiles.delete(`${row}-${col}`);

    let { toastMsg, grantedIds } = claimLuckyTileItems();
    toastMsg = applyVarianceCollapsePenalty(toastMsg);

    save();
    globalThis.buildInventoryPanel();
    grantedIds.forEach(defId =>     globalThis.showItemGainPopup(defId));
    showHtmlToast(toastMsg);

    applyCovarianceShiftReveal(row, col);

    if (typeof globalThis.triggerBanter === 'function') globalThis.triggerBanter('lucky_tile');
}


//------------------------------------------------------------------------
//-------------------CORRECT FILL HOOKS AND SKILL TRIGGERS---------------
//------------------------------------------------------------------------
// Helpers that fire after a verified correct left-click fill.
//------------------------------------------------------------------------

// Shows the size of the contiguous correctly-filled run passing through
// (row, col) along the current drag axis. Recomputed fresh on every call,
// so it's naturally correct regardless of drag direction, revisits, or
// how many of the cells were already filled before this stroke.
function updateDragStrokeCounter(row, col) {
    if (!globalThis.painting || pval !== 1) return;

    // Figure out which axis to measure along.
    let axis = dragAxis;
    if (!axis) {
        // Still on the start cell / direction not known yet - pick whichever
        // axis has the longer existing run as a best guess.
        const rowRun = _countAdjacentPrefillRun(row, col, 'row');
        const colRun = _countAdjacentPrefillRun(row, col, 'col');
        axis = rowRun >= colRun ? 'row' : 'col';
    }

    const displayCount = _countAdjacentPrefillRun(row, col, axis) + 1; // +1 for the cell itself

    if (displayCount > 1) {
        dragCounterApply(row, col, displayCount);
    }
}

// Fires all class and passive system hooks for a correct fill.
function fireCorrectFillHooks(row, col) {
    if (typeof window.feedDrifter === 'function') window.feedDrifter();

    globalThis.onCorrectFill(row, col);    // class.js hook
    if (typeof globalThis.PassiveTracker !== 'undefined') PassiveTracker.onCorrectFill();

    _binomialBurstOnCorrectFill(row, col);
    _gamblersRuinOnCorrectFill();
    _frequentistsBurdenOnCorrectFill();
}

// sample_efficiency (nodes 1-3): after N consecutive correct fills, reveal a tile.
// The threshold decreases with higher nodes.
function checkSampleEfficiency(row, col) {
    if (!ptHasSkill('sample_efficiency_1')) return;
    if (ptHasSkill('keystone_ergodic_field')) return;

    globalThis.consecutiveCorrectFills++;

    let threshold = 20;
    if (ptHasSkill('sample_efficiency_2')) threshold -= 2;
    if (ptHasSkill('sample_efficiency_3')) threshold -= 3;

    if (globalThis.consecutiveCorrectFills >= threshold) {
        globalThis.consecutiveCorrectFills = 0;
        // Capture the output of revealTiles
        const revealed = revealTiles(1);
        if (revealed && revealed.length > 0) {
            globalThis.playSampleEfficiencyEffect(revealed[0].row, revealed[0].col);
            Audio_Manager.playSFX('sample_efficiency');
        }

        // Bayesian bonus: chance to reveal a second tile
        if (_getBayesianBonus() > 0 && Math.random() < _getBayesianBonus()) {
            _resetBayesianBonus();
            const bonusRevealed = revealTiles(1);

            if (bonusRevealed && bonusRevealed.length > 0) {
                // Delay the second effect slightly so they don't overlap perfectly
                setTimeout(() => {
                    globalThis.playSampleEfficiencyEffect(bonusRevealed[0].row, bonusRevealed[0].col);
                    Audio_Manager.playSFX('sample_efficiency');
                }, 300);
            }
            questStat_sampleEfficiencyReveal();
        }

        globalThis.showToast(`📈 ${t('cg_sample_efficiency')}`);
        PassiveTracker.onSampleEffTrigger();
    }
}

// streak_bonus (nodes 1-3): after 15 consecutive correct fills, add bonus seconds.
// Keystone gamblers_ruin disables this skill entirely.
function checkStreakBonus() {
    if (!ptHasSkill('streak_bonus_1')) return;
    if (ptHasSkill('keystone_gamblers_ruin')) return;

    window.LEVEL_FLAGS.streakBonusFills++;
    if (window.LEVEL_FLAGS.streakBonusFills >= 15) {
        window.LEVEL_FLAGS.streakBonusFills = 0;

        let bonus = 15;                                     // streak_bonus_1 base
        if (ptHasSkill('streak_bonus_2')) bonus += 5;
        if (ptHasSkill('streak_bonus_3')) bonus += 10;

        // Preview so the FX/toast show the actual (map-scaled) gain.
        const shown = previewGainSecs(bonus);
        addTimeSecs(bonus);
        if (typeof globalThis.playTimeGainEffect === 'function') globalThis.playTimeGainEffect(`+${shown}s`, '#ffb830');
        globalThis.showToast(`🔥 ${t('cg_streak_bonus').replace('{n}', shown)}`);
        PassiveTracker.onStreakBonusTrigger();
    }
}

// Orchestrates everything that happens after a verified correct left-click fill.
function handleCorrectFill(row, col) {
    questStat_hasManuallyFilledCell();
    Audio_Manager.playSFX('cellFill');

    trackAchStat('cellsFilled');
    _incDirect('lifetimeTilesFilled');

    // Absolute Zero: leave a persistent frost crust on tiles correctly
    // filled while the freeze is active
    if (window._freezeActive && typeof globalThis._arcaneFreeze_applyPersistentFrost === 'function') {
        globalThis._arcaneFreeze_applyPersistentFrost(row, col);
    }

    // Endgame hooks
    if (isEndgameLevel()) {
        _egCheckAllClaims(row, col);
        if (typeof globalThis._egOnCorrectCell === 'function') globalThis._egOnCorrectCell(row, col);
        // Shocked-cursor ailment: reveals may strip ✕ marks from neighbours
        if (typeof globalThis._egOnCorrectCellPuzzleFX === 'function') globalThis._egOnCorrectCellPuzzleFX(row, col);
    }

    updateDragStrokeCounter(row, col);
    fireCorrectFillHooks(row, col);
    checkSampleEfficiency(row, col);
    checkStreakBonus();

    // Character banter: react to a solid run of correct fills.
    if (typeof globalThis.triggerBanter === 'function'
        && globalThis.consecutiveCorrectFills > 0 && globalThis.consecutiveCorrectFills % 10 === 0) {
        globalThis.triggerBanter('correct_streak');
    }
}


//------------------------------------------------------------------------
//----------------------------APPLY CELL----------------------------------
//------------------------------------------------------------------------
// Core function: changes a cell's state. Called by cellDown() on the
// initial click and by onHover() for every cell entered while dragging.
//------------------------------------------------------------------------

export function applyCell(row, col) {

    // --- Special intercepts (must run first) ---
    // These can completely redirect or consume the click.
    if (checkSpecialIntercepts(row, col)) return;

    // Cells that are already correctly filled (revealed by an item/skill,
    // or filled earlier) get skipped by the guard below as a no-op - but
    // they should still count toward the drag-stroke counter as we pass
    // over them.
    if (globalThis.painting && pval === 1 && globalThis.userGrid[row][col] === 1) {
        updateDragStrokeCounter(row, col);
    }

    // --- Cell guards ---
    // Silently ignore clicks that would be no-ops.
    if (checkCellGuards(row, col)) return;

    // --- Wrong fill path (left-click on an incorrect cell) ---
    if (pval === 1 && cur.grid[row][col] !== 1) {
        // First try sig-threshold intercept (must be before penalty logic)
        if (globalThis._sigThresholdIntercept(row, col)) {
            trackAchStat('sigThresholdIntercepts');
            return;
        }
        // Bayesian mistake-prevention intercepts
        if (typeof globalThis._typeIShieldIntercept === 'function' && globalThis._typeIShieldIntercept(row, col)) return;
        if (typeof globalThis._bayesTrapProtectionIntercept === 'function' && globalThis._bayesTrapProtectionIntercept(row, col)) return;

        // Try to absorb or apply the mistake; stop processing if game-over triggered
        if (handleWrongFill(row, col)) {
            // Whether absorbed or penalised, a wrong click on an endgame pickup discards it
            _egDiscardAllDrops(row, col);
            return;
        }

        // handleWrongFill handled everything - don't fall through to valid-move logic
        return;
    }

    // --- Valid move path ---

    // Lucky tile: right-clicking to mark ✕ on an unspent lucky tile grants a reward
    handleLuckyTileClaim(row, col);

    Audio_Manager.playSFX('cellMark');

    // Endgame: right-click mark on a correct cell discards any drop sitting there
    if (isEndgameLevel() && pval === 2 && cur.grid[row][col] === 1) {
        _egDiscardAllDrops(row, col);
    }

    // Write the new value into the player grid
    globalThis.userGrid[row][col] = pval;
    // Any mark written through this function is the player's own input,
    // so always clear a possibly-stale system-mark flag here. Some effects
    // (e.g. state rollback, boss mark-wipes) reset cells to empty without
    // clearing it, which would otherwise make a fresh manual ✕ render
    // with the 'marked-system' ability styling.
    globalThis.systemMarkedGrid[row][col] = false;

    // Extra logic that only applies to a correct left-click fill
    if (pval === 1 && cur.grid[row][col] === 1) {
        handleCorrectFill(row, col);
    }

    // Endgame: correct right-click mark on an empty-solution cell claims any drop there
    if (pval === 2 && cur.grid[row][col] === 0) {
        _egCheckAllClaims(row, col);
    }

    // Refresh display and check for puzzle completion
    renderCell(row, col);
    updClues(row, col);
    globalThis.checkWin();
}


//------------------------------------------------------------------------
//-------------------CELL DOWN HELPER-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Determines what pval (paint value) a right-click should use,
// based on the cell's current state and user settings.
// Cycles: empty → ✕ → question mark (optional) → empty
function resolveRightClickValue(row, col) {
    if (globalThis.userGrid[row][col] === 2 && globalThis.SETTINGS.questionMark) {
        return 3;   // ✕ → question mark (if the setting is enabled)
    } else if (globalThis.userGrid[row][col] === 2 && !globalThis.SETTINGS.questionMark) {
        return 0;   // ✕ → empty (skip question mark)
    } else if (globalThis.userGrid[row][col] === 3) {
        return 0;   // question mark → empty
    } else {
        return 2;   // empty → ✕
    }
}


//------------------------------------------------------------------------
//----------------------------CELL DOWN-----------------------------------
//------------------------------------------------------------------------
// Entry point for a mousedown event on any grid cell.
// Sets up drag state and fires the first applyCell() call.
//------------------------------------------------------------------------

export function cellDown(e, row, col) {
    e.preventDefault();
    if (globalThis.dead) return;

    mbtn = e.button;
    globalThis.painting = true;

    dragStartRow = row;
    dragStartCol = col;
    dragAxis = null;
    dragStrokeCount = 0;
    dragCountedCells = new Set();

    // snapshot how many correct cells already sit adjacent to the
    // start cell along each axis, so the counter can pick up from there.
    dragPrefillRow = _countAdjacentPrefillRun(row, col, 'row');
    dragPrefillCol = _countAdjacentPrefillRun(row, col, 'col');
    dragPrefillApplied = false;

    // Touchpad Mode: swap which physical button means "fill" vs "mark".
    // effectiveBtn is what we treat the click AS, regardless of the real button pressed.
    // "Invert Mouse Buttons" setting swaps fill/mark the same way, permanently.
    let btn = mbtn;
    if (globalThis.SETTINGS.invertMouseButtons && (btn === 0 || btn === 2)) {
        btn = (btn === 0) ? 2 : 0;
    }
    const effectiveBtn = (touchpadMarkModeActive && btn === 0) ? 2
        : (touchpadMarkModeActive && btn === 2) ? 0
            : btn;

    if (effectiveBtn === 0) {
        pval = 1;
    } else {
        if (globalThis.userGrid[row][col] === 1 && cur.grid[row][col] === 1) {
            globalThis.painting = false;
            return;
        }
        pval = resolveRightClickValue(row, col);
    }

    applyCell(row, col);
}


//------------------------------------------------------------------------
//---------------------------STOP PAINTING--------------------------------
//------------------------------------------------------------------------
// Called on mouseup or when the cursor leaves the grid.
// Cleans up all drag state so the next stroke starts fresh.
//------------------------------------------------------------------------

export function stopPainting() {
    globalThis.painting = false;
    dragStartRow = -1;
    dragStartCol = -1;
    dragAxis = null;
    dragStrokeCount = 0;
    dragCountedCells = new Set();
    dragPrefillRow = 0;
    dragPrefillCol = 0;
    dragPrefillApplied = false;
    dragPrefillOffset = 0;
    dragCounterClear();

    // Endgame: release the charged projectile accumulated while drag-painting
    if (isEndgameLevel() && typeof globalThis._egReleaseChargedShot === 'function') {
        globalThis._egReleaseChargedShot();
    }
}

//------------------------------------------------------------------------
//----------------------------TOUCHPAD MODE-------------------------------
//------------------------------------------------------------------------
// Lets players on a touchpad swap left-click to act as "mark" instead of
// "fill", since trackpads often can't reliably right-click on a grid cell.
//------------------------------------------------------------------------

// Shows or hides the in-game toggle button based on the settings flag.
// Called on settings change (settings.js) and once on level start.
// The button hangs below the grid inside #puzzle-scaler-wrap, so showing/
// hiding it also changes the space the grid needs - re-run the puzzle
// scaling afterwards to keep the toggle clear of the inventory bar.
export function updateTouchpadModeButtonVisibility() {
    const btn = document.getElementById('btn-touchpad-mode');
    if (!btn) return;
    const wasHidden = btn.classList.contains('hidden');
    btn.classList.toggle('hidden', !globalThis.SETTINGS.touchpadModeEnabled);

    // If the setting was turned off while active, force back to normal mode
    if (!globalThis.SETTINGS.touchpadModeEnabled && touchpadMarkModeActive) {
        touchpadMarkModeActive = false;
        _refreshTouchpadModeButtonLabel();
    }

    // Grid must re-fit whenever the toggle appears or disappears mid-level
    if (wasHidden !== !globalThis.SETTINGS.touchpadModeEnabled
        && typeof globalThis.scalePuzzle === 'function' && typeof globalThis._getWrap === 'function' && globalThis._getWrap()) {
        globalThis.scalePuzzle();
    }
}

// Updates the button's text/icon so it always reflects the CURRENT behaviour
// (not the behaviour you'll switch to) - e.g. while in Mark mode, the button
// reads "MARK" so the player always knows what left-click currently does.
export function _refreshTouchpadModeButtonLabel() {
    const btn = document.getElementById('btn-touchpad-mode');
    if (!btn) return;
    if (touchpadMarkModeActive) {
        btn.textContent = t('touchpad_btn_mark');
        btn.classList.add('touchpad-mode-active');
    } else {
        btn.textContent = t('touchpad_btn_fill');
        btn.classList.remove('touchpad-mode-active');
    }
}

// Flips the mode. Wired to the button's click handler in title-bindings.js (or here).
export function toggleTouchpadMarkMode() {
    touchpadMarkModeActive = !touchpadMarkModeActive;
    _refreshTouchpadModeButtonLabel();
    Audio_Manager.playSFX('cellMark'); // small audio confirmation, reuses an existing sfx
}


//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
