import { trackAchStat } from '../achievements/achievements.js';
import { revealTiles, markWrongTiles } from '../puzzle-mechanics/grid-actions.js';
import { Audio_Manager } from '../audio/audio.js';
import { renderCell, updClues } from '../grid.js';
import { isEndgameLevel } from '../mouse-button-handlers.js';
import { _resetStoxFlags, save } from '../state.js';
import { addTimeSecs } from '../puzzle-mechanics/timer-adjust.js';
import { LANG, t } from '../translation/translations.js';
import { ASCENDENCY_DEFS } from './ascendency-defs.js';
import { _executeRegressionToPrior, _executeSignificanceThreshold } from './class-actuary.js';
import { _executeBayesTraps, _executeTypeIShield } from './class-bayesian.js';
import { _patchCooldownButton, cooldownState, getEffectiveCooldown, startSlotCooldown } from './class-cooldown-state.js';
import { CLASS_DEFS, ENDGAME_HEARTBLOOM_DEF } from './class-defs.js';
import { CLASS_HUD_HINT_MAX_USES, buildClassHUD, updateMomentumBar } from './class-hud.js';
import { _abilityCanAfford, _bloodMagicActive, _getAbilityManaCost, payAbilityCost } from './class-mana.js';
import { _clearTransitionMatrix, _executeStateRollback, _executeTransitionMatrix, _transitionMatrixCascade, resetMarkovianState } from './class-markovian.js';
import { _executeArcaneFreeze, _executeArcaneReveal, _varianceShield_playCometImpact, _varianceShield_removeBubble, _varianceShield_updateVisibility } from './class-mathmagician.js';
import { _endBlackSwan, _executeBlackSwan, _executeTailRisk } from './class-outlier.js';
import { _executeFieldScan, _executePrecisionMark, _playBayesianInsightAnimation, _playBayesianRevealEffect } from './class-probabilist.js';
import { _executeBrownianMotion, _executeSummonDrifter } from './class-random-walker.js';
import { _executeDegreesOfFreedom, _executeResidual, resetRecursionistState } from './class-recursionist.js';
import { _executeDataStrike, _executeDiagonalStrike, _momentumClearParticlesImmediate, _momentumParticlesOnMistake, _momentumSpawnParticle, _statisticianTriggerMomentum } from './class-statistician.js';
import { activateTargetingReticle } from './targeting-reticle.js';
import { playShieldChargePulseEffect, playTimeGainEffect } from '../passive-tree/passive-effects.js';
import { ptHasSkill } from '../passive-tree/passive-tree-state-points.js';
import { getCharmLockedSkillForLegacySlot, getSkillCastRankClampedForSlot, getSkillIdForLegacySlot, noteCharmCast } from '../skills/skill-charms.js';
import { _incDirect, updateQuestStats } from '../quests/quests-stats.js';

