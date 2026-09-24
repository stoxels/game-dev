import { save, STATE, cur } from '../state.js';
import { t } from '../translation/translations.js';
import { _incDirect, questStat_luckyDropClaimed } from '../inference/inference-stats.js';
import { hideResultOverlays } from '../screens/screens.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { puzzleItemIconHtml, showToast, showItemGainPopup } from '../puzzle-mechanics/toasts-and-popups.js';
import { buildInventoryPanel, attachItemTooltip } from '../puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { rarityColors, itemName, pickRandomItem } from '../puzzle-items/item-pool.js';
import { ITEM_DEFS } from '../puzzle-items/item-definitions.js';
import { WORLDS } from '../levels/level-world-data.js';
import { setNexusUnlocked, lvText, ALL } from '../levels/levels.js';
import { _charIs } from '../sprite/player_sprite.js';
import { _egTrialTriggerLevels, _egIsTrialUnlocked, _egIsTrialDone, _egLaunchCampaignTrial } from '../campaign-trials.js';
import { showEndgameNexus } from '../endgame/endgame-nexus.js';
import { checkWorldCompleteAch } from '../achievements/achievements.js';
import { isMonsterless } from '../difficulty-modifiers.js';
import { isConvergenceLevel } from './scoring-core.js';

// Live end-of-level state shared across the concatenated core (owned by
// start-level.js / state.js / difficulty-modifiers.js as module-let
// bindings with live bridge accessors). These change per run/level, so
// reads go through the live bridge, not value imports.
function _liveMods() { return globalThis.curMods; }
function _liveMistakes() { return globalThis.mistakeCount; }
function _liveAbsorbed() { return globalThis.absorbedMistakes; }
function _liveTimerSecs() { return globalThis.timerSecs; }

//------------------------------------------------------------------------
//-------------------SCORING REWARDS (scoring-rewards.js)------------------
//------------------------------------------------------------------------
// Reward half of the scoring subsystem: bonus-objective evaluation, lucky
// drops, one-time special rewards (convergence / ascension / Nexus Point),
// and the win-overlay rendering they feed into. The win-flow entry point
// (checkWin) lives in scoring.js and calls renderWinOverlay() here.

//------------------------------------------------------------------------
//-------------------ITEM REWARD HELPERS-----------------------------------
//------------------------------------------------------------------------

// Wraps reward content in the standard item-reward card markup shared by
// bonus rewards, lucky drops, and the ascension codex reward.
function _buildItemRewardCard(defId, def, labelHtml) {
    const rc = rarityColors(def.rarity);
    return `
        <div class="item-reward" data-reward-defid="${defId}"
             style="border-color:${rc.border};color:${rc.color};cursor:default;">
            ${labelHtml}
        </div>`;
}

//------------------------------------------------------------------------
//-------------------CONVERGENCE REWARD------------------------------------
//------------------------------------------------------------------------

// Convergence milestones no longer live on campaign puzzle levels (Leveling
// Rework): every former convergence level is a REGULAR puzzle level now.
// Passive points for milestones come from Convergence Trials instead (see
// js/campaign-trials.js). The always-false classifier lives in scoring-core.js
// (isConvergenceLevel) so campaign-trials.js, the world screens and quest
// stats share one owner; the reward dispatcher just calls it.

// Grants one passive tree point on the first clear of a convergence level
// and queues the convergence modal for display after the win overlay closes.
export function applyConvergenceReward(gi) {
    if (!STATE.convergenceDone) STATE.convergenceDone = [];
    STATE.convergenceDone.push(gi);
    STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + 1;
    _incDirect('lifetimePassivePointsObtained', 1);
    save();
    window._pendingConvergenceModal = true;
}

//------------------------------------------------------------------------
//-------------------ASCENSION + NEXUS REWARDS-----------------------------
//------------------------------------------------------------------------

