// ════════════════════════════════════════════════════════════════════════════
//
//  quests-logic.js  —  Milestone evaluation, claiming, banner, badge,
//                      and achievement tracking for the quest ledger.
//
//  Depends on: quests-data.js   (LEDGER_CATEGORIES, _MILESTONE_MAP)
//  Depends on: achievements.js  (trackAchStat, setAchStat)
//  Depends on: (global)         STATE, LANG, ITEM_DEFS, save(), pickRandomItem()
//
//  Public API:
//    claimQuest(milestoneId)      — claim a completed milestone by id
//    buildQuestLogButton()        — initialise badge visibility on game start
//    _refreshQuestBadge()         — update red badge on the quest-log button
//
//  Used internally by quests-ui.js:
//    _milestone_isComplete(ms)                    — has the player hit the target?
//    _milestone_isClaimed(ms)                     — has the reward been collected?
//    _milestone_getProgress(ms)  → { current, target, pct }
//    _ledger_hasAnyClaimable()                    — any ready-to-claim milestone?
//
// ════════════════════════════════════════════════════════════════════════════


//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/** How long (ms) the claim banner stays visible before starting to fade out. */
const BANNER_DISMISS_MS = 4000;

/** Duration (ms) of the claim banner CSS fade-out. Must match .qcb fade CSS. */
const BANNER_FADEOUT_MS = 400;

/**
 * Category ids that qualify as "keystone" quests for achievement tracking.
 * Defined here at the top level so the Set is only created once, not on
 * every claim event.
 */
const KEYSTONE_CATEGORY_IDS = new Set([
    'signal_noise_master',
    'oracle_vision',
    'degrees_of_freedom_master',
    'entropy_drain_master',
    'overfitting_gambler',
    'countdown_crisis_master',
    'sparse_prior_master',
    'dead_reckoning_navigator',
    'frequentists_burden_master',
    'adjacency_matrix_master',
    'minesweeper_mind',
    'gamblers_fortune',
    'random_walk_survivor',
]);

/**
 * Maps each ledger category id to the achievement stat that should be
 * incremented when one of its milestones is claimed.
 * Allows _ach_trackCategoryMilestone() to be a simple lookup rather than
 * a long chain of if-statements.
 */
const CATEGORY_ACHIEVEMENT_MAP = {
    expected_value: 'inferenceScoreMilestones',
    sample_size: 'inferenceSampleMilestones',
    parameter_space: 'inferenceWorldMilestones',
    probability_gate: 'inferenceGateMilestones',
    convergence: 'inferenceConvergenceMilestones',
    probability_tree: 'inferencePTMilestones',
    max_likelihood: 'inferenceClassUpgradeMilestones',
    choose_ascendency: 'inferenceAscendencyMilestones',
    ascendency_mastery: 'inferenceAscendencyMilestones',
    descriptive_stats: 'inferenceAchievementMilestones',
    confidence_interval: 'inferenceAnswerMilestones',
    lucky_drop_event: 'inferenceLuckyMilestones',
    zero_variance: 'inferenceFlawlessMilestones',
};


//------------------------------------------------------------------------
//-------------------MILESTONE EVALUATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  Read-only query layer. All UI and claiming code goes through these
//  functions — nothing should read STATE.questStats or STATE.questsClaimed
//  directly outside of this section.
//

/**
 * Returns true if the player has met the milestone's required target.
 * @param {Object} ms - A milestone object from quests-data.js
 * @returns {boolean}
 */
function _milestone_isComplete(ms) {
    const { current, target } = ms.check(STATE.questStats || {});
    return current >= target;
}

/**
 * Returns true if the player has already claimed this milestone's reward.
 * @param {Object} ms - A milestone object from quests-data.js
 * @returns {boolean}
 */
function _milestone_isClaimed(ms) {
    return (STATE.questsClaimed || []).includes(ms.id);
}

/**
 * Returns current progress for a milestone.
 * `current` is clamped to `target` so progress bars never overflow 100%.
 * @param {Object} ms - A milestone object from quests-data.js
 * @returns {{ current: number, target: number, pct: number }}
 */
function _milestone_getProgress(ms) {
    const { current, target } = ms.check(STATE.questStats || {});
    const clamped = Math.min(current, target);
    const pct = Math.min(100, Math.round((clamped / target) * 100));
    return { current: clamped, target, pct };
}

/**
 * Returns true if ANY milestone across all categories is complete but unclaimed.
 * Used to decide whether the red badge on the quest-log button should be shown.
 * @returns {boolean}
 */
