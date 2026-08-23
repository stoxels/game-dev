//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/** How long a quest toast stays fully visible before fading out (ms). */
const QUEST_TOAST_DISPLAY_MS = 10000; //3500;

/** Duration of the toast CSS fade-out transition (ms). Must match the CSS. */
const QUEST_TOAST_FADEOUT_MS = 500;

/** Gap between consecutive toasts to prevent them overlapping (ms). */
const QUEST_TOAST_GAP_MS = 300;

/** Currently active ledger tab (category group). */
let _ledger_activeGroupId = 'progression'; // Default tab

/** Currently open category id, or null when showing the grid overview. */
let _ledger_activeCategoryId = null;

/**
 * Category icons layered on top of the shared stone-and-parchment card
 * frame (that frame is one shared image set in CSS, .ledger-card-art —
 * only this small icon changes per category). Every category id from
 * quests-data.js needs exactly one entry here.
 */
const LEDGER_CATEGORY_ICON = {
    // Progression
    expected_value: 'images/Inference/icons/expected_value.png',
    sample_size: 'images/Inference/icons/sample_size.png',
    parameter_space: 'images/Inference/icons/parameter_space.png',
    probability_gate: 'images/Inference/icons/probability_gate.png',
    convergence: 'images/Inference/icons/convergence.png',
    probability_tree: 'images/Inference/icons/probability_tree.png',
    choose_estimator: 'images/Inference/icons/choose_estimator.png',
    choose_ascendency: 'images/Inference/icons/choose_ascendency.png',
    max_likelihood: 'images/Inference/icons/max_likelihood.png',
    ascendency_mastery: 'images/Inference/icons/ascendency_mastery.png',
    descriptive_stats: 'images/Inference/icons/descriptive_stats.png',

    // Gameplay
    confidence_interval: 'images/Inference/icons/confidence_interval.png',
    guided_scholarship: 'images/Inference/icons/guided_scholarship.png',
    full_primer_coverage: 'images/Inference/icons/full_primer_coverage.png',
    elimination_expert: 'images/Inference/icons/elimination_expert.png',
    exercise_hints: 'images/Inference/icons/exercise_hints.png',
    lucky_drop_event: 'images/Inference/icons/lucky_drop_event.png',
    error_correction: 'images/Inference/icons/error_correction.png',
    curse_ward: 'images/Inference/icons/curse_ward.png',
    countdown_crisis_master: 'images/Inference/icons/countdown_crisis_master.png',
    pure_revelation: 'images/Inference/icons/pure_revelation.png',
    overfitting_gambler: 'images/Inference/icons/overfitting_gambler.png',
    sample_efficiency_master: 'images/Inference/icons/sample_efficiency_master.png',
    future_glimpse: 'images/Inference/icons/future_glimpse.png',
    signal_noise_master: 'images/Inference/icons/signal_noise_master.png',
    oracle_vision: 'images/Inference/icons/oracle_vision.png',
    degrees_of_freedom_master: 'images/Inference/icons/degrees_of_freedom_master.png',
    random_walk_survivor: 'images/Inference/icons/random_walk_survivor.png',
    emergency_response: 'images/Inference/icons/emergency_response.png',
    gamblers_fortune: 'images/Inference/icons/gamblers_fortune.png',
    entropy_drain_master: 'images/Inference/icons/entropy_drain_master.png',
    dead_reckoning_navigator: 'images/Inference/icons/dead_reckoning_navigator.png',
    frequentists_burden_master: 'images/Inference/icons/frequentists_burden_master.png',
    field_scan_revelation: 'images/Inference/icons/field_scan_revelation.png',
    sparse_prior_master: 'images/Inference/icons/sparse_prior_master.png',
    confidence_interval_master: 'images/Inference/icons/confidence_interval_master.png',
    adjacency_matrix_master: 'images/Inference/icons/adjacency_matrix_master.png',
    minesweeper_mind: 'images/Inference/icons/minesweeper_mind.png',

    // Items & Classes
    null_hypothesis: 'images/Inference/icons/null_hypothesis.png',
    item_distribution: 'images/Inference/icons/item_distribution.png',
    curse_dimensionality: 'images/Inference/icons/curse_dimensionality.png',
    prior_distribution: 'images/Inference/icons/prior_distribution.png',
    witch_immunity: 'images/Inference/icons/witch_immunity.png',
    erasure_engine: 'images/Inference/icons/erasure_engine.png',
    cartographic_mastery: 'images/Inference/icons/cartographic_mastery.png',
    tutor_regression: 'images/Inference/icons/tutor_regression.png',
    active_inference: 'images/Inference/icons/active_inference.png',
    ability_marathon: 'images/Inference/icons/ability_marathon.png',
    ability_harvest: 'images/Inference/icons/ability_harvest.png',
    shadow_seal_init: 'images/Inference/icons/shadow_seal_init.png',

    // Challenges
    significance_level: 'images/Inference/icons/significance_level.png',
    time_pressure: 'images/Inference/icons/time_pressure.png',
    outlier_resistance: 'images/Inference/icons/outlier_resistance.png',
    ironman_dist: 'images/Inference/icons/ironman_dist.png',
    prior_free_estimation: 'images/Inference/icons/prior_free_estimation.png',
    tabula_rasa: 'images/Inference/icons/tabula_rasa.png',
    monte_carlo: 'images/Inference/icons/monte_carlo.png',
    zero_variance: 'images/Inference/icons/zero_variance.png',
    precision_large: 'images/Inference/icons/precision_large.png',
};

