import { setAchStat, trackAchStat } from '../achievements/achievements.js';
import { Audio_Manager } from '../audio/audio.js';
import { save, STATE } from '../state.js';
import { LANG, t } from '../translation/translations.js';
import { ITEM_DEFS } from '../puzzle-items/item-definitions.js';
import { pickRandomItem } from '../puzzle-items/item-pool.js';
import { buildInventoryPanel } from '../puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { _escapeToastHtml, puzzleItemIconHtml, showHtmlToast, showItemGainPopup, showToast } from '../puzzle-mechanics/toasts-and-popups.js';
import { LEDGER_CATEGORIES, _MILESTONE_MAP } from './inference-data.js';
import { _incDirect } from './inference-stats.js';
import { renderQuestLog } from './inference-ui.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS---------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
// inference-logic.js - milestone evaluation, claiming, claim banner,
// badge and achievement tracking for the quest ledger.
// UI reads progress through the _milestone_* queries; claiming flows
// through claimQuest() only.
//

// How long (ms) the claim banner stays visible before starting to fade out.
const BANNER_DISMISS_MS = 4000;

// Duration (ms) of the claim banner CSS fade-out. Must match .qcb fade CSS.
const BANNER_FADEOUT_MS = 400;

// Category ids that count as "keystone" quests for achievement tracking.
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

// Maps each ledger category id to the achievement stat that should be
// incremented when one of its milestones is claimed, so the per-category
// tracking is a simple lookup.
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
//  functions - nothing should read STATE.questStats or STATE.questsClaimed
//  directly outside of this section.
//

// Returns true if the player has met the milestone's required target.
export function _milestone_isComplete(ms) {
    const { current, target } = ms.check(STATE.questStats || {});
    return current >= target;
}

// Returns true if the player has already claimed this milestone's reward.
export function _milestone_isClaimed(ms) {
    return (STATE.questsClaimed || []).includes(ms.id);
}

// Returns current progress for a milestone. `current` is clamped to
// `target` so progress bars never overflow 100%.
export function _milestone_getProgress(ms) {
    const { current, target } = ms.check(STATE.questStats || {});
    const clamped = Math.min(current, target);
    const pct = Math.min(100, Math.round((clamped / target) * 100));
    return { current: clamped, target, pct };
}

// Returns true if ANY milestone across all categories is complete but
// unclaimed. Drives the red badge on the quest-log toolbar button.
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
//  Helpers that write reward data into STATE. All reward mutations are
//  funnelled through _reward_grantAll() so it's easy to find every place
//  STATE is modified during a claim.
//