//--- Phase 3 step 5: live accessors (external write sites stay untouched) ---
try { Object.defineProperty(globalThis, 'correctFillStreak', { get() { return correctFillStreak; }, set(v) { correctFillStreak = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'nextPenaltyHalved', { get() { return nextPenaltyHalved; }, set(v) { nextPenaltyHalved = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, 'toggleActiveAbility', { get() { return toggleActiveAbility; }, set(v) { toggleActiveAbility = v; }, configurable: true }); } catch (e) {}
// class-abilities.js
// Handles all class passive and active ability logic:
//   - Shared grid/cell helpers used across multiple abilities
//   - Dispatch routing to per-class and per-ascendency ability functions
//   - Active ability arming, instant firing, and cell-click execution
//   - Class passive setup at level start
//   - Passive reactions to correct fills and mistakes during play


//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

let correctFillStreak = 0;
let nextPenaltyHalved = false;




//------------------------------------------------------------------------
//---------------------------CELL HELPERS---------------------------------
//------------------------------------------------------------------------
// Low-level helpers that read/write a single grid cell.
// Used by many ability implementations across the codebase.
//------------------------------------------------------------------------


// _resolveCell - reveals a filled cell OR marks an empty cell.
//   Returns the cell id string ("g-r-c") if the cell was actually changed, otherwise null.
export function _resolveCell(r, c, sol) {
    if (sol[r][c] === 1) {
        if (!globalThis.revealedGrid[r][c] && globalThis.userGrid[r][c] !== 1) {
            globalThis.revealedGrid[r][c] = true;
            globalThis.userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            return `g-${r}-${c}`;
        }
    } else {
        if (globalThis.userGrid[r][c] === 0) {
            globalThis.userGrid[r][c] = 2;
            globalThis.systemMarkedGrid[r][c] = true;
            renderCell(r, c);
            return `g-${r}-${c}`;
        }
    }
    return null;
}


// _revealFilledCell - reveals a filled cell only. Never touches empty cells.
//   Used by Diagonal Strike when the 'diagonally_wrong' passive node is NOT active.
export function _revealFilledCell(r, c, sol) {
    if (sol[r][c] === 1) {
        if (!globalThis.revealedGrid[r][c] && globalThis.userGrid[r][c] !== 1) {
            globalThis.revealedGrid[r][c] = true;
            globalThis.userGrid[r][c] = 1;
            renderCell(r, c);
            updClues(r, c);
            return `g-${r}-${c}`;
        }
    }
    return null;
}


// _filterRevealedIds - from a list of cell ids, returns only those whose solution cell is filled (=1).
export function _filterRevealedIds(ids, sol) {
    return ids.filter(id => {
        const [, r, c] = id.split('-').map(Number);
        return sol[r][c] === 1;
    });
}


// _filterMarkedIds - from a list of cell ids, returns only those whose solution cell is empty (=0).
export function _filterMarkedIds(ids, sol) {
    return ids.filter(id => {
        const [, r, c] = id.split('-').map(Number);
        return sol[r][c] === 0;
    });
}




//------------------------------------------------------------------------
//---------------------------DATA LOOKUP HELPERS--------------------------
//------------------------------------------------------------------------
// Resolves ability definitions and effect data from STATE and CLASS_DEFS /
// ASCENDENCY_DEFS. Keeps callers free of repeated level-index arithmetic.
//------------------------------------------------------------------------


// _getActiveAbilityData - returns the level-specific ability data object for the given slot.
//   Reads classActive1Level / classActive2Level from STATE, overridden by
//   the slotted charm's rank when the charm system has one placed (so
//   slotting a lower-rank charm really does cast the weaker variant).
export function _getActiveAbilityData(def, activeKey) {
    let level = activeKey === 'active1'
        ? (globalThis.STATE.classActive1Level || 1)
        : (globalThis.STATE.classActive2Level || 1);
    if (globalThis.STATE.playerClass && typeof getSkillCastRankClampedForSlot === 'function') {
        const charmRank = getSkillCastRankClampedForSlot(activeKey);
        if (charmRank) level = charmRank;
    }
    return def[activeKey].levels[level - 1];
}


// _getPassiveEffect - returns the current passive effect object for the active class.
//   Reads classPassiveLevel from STATE.
export function _getPassiveEffect() {
    const def = CLASS_DEFS[globalThis.STATE.playerClass];
    const passLv = globalThis.STATE.classPassiveLevel || 1;
    return def.passive.levels[passLv - 1].effect;
}


// _getAscendencySlotData - resolves the ability data for an ascendency HUD slot.
//   hudSlot 'active3' maps to ascendency active1; 'active4' maps to active2.
export function _getAscendencySlotData(hudSlot) {
    const asc = globalThis.STATE.playerAscendency ? ASCENDENCY_DEFS[globalThis.STATE.playerAscendency] : null;
    if (!asc) return null;
    const ascSlot = hudSlot === 'active3' ? 'active1' : 'active2';
    let skillLv = ascSlot === 'active1'
        ? (globalThis.STATE.ascendencySkill1Level || 1)
        : (globalThis.STATE.ascendencySkill2Level || 1);
    // Charm rank override (see _getActiveAbilityData above).
    if (globalThis.STATE.playerAscendency && typeof getSkillCastRankClampedForSlot === 'function') {
        const charmRank = getSkillCastRankClampedForSlot(hudSlot);
        if (charmRank) skillLv = charmRank;
    }
    return { asc, ascSlot, actData: asc[ascSlot].levels[skillLv - 1] };
}




//------------------------------------------------------------------------
//---------------------------UI / MODE HELPERS----------------------------
//------------------------------------------------------------------------
// Helpers that touch the DOM or show toasts related to ability arming.
//------------------------------------------------------------------------


// _setAbilityMode - arms or disarms activeAbilityMode and updates the targeting cursor.
//   The old approach set `cursor: crosshair` on #puzzle-scaler-wrap only, which was
//   silently overridden by .gc's `cursor: pointer` whenever the mouse was actually over
//   a grid cell. activateTargetingReticle() (targeting-reticle.js) replaces the native
//   cursor everywhere with a custom animated reticle that tracks the mouse via JS, so it
//   now stays consistent both inside and outside the grid.
export function _setAbilityMode(armed) {
    globalThis.activeAbilityMode = armed;
    if (typeof activateTargetingReticle === 'function') activateTargetingReticle(armed);
}


// _showAbilityArmToast - shows the "click a cell" hint toast for the given HUD slot.
//   Reads the localised cursor description from the ability definition.
export function _showAbilityArmToast(slot) {
    let activeData = null;

    if (slot === 'active3' || slot === 'active4') {
        const asc = globalThis.STATE.playerAscendency ? ASCENDENCY_DEFS[globalThis.STATE.playerAscendency] : null;
        if (!asc) return;
        activeData = slot === 'active3' ? asc.active1 : asc.active2;
    } else {
        const def = CLASS_DEFS[globalThis.STATE.playerClass];
        if (!def) return;
        activeData = def[slot];
    }

    if (!activeData) return;
    const msg = LANG === 'de'
        ? (activeData.descCursorDE || activeData.descCursorEn)
        : activeData.descCursorEn;
    globalThis.showToast(`🎯 ${msg}`);
}




//------------------------------------------------------------------------
//------------------ABILITY DISPATCH (BASE CLASSES)-----------------------
//------------------------------------------------------------------------
// Routes an ability call to the correct implementation function and tracks
// the matching achievement stat. Split by active slot to keep each switch
// focused on a single set of abilities. Placed ahead of the instant-fire
// and cell-click execution sections below, since both call into this.
//------------------------------------------------------------------------


// _dispatchBaseActive1 - dispatches the active1 ability for base classes.
export function _dispatchBaseActive1(playerClass, row, col, effect) {
    switch (playerClass) {
        case 'mathmagician':
            _executeArcaneReveal(row, col, effect.radius, effect.maxReveals);
            trackAchStat('skillArcaneRevealUsed');
            break;
        case 'statistician':
            _executeDataStrike(effect.solveCount, effect.revealCap || 5);
            trackAchStat('skillDataStrikeUsed');
            break;
        case 'probabilist':
            _executePrecisionMark(row, col, effect.extraLines || 0);
            trackAchStat('skillPrecisionMarkUsed');
            break;
    }
}


// _dispatchBaseActive2 - dispatches the active2 ability for base classes.
export function _dispatchBaseActive2(playerClass, row, col, effect) {
    switch (playerClass) {
        case 'mathmagician':
            _executeArcaneFreeze(effect.freezeDuration);
            trackAchStat('skillAbsoluteZeroUsed');
            break;
        case 'statistician':
            _executeDiagonalStrike(row, col, effect.diagonals);
            trackAchStat('skillDiagonalStrikeUsed');
            break;
        case 'probabilist':
            _executeFieldScan(row, col, effect.scanSize, effect.scanDuration, true);
            trackAchStat('skillFieldScanUsed');
            break;
    }
}


// _noteCharmCastForSlot - records which skill id a legacy HUD slot ('active1'
//   … 'active4') is casting, so the reveal projectiles that fire on a stagger
//   afterwards read THAT skill's charmed rank and orb bonus
//   (js/skills/skill-charms.js). Without this the HUD entry point - as opposed
//   to the hotbar, which notes the cast in activateSkill() - would fall back
//   to the un-charmed damage multiplier.
export function _noteCharmCastForSlot(slot) {
    if (typeof noteCharmCast !== 'function' || typeof getSkillIdForLegacySlot !== 'function') return;
    const castingId = getSkillIdForLegacySlot(slot);
    if (castingId) noteCharmCast(castingId);
}


// _dispatchBaseAbility - top-level router for base class active abilities.
//   Calls the correct active1 or active2 dispatcher, then logs the quest stat.
export function _dispatchBaseAbility(activeKey, playerClass, row, col, effect) {
    // The cast rank + orb bonus follow the skill's slotted charm.
    _noteCharmCastForSlot(activeKey);

    // Character banter for this exact class + skill combination.
    if (typeof globalThis.triggerSkillBanter === 'function') {
        globalThis.triggerSkillBanter(`${playerClass}_${activeKey}`);
    }

    // Combat animation for this exact class + skill combination (no-op
    // until art exists - the static portrait keeps showing).
    if (typeof globalThis._playAvatarSkillAnimationForSlot === 'function') {
        try { globalThis._playAvatarSkillAnimationForSlot(activeKey); } catch (e) {}
    }

    if (activeKey === 'active1') {
        _dispatchBaseActive1(playerClass, row, col, effect);
    } else {
        _dispatchBaseActive2(playerClass, row, col, effect);
    }
    updateQuestStats('classAbilityUsed', {});
}




//------------------------------------------------------------------------
//------------------ABILITY DISPATCH (ASCENDENCIES)-----------------------
//------------------------------------------------------------------------
// Routes an ascendency ability call to the correct implementation and
// tracks the achievement stat. One case per ascendency for readability.
//------------------------------------------------------------------------


// _dispatchAscendencyAbility - routes to the correct ascendency skill implementation.
//   hudSlot 'active3' → ascendency active1 (skill 1); 'active4' → ascendency active2 (skill 2).
export function _dispatchAscendencyAbility(hudSlot, ascendency, row, col, effect) {
    const ascSlot = hudSlot === 'active3' ? 'active1' : 'active2';

    // The cast rank + orb bonus follow the skill's slotted charm.
    _noteCharmCastForSlot(hudSlot);

    // Character banter for this exact ascendency + skill combination.
    if (typeof globalThis.triggerSkillBanter === 'function') {
        globalThis.triggerSkillBanter(`${ascendency}_${ascSlot}`);
    }

    // Combat animation for this exact ascendency + skill combination
    // (no-op until art exists - the static portrait keeps showing).
    if (typeof globalThis._playAvatarSkillAnimationForSlot === 'function') {
        try { globalThis._playAvatarSkillAnimationForSlot(hudSlot); } catch (e) {}
    }

    updateQuestStats('classAbilityUsed', {});

    switch (ascendency) {
        case 'outlier':
            if (ascSlot === 'active1') {
                _executeTailRisk(effect.secondsPerCell, effect.maxCells);
            } else {
                _executeBlackSwan(effect.duration);
            }
            break;

        case 'actuary':
            if (ascSlot === 'active1') {
                _executeRegressionToPrior(effect.correctCount, effect.recoverPct, effect.revealCount);
            } else {
                _executeSignificanceThreshold(effect.lines);
            }
            break;

        case 'recursionist':
            if (ascSlot === 'active1') {
                _executeResidual(row, col, effect);
            } else {
                _executeDegreesOfFreedom(row, col, effect);
            }
            break;

        case 'markovian':
            if (ascSlot === 'active1') {
                _executeStateRollback(effect.windowSeconds, effect.rewindSeconds, effect.clearOldMistakes);
            } else {
                _executeTransitionMatrix(effect.duration, effect.cascadeChance, effect.maxDepth);
            }
            break;

        case 'bayesian':
            if (ascSlot === 'active1') {
                _executeBayesTraps(effect.trapCount, effect.availableTraps);
            } else {
                _executeTypeIShield(effect.seedCount, effect.bonusReveal);
            }
            break;

        case 'random_walker':
            if (ascSlot === 'active1') {
                _executeBrownianMotion(row, col, effect.paths, effect.rank);
            } else {
                _executeSummonDrifter(effect.duration, effect.interval, effect.smartTarget, effect.finalHowl);
            }
            break;
    }

    trackAchStat('skillAscendencyUsed');
}




//------------------------------------------------------------------------
//------------------INSTANT ABILITY DETECTION & FIRING-------------------
//------------------------------------------------------------------------
// Some abilities fire the moment the player presses the button, without
// waiting for a cell click. These helpers detect and fire those cases.
//------------------------------------------------------------------------


// _isInstantAbility - returns true if the given slot fires immediately on button press.
//   Instant abilities skip the arm → click flow entirely.
export function _isInstantAbility(slot) {
    // Heartbloom (active5) is always instant - endgame-only
    if (slot === 'active5') return true;

    // Base class instants
    //if (STATE.playerClass === 'probabilist' && slot === 'active2') return true; // Field Scan
    if (globalThis.STATE.playerClass === 'statistician' && slot === 'active1') return true; // Data Strike
    if (globalThis.STATE.playerClass === 'mathmagician' && slot === 'active2') return true; // Absolute Zero

    // Ascendency instants
    if (globalThis.STATE.playerAscendency === 'actuary') {
        if (slot === 'active3') return true; // Regression to Prior
        if (slot === 'active4') return true; // Significance Threshold
    }
    if (globalThis.STATE.playerAscendency === 'markovian') {
        if (slot === 'active3') return true; // State Rollback
        if (slot === 'active4') return true; // Transition Matrix
    }
    if (globalThis.STATE.playerAscendency === 'bayesian') {
        if (slot === 'active3') return true; // Bayes Traps
        if (slot === 'active4') return true; // Type I Error Shield
    }
    if (globalThis.STATE.playerAscendency === 'outlier' && slot === 'active3') return true; // Tail Risk
    if (globalThis.STATE.playerAscendency === 'random_walker') {
        if (slot === 'active3') return true; // Brownian Motion
        if (slot === 'active4') return true; // Drifter
    }


    // active4 instants for specific ascendencies
    if (slot !== 'active4') return false;
    return globalThis.STATE.playerAscendency === 'outlier' || globalThis.STATE.playerAscendency === 'recursionist';
}


// _canFireInstantAbility - extra usability gate for instant abilities that
// only make sense under certain conditions. Returns false (with a toast)
// when the ability must not fire, e.g. Regression to Prior with an empty
// mistake log. Prevents wasting the cooldown on a no-op.
export function _canFireInstantAbility(slot) {
    if (slot === 'active5') {
        if (typeof isEndgameLevel === 'function' && !isEndgameLevel()) {
            globalThis.showToast('💚 Heartbloom only works on endgame maps!', '#ff6b9d');
            return false;
        }
        // Also ensure there is at least one eligible cell - otherwise toast and abort
        // so the cooldown isn't wasted on a no-op.
        const pool = (typeof globalThis._egBuildPickupEligiblePool === 'function') ? globalThis._egBuildPickupEligiblePool() : null;
        if (pool && pool.length === 0) {
            globalThis.showToast('💚 No free cells to spawn hearts!', '#ff6b9d');
            return false;
        }
        // Fallback manual check when _egBuildPickupEligiblePool not yet available
        if (!pool && typeof globalThis.cur !== 'undefined' && globalThis.cur && globalThis.cur.grid) {
            let freeCount = 0;
            for (let r = 0; r < globalThis.cur.grid.length; r++)
                for (let c = 0; c < globalThis.cur.grid[0].length; c++)
                    if (typeof globalThis._egIsCellPickupEligible === 'function' ? globalThis._egIsCellPickupEligible(r, c) : (globalThis.userGrid[r][c] === 0 && !globalThis.revealedGrid[r][c] && !globalThis.wrongGrid[r][c])) freeCount++;
            if (freeCount === 0) {
                globalThis.showToast('💚 No free cells to spawn hearts!', '#ff6b9d');
                return false;
            }
        }
        return true;
    }
    if (globalThis.STATE.playerAscendency === 'actuary' && slot === 'active3') {
        if (!(window._mistakeLog && window._mistakeLog.length > 0)) {
            globalThis.showToast(t('cls_regression_none'));
            return false;
        }
    }
    return true;
}


// _fireInstantBaseAbility - fires an instant ability from the base class slot (active1/active2)
//   and immediately starts its cooldown.
export function _fireInstantBaseAbility(slot) {
    const def = CLASS_DEFS[globalThis.STATE.playerClass];
    if (!def) return;

    const actData = _getActiveAbilityData(def, slot);
    const effect = actData.effect;

    // Pay the cost (life under Blood Magic) - abort without firing if it can't be covered.
    if (!payAbilityCost(_getAbilityManaCost(slot))) return;

    // Row/col are 0,0 - instant abilities ignore position.
    _dispatchBaseAbility(slot, globalThis.STATE.playerClass, 0, 0, effect);

    const cdSeconds = getEffectiveCooldown(slot, def[slot].cooldownSeconds);
    startSlotCooldown(slot, cdSeconds);
}


// _fireInstantAscendencyAbility - fires an instant ability from an ascendency slot (active3/active4)
//   and immediately starts its cooldown.
export function _fireInstantAscendencyAbility(slot) {
    const slotData = _getAscendencySlotData(slot);
    if (!slotData) return;

    const { asc, ascSlot, actData } = slotData;
    const effect = actData.effect;

    // Pay the cost (life under Blood Magic) - abort without firing if it can't be covered.
    if (!payAbilityCost(_getAbilityManaCost(slot))) return;

    // Row/col are 0,0 - instant abilities ignore position.
    _dispatchAscendencyAbility(slot, globalThis.STATE.playerAscendency, 0, 0, effect);

    const cdSeconds = getEffectiveCooldown(slot, asc[ascSlot].cooldownSeconds);
    startSlotCooldown(slot, cdSeconds);
}

//------------------------------------------------------------------------
//------------------HEARTBLOOM (ACTIVE5) EXECUTION------------------------
//------------------------------------------------------------------------

// Picks a random heart pickup def weighted like normal hearts:
// 60% small, 30% medium, 10% large. Falls back to small if defs missing.
export function _pickRandomHeartDef() {
    if (typeof globalThis.EG_PICKUP_DEFS === 'undefined') return null;
    const roll = Math.random() * 100;
    if (roll < 60) return globalThis.EG_PICKUP_DEFS.heart_small;
    if (roll < 90) return globalThis.EG_PICKUP_DEFS.heart_medium;
    return globalThis.EG_PICKUP_DEFS.heart_large;
}

// Spawns `count` hearts onto eligible grid cells, bypassing the normal
// EG_PICKUP_MAX_ON_BOARD cap so all 3 appear at once. Each heart gets
// the standard lifetime/expiry handling.
export function _spawnHeartbloomHearts(count) {
    let spawned = 0;
    for (let i = 0; i < count; i++) {
        let pool = [];
        if (typeof globalThis._egBuildPickupEligiblePool === 'function') {
            pool = globalThis._egBuildPickupEligiblePool().filter(([r, c]) => {
                if (typeof globalThis._egCellHasAnyDrop === 'function') return !globalThis._egCellHasAnyDrop(r, c);
                const key = `${r}-${c}`;
                if (typeof globalThis._egPickups !== 'undefined' && globalThis._egPickups.has(key)) return false;
                return true;
            });
        } else if (typeof globalThis.cur !== 'undefined' && globalThis.cur && globalThis.cur.grid) {
            const rows = globalThis.cur.grid.length;
            const cols = globalThis.cur.grid[0].length;
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    const hasPickup = (typeof globalThis._egPickups !== 'undefined' && globalThis._egPickups.has(key));
                    const hasAnyDrop = (typeof globalThis._egCellHasAnyDrop === 'function') ? globalThis._egCellHasAnyDrop(r, c) : hasPickup;
                    if (hasAnyDrop) continue;
                    if (typeof globalThis._egIsCellPickupEligible === 'function') {
                        if (!globalThis._egIsCellPickupEligible(r, c)) continue;
                    } else {
                        if (globalThis.userGrid[r][c] !== 0 || globalThis.revealedGrid[r][c] || globalThis.wrongGrid[r][c]) continue;
                        if (typeof globalThis.luckyTiles !== 'undefined' && globalThis.luckyTiles && globalThis.luckyTiles.has(key)) continue;
                    }
                    pool.push([r, c]);
                }
        }

        if (pool.length === 0) break;
        const [r, c] = pool[Math.floor(Math.random() * pool.length)];
        const def = _pickRandomHeartDef() || (typeof globalThis.EG_PICKUP_DEFS !== 'undefined' ? globalThis.EG_PICKUP_DEFS.heart_small : { id: 'heart_small', emoji: '💚', rarity: 'common' });
        if (!def) break;
        const key = `${r}-${c}`;
        try {
            if (typeof globalThis._egPickups !== 'undefined') {
                globalThis._egPickups.set(key, def);
                if (typeof globalThis._egRenderPickupOverlay === 'function') globalThis._egRenderPickupOverlay(r, c, def);
                const lifetime = (typeof globalThis.EG_PICKUP_LIFETIME_MS !== 'undefined') ? globalThis.EG_PICKUP_LIFETIME_MS : 20000;
                if (typeof globalThis._egScheduleTrackedExpiry === 'function') {
                    globalThis._egScheduleTrackedExpiry(globalThis._egPickups, key, def, lifetime, `eg-pickup-${r}-${c}`, (typeof globalThis._egRemovePickupOverlay === 'function') ? globalThis._egRemovePickupOverlay : () => {
                        const span = document.getElementById(`eg-pickup-${r}-${c}`); if (span) span.remove();
                    });
                } else if (typeof globalThis._egSchedulePickupExpiry === 'function') {
                    globalThis._egSchedulePickupExpiry(key, def);
                }
            } else {
                // Fallback when endgame pickup system not loaded (e.g. outside endgame map)
                // just render a simple overlay if possible
                const el = document.getElementById(`g-${r}-${c}`);
                if (el) {
                    const span = document.createElement('span');
                    span.className = 'eg-pickup-overlay';
                    span.id = `eg-pickup-${r}-${c}`;
                    span.textContent = def.emoji || '💚';
                    el.appendChild(span);
                }
            }
            spawned++;
        } catch (e) { /* ignore spawn errors */ }
    }
    return spawned;
}

// Fires the Heartbloom ability: pays cost, spawns 3 hearts, starts 5-min cooldown.
export function _fireInstantHeartbloomAbility() {
    const def = (typeof ENDGAME_HEARTBLOOM_DEF !== 'undefined') ? ENDGAME_HEARTBLOOM_DEF : null;
    if (!def) return;

    // Pay the cost (life under Blood Magic) - abort without firing if it can't be covered.
    if (!payAbilityCost(_getAbilityManaCost('active5'))) return;

    const count = (def.levels[0]?.effect?.heartCount) || 3;
    const spawned = _spawnHeartbloomHearts(count);

    if (spawned > 0) {
        if (typeof globalThis.showToast === 'function') globalThis.showToast(`💚 Heartbloom: ${spawned} heart${spawned > 1 ? 's' : ''} spawned!`, '#ff6b9d');
        if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) Audio_Manager.playSFX('heart_heals');
        if (typeof globalThis._playAvatarSkillAnimationForSlot === 'function') {
            try { globalThis._playAvatarSkillAnimationForSlot('active5'); } catch (e) {}
        }
        if (typeof trackAchStat === 'function') trackAchStat('skillHeartbloomUsed');
        if (typeof globalThis.updateQuestStats === 'function') updateQuestStats('classAbilityUsed', {});
        if (typeof globalThis.triggerSkillBanter === 'function') globalThis.triggerSkillBanter('heartbloom');
    } else {
        if (typeof globalThis.showToast === 'function') globalThis.showToast('💚 Heartbloom: no free cells!', '#ff6b9d');
        // Refund cost if nothing spawned? Keep cost spent as penalty for bad timing.
    }

    const cdSeconds = getEffectiveCooldown('active5', def.cooldownSeconds);
    startSlotCooldown('active5', cdSeconds);
}


// _fireInstantAbility - router that fires the correct instant handler based on slot.
export function _fireInstantAbility(slot) {
    if (slot === 'active5') {
        _fireInstantHeartbloomAbility();
    } else if (slot === 'active1' || slot === 'active2') {
        _fireInstantBaseAbility(slot);
    } else {
        _fireInstantAscendencyAbility(slot);
    }
    buildClassHUD();
}



// Advances the "press 1/2" HUD hint counter. Only counts activations of the base
// class slots (1/2), since that's what the arrows point at. Once it reaches
// CLASS_HUD_HINT_MAX_USES the arrows stop rendering on the next HUD rebuild.
export function _trackActivationHintProgress(slot) {
    if (slot !== 'active1' && slot !== 'active2') return;
    if ((globalThis.STATE.classHudHintUses || 0) >= CLASS_HUD_HINT_MAX_USES) return;

    globalThis.STATE.classHudHintUses = (globalThis.STATE.classHudHintUses || 0) + 1;
    save();
}


//------------------------------------------------------------------------
//------------------ACTIVE ABILITY TOGGLE (ENTRY POINT)------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


// toggleActiveAbility - entry point when the player presses an ability button.
//   slot: 'active1' | 'active2' | 'active3' | 'active4' | 'active5'
//   Instant abilities fire immediately. All others arm the crosshair cursor
//   so the next grid click calls executeActiveAbility().
function toggleActiveAbility(slot) {
    if (globalThis.isClassless()) return;
    const newSlot = slot || 'active1';

    // Charm gate (js/skills/skill-charms.js): a spell whose charm is not in a
    // spell slot cannot be armed or fired, even from the legacy class HUD.
    if (typeof getCharmLockedSkillForLegacySlot === 'function') {
        const lockedId = getCharmLockedSkillForLegacySlot(newSlot);
        if (lockedId) {
            if (typeof globalThis.showToast === 'function') globalThis.showToast(t('charm_locked_toast'), '#ff6b9d');
            return;
        }
    }

    const cd = cooldownState[newSlot];

    if (globalThis.dead || !cd || cd.remaining > 0) return;

    // Heartbloom is endgame-only - block entirely outside endgame (HUD also shows locked)
    if (newSlot === 'active5' && typeof isEndgameLevel === 'function' && !isEndgameLevel()) {
        globalThis.showToast('💚 Heartbloom only works on endgame maps!', '#ff6b9d');
        return;
    }

    // Clicking the already-armed slot cancels the arm
    const isAlreadyArmed = globalThis.activeAbilityMode && globalThis.STATE.classActiveChoice === newSlot;
    if (isAlreadyArmed) {
        _setAbilityMode(false);
        buildClassHUD();
        return;
    }

    // Affordability gate: the ability must be payable before it can be armed
    // or fired. Under Blood Magic the cost comes from life instead of mana.
    if (!_abilityCanAfford(newSlot)) {
        globalThis.showToast(t(_bloodMagicActive() ? 'cls_no_life' : 'cls_no_mana'));
        return;
    }

    // Disallow activating or switching to another ability if one is already armed
    if (globalThis.activeAbilityMode && globalThis.STATE.classActiveChoice !== newSlot) {
        return;
    }

    globalThis.STATE.classActiveChoice = newSlot;
    _trackActivationHintProgress(newSlot);

    if (_isInstantAbility(newSlot)) {
        if (!_canFireInstantAbility(newSlot)) return;
        _fireInstantAbility(newSlot);
        return;
    }

    // Arm the cursor and wait for a cell click
    _setAbilityMode(true);
    _showAbilityArmToast(newSlot);
    buildClassHUD();
}




//------------------------------------------------------------------------
//------------------ACTIVE ABILITY CELL-CLICK EXECUTION------------------
//------------------------------------------------------------------------
// Called when the player clicks a cell while an ability is armed.
// Routes to base class or ascendency execution, then starts cooldown.
//------------------------------------------------------------------------


// _executeAscendencySkillOnCell - fires a targeted ascendency ability on the clicked cell
//   and handles post-fire cooldown logic.
export function _executeAscendencySkillOnCell(activeKey, row, col) {
    const slotData = _getAscendencySlotData(activeKey);
    if (!slotData) return;

    const { asc, ascSlot, actData } = slotData;
    const effect = actData.effect;

    // Pay the cost (life under Blood Magic) - abort without firing if it can't be covered.
    if (!payAbilityCost(_getAbilityManaCost(activeKey))) return;

    _dispatchAscendencyAbility(activeKey, globalThis.STATE.playerAscendency, row, col, effect);

    // End arm mode and start cooldown immediately
    _setAbilityMode(false);
    const cdSeconds = getEffectiveCooldown(activeKey, asc[ascSlot].cooldownSeconds);
    startSlotCooldown(activeKey, cdSeconds);
}


// _executeBaseSkillOnCell - fires a targeted base class ability on the clicked cell
//   and starts its cooldown immediately.
export function _executeBaseSkillOnCell(activeKey, row, col) {
    _setAbilityMode(false);
    const def = CLASS_DEFS[globalThis.STATE.playerClass];
    const actData = _getActiveAbilityData(def, activeKey);
    const effect = actData.effect;

    // Pay the cost (life under Blood Magic) - abort without firing if it can't be covered.
    if (!payAbilityCost(_getAbilityManaCost(activeKey))) {
        globalThis.showToast(t(_bloodMagicActive() ? 'cls_no_life' : 'cls_no_mana'));
        return;
    }

    _dispatchBaseAbility(activeKey, globalThis.STATE.playerClass, row, col, effect);

    const cdSeconds = getEffectiveCooldown(activeKey, def[activeKey].cooldownSeconds);
    startSlotCooldown(activeKey, cdSeconds);
}


// executeActiveAbility - called when the player clicks a grid cell while an ability is armed.
//   Routes to ascendency or base class execution based on the active HUD slot.
export function executeActiveAbility(row, col) {
    if (!globalThis.activeAbilityMode || !globalThis.STATE.playerClass || globalThis.dead) return;
    if (globalThis.isClassless()) { _setAbilityMode(false); return; }

    trackAchStat('classAbilitiesUsedTotal'); 

    const activeKey = globalThis.STATE.classActiveChoice || 'active1';

    if (activeKey === 'active3' || activeKey === 'active4') {
        _executeAscendencySkillOnCell(activeKey, row, col);
    } else {
        _executeBaseSkillOnCell(activeKey, row, col);
    }

    buildClassHUD();
}




//------------------------------------------------------------------------
//---------------------------CLASS PASSIVES-------------------------------
//------------------------------------------------------------------------
// Logic that runs at level start (state reset + initial passive bonuses)
// and passive reactions to correct fills and mistakes during play.
//------------------------------------------------------------------------


// _resetClassLevelState - zeroes all per-level tracking flags and window globals
//   before any class-specific passive setup runs.
export function _resetClassLevelState() {
    correctFillStreak = 0;
    nextPenaltyHalved = false;
    window._momentumThisLevel = 0;
    window._dataStrikeUsesThisLevel = 0;
    window._shadowSealActive = false;
    window._goldenClockMistakesLeft = null;
    window._chronoFractureActive = false;
    window._shieldExtraCharges = 0;
    // cursedImmune / goldenClockActive / veiledCursedUsed now live in
    // window.STOX_FLAGS (state.js) - reset them all in one call.
    _resetStoxFlags();
    window._bayesTrapsState = null;
    window._typeIShieldedCells = new Set();
    window._typeIBonusReveal = false;
    window._bayesTrapProtectedLines = new Set();
    _varianceShield_removeBubble();
    _momentumClearParticlesImmediate();

    updateMomentumBar(0, 15);

    if (typeof resetRecursionistState === 'function') resetRecursionistState();
    if (typeof resetMarkovianState === 'function') resetMarkovianState();
}


// _applyMathmagicianPassive - sets up the Variance Shield free-mistake counter.
//   Adds bonus charges from passive tree nodes reinforced_shield and fortified_shield.
//   Recharges to max at the start of every puzzle, including chained puzzles
//   inside an endgame encounter chain.
export function _applyMathmagicianPassive(effect) {
    let freeMistakes = effect.freeMistakes || 0;
    if (ptHasSkill('reinforced_shield')) freeMistakes += 1;
    if (ptHasSkill('fortified_shield')) freeMistakes += 1;
    window._classFreeMistakes = freeMistakes;
    _varianceShield_updateVisibility();
}


// _collectProbabilistMarkCount - builds the auto-mark count for the Probabilist passive,
//   adding bonus marks from passive tree nodes.
export function _collectProbabilistMarkCount(baseCount) {
    let markCount = baseCount;
    if (ptHasSkill('prior_knowledge')) markCount += 1;
    if (ptHasSkill('updated_beliefs')) markCount += 1;
    if (ptHasSkill('posterior_insight')) markCount += 1;
    if (ptHasSkill('convergent_evidence')) markCount += 1;
    return markCount;
}


// _snapshotMarkedCells - returns a Set of all cell ids that are currently marked (userGrid === 2).
export function _snapshotMarkedCells() {
    const marked = new Set();
    if (!globalThis.cur) return marked;
    const sol = globalThis.cur.grid;
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[0].length; c++)
            if (globalThis.userGrid[r][c] === 2) marked.add(`g-${r}-${c}`);
    return marked;
}


// _collectNewlyMarkedCells - returns the cell ids that are now marked but were not in the snapshot.
export function _collectNewlyMarkedCells(markedBefore) {
    const newlyMarked = [];
    if (!globalThis.cur) return newlyMarked;
    const sol = globalThis.cur.grid;
    for (let r = 0; r < sol.length; r++)
        for (let c = 0; c < sol[0].length; c++)
            if (globalThis.userGrid[r][c] === 2 && !markedBefore.has(`g-${r}-${c}`))
                newlyMarked.push(`g-${r}-${c}`);
    return newlyMarked;
}


// _applyProbabilistBonusReveals - reveals bonus cells for confirmed_hypothesis / god_of_probabilities.
export function _applyProbabilistBonusReveals() {
    let bonusReveals = 0;
    if (ptHasSkill('confirmed_hypothesis')) bonusReveals += 1;
    if (ptHasSkill('god_of_probabilities')) bonusReveals += 1;
    for (let i = 0; i < bonusReveals; i++) _bayesianRevealOneCell();
}


// _applyProbabilistPassive - runs the delayed Bayesian Insight auto-mark sequence
//   for the Probabilist at level start.
export function _applyProbabilistPassive(effect) {
    if (!effect.autoMarkCount) return;

    setTimeout(() => {
        const markCount = _collectProbabilistMarkCount(effect.autoMarkCount);
        const markedBefore = _snapshotMarkedCells();

        markWrongTiles(markCount);
        Audio_Manager.playSFX('bayesianInsight');
        trackAchStat('bayesianInsightUsed');

        const newlyMarked = _collectNewlyMarkedCells(markedBefore);
        if (typeof _playBayesianInsightAnimation === 'function') {
            _playBayesianInsightAnimation(newlyMarked);
        }

        _applyProbabilistBonusReveals();
    }, 300);
}


// _bayesianRevealOneCell - reveals 1 random unrevealed filled cell at level start.
//   Used by confirmed_hypothesis and god_of_probabilities passive nodes.
export function _bayesianRevealOneCell() {
    if (!globalThis.cur) return;
    const sol = globalThis.cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (sol[r][c] === 1 && !globalThis.revealedGrid[r][c] && globalThis.userGrid[r][c] !== 1)
                candidates.push([r, c]);

    if (!candidates.length) return;

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    globalThis.revealedGrid[r][c] = true;
    globalThis.userGrid[r][c] = 1;
    renderCell(r, c);
    updClues(r, c);
    trackAchStat('tilesRevealed', 1);
    _incDirect('lifetimeTilesRevealed', 1);

    if (typeof _playBayesianRevealEffect === 'function') {
        const cellEl = document.getElementById(`g-${r}-${c}`);
        if (cellEl) _playBayesianRevealEffect(cellEl);
    }
}


// applyClassPassiveOnLevelStart - called at the start of each level.
//   Resets all per-level state, then applies the class passive starting bonus.
//   Must fire on EVERY puzzle, including chained puzzles inside a map
//   (endgame encounter chain). See _egTransitionToChainPuzzle.
export function applyClassPassiveOnLevelStart() {
    _resetClassLevelState();

    if (!globalThis.STATE.playerClass || globalThis.isClassless()) {
        // Still mark that class passives were considered for this Gi so the
        // chain guarantee does not re-fire unnecessarily.
        window._egClassPassiveAppliedForGi = globalThis.cur ? globalThis.cur.gIdx : null;
        return;
    }

    const effect = _getPassiveEffect();

    if (globalThis.STATE.playerClass === 'mathmagician') _applyMathmagicianPassive(effect);
    if (globalThis.STATE.playerClass === 'probabilist') _applyProbabilistPassive(effect);
    window._egClassPassiveAppliedForGi = globalThis.cur ? globalThis.cur.gIdx : null;
}




//------------------------------------------------------------------------
//------------------PENALTY MODIFIER (CORRECT PENALTIES)-----------------
//------------------------------------------------------------------------
// Intercepts the penalty timer hit and applies class-specific modifiers
// before the standard deduction is applied.
//------------------------------------------------------------------------


// _applyMathmagicianShieldAbsorb - consumes one free-mistake charge and optionally
//   grants bonus time via passive tree nodes. Returns true if the penalty was absorbed.
export function _applyMathmagicianShieldAbsorb() {
    if (window._classFreeMistakes <= 0) return false;

    window._classFreeMistakes--;
    globalThis.absorbedMistakes++;
    buildClassHUD();
    Audio_Manager.playSFX('varianceShield');
    trackAchStat('mistakesAbsorbed');

    _varianceShield_playCometImpact();   
    _varianceShield_updateVisibility(); 

    // Each passive node has its own independent chance to grant bonus time
    let bonus = 0;
    if (ptHasSkill('calculated_error') && Math.random() < 0.50) bonus += 120;
    if (ptHasSkill('error_dividend') && Math.random() < 0.25) bonus += 30;
    if (ptHasSkill('lucky_lapse') && Math.random() < 0.25) bonus += 30;

    // god_of_math doubles all absorbed-mistake time bonuses
    if (ptHasSkill('god_of_math') && bonus > 0) bonus *= 2;

    if (bonus > 0) {
        // Active map run: "% less Time gained from Item and Ability effects"
        if (typeof globalThis._egMapTimeGainMult === 'function') bonus = Math.round(bonus * globalThis._egMapTimeGainMult());
        addTimeSecs(bonus, { capSecs: 3600 });

        const msg = t('cls_shield_absorbed_time').replace('{n}', bonus);

        globalThis.showToast(msg);

        // Floating "+Xs" feedback so the proc is visible beyond the toast
        if (typeof playTimeGainEffect === 'function') {
            playTimeGainEffect(`+${bonus}s`, ptHasSkill('calculated_error') && bonus >= 120 ? '#c080ff' : '#70e0ff');
        }


        trackAchStat('timeAdded', bonus);
    }

    return true;
}


// getClassPenaltyMultiplier - returns the penalty time multiplier for the current mistake.
//   Called from applyPenalty() in mousebutton_handlers.js before the time deduction is applied.
//   Returns 0.0 if the penalty should be fully blocked (absorbed by a free mistake).
//   Returns 5.0 if a Black Swan streak is broken (heavy punishment).
//   Returns 1.0 for all other cases (standard penalty).
export function getClassPenaltyMultiplier() {
    if (!globalThis.STATE.playerClass || globalThis.isClassless()) return 1.0;

    // Breaking an active Speedforce (Black Swan) streak ends it unnaturally and applies a heavy penalty
    if (window._blackSwanActive) {
        _endBlackSwan(false);
        globalThis.showToast(t('cls_speedforce_broken'));
        return 5.0;
    }

    // Mathmagician Variance Shield absorbs the mistake entirely.
    // Null Hypothesis / Asymptotic Mastery disable shields of all kinds,
    // so the class-passive absorption is skipped as well.
    if (globalThis.STATE.playerClass === 'mathmagician'
        && !ptHasSkill('keystone_null_hypothesis')
        && !ptHasSkill('keystone_asymptotic_mastery')) {
        const absorbed = _applyMathmagicianShieldAbsorb();
        if (absorbed) return 0.0;
    }

    return 1.0;
}




//------------------------------------------------------------------------
//------------------CORRECT FILL REACTIONS--------------------------------
//------------------------------------------------------------------------
// Passive abilities that trigger when the player correctly fills a cell.
//------------------------------------------------------------------------


// _handleTransitionMatrixCascade - if Transition Matrix is active, cascade from the
//   newly filled cell. Clears the effect if its duration has expired.
export function _handleTransitionMatrixCascade(row, col) {
    if (!window._transitionMatrixActive) return;
    if (typeof _transitionMatrixCascade !== 'function') return;

    const tm = window._transitionMatrixActive;
    if (Date.now() <= tm.endTime) {
        _transitionMatrixCascade(row, col, tm.maxDepth);
    } else {
        _clearTransitionMatrix(true);
    }
}


// _handleMathmagicianFreezeBonus - during Absolute Zero, awards passive bonuses
//   for correct fills. frozen_resilience grants +1 shield every 5 fills;
//   god_of_math reduces the Arcane Reveal cooldown by 1s per fill.
export function _handleMathmagicianFreezeBonus() {
    if (globalThis.STATE.playerClass !== 'mathmagician' || !window._freezeActive) return;

    if (ptHasSkill('frozen_resilience')) {
        window._freezeCorrFills = (window._freezeCorrFills || 0) + 1;
        if (window._freezeCorrFills % 5 === 0) {
            window._classFreeMistakes = (window._classFreeMistakes || 0) + 1;

            _varianceShield_updateVisibility(); 

            globalThis.showToast(t('cls_frozen_resilience'));

            // Icy grid pulse so the charge gain is visible in play
            if (typeof playShieldChargePulseEffect === 'function') {
                playShieldChargePulseEffect();
            }
        }
    }

    if (ptHasSkill('god_of_math')) {
        const cd = cooldownState['active1'];
        if (cd.remaining > 0) {
            cd.remaining = Math.max(0, cd.remaining - 1);
            _patchCooldownButton('active1');
        }
    }
}


// _handlePrecisionMarkMomentum - if momentum_of_certainty is active and the filled
//   cell is inside the tracked Precision Mark window, grants +20s and clears the
//   cell from the window (auto-closes when all tracked cells are filled).
export function _handlePrecisionMarkMomentum(row, col) {
    if (!ptHasSkill('momentum_of_certainty')) return;
    if (!window._pmMomentumActive || !window._pmMomentumSet) return;

    const id = `g-${row}-${col}`;
    if (!window._pmMomentumSet.has(id)) return;

    window._pmMomentumSet.delete(id);
    addTimeSecs(20, { capSecs: 3600 });
    globalThis.showToast(t('cls_momentum_certainty'));
    if (typeof playTimeGainEffect === 'function') playTimeGainEffect('+20s', '#ffb830');
    trackAchStat('timeAdded', 20);

    if (window._pmMomentumSet.size === 0) {
        // All tracked cells filled - close the momentum window
        window._pmMomentumActive = false;
        window._pmMomentumSet = null;
    }
}

// _handleStatisticianStreak - advances or triggers the Statistician fill streak.
//   Black Swan mode bypasses the streak counter and fires momentum on every fill.
export function _handleStatisticianStreak(effect, row, col) {
    if (window._blackSwanActive) {
        // Black Swan: momentum on every correct fill, no streak required
        _momentumSpawnParticle(row, col);
        _statisticianTriggerMomentum(effect.bonusSeconds);
        updateMomentumBar(correctFillStreak, effect.streakForBonus);
        return;
    }

    correctFillStreak++;
    _momentumSpawnParticle(row, col);

    if (correctFillStreak >= effect.streakForBonus) {
        _statisticianTriggerMomentum(effect.bonusSeconds);
        // Streak was reset to 0 inside _statisticianTriggerMomentum
    } else {
        updateMomentumBar(correctFillStreak, effect.streakForBonus);
    }
}


// onCorrectFill - called from ac() in mouse-button-handlers.js whenever the player
//   correctly fills a cell. Runs all passive reactions in priority order.
export function onCorrectFill(row, col) {
    _handleTransitionMatrixCascade(row, col);
    _handleMathmagicianFreezeBonus();
    _handlePrecisionMarkMomentum(row, col);

    // Statistician streak logic only applies to the Statistician class
    if (globalThis.STATE.playerClass !== 'statistician' || globalThis.isClassless()) return;
    _handleStatisticianStreak(_getPassiveEffect(), row, col);
}




//------------------------------------------------------------------------
//------------------MISTAKE REACTIONS-------------------------------------
//------------------------------------------------------------------------
// Passive abilities that trigger when the player makes a wrong fill.
//------------------------------------------------------------------------


// _getStatisticianStreakReduction - returns how many streak points a mistake costs
//   based on which passive tree nodes are active.
//   learning_from_mistakes + mistakes_no_matter together: -10. Either alone: -12. Neither: full reset.
export function _getStatisticianStreakReduction(hasLFM, hasMNM) {
    if (hasLFM && hasMNM) return 10;
    if (hasLFM || hasMNM) return 12;
    return null; // null signals a full reset
}



// onMistake - called on any wrong fill (from input.js).
//   Resets or reduces the Statistician fill streak depending on passive tree nodes.
export function onMistake() {
    if (globalThis.STATE.playerClass === 'statistician' && !globalThis.isClassless()) {
        _momentumParticlesOnMistake();

        const effect = _getPassiveEffect();
        const threshold = effect.streakForBonus || 15;
        const hasLFM = ptHasSkill('learning_from_mistakes');
        const hasMNM = ptHasSkill('mistakes_no_matter');
        const reduction = _getStatisticianStreakReduction(hasLFM, hasMNM);

        if (reduction !== null) {
            correctFillStreak = Math.max(0, correctFillStreak - reduction);
        } else {
            correctFillStreak = 0;
        }

        updateMomentumBar(correctFillStreak, threshold);
        return;
    }

    correctFillStreak = 0;
}