/** Cached reference to the floating reward-tooltip element. */
let _questRewardTipEl = null;

/** Queue of pending { milestone, category } objects waiting to be displayed as toasts. */
let _questToastQueue = [];

/** True while a toast is currently being shown (prevents overlap). */
let _questToastBusy = false;


//------------------------------------------------------------------------
//-------------------SHARED HELPERS----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Returns the background-image CSS value for a category's small icon.
 * Falls back to a generic placeholder so a missing entry never renders
 * a blank box.
 * @param {string} catId
 * @returns {string} a CSS url() value
 */
function _ledger_getCategoryIcon(catId) {
    const path = LEDGER_CATEGORY_ICON[catId] || 'images/Inference/icons/placeholder.png';
    return `url('${path}')`;
}

/**
 * Positions a tooltip element above its anchor, flipping below if too close
 * to the top of the viewport. Clamps horizontally to stay on-screen.
 * @param {HTMLElement} tip
 * @param {HTMLElement} anchorEl
 */
function _positionTooltipNearAnchor(tip, anchorEl) {
    // Reset so we can measure the natural size
    tip.style.left = '0px';
    tip.style.top = '0px';

    const ar = anchorEl.getBoundingClientRect();
    const tw = tip.offsetWidth || 220;
    const th = tip.offsetHeight || 70;

    let left = ar.left + ar.width / 2 - tw / 2;
    let top = ar.top - th - 8;

    // Flip below anchor if it would be cut off at the top of the viewport
    if (top < 6) top = ar.bottom + 8;

    // Clamp horizontally within the viewport
    left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
}


//------------------------------------------------------------------------
//-------------------REWARD CHIP TOOLTIP------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Returns (or lazily creates) the floating tooltip element used on reward chips.
 * @returns {HTMLElement}
 */
function _ensureQuestRewardTooltip() {
    if (_questRewardTipEl) return _questRewardTipEl;
    _questRewardTipEl = document.createElement('div');
    _questRewardTipEl.id = 'quest-reward-tooltip';
    document.body.appendChild(_questRewardTipEl);
    return _questRewardTipEl;
}

/**
 * Fills in and shows the reward tooltip, positioned near the hovered chip.
 * @param {Object} def       - ITEM_DEFS entry for the item
 * @param {HTMLElement} anchorEl - The chip element that was hovered
 */
function _showQuestRewardTooltip(def, anchorEl) {
    const tip = _ensureQuestRewardTooltip();
    const rc = rarityColors(def.rarity);
    const de = LANG === 'de';

    tip.innerHTML = `
        <div class="inv-tip-name"   style="color:${rc.color}">${def.icon} ${de ? def.nameDE : def.nameEn}</div>
        <div class="inv-tip-rarity" style="color:${rc.color}">${def.rarity.toUpperCase()}</div>
        <div class="inv-tip-desc">${de ? def.descDE : def.descEn}</div>`;
    tip.classList.add('visible');

    _positionTooltipNearAnchor(tip, anchorEl);
}

/** Hides the floating reward tooltip. Called from chip onmouseleave. */
function _hideQuestRewardTooltip() {
    if (_questRewardTipEl) _questRewardTipEl.classList.remove('visible');
}

/**
 * Convenience handler attached to chip onmouseenter via inline HTML.
 * Looks up the item def and delegates to _showQuestRewardTooltip.
 * @param {HTMLElement} el
 * @param {string} defId
 */