// Grants the Codex of Completion artifact on the first clear of the final
// level in a world (the ascension level), and writes its reward HTML into irz.
// Does nothing in ironman mode - that mode disables item rewards.
export function applyAscensionReward(irz) {
    const defId = 'artifactComplete';
    const codexDef = ITEM_DEFS[defId];

    STATE.inventory.push({
        defId,
        uid: `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });
    save();

    buildInventoryPanel();
    showItemGainPopup(defId);

    const label = `🌟 ${t('cg_ascension_reward')}:
            ${puzzleItemIconHtml(codexDef)} <strong>${itemName(codexDef)}</strong>`;
    irz.innerHTML = _buildItemRewardCard(defId, codexDef, label);
}

// Builds the Nexus Point unlock card shown in the win overlay's reward zone.
// MONSTERLESS runs end after World 14: no Nexus unlock, no card.
export function applyNexusPointReward(irz) {
    if (_liveMods() && _liveMods().monsterless) return;
    if (isMonsterless()) return;
    setNexusUnlocked();
    if (!irz) return;
    const label = `🌌 ${t('scr_nexus_unlocked_title')}: ${t('scr_enter_nexus_short')}`;
    irz.innerHTML += `<div class="item-reward" style="border-color:#7fd4ff;color:#bfe9ff;cursor:default;">${label}<br><span style="opacity:0.8;font-size:0.9em">${t('scr_nexus_unlocked_desc')}</span></div>`;
    showToast(`🌌 ${t('scr_nexus_unlocked_title')}`);
}

// Dispatcher for convergence, ascension and Nexus Point one-time rewards.
// Called during win-overlay rendering; writes into the item-reward zone (irz)
// when a special reward applies. The Nexus Point never grants the ascension
// codex - it unlocks the Nexus instead.
export function handleSpecialRewards({ gi, isFirstClear, isAscensionLevel, irz, isNexusPoint }) {
    const worldData = WORLDS[cur.world - 1];

    if (isConvergenceLevel(worldData, isAscensionLevel) && isFirstClear) {
        applyConvergenceReward(gi);
    }

    if (isNexusPoint) {
        if (isFirstClear) applyNexusPointReward(irz);
        return;
    }

    if (isAscensionLevel && isFirstClear && !_liveMods().ironman) {
        applyAscensionReward(irz);
    }
}

//------------------------------------------------------------------------
//-------------------LUCKY DROPS-------------------------------------------
//------------------------------------------------------------------------

// Returns the total drop chance for lucky drops based on allocated passive nodes.
// Base chance is 25%; each bonus_replay node adds an additional percentage.
function getLuckyDropChance() {
    let chance = 0.25;
    if (ptHasSkill('bonus_replay_1')) chance += 0.10;
    if (ptHasSkill('bonus_replay_2')) chance += 0.15;
    if (ptHasSkill('bonus_replay_3')) chance += 0.20;
    if (_charIs('trix')) chance += 0.15;
    return chance;
}

// Returns the chance of receiving a second lucky drop item.
// Each lucky_replay node contributes an additive percentage.
function getExtraItemChance() {
    return (ptHasSkill('lucky_replay_1') ? 0.10 : 0)
        + (ptHasSkill('lucky_replay_2') ? 0.15 : 0)
        + (ptHasSkill('lucky_replay_3') ? 0.20 : 0);
}

// Decides how many lucky drop items to grant this trigger (1 or 2).
function rollLuckyDropCount() {
    return Math.random() < getExtraItemChance() ? 2 : 1;
}

// Builds the HTML for a single lucky-drop item reward and adds it to the inventory.
function grantLuckyDropItem() {
    const defId = pickRandomItem();
    if (!defId) return '';

    const def = ITEM_DEFS[defId];
    if (!def) return '';

    STATE.inventory.push({ defId, uid: Date.now() + Math.random().toString(36).slice(2) });

    buildInventoryPanel();
    showItemGainPopup(defId);

    const label = `${t('ov_lucky_drop')} ${puzzleItemIconHtml(def)} <strong>${itemName(def)}</strong>`;
    return _buildItemRewardCard(defId, def, label);
}

// Attempts to trigger lucky drops for this level completion.
// Requires the lucky_drops passive node to be allocated.
// Returns an HTML string of all item-reward divs granted, or '' if none triggered.
export function rollLuckyDrops() {
    if (!ptHasSkill('lucky_drops') && !_charIs('trix')) return '';
    if (Math.random() >= getLuckyDropChance()) return '';

    questStat_luckyDropClaimed();

    const count = rollLuckyDropCount();
    let html = '';
    for (let i = 0; i < count; i++) {
        html += grantLuckyDropItem();
    }

    if (html) save();
    return html;
}

//------------------------------------------------------------------------
//-------------------WIN OVERLAY BUILDERS----------------------------------
//------------------------------------------------------------------------

// Formats a time in seconds as "M:SS".
export function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Builds the gain-note string shown next to the score.
// If a new record was set, shows the net-new points and the previous best.
// Otherwise shows just the total points awarded.
function buildGainNote(pts, ptsAwarded, prevBest) {
    if (ptsAwarded < pts) {
        return ` (+${ptsAwarded} ${t('ov_win_new')} - ${t('ov_win_best_was')} ${prevBest})`;
    }
    return ` (+${ptsAwarded})`;
}

// Returns the appropriate HTML line for the mistake count.
// Handles the three distinct display states: no mistakes, all absorbed, partial absorbed.
function buildMistakeLine() {
    const totalWrongClicks = _liveMistakes() + _liveAbsorbed();

    if (totalWrongClicks === 0) {
        return `<div class="ov-sub-line ov-sub-miss-ok">✗ 0 ${t('ov_win_mistakes')}</div>`;
    }

    const absorbedNote = `<span style="opacity:0.55;font-size:0.85em">(${_liveAbsorbed()} ${t('ov_win_absorbed')})</span>`;

    if (_liveAbsorbed() > 0 && _liveMistakes() === 0) {
        // All wrong clicks were absorbed - still shows as a clean run
        return `<div class="ov-sub-line ov-sub-miss-ok">✗ 0 ${t('ov_win_mistakes')} ${absorbedNote}</div>`;
    }

    const mistakeWord = _liveMistakes() !== 1 ? t('ov_win_mistakes') : t('ov_win_mistake');
    const cssClass = _liveMistakes() === 0 ? 'ov-sub-miss-ok' : 'ov-sub-miss';

    if (_liveAbsorbed() > 0) {
        return `<div class="ov-sub-line ${cssClass}">✗ ${_liveMistakes()} ${mistakeWord} ${absorbedNote}</div>`;
    }

    return `<div class="ov-sub-line ${cssClass}">✗ ${_liveMistakes()} ${mistakeWord}</div>`;
}

function buildScoreColumn(pts, ptsAwarded, prevBest, mult) {
    const safeMult = Number.isFinite(Number(mult)) ? Number(mult) : 1;
    const gainNote = buildGainNote(pts, ptsAwarded, prevBest);
    document.getElementById('ov-col-score').innerHTML = `
        <div class="ov-sub-line ov-sub-pts">${pts} ${t('ov_win_pts')}</div>
        <div class="ov-sub-line ov-sub-pts">${t('ov_win_multiplier')} ×${safeMult.toFixed(2)}</div>
        <div class="ov-sub-line ov-sub-pts">${gainNote}</div>`;
}

function buildTimeColumn(elapsed) {
    document.getElementById('ov-col-time').innerHTML = `
        <div class="ov-sub-line ov-sub-time">
            ⏱ ${formatTime(_liveTimerSecs())} ${t('ov_win_left')} · ${t('ov_win_solved_in')} ${formatTime(elapsed)}
        </div>
        ${buildMistakeLine()}`;
}

// Writes the bonus badge into #bonus-list.
// Shows a success badge if the bonus was met, or the bonus hint if it was missed.
function renderBonusBadge(bonusMet) {
    document.getElementById('bonus-list').innerHTML = `
        <span class="bonus-badge ${bonusMet ? 'earned' : 'missed'}">
            ${bonusMet ? t('ov_bonus_met') : '🎯 ' + lvText(cur, 'bonusHint')}
        </span>`;
}

// Builds the HTML for a guaranteed first-time bonus item reward,
// adds it to the inventory, and saves.
function grantBonusItem() {
    const defId = pickRandomItem();
    if (!defId) return '';

    const def = ITEM_DEFS[defId];
    if (!def) return '';

    STATE.inventory.push({ defId, uid: Date.now() + Math.random().toString(36).slice(2) });
    save();

    buildInventoryPanel();
    showItemGainPopup(defId);

    const label = `${t('ov_item_earned')}: ${puzzleItemIconHtml(def)} <strong>${itemName(def)}</strong>`;
    return _buildItemRewardCard(defId, def, label);
}

// Returns the HTML for the "bonus already claimed" notice shown on repeat clears.
function buildBonusClaimedNote() {
    return `<div class="item-reward" style="border-color:var(--border2);color:#666;">
        ${t('ov_bonus_claimed_note')}
    </div>`;
}

// Writes item rewards into the item-reward zone (irz) based on bonus state.
// Priority order:
//   1. First-time bonus clear → guaranteed item
//   2. Repeat bonus clear     → "already claimed" note + lucky drop chance
//   3. Bonus missed           → lucky drop chance only
// Ironman mode and quiz bonuses suppress all item rewards.
function renderItemRewardZone(gi, bonusMet, isFirstClear, isAscensionLevel, isNexusPoint) {
    const irz = document.getElementById('item-reward-zone');
    irz.innerHTML = '';
    const bonusAlreadyDone = STATE.bonusDone.includes(gi);
    const isQuizBonus = cur.bonusType === 'quiz';

    // Special one-time rewards (convergence points, ascension codex, Nexus unlock) go first
    handleSpecialRewards({ gi, isFirstClear, isAscensionLevel, irz, isNexusPoint });

    // Mark the bonus as done on first clear (before item logic so save() is called once)
    if (bonusMet && !bonusAlreadyDone && !isQuizBonus) {
        STATE.bonusDone.push(gi);
        save();
        // Re-check world aggregates - claiming this bonus may have completed
        // the "all bonuses in a world" achievement set.
        checkWorldCompleteAch();
    }

    // Item drops are suppressed in ironman mode and for quiz bonus levels
    if (_liveMods().ironman || isQuizBonus) return;

    if (bonusMet && !bonusAlreadyDone) {
        irz.innerHTML += grantBonusItem();
    } else if (bonusMet && bonusAlreadyDone) {
        irz.innerHTML += buildBonusClaimedNote();
        irz.innerHTML += rollLuckyDrops();
    } else {
        irz.innerHTML += rollLuckyDrops();
    }

    // Attach hover tooltips to every item-reward card
    setTimeout(() => {
        irz.querySelectorAll('[data-reward-defid]').forEach(el => {
            attachItemTooltip(el, el.dataset.rewardDefid);
        });
    }, 0);
}

// Orchestrates the full win overlay render: stats, bonus badge, and item rewards.
export function renderWinOverlay({ gi, pts, ptsAwarded, prevBest, mult, elapsed, bonusMet, isAscensionLevel, isFirstClear, isNexusPoint }) {
    document.getElementById('ov-reveal-quote').innerHTML = `"${lvText(cur, 'reveal')}"`;
    buildScoreColumn(pts, ptsAwarded, prevBest, mult);
    buildTimeColumn(elapsed);
    renderBonusBadge(bonusMet);
    renderItemRewardZone(gi, bonusMet, isFirstClear, isAscensionLevel, isNexusPoint);

    // Ascension levels always route back to the overworld: hide Next/Retry
    // and promote the Levels button to the primary action.
    // The Nexus Point behaves the same, but gains a dedicated gateway
    // button into the Nexus screen (separate element, so the static
    // Next/Levels handlers wired in title-bindings.js keep working untouched).
    const nextBtn = document.getElementById('btn-next-lvl');
    const retryBtn = document.getElementById('btn-win-retry');
    const levelsBtn = document.getElementById('btn-win-levels');
    const endOfLine = isAscensionLevel || isNexusPoint;
    if (nextBtn) nextBtn.style.display = endOfLine ? 'none' : '';
    if (retryBtn) retryBtn.style.display = endOfLine ? 'none' : '';
    if (levelsBtn) levelsBtn.className = endOfLine ? 'ob p' : 'ob s';
    // The buttons live in per-column wrappers (LEVELS | REPLAY pair | NEXT);
    // a fully hidden column must collapse so the row re-centres instead of
    // leaving an empty gap (ascension / Nexus Point wins hide Next+Replay).
    const nextCol = nextBtn ? nextBtn.closest('.ov-btns-col') : null;
    if (nextCol) nextCol.style.display = endOfLine ? 'none' : '';
    _updateNexusWinButton(isNexusPoint);
    _updateConvergenceTrialWinButton(gi);
}

// Ensures the win overlay has a dedicated "Enter Convergence Trial" button.
// Shown after clearing one of the world's two convergence milestone levels
// (33% / 66% rule) when that completion unlocked (or re-unlocked) the world's
// trial. Mirrors the Nexus win button pattern: own id, static Next/Levels
// handlers untouched.
function _updateConvergenceTrialWinButton(gi) {
    const container = document.querySelector('#ov-win .ov-btns');
    if (!container) return;
    const nextBtn = document.getElementById('btn-next-lvl');
    const target = (nextBtn && nextBtn.closest('.ov-btns-col')) || container;

    // Show condition: this win IS a trigger level AND the trial is now
    // unlocked AND not already completed. Everything else hides it.
    let show = false;
    let wi = null;
    try {
        wi = cur.world - 1;
        const level = ALL[gi];
        const triggers = _egTrialTriggerLevels(wi);
        const isTrigger = !!(level && triggers && triggers.includes(level.li - 1));
        show = isTrigger && _egIsTrialUnlocked(wi) && !_egIsTrialDone(wi);
    } catch (e) { show = false; }

    let btn = document.getElementById('btn-enter-trial-win');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-enter-trial-win';
        btn.className = 'ob y';
        btn.addEventListener('click', () => {
            hideResultOverlays();
            _egLaunchCampaignTrial(wi);
        });
        target.appendChild(btn);
    }
    const label = t('btn_enter_trial_win');
    btn.textContent = (label && label !== 'btn_enter_trial_win') ? label : '🌿 ENTER CONVERGENCE TRIAL';
    btn.style.display = show ? '' : 'none';
    if (show && target.classList && target.classList.contains('ov-btns-col')) {
        target.style.display = '';
    }
}

// Ensures the win overlay has a dedicated "Enter the Nexus" button.
// Created once, then shown only after the Nexus Point. Uses its own id so
// it never collides with the static Next/Levels handlers.
// MONSTERLESS runs end after World 14: the button never shows.
function _updateNexusWinButton(show) {
    if (_liveMods() && _liveMods().monsterless) show = false;
    else if (isMonsterless()) show = false;
    const container = document.querySelector('#ov-win .ov-btns');
    if (!container) return;
    // Prefer the NEXT column wrapper (the Nexus button occupies Next's slot
    // on Nexus Point wins, where Next itself is hidden); fall back to the
    // bare container for any markup without column wrappers.
    const nextBtn = document.getElementById('btn-next-lvl');
    const target = (nextBtn && nextBtn.closest('.ov-btns-col')) || container;
    let btn = document.getElementById('btn-enter-nexus-win');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-enter-nexus-win';
        btn.className = 'ob p';
        btn.addEventListener('click', () => {
            hideResultOverlays();
            showEndgameNexus();
        });
        target.appendChild(btn);
    } else if (btn.parentElement !== target) {
        target.appendChild(btn);
    }
    btn.textContent = t('scr_enter_nexus_short');
    btn.style.display = show ? '' : 'none';
    // On Nexus wins the Next column was hidden a moment earlier (endOfLine);
    // re-show the wrapper so the Nexus button is actually rendered.
    if (show && target.classList && target.classList.contains('ov-btns-col')) {
        target.style.display = '';
    }
}