// Generates a collision-resistant uid for a newly granted inventory item.
function _reward_generateItemUid() {
    return `ledger_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Resolves a single item defId (handling the special '__random__' token),
// then pushes the resulting item into the player's inventory. Silently
// no-ops if the resolved id is missing or not found in ITEM_DEFS.
function _reward_grantOneItem(defId) {
    // '__random__' is resolved at grant-time via pickRandomItem(), which may
    // return null if the Apex Collector passive consumed the pool.
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

// Adds passive-tree skill points to STATE.
function _reward_grantPassivePoints(amount) {
    STATE.passiveTreePoints = (STATE.passiveTreePoints || 0) + amount;
    _incDirect('lifetimePassivePointsObtained', amount);
}

// Grants all rewards defined on a milestone: passive-tree points and/or
// items. Also triggers the reward SFX. Returns the defIds of every item
// actually granted (resolved, non-null).
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
//  The on-screen confirmation popup shown immediately after a successful
//  claim. Flow: _showClaimBanner() -> build parts -> build element ->
//  auto-dismiss.
//

// Resolves a single reward item defId to a short label like an icon plus
// the item name, falling back to a generic label if resolution fails.
// The icon is the real item art image (emoji fallback while art loads);
// the label is embedded in the claim banner's innerHTML.
function _banner_resolveItemLabel(defId, de) {
    const resolvedId = defId === '__random__' ? pickRandomItem() : defId;
    const def = resolvedId ? ITEM_DEFS[resolvedId] : null;
    return def
        ? `${puzzleItemIconHtml(def)} ${de ? def.nameDE : def.nameEn}`
        : t('qa_item_fallback');
}

// Shows the localized "item added to inventory" toast for a single
// granted item defId, with the item's real art image up front.
function _questItemGrantToast(defId) {
    const de = LANG === 'de';
    const def = ITEM_DEFS[defId];
    if (!def) {
        showToast(`🎒 ${t('qa_added_prefix')}: ${t('qa_item_fallback')}`);
        return;
    }
    showHtmlToast(`🎒 ${_escapeToastHtml(t('qa_added_prefix'))}: ${puzzleItemIconHtml(def)} ${_escapeToastHtml(de ? def.nameDE : def.nameEn)}`);
}

// Builds the localised reward-parts array shown inside the claim banner.
// Each entry is a short human-readable string, e.g. a convergence-point line.
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

// Builds and returns the banner <div> element (not yet attached to the DOM).
function _banner_buildElement(ms, cat, rewardParts) {
    const de = LANG === 'de';

    const banner = document.createElement('div');
    banner.id = 'quest-claim-banner';

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

// Auto-dismisses the claim banner: waits BANNER_DISMISS_MS, then fades it
// out over BANNER_FADEOUT_MS, then removes it.
function _banner_startAutoDismiss() {
    setTimeout(() => {
        const el = document.getElementById('quest-claim-banner');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), BANNER_FADEOUT_MS);
    }, BANNER_DISMISS_MS);
}

// Shows the claim banner for a just-claimed milestone. Any banner still
// visible from a rapid previous claim is removed first.
function _showClaimBanner(ms, cat) {
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

// Shows or hides the red claimable-badge on the quest-log toolbar button.
// Should be called any time milestone claimed/completed state may have changed.
export function _refreshQuestBadge() {
    const badge = document.getElementById('quest-log-badge');
    if (!badge) return;
    badge.style.display = _ledger_hasAnyClaimable() ? 'inline-block' : 'none';
}

// Public initialiser - call this from game init once the toolbar button
// is in the DOM. Sets the correct initial badge visibility on load.
export function buildQuestLogButton() {
    _refreshQuestBadge();
}


//------------------------------------------------------------------------
//-------------------ACHIEVEMENT TRACKING (INFERENCE)------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
//
//  Maps claimed milestones onto achievement stats via trackAchStat /
//  setAchStat from achievements.js. Called once per successful claim
//  from claimQuest().
//

// Increments the global "total quests claimed" achievement counter.
function _ach_trackGlobalClaim() {
    trackAchStat('inferenceQuestsClaimed');
}

// Tracks passive-tree points earned through quest rewards. Only called
// when the milestone reward actually includes pt points.
function _ach_trackPassivePointsEarned(ms) {
    if (ms.reward && ms.reward.ptPoints) {
        trackAchStat('inferencePtPointsEarned', ms.reward.ptPoints);
    }
}

// Increments the keystone-quest counter if the claimed milestone's category
// is listed in KEYSTONE_CATEGORY_IDS.
function _ach_trackKeystoneQuest(cat) {
    if (KEYSTONE_CATEGORY_IDS.has(cat.id)) {
        trackAchStat('inferenceKeystoneQuestsDone');
    }
}

// Increments the per-category achievement stat for the claimed milestone.
// No-ops silently if the category has no mapped stat (e.g. future categories).
function _ach_trackCategoryMilestone(cat) {
    const stat = CATEGORY_ACHIEVEMENT_MAP[cat.id];
    if (stat) {
        trackAchStat(stat);
    }
}

// If every milestone in the given category is now claimed, counts all
// fully-completed categories and writes that total to the
// 'inferenceFullCategoriesClaimed' achievement stat.
function _ach_trackFullCategoryCompletion(cat) {
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

// Orchestrates all achievement stat tracking for a milestone that was
// just claimed.
function _trackInferenceAchievements(ms, cat) {
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

// Marks a milestone as claimed by pushing its id into STATE.questsClaimed.
function _claim_recordClaim(ms) {
    if (!STATE.questsClaimed) STATE.questsClaimed = [];
    STATE.questsClaimed.push(ms.id);
}

// Claims a milestone by id if it is complete and not yet claimed.
// On success: records the claim, grants rewards, saves, shows the banner,
// refreshes the badge, tracks achievements, and re-renders the quest log.
// Called from inline onclick handlers in inference-ui.js.
export function claimQuest(milestoneId) {
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
    grantedIds.forEach(defId => showItemGainPopup(defId));
    grantedIds.forEach(defId => _questItemGrantToast(defId));
}