function _questChipHover(el, defId) {
    const def = ITEM_DEFS[defId];
    if (def) _showQuestRewardTooltip(def, el);
}


//------------------------------------------------------------------------
//-------------------GRID VIEW BUILDERS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Gathers the numbers needed for the summary strip.
 * Separated from the HTML builder so the data is easy to test or reuse.
 * @returns {{ totalMs: number, claimedMs: number, claimableMs: number, ptFromLedger: number, ptTotal: number }}
 */
function _ledger_computeSummaryData() {
    let totalMs = 0, claimedMs = 0, claimableMs = 0, ptFromLedger = 0, ptTotal = 0;

    LEDGER_CATEGORIES.forEach(cat => {
        cat.milestones.forEach(ms => {
            totalMs++;
            if (ms.reward.ptPoints) ptTotal += ms.reward.ptPoints;
            if (_milestone_isClaimed(ms)) {
                claimedMs++;
                if (ms.reward.ptPoints) ptFromLedger += ms.reward.ptPoints;
            } else if (_milestone_isComplete(ms)) {
                claimableMs++;
            }
        });
    });

    return { totalMs, claimedMs, claimableMs, ptFromLedger, ptTotal };
}

/**
 * Builds the summary strip HTML shown above the category grid.
 * Displays total PT points earned, milestones claimed, and a claimable badge if relevant.
 * @returns {string} HTML string
 */
function _ledger_buildSummaryStrip() {
    const { totalMs, claimedMs, claimableMs, ptFromLedger, ptTotal } = _ledger_computeSummaryData();

    const claimableStat = claimableMs > 0
        ? `<div class="ledg-stat is-claimable">
               <span class="ledg-stat-icon claimable"></span>
               <span>
                   <span class="ledg-stat-label">${t('qa_claimable')}</span>
                   <span class="ledg-stat-value"><strong>${claimableMs}</strong></span>
               </span>
           </div>`
        : '';

    return `
        <div class="ledger-summary-strip">
            <div class="ledg-stat">
                <span class="ledg-stat-icon cp"></span>
                <span>
                    <span class="ledg-stat-label">${t('qa_convergence_points')}</span>
                    <span class="ledg-stat-value">${ptFromLedger} / ${ptTotal}</span>
                </span>
            </div>
            <div class="ledg-stat">
                <span class="ledg-stat-icon claimed"></span>
                <span>
                    <span class="ledg-stat-label">${t('qa_milestones_claimed')}</span>
                    <span class="ledg-stat-value">${claimedMs} / ${totalMs}</span>
                </span>
            </div>
            ${claimableStat}
        </div>`;
}

/**
 * Builds the HTML for a single category card in the grid overview.
 * The card's border colour and animated dot reflect its current claim state.
 * @param {Object} cat - A category object from LEDGER_CATEGORIES
 * @returns {string} HTML string
 */
function _ledger_buildCategoryCard(cat) {
    const de = LANG === 'de';

    const totalMs = cat.milestones.length;
    const claimedMs = cat.milestones.filter(ms => _milestone_isClaimed(ms)).length;
    const hasReady = cat.milestones.some(ms => _milestone_isComplete(ms) && !_milestone_isClaimed(ms));

    // Progress bar reflects how far the player is through the NEXT unclaimed milestone
    const nextUnclaimed = cat.milestones.find(ms => !_milestone_isClaimed(ms));
    const barPct = nextUnclaimed ? _milestone_getProgress(nextUnclaimed).pct : 100;

    const cardClass = hasReady
        ? 'ledger-card ledger-card-ready'
        : claimedMs === totalMs
            ? 'ledger-card ledger-card-done'
            : 'ledger-card';

    const notifyDot = hasReady ? `<span class="ledger-card-dot"></span>` : '';
    const iconUrl = _ledger_getCategoryIcon(cat.id);

    return `
        <div class="${cardClass}" onclick="_ledger_openCategory('${cat.id}')">
            ${notifyDot}
            <div class="ledger-card-art">
                <div class="ledger-card-icon-img" style="background-image:${iconUrl};"></div>
            </div>
            <div class="ledger-card-ticket">
                <div class="ledger-card-title">${de ? cat.titleDE : cat.titleEn}</div>
                <div class="ledger-card-prog-bar">
                    <div class="ledger-card-prog-fill ${claimedMs === totalMs ? 'ledger-prog-done' : ''}"
                         style="width:${barPct}%"></div>
                </div>
                <div class="ledger-card-sub">
                    ${claimedMs} / ${totalMs} ${t('qa_claimed_short')}
                </div>
            </div>
        </div>`;
}