function _ledger_hasAnyClaimable() {
    return LEDGER_CATEGORIES.some(cat =>
        cat.milestones.some(ms => _milestone_isComplete(ms) && !_milestone_isClaimed(ms))
    );
}


//------------------------------------------------------------------------
//-------------------REWARD GRANTING----------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  Helpers that write reward data into STATE.
//  All reward mutations are funnelled through _reward_grantAll() so
//  it's easy to find every place STATE is modified during a claim.
//

/**
 * Generates a collision-resistant uid for a newly granted inventory item.
 * Format: "ledger_<timestamp>_<random6chars>"
 * Placed first because _reward_grantOneItem() depends on it.
 * @returns {string}
 */
function _reward_generateItemUid() {
    return `ledger_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Resolves a single item defId (handling the special '__random__' token),
 * then pushes the resulting item into the player's inventory.
 * Silently no-ops if the resolved id is missing or not found in ITEM_DEFS.
 * @param {string} defId - Raw defId from the reward definition; may be '__random__'
 */
function _reward_grantOneItem(defId) {
    // '__random__' is resolved at grant-time via pickRandomItem().
    // pickRandomItem() may return null if the Apex Collector passive consumed the pool.
    const resolvedId = defId === '__random__' ? pickRandomItem() : defId;
    if (!resolvedId) return null;

    const def = ITEM_DEFS[resolvedId];
    if (!def) return null;

    STATE.inventory.push({
        uid: _reward_generateItemUid(),
        defId: resolvedId,
    });

    return resolvedId;
}

/**
 * Adds passive-tree skill points to STATE.
 * @param {number} amount - Number of points to add
 */
function _reward_grantPassivePoints(amount) {
    STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + amount;
    _incDirect('lifetimePassivePointsObtained', amount);
}

/**
 * Grants all rewards defined on a milestone: passive-tree points and/or items.
 * Also triggers the reward SFX.
 * @param {Object} ms - The milestone whose rewards should be granted
 * @returns {string[]} defIds of every item actually granted (resolved, non-null)
 */
function _reward_grantAll(ms) {
    Audio_Manager.playSFX('questRewardClaimed');

    if (ms.reward.ptPoints) {
        _reward_grantPassivePoints(ms.reward.ptPoints);
    }

    const grantedIds = [];
    if (ms.reward.items) {
        ms.reward.items.forEach(defId => {
            const resolvedId = _reward_grantOneItem(defId);
            if (resolvedId) grantedIds.push(resolvedId);
        });
    }

    return grantedIds;
}


//------------------------------------------------------------------------
//-------------------CLAIM BANNER---------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  The on-screen confirmation popup shown immediately after a successful claim.
//  Banner flow: _showClaimBanner() → build parts → build element → auto-dismiss.
//

/**
 * Resolves a single reward item defId to a human-readable label string
 * like "🗡️ Iron Sword", falling back to "🎁 Item" if resolution fails.
 * Placed first because _banner_buildRewardParts() depends on it.
 * @param {string} defId - Raw defId from the reward definition; may be '__random__'
 * @param {boolean} de   - True when the current language is German
 * @returns {string}
 */
function _banner_resolveItemLabel(defId, de) {
    const resolvedId = defId === '__random__' ? pickRandomItem() : defId;
    const def = resolvedId ? ITEM_DEFS[resolvedId] : null;
    return def
        ? `${def.icon} ${de ? def.nameDE : def.nameEn}`
        : t('qa_item_fallback');
}


/**
 * Builds a localized "item added to inventory" toast message for a single
 * granted item defId, e.g. "🎁 Added: 🗡️ Iron Sword". Falls back to a
 * generic label if the def can't be resolved.
 * @param {string} defId - Resolved item defId (already resolved, not '__random__')
 * @returns {string}
 */
function _questItemGrantToastMsg(defId) {
    const de = LANG === 'de';
    const def = ITEM_DEFS[defId];
    const label = def ? `${def.icon} ${de ? def.nameDE : def.nameEn}` : t('qa_item_fallback');
    return `🎒 ${t('qa_added_prefix')}: ${label}`;
}

/**
 * Builds the localised reward-parts array shown inside the claim banner.
 * Each entry is a short human-readable string, e.g. "🌳 +1 Convergence Point".
 * @param {Object} ms - The milestone that was just claimed
 * @returns {string[]}
 */
function _banner_buildRewardParts(ms) {
    const de = LANG === 'de';
    const parts = [];

    if (ms.reward.ptPoints) {
        parts.push(`🌳 +${ms.reward.ptPoints} ${t('qa_convergence_point')}`);
    }

    if (ms.reward.items) {
        ms.reward.items.forEach(defId => {
            parts.push(_banner_resolveItemLabel(defId, de));
        });
    }

    return parts;
}

/**
 * Builds and returns the banner <div> element (not yet attached to the DOM).
 * @param {Object}   ms          - The milestone that was just claimed
 * @param {Object}   cat         - The parent category of that milestone
 * @param {string[]} rewardParts - Output of _banner_buildRewardParts()
 * @returns {HTMLElement}
 */
function _banner_buildElement(ms, cat, rewardParts) {
    const de = LANG === 'de';

    const banner = document.createElement('div');
    banner.id = 'quest-claim-banner';

    // quests-logic.js — inside _banner_buildElement()

    banner.innerHTML = `
    <div class="qcb-inner">
        <span class="qcb-icon">${cat.icon}</span>
        <div class="qcb-text">
            <div class="qcb-title">⭐ ${t('qa_milestone_reached')}</div>
            <div class="qcb-sub">
                ${de ? cat.titleDE : cat.titleEn}: <em>${de ? ms.labelDE : ms.labelEn}</em>
            </div>
            <div class="qcb-rewards">${rewardParts.join('&nbsp;&nbsp;')}</div>
        </div>
        <button class="qcb-close"
                onclick="document.getElementById('quest-claim-banner')?.remove()">✕</button>
    </div>`;

    return banner;
}

/**
 * Starts the auto-dismiss sequence for the claim banner:
 * waits BANNER_DISMISS_MS, then fades it out over BANNER_FADEOUT_MS, then removes it.
 */
function _banner_startAutoDismiss() {
    setTimeout(() => {
        const el = document.getElementById('quest-claim-banner');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), BANNER_FADEOUT_MS);
    }, BANNER_DISMISS_MS);
}

/**
 * Shows the claim banner for a just-claimed milestone.
 * Any banner still visible from a rapid previous claim is removed first.
 * @param {Object} ms  - The milestone that was just claimed
 * @param {Object} cat - The parent category of that milestone
 */
function _showClaimBanner(ms, cat) {
    // Remove any previous banner that hasn't finished fading yet
    document.getElementById('quest-claim-banner')?.remove();

    const rewardParts = _banner_buildRewardParts(ms);
    const banner = _banner_buildElement(ms, cat, rewardParts);

    document.body.appendChild(banner);
    _banner_startAutoDismiss();
}


//------------------------------------------------------------------------
//-------------------BADGE--------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  The small red dot on the quest-log toolbar button that signals there is
//  at least one reward ready to collect.
//

/**
 * Shows or hides the red claimable-badge on the quest-log toolbar button.
 * Should be called any time milestone claimed/completed state may have changed.
 */
function _refreshQuestBadge() {
    const badge = document.getElementById('quest-log-badge');
    if (!badge) return;
    badge.style.display = _ledger_hasAnyClaimable() ? 'inline-block' : 'none';
}

/**
 * Public initialiser — call this from game init once the toolbar button
 * is in the DOM. Sets the correct initial badge visibility on load.
 */
function buildQuestLogButton() {
    _refreshQuestBadge();
}


//------------------------------------------------------------------------
//-------------------ACHIEVEMENT TRACKING (INFERENCE)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  Maps claimed milestones onto achievement stats via trackAchStat / setAchStat
//  from achievements.js. Called once per successful claim from claimQuest().
//
//  Structure:
//    _ach_trackGlobalClaim()             — fired for every single claim
//    _ach_trackPassivePointsEarned()     — only when pt points are in the reward
//    _ach_trackKeystoneQuest()           — only for keystone category ids
//    _ach_trackCategoryMilestone()       — increments the per-category stat
//    _ach_trackFullCategoryCompletion()  — checks if a whole category is now done
//    _trackInferenceAchievements()       — orchestrator, called by claimQuest()
//

/**
 * Increments the global "total quests claimed" achievement counter.
 * Fired on every successful claim regardless of category or reward type.
 */
function _ach_trackGlobalClaim() {
    trackAchStat('inferenceQuestsClaimed');
}

/**
 * Tracks passive-tree points earned through quest rewards.
 * Only called when the milestone reward actually includes pt points.
 * @param {Object} ms - The milestone that was just claimed
 */
function _ach_trackPassivePointsEarned(ms) {
    if (ms.reward && ms.reward.ptPoints) {
        trackAchStat('inferencePtPointsEarned', ms.reward.ptPoints);
    }
}

/**
 * Increments the keystone-quest counter if the claimed milestone's category
 * is listed in KEYSTONE_CATEGORY_IDS.
 * @param {Object} cat - The parent category of the claimed milestone
 */
function _ach_trackKeystoneQuest(cat) {
    if (KEYSTONE_CATEGORY_IDS.has(cat.id)) {
        trackAchStat('inferenceKeystoneQuestsDone');
    }
}

/**
 * Increments the per-category achievement stat for the claimed milestone.
 * The mapping from category id → stat name lives in CATEGORY_ACHIEVEMENT_MAP.
 * No-ops silently if the category has no mapped stat (e.g. future categories).
 * @param {Object} cat - The parent category of the claimed milestone
 */
function _ach_trackCategoryMilestone(cat) {
    const stat = CATEGORY_ACHIEVEMENT_MAP[cat.id];
    if (stat) {
        trackAchStat(stat);
    }
}

/**
 * Checks whether every milestone in the given category is now claimed.
 * If so, counts all fully-completed categories and writes that total to
 * the 'inferenceFullCategoriesClaimed' achievement stat via setAchStat.
 * @param {Object} cat - The category to check for full completion
 */
function _ach_trackFullCategoryCompletion(cat) {
    if (typeof setAchStat !== 'function') return;

    const claimedIds = STATE.questsClaimed || [];

    // Check if this specific category just became fully complete
    const thisCategoryComplete = cat.milestones.every(m => claimedIds.includes(m.id));
    if (!thisCategoryComplete) return;

    // Count ALL fully-completed categories (not just this one)
    const totalFullyComplete = LEDGER_CATEGORIES.filter(c =>
        c.milestones.every(m => claimedIds.includes(m.id))
    ).length;

    setAchStat('inferenceFullCategoriesClaimed', totalFullyComplete);
}

/**
 * Orchestrates all achievement stat tracking for a milestone that was just claimed.
 * Guards against achievements.js not being loaded (trackAchStat check at the top).
 * @param {Object} ms  - The milestone that was just claimed
 * @param {Object} cat - The parent category of that milestone
 */
function _trackInferenceAchievements(ms, cat) {
    if (typeof trackAchStat !== 'function') return;

    _ach_trackGlobalClaim();
    _ach_trackPassivePointsEarned(ms);
    _ach_trackKeystoneQuest(cat);
    _ach_trackCategoryMilestone(cat);
    _ach_trackFullCategoryCompletion(cat);
}


//------------------------------------------------------------------------
//-------------------CLAIMING-------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  Public entry point for the claim flow. All downstream effects (rewards,
//  banner, badge, achievements, save) are triggered from claimQuest().
//

/**
 * Marks a milestone as claimed by pushing its id into STATE.questsClaimed.
 * Initialises the array if it doesn't exist yet.
 * @param {Object} ms - The milestone to mark as claimed
 */
function _claim_recordClaim(ms) {
    if (!STATE.questsClaimed) STATE.questsClaimed = [];
    STATE.questsClaimed.push(ms.id);
}

/**
 * Claims a milestone by id if it is complete and not yet claimed.
 * On success: records the claim, grants rewards, saves, shows the banner,
 * refreshes the badge, tracks achievements, and re-renders the quest log.
 * Called from inline onclick handlers in quests-ui.js.
 * @param {string} milestoneId - The id of the milestone to claim
 */
function claimQuest(milestoneId) {
    const entry = _MILESTONE_MAP[milestoneId];
    if (!entry) return;

    const { milestone: ms, category: cat } = entry;

    // Guard: do nothing if not yet complete or already collected
    if (_milestone_isClaimed(ms) || !_milestone_isComplete(ms)) return;

    _claim_recordClaim(ms);
    const grantedIds = _reward_grantAll(ms);

    save();
    _trackInferenceAchievements(ms, cat);
    _showClaimBanner(ms, cat);
    _refreshQuestBadge();
    renderQuestLog();

    if (typeof buildInventoryPanel === 'function') buildInventoryPanel();
    if (typeof showItemGainPopup === 'function') {
        grantedIds.forEach(defId => showItemGainPopup(defId));
    }
    if (typeof showToast === 'function') {
        grantedIds.forEach(defId => showToast(_questItemGrantToastMsg(defId)));
    }
}