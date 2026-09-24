import { trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { _adjacencyMatrixRefreshAll, renderCell, updClues } from '../grid.js';
import { subtractTimeSecs } from '../timer/timer-adjust.js';
import { t } from '../translation/translations.js';
import { _setAbilityMode } from './class-abilities.js';
import { cooldownState } from './class-cooldown-state.js';
import { buildClassHUD } from './class-hud.js';
import { ptHasSkill } from '../probability-tree/probability-tree-state-points.js';
import { questStat_classRevealUsed, updateQuestStats } from '../inference/inference-stats.js';
import { STATE } from '../state.js';
import { cur } from '../state.js';

//------------------------------------------------------------------------
//--------------------ASCENDENCY SKILL IMPLEMENTATIONS--------------------
//-------------------------------OUTLIER CLASS----------------------------
//------------------------------------------------------------------------

//------------------------------------------------------------------------
//----------------------------CONSTANTS-----------------------------------
//------------------------------------------------------------------------

// Tail Risk uses the active3 HUD slot for its cooldown state.
const TAIL_RISK_COOLDOWN_SLOT = 'active3';


//------------------------------------------------------------------------
//-------------------TAIL RISK - HELPER FUNCTIONS------------------------
//------------------------------------------------------------------------

// Formats time cost into MM:SS if over 60 seconds
export function _formatTimeCost(totalSeconds) {
    if (totalSeconds <= 60) return `${totalSeconds}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}


// Returns all unrevealed filled cells on the current grid as [row, col] pairs
export function _tailRiskGetCandidateCells() {
    const sol = cur.grid;
    const rows = sol.length;
    const cols = sol[0].length;
    const candidates = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isFilled = sol[r][c] === 1;
            const notRevealed = !globalThis.revealedGrid[r][c];
            const notUserFilled = globalThis.userGrid[r][c] !== 1;
            if (isFilled && notRevealed && notUserFilled) {
                candidates.push([r, c]);
            }
        }
    }

    return candidates;
}

// Builds the localised HTML string for the Tail Risk modal overlay
export function _tailRiskBuildOverlayHTML(secondsPerCell, maxCells) {
    const title = t('cls_ih_title');
    const prompt = t('cls_ih_prompt').replace('{n}', secondsPerCell);
    const costLabel = t('cls_cost');
    const confirmLabel = t('cls_sacrifice');
    const cancelLabel = t('cls_cancel');

    return `
        <div class="ih-canvas">
            <img class="ih-bg-img" src="images/Infinite_Hunger/infinite-hunger-background.webp" alt="">

            <div class="ih-tablet">
                <img class="ih-tablet-img" src="images/Infinite_Hunger/stone-tablet.webp" alt="">

                <div class="ih-title">${title}</div>
                <div class="ih-prompt">${prompt}</div>

                <div class="ih-slider-row">
                    <div class="ih-slider-track">
                        <img class="ih-selector-bar-img" src="images/Infinite_Hunger/selector-bar.webp" alt="">
                        <input type="range" id="tr-slider" class="ih-slider" min="1" max="${maxCells}" value="1">
                        <img class="ih-clock-broken-icon" src="images/Infinite_Hunger/clock-broken.webp" alt="">
                    </div>
                </div>

                <div class="ih-cost-line">${costLabel}: <span id="tr-cost">${_formatTimeCost(secondsPerCell)}</span></div>

                <div class="ih-btns">
                    <button class="ih-btn ih-btn-sacrifice" onclick="_tailRiskResolve()">
                        <img class="ih-btn-bg" src="images/Infinite_Hunger/sacrifice-stone.webp" alt="">
                        <span class="ih-btn-label">${confirmLabel}</span>
                    </button>
                    <button class="ih-btn ih-btn-cancel" onclick="_tailRiskCancel()">
                        <img class="ih-btn-bg" src="images/Infinite_Hunger/cancel-stone.webp" alt="">
                        <span class="ih-btn-label">${cancelLabel}</span>
                    </button>
                </div>
            </div>
        </div>`;
}

// Removes the Tail Risk overlay from the DOM
export function _tailRiskRemoveOverlay() {
    const overlay = document.getElementById('tail-risk-overlay');
    if (overlay) overlay.remove();
}

// Attaches the live cost readout to the slider inside the overlay
export function _tailRiskBindSliderCost(secondsPerCell) {
    const slider = document.getElementById('tr-slider');
    const costEl = document.getElementById('tr-cost');
    if (!slider || !costEl) return;

    slider.addEventListener('input', (e) => {
        const totalCost = e.target.value * secondsPerCell;
        costEl.textContent = _formatTimeCost(totalCost);
    });
}

// Refunds the cooldown for the Tail Risk HUD slot and resets it to zero
export function _tailRiskRefundCooldown() {
    const cd = cooldownState[TAIL_RISK_COOLDOWN_SLOT];
    if (!cd) return;

    if (cd.interval) {
        clearInterval(cd.interval);
        cd.interval = null;
    }
    cd.remaining = 0;
}

// Deducts totalCost seconds from the timer (floors at 0)
export function _tailRiskApplyTimeCost(totalCost) {
    subtractTimeSecs(totalCost);
}

// Reveals count randomly selected cells from the shuffled candidate list.
// Returns the number of cells actually revealed and their grid IDs.
export function _tailRiskRevealCells(shuffledCandidates, count) {
    const affectedIds = [];
    let revealedCount = 0;

    for (let i = 0; i < count; i++) {
        const [r, c] = shuffledCandidates[i];
        globalThis.revealedGrid[r][c] = true;
        globalThis.userGrid[r][c] = 1;
        renderCell(r, c);
        updClues(r, c);
        affectedIds.push(`g-${r}-${c}`);
        revealedCount++;
    }

    return { revealedCount, affectedIds };
}

// Fires all post-reveal side-effects: visual flash, adjacency refresh, quest/achievement tracking, win check
export function _tailRiskPostReveal(revealedCount, affectedIds, totalCost) {
    globalThis._applyCellEffect(affectedIds, 'reveal');

    // Refresh adjacency clues if the passive skill is active
    if (typeof _adjacencyMatrixRefreshAll === 'function' && ptHasSkill('adjacency_matrix')) {
        _adjacencyMatrixRefreshAll();
    }

    trackAchStat('tilesRevealed', revealedCount);
    globalThis.showToast(t('cls_tail_risk_resolved')
        .replace('{r}', revealedCount)
        .replace('{c}', totalCost));

    Audio_Manager.playSFX('tailRiskResolve');

    questStat_classRevealUsed(revealedCount);
    updateQuestStats('classAbilityUsedThisLevel', {});

    // Achievement: reveal exactly 20 cells in one use
    if (revealedCount === 20) trackAchStat('outlierInfiniteHunger20Reveals');

    globalThis.checkWin();
}


//------------------------------------------------------------------------
//-------------------TAIL RISK - MAIN FUNCTIONS--------------------------
//------------------------------------------------------------------------

// Spawns the Tail Risk modal overlay and stores the session data globally
export function _tailRiskShowOverlay(secondsPerCell, maxCells, candidates) {
    window._tailRiskData = { secondsPerCell, candidates };

    const overlay = document.createElement('div');
    overlay.id = 'tail-risk-overlay';
    overlay.className = 'modal-bg show';
    overlay.style.cssText = 'z-index:3000;';
    overlay.innerHTML = _tailRiskBuildOverlayHTML(secondsPerCell, maxCells);

    document.body.appendChild(overlay);
    _tailRiskBindSliderCost(secondsPerCell);
}

// Called when the player clicks cancel on the Tail Risk overlay.
// refund=true skips the cancel toast (used when no cells were available).
export function _tailRiskCancel(refund = false) {
    _tailRiskRemoveOverlay();
    window._tailRiskData = null;

    _setAbilityMode(false);
    STATE.classActiveChoice = TAIL_RISK_COOLDOWN_SLOT;

    _tailRiskRefundCooldown();
    buildClassHUD();

    if (!refund) globalThis.showToast(`📈 ${t('cls_cancelled')}`);
}

// Called when the player confirms the Tail Risk sacrifice.
// Reads the slider value, deducts time, and reveals the chosen cells.
export function _tailRiskResolve() {
    const slider = document.getElementById('tr-slider');
    if (!slider) return;

    const count = parseInt(slider.value, 10);
    const data = window._tailRiskData;
    const totalCost = count * data.secondsPerCell;

    _tailRiskRemoveOverlay();
    window._tailRiskData = null;

    _tailRiskApplyTimeCost(totalCost);

    // Shuffle candidates so the revealed cells are random each cast
    const shuffled = data.candidates.sort(() => 0.5 - Math.random());
    const { revealedCount, affectedIds } = _tailRiskRevealCells(shuffled, count);

    _tailRiskPostReveal(revealedCount, affectedIds, totalCost);
}

// Entry point: validates the grid state, finds candidate cells, then opens the overlay
export function _executeTailRisk(secondsPerCell, maxCells) {
    if (!cur) return;

    const candidates = _tailRiskGetCandidateCells();

    if (candidates.length === 0) {
        globalThis.showToast(t('cls_tail_risk_none'));
        _tailRiskCancel(true); // refund cooldown - nothing to do
        return;
    }

    // Cap the slider maximum at however many cells are actually available
    const actualMax = Math.min(maxCells, candidates.length);
    _tailRiskShowOverlay(secondsPerCell, actualMax, candidates);

    trackAchStat('skillTailRiskUsed');
    Audio_Manager.playSFX('tailRiskStart');
}