/**
 * Builds the full category grid as one continuous flowing grid — no
 * fixed-size "pages"/scroll-snap. The scroll region just scrolls normally
 * and the CSS grid wraps into however many rows the current column count
 * needs at any screen size.
 * @param {Array} cats
 * @returns {string} HTML string
 */
function _ledger_buildGrid(cats) {
    return `<div class="ledger-grid">
        ${cats.map(_ledger_buildCategoryCard).join('')}
    </div>`;
}

/**
 * Renders the full grid overview (tabs + summary strip + category grid)
 * into the modal element, for the currently active group tab.
 * @param {HTMLElement} modal
 */
function _ledger_renderGridView(modal) {
    const de = LANG === 'de';

    // Build the Tab Navigation
    const tabsHtml = LEDGER_GROUPS.map(g => {
        const isActive = g.id === _ledger_activeGroupId;
        const label = de ? g.labelDE : g.labelEn;
        const groupHasClaimable = LEDGER_CATEGORIES
            .filter(c => c.groupId === g.id)
            .some(c => c.milestones.some(ms => _milestone_isComplete(ms) && !_milestone_isClaimed(ms)));
        const dot = groupHasClaimable
            ? `<span class="ledger-tab-dot"></span>`
            : '';
        return `<button class="ledger-tab-btn ${isActive ? 'active' : ''}" 
                    onclick="_ledger_switchGroup('${g.id}')">
                ${label}${dot}
            </button>`;
    }).join('');

    // Filter categories to only show the active group
    const visibleCats = LEDGER_CATEGORIES.filter(c => c.groupId === _ledger_activeGroupId);

    // Render the modal
    modal.innerHTML = `
    <div class="modal-box ledger-modal-box">
        <button class="modal-close">
            ✕ ${t('qa_close')}
        </button>
        <div class="ledg-corner-seal"></div>

        <div class="ledg-header-plaque">
            <div class="ledg-header-title">${t('btn_inference')}</div>
        </div>

        ${_ledger_buildSummaryStrip()}

        <div class="ledger-tabs">
            ${tabsHtml}
        </div>

        <div class="ledger-scroll-region">
            ${_ledger_buildGrid(visibleCats)}
        </div>
    </div>`;
    
}


//------------------------------------------------------------------------
//-------------------DETAIL VIEW BUILDERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Derives the display state for a milestone row from its claimed/complete status.
 * Keeps the HTML builder clean by centralising all the conditional logic here.
 * @param {Object} ms
 * @returns {{ rowClass: string, statusText: string, claimable: boolean, claimed: boolean }}
 */
function _ledger_getMilestoneDisplayState(ms) {
    const claimed = _milestone_isClaimed(ms);
    const complete = _milestone_isComplete(ms);
    const claimable = complete && !claimed;

    const rowClass = claimed ? 'quest-row quest-done'
        : claimable ? 'quest-row quest-claimable'
            : 'quest-row quest-active';

    const statusText = claimed ? t('qa_status_claimed')
        : claimable ? t('qa_status_claim_now')
            : t('qa_status_in_progress');

    return { rowClass, statusText, claimable, claimed };
}

/**
 * Builds a single named-item reward chip with a hover tooltip.
 * @param {string} defId
 * @param {boolean} de - True if German locale
 * @returns {string} HTML string
 */
function _ledger_buildItemChip(defId, de) {
    const def = ITEM_DEFS[defId];
    if (!def) return '';
    return `
        <span class="quest-reward-item quest-reward-item-tip"
              onmouseenter="_questChipHover(this,'${defId}')"
              onmouseleave="_hideQuestRewardTooltip()">
            ${def.icon} ${de ? def.nameDE : def.nameEn}
        </span>`;
}

/**
 * Builds the coloured reward chip HTML for a milestone's reward definition.
 * PT-point chips are green; item chips are orange with a hover tooltip.
 * @param {Object} reward - The ms.reward object
 * @returns {string} HTML string
 */
function _ledger_buildRewardChips(reward) {
    const de = LANG === 'de';
    const chips = [];

    if (reward.ptPoints) {
        chips.push(
            `<span class="quest-reward-pt">🌳 +${reward.ptPoints} ${t('qa_convergence_point')}</span>`
        );
    }

    if (reward.items) {
        reward.items.forEach(defId => {
            chips.push(defId === '__random__'
                ? `<span class="quest-reward-item">🎁 ${t('qa_random_item')}</span>`
                : _ledger_buildItemChip(defId, de)
            );
        });
    }

    return chips.join('');
}

/**
 * Builds the claim/claimed button for a milestone row, or an empty string
 * if the milestone is still in progress (no button shown).
 * @param {Object} ms
 * @param {boolean} claimable
 * @param {boolean} claimed
 * @returns {string} HTML string
 */
function _ledger_buildClaimButton(ms, claimable, claimed) {
    if (claimable) {
        return `<button class="quest-claim-btn" onclick="claimQuest('${ms.id}')">
                    🎁 ${t('qa_btn_claim')}
                </button>`;
    }
    if (claimed) {
        return `<button class="quest-claim-btn quest-claimed-btn" disabled>
                    ✓ ${t('qa_btn_claimed')}
                </button>`;
    }
    return '';
}

/**
 * Builds the HTML for a single milestone row in the detail view.
 * @param {Object} ms - A milestone object from quests-data.js
 * @returns {string} HTML string
 */
function _ledger_buildMilestoneRow(ms) {
    const de = LANG === 'de';
    const { rowClass, claimable, claimed } = _ledger_getMilestoneDisplayState(ms);
    const { current, target, pct } = _milestone_getProgress(ms);
    const complete = _milestone_isComplete(ms);
    const label = de ? ms.labelDE : ms.labelEn;

    return `
        <div class="${rowClass}">
            <div class="quest-row-header">
                <span class="quest-title">${complete ? '✓ ' : ''}${label}</span>
                <span class="quest-obj-count">
                    ${current.toLocaleString()} / ${target.toLocaleString()}
                </span>
            </div>
            <div class="quest-prog-bar">
                <div class="quest-prog-fill ${complete ? 'quest-prog-done' : ''}"
                     style="width:${pct}%"></div>
            </div>
            <div class="quest-reward-row">
                <div class="quest-rewards">
                    ${_ledger_buildRewardChips(ms.reward)}
                </div>
                ${_ledger_buildClaimButton(ms, claimable, claimed)}
            </div>
        </div>`;
}

/**
 * Renders the detail view for the active category into the modal element.
 * Falls back to the grid view if the category id is invalid.
 * @param {HTMLElement} modal
 */
function _ledger_renderDetailView(modal) {
    const de = LANG === 'de';
    const cat = LEDGER_CATEGORIES.find(c => c.id === _ledger_activeCategoryId);
    if (!cat) { _ledger_backToGrid(); return; }

    const iconUrl = _ledger_getCategoryIcon(cat.id);

    modal.innerHTML = `
    <div class="modal-box quest-log-box">
        <button class="modal-close">
            ✕ ${t('qa_close')}
        </button>

        <div class="ledg-detail-header">
            <div class="ledg-detail-icon-badge" style="background-image:${iconUrl};"></div>
            <div class="modal-title">${de ? cat.titleDE : cat.titleEn}</div>
        </div>

        <div class="ledger-cat-desc">${de ? cat.descDE : cat.descEn}</div>

        <div class="ledger-scroll-region">
            <div class="quest-list">
                ${cat.milestones.map(ms => _ledger_buildMilestoneRow(ms)).join('')}
            </div>
        </div>
    </div>`;
}


//------------------------------------------------------------------------
//-------------------NAVIGATION & MODAL LIFECYCLE---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/**
 * Re-renders the quest-log modal in-place.
 * Decides whether to show the grid overview or a category detail view.
 * Safe to call when the modal is not open — it will no-op.
 */
function renderQuestLog() {
    const modal = document.getElementById('quest-log-modal');
    const hasShow = modal?.classList.contains('show');
    if (!modal || !modal.classList.contains('show')) return;

    if (_ledger_activeCategoryId) {
        _ledger_renderDetailView(modal);
    } else {
        _ledger_renderGridView(modal);
    }
}

/**
 * Closes the quest-log modal and resets navigation back to the grid overview.
 */
function hideQuestLog() {
    _ledger_activeCategoryId = null;
    const modal = document.getElementById('quest-log-modal');
    if (modal) modal.classList.remove('show');
}

/**
 * Returns to the category grid from a detail view.
 * Called from the "Back to Overview" button.
 */
function _ledger_backToGrid() {
    _ledger_activeCategoryId = null;
    renderQuestLog();
}

/**
 * Opens the detail view for a category.
 * Called from inline onclick on category cards.
 * @param {string} id - Category id from quests-data.js
 */
function _ledger_openCategory(id) {
    _ledger_activeCategoryId = id;
    renderQuestLog();
}

/**
 * Switches the active ledger tab (category group) and re-renders.
 * @param {string} groupId
 */
function _ledger_switchGroup(groupId) {
    _ledger_activeGroupId = groupId;
    renderQuestLog();
}

/**
 * Opens the quest-log modal and renders its current state.
 * Creates the modal element if it doesn't exist yet.
 */
function showQuestLog() {
    let modal = document.getElementById('quest-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quest-log-modal';
        modal.className = 'modal-bg';
        modal.dataset.listenerBound = '1';

        modal.addEventListener('click', (e) => {
            if (e.target === modal) { hideQuestLog(); return; }
            if (e.target.classList.contains('modal-close') || e.target.closest?.('.modal-close')) {
                if (_ledger_activeCategoryId) {
                    _ledger_backToGrid();
                } else {
                    hideQuestLog();
                }
                return;
            }
        });

        document.body.appendChild(modal);
    }
    modal.classList.add('show');
    renderQuestLog();
}


//------------------------------------------------------------------------
//-------------------QUEST TOAST NOTIFICATIONS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//  Toasts are queued so they never overlap each other.

/**
 * Builds and returns the toast DOM element (not yet appended to the document).
 * @param {Object} milestone
 * @param {Object} category
 * @returns {HTMLElement}
 */
function _buildQuestToastElement(milestone, category) {
    const de = LANG === 'de';

    const catTitle = de ? category.titleDE : category.titleEn;
    const msLabel = de ? milestone.labelDE : milestone.labelEn;
    const headerText = t('qa_milestone_reached');
    const rewardText = t('qa_toast_collect_reward');

    const el = document.createElement('div');
    el.id = 'quest-toast';
    el.innerHTML = `
        <div class="quest-toast-inner">
            <span class="quest-toast-icon">${category.icon}</span>
            <div class="quest-toast-text">
                <div class="quest-toast-title">⭐ ${headerText}</div>
                <div class="quest-toast-name">${catTitle}: <em>${msLabel}</em></div>
                <div class="quest-toast-sub">${rewardText}</div>
            </div>
        </div>`;

    return el;
}

/**
 * Slides the toast out, removes it from the DOM, clears the busy flag,
 * and schedules the next drain after the gap delay.
 * @param {HTMLElement} el
 */
function _dismissQuestToast(el) {
    el.classList.remove('show');
    setTimeout(() => {
        el.remove();
        _questToastBusy = false;
        // Brief gap between toasts so they don't feel like they're stacking
        setTimeout(_drainQuestToastQueue, QUEST_TOAST_GAP_MS);
    }, QUEST_TOAST_FADEOUT_MS);
}

/**
 * Displays a single toast notification.
 * Sets the busy flag, builds the DOM element, triggers the CSS show transition,
 * and schedules auto-dismiss.
 * @param {Object} milestone
 * @param {Object} category
 */
function _showQuestToast(milestone, category) {
    _questToastBusy = true;

    // Safety-clear any element that somehow wasn't removed
    document.getElementById('quest-toast')?.remove();

    const el = _buildQuestToastElement(milestone, category);
    document.body.appendChild(el);

    // Trigger the CSS slide-in transition on the next paint
    requestAnimationFrame(() => el.classList.add('show'));

    const autoDismissTimer = setTimeout(() => _dismissQuestToast(el), QUEST_TOAST_DISPLAY_MS);

    // Click-to-dismiss: cancel the auto-dismiss timer so it doesn't
    // fire later against a toast that's already gone (and mess up the queue).
    el.addEventListener('click', () => {
        clearTimeout(autoDismissTimer);
        _dismissQuestToast(el);
    });

    Audio_Manager.playSFX('milestone');
}

/**
 * Dequeues and displays the next toast if none is currently showing.
 */
function _drainQuestToastQueue() {
    if (_questToastBusy || !_questToastQueue.length) return;
    const { milestone, category } = _questToastQueue.shift();
    _showQuestToast(milestone, category);
}

/**
 * Public entry point — queues a "milestone reached" toast notification.
 * Called from quests-stats.js when a milestone becomes complete.
 * @param {Object} milestone
 * @param {Object} category
 */
function showQuestToast(milestone, category) {
    _questToastQueue.push({ milestone, category });
    // Use setTimeout 0 so callers finish their stack frame first
    setTimeout(_drainQuestToastQueue, 0);
}