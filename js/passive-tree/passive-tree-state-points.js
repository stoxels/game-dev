//  passive-tree-state-points.js
//  Handles all allocation / deallocation logic, point accounting, and the
//  adjacency graph that the connectivity checks rely on.




//------------------------------------------------------------------------
//---------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Internal shared references — populated by PT.loadInline() so all sub-files
// operate on the same arrays without passing them as arguments on every call.
let _pt_skills = [];   // layout skill objects
let _pt_conns = [];   // connection objects
let _pt_skillMap = {};   // id → layout skill object
let _pt_adjacency = {};   // id → Set of adjacent node ids

// All statKeys that belong to each of the three main class branches.
// Defined at module level so they are not recreated on every node click.
const PT_BRANCH_STATISTICIAN = new Set([
    'gear_of_the_statistician', 'improved_gear_of_the_statistician',
    'chain_reaction', 'precise_momentum', 'exponential_growth',
    'learning_from_mistakes', 'mistakes_no_matter',
    'monte_carlo', 'correlation_matrix', 'advanced_data_strike',
    'swift_strike', 'accelerated_computation',
    'random_diagonal', 'diagonal_witch', 'diagonally_wrong',
    'quick_strike', 'accelerated_striking',
    'god_of_statistics',
]);

const PT_BRANCH_MATHMAGICIAN = new Set([
    'gear_of_the_mathmagician', 'improved_gear_of_the_mathmagician',
    'arcane_echo', 'resonant_reveal', 'arcane_exposure',
    'rapid_revelation', 'accelerated_revelation',
    'reinforced_shield', 'fortified_shield',
    'calculated_error', 'error_dividend', 'lucky_lapse',
    'prolonged_frost', 'deep_freeze', 'frozen_resilience',
    'hastened_zero', 'accelerated_zero',
    'god_of_math',
]);

const PT_BRANCH_PROBABILIST = new Set([
    'gear_of_the_probabilist', 'improved_gear_of_the_probabilist',
    'probabilistic_sweep', 'expanded_inference', 'momentum_of_certainty',
    'swift_marking', 'accelerated_marking',
    'prior_knowledge', 'updated_beliefs', 'confirmed_hypothesis',
    'posterior_insight', 'convergent_evidence',
    'wider_lens', 'panoramic_view', 'photographic_memory',
    'swift_scan', 'accelerated_scan',
    'god_of_probabilities',
]);

// StatKeys required to satisfy the "lucky tile build" achievement
const PT_LUCKY_BUILD_KEYS = [
    'grid_awareness',
    'fortunes_tile_1', 'fortunes_tile_2', 'fortunes_tile_3',
    'generous_fortune_1', 'generous_fortune_2', 'generous_fortune_3',
    'outlier_detection_1', 'outlier_detection_2',
    'covariance_shift_1', 'covariance_shift_2', 'covariance_shift_3',
];

// StatKeys for nodes that lie on the outer rim of the tree (x > 3400).
// Used to track how many outer rim nodes the player has allocated.
const PT_OUTER_RIM_KEYS = new Set([
    'timed_stasis_1', 'timed_stasis_2', 'timed_stasis_3',
    'interquartile_vision_1', 'interquartile_vision_2', 'interquartile_vision_3',
    'bayesian_update_2',
    'keystone_frequentists_burden', 'keystone_ergodic_field', 'keystone_sparse_prior',
    'confidence_interval_1', 'confidence_interval_2', 'confidence_interval_3',
    'adjacency_matrix',
]);

// Each entry is [keysArray, achievementStatName].
// _ptTrackClusterCompletions() iterates this list so adding a new cluster
// only requires a single line here rather than a new _clusterCheck call.
const PT_CLUSTER_CHECKS = [
    [
        ['tutor_enable', 'careful_study', 'stochastics_tutor', 'efficient_tutoring',
            'statistics_tutor', 'endless_instructions', 'maths_tutor', 'professor_tutor'],
        'treeTutorBranchComplete',
    ],
    [
        ['expanding_front', 'widened_formation', 'extended_horizon', 'total_coverage',
            'vertical_insight', 'rising_structure', 'elevated_scope', 'total_survey', 'primed_scout'],
        'treePrimerBranchComplete',
    ],
    [['extended_session_1', 'extended_session_2', 'extended_session_3'], 'treeTimeExtensionComplete'],
    [['timed_stasis_1', 'timed_stasis_2', 'timed_stasis_3'], 'treeTimedStasisComplete'],
    [['regression_reward_1', 'regression_reward_2', 'regression_reward_3'], 'treePatternMomentumComplete'],
    [['bayesian_update_1', 'bayesian_update_2', 'bayesian_update_3'], 'treeBayesianUpdateComplete'],
    [['confidence_interval_1', 'confidence_interval_2', 'confidence_interval_3'], 'treeConfidenceIntervalComplete'],
    [['sample_efficiency_1', 'sample_efficiency_2', 'sample_efficiency_3'], 'treeSampleEfficiencyComplete'],
    [['streak_bonus_1', 'streak_bonus_2', 'streak_bonus_3'], 'treeStreakBonusComplete'],
    [['emergency_scan_1', 'emergency_scan_2', 'emergency_scan_3'], 'treeEmergencyScanComplete'],
    [['blackout_ward_1', 'blackout_ward_2', 'blackout_ward_3'], 'treeBlackoutWardComplete'],
    [['removal_ward_1', 'removal_ward_2', 'removal_ward_3'], 'treeRemovalWardComplete'],
    [['interquartile_vision_1', 'interquartile_vision_2', 'interquartile_vision_3'], 'treeInterquartileComplete'],
    [
        ['stronger_light_1', 'stronger_light_2', 'stronger_light_3',
            'seeker_of_light_1', 'seeker_of_light_2', 'seeker_of_light_3',
            'targeted_reveal_1', 'targeted_reveal_2', 'targeted_reveal_3'],
        'treeRevealItemsComplete',
    ],
    [
        ['reinforced_ward_1', 'reinforced_ward_2', 'reinforced_ward_3',
            'wardens_stockpile_1', 'wardens_stockpile_2', 'wardens_stockpile_3'],
        'treeShieldItemsComplete',
    ],
    [
        ['stronger_marks_1', 'stronger_marks_2', 'stronger_marks_3',
            'error_collector_1', 'error_collector_2', 'error_collector_3',
            'dense_marker_1', 'dense_marker_2', 'dense_marker_3'],
        'treeMarkItemsComplete',
    ],
    [['poisson_process_1', 'poisson_process_2', 'poisson_process_3'], 'treePoissonComplete'],
    [['expected_value_1', 'expected_value_2', 'expected_value_3'], 'treeExpectedValueComplete'],
    [['marginal_distribution_1', 'marginal_distribution_2', 'marginal_distribution_3'], 'treeMarginalDistComplete'],
];




//------------------------------------------------------------------------
//-------------------------LANGUAGE HELPER---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the active UI language: 'de' or 'en'
function _ptLang() {
    return (typeof LANG !== 'undefined' && LANG === 'de') ? 'de' : 'en';
}




//------------------------------------------------------------------------
//---------------------------STATE ACCESSORS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the live Set of allocated node IDs from STATE.
// Auto-creates the Set if it is missing so callers never get undefined.
function _ptAllocated() {
    if (typeof STATE === 'undefined') return new Set();
    if (!(STATE.passiveTreeAllocated instanceof Set)) {
        STATE.passiveTreeAllocated = new Set();
    }
    return STATE.passiveTreeAllocated;
}

// Returns the current number of spendable convergence points
function _ptPoints() {
    return (typeof STATE !== 'undefined' && STATE.passiveTreePoints) || 0;
}

// Decrements the point counter by 1 (floor 0) and refreshes the UI label
function _ptSpendPoint() {
    if (typeof STATE !== 'undefined') {
        STATE.passiveTreePoints = Math.max(0, _ptPoints() - 1);
    }
    _ptRefreshPointsDisplay();
}

// Increments the point counter by 1 and refreshes the UI label
function _ptRefundPoint() {
    if (typeof STATE !== 'undefined') {
        STATE.passiveTreePoints = _ptPoints() + 1;
    }
    _ptRefreshPointsDisplay();
}

// Writes the current point count to the #pt-points element in the correct language
function _ptRefreshPointsDisplay() {
    const el = document.getElementById('pt-points');
    if (!el) return;
    const p = _ptPoints();
    el.textContent = _ptLang() === 'de'
        ? `Verfügbare Konvergenzpunkte: ${p}`
        : `Available Convergence Points: ${p}`;
}




//------------------------------------------------------------------------
//---------------------------ADJACENCY GRAPH------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Rebuilds _pt_adjacency as a bidirectional map from _pt_conns.
// Must be called after PT.loadInline() and before any unlock/dealloc checks.
function _ptBuildAdjacency() {
    _pt_adjacency = {};
    _pt_skills.forEach(s => { _pt_adjacency[s.id] = new Set(); });
    _pt_conns.forEach(c => {
        if (_pt_adjacency[c.from]) _pt_adjacency[c.from].add(c.to);
        if (_pt_adjacency[c.to]) _pt_adjacency[c.to].add(c.from);
    });
}




//------------------------------------------------------------------------
//---------------------GRAPH TRAVERSAL HELPERS---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Traverses from `startId` through nodes present in `availableSet`, visiting
// every reachable node exactly once. Returns a Set of all reached node IDs.
// Used by the deallocation check to verify connectivity is not broken.
function _ptBfsReachable(startId, availableSet) {
    const visited = new Set();
    const queue = [startId];
    while (queue.length) {
        const cur = queue.pop();
        if (visited.has(cur)) continue;
        visited.add(cur);
        const adj = _pt_adjacency[cur] || new Set();
        for (const neighbour of adj) {
            if (availableSet.has(neighbour) && !visited.has(neighbour)) {
                queue.push(neighbour);
            }
        }
    }
    return visited;
}

// Returns the statKey string for the skill at the given node ID,
// or an empty string if the node has no definition.
function _ptGetSkillStatKey(nodeId) {
    const skill = _pt_skillMap[nodeId];
    const def = skill ? skill._def : null;
    return def ? def.statKey : '';
}

// Builds and returns a Set of all statKeys that are currently allocated.
// Filters out any nodes that have no associated definition.
function _ptGetAllAllocatedStatKeys() {
    const alloc = _ptAllocated();
    const keys = new Set();
    for (const nodeId of alloc) {
        const key = _ptGetSkillStatKey(nodeId);
        if (key) keys.add(key);
    }
    return keys;
}




//------------------------------------------------------------------------
//------------------UNLOCK / DE-ALLOCATE RULES----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// A node is UNLOCKABLE when:
//   – it is not already allocated
//   – at least one adjacent node IS allocated, OR it is the Start node
function _ptIsUnlockable(id) {
    const alloc = _ptAllocated();
    if (alloc.has(id)) return false;
    if (id === PT_START_ID) return true;

    const neighbours = _pt_adjacency[id] || new Set();
    for (const neighbourId of neighbours) {
        if (alloc.has(neighbourId)) return true;
    }
    return false;
}

// Returns true if the given node exists in the allocated set
function _ptIsAllocated(id) {
    return _ptAllocated().has(id);
}

// A node can be DE-ALLOCATED when:
//   – it IS currently allocated
//   – removing it would NOT strand any other allocated node (traversal from Start)
function _ptIsDeallocatable(id) {
    const alloc = _ptAllocated();
    if (!alloc.has(id)) return false;
    if (id === PT_START_ID) return false;   // Start node is permanent

    // Simulate removal and verify every remaining allocated node stays
    // connected to Start through the remaining allocated set.
    const testSet = new Set(alloc);
    testSet.delete(id);

    // If Start itself was just removed from the test set there is nothing to check
    if (!testSet.has(PT_START_ID)) return true;

    const reachable = _ptBfsReachable(PT_START_ID, testSet);
    for (const allocatedId of testSet) {
        if (!reachable.has(allocatedId)) return false;   // a node got stranded
    }
    return true;
}




//------------------------------------------------------------------------
//------------------ACHIEVEMENT TRACKING HELPERS--------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Tracks the basic per-allocation counters that fire on every node allocation
function _ptTrackSimpleAchievements(statKey) {
    trackAchStat('treeNodesAllocated');
    trackAchStat('treePointsSpent');

    if (statKey.startsWith('keystone_')) {
        trackAchStat('treeKeystonesAllocated');
    }
}

// Tracks achievements related to the three God nodes individually and collectively
function _ptTrackGodNodeAchievements(statKey) {
    if (statKey === 'god_of_statistics') trackAchStat('treeGodStatisticsAllocated');
    if (statKey === 'god_of_math') trackAchStat('treeGodMathAllocated');
    if (statKey === 'god_of_probabilities') trackAchStat('treeGodProbabilitiesAllocated');

    if (typeof setAchStat !== 'function') return;

    // Count how many of the three God nodes are currently allocated
    const godsOwned = ['god_of_statistics', 'god_of_math', 'god_of_probabilities']
        .filter(k => ptHasSkill(k)).length;
    setAchStat('treeAllGodsAllocated', godsOwned);
}

// Tracks the keystone-duo achievement (2+ keystones active simultaneously)
function _ptTrackKeystoneAchievements(alloc) {
    if (typeof setAchStat !== 'function') return;

    const keystoneCount = [...alloc].filter(nodeId => {
        const key = _ptGetSkillStatKey(nodeId);
        return key && key.startsWith('keystone_');
    }).length;

    if (keystoneCount >= 2) {
        trackAchStat('treeKeystoneDuoActive');
    }
}

// Tracks completion of the three main class branches (Statistician, Mathmagician, Probabilist)
// and the cross-branch Lucky tile build achievement
function _ptTrackBranchCompletions(allocatedKeys) {
    if (typeof setAchStat === 'function') {
        if ([...PT_BRANCH_STATISTICIAN].every(k => allocatedKeys.has(k))) {
            setAchStat('treeStatisticianBranchComplete', 1);
        }
        if ([...PT_BRANCH_MATHMAGICIAN].every(k => allocatedKeys.has(k))) {
            setAchStat('treeMathmagicianBranchComplete', 1);
        }
        if ([...PT_BRANCH_PROBABILIST].every(k => allocatedKeys.has(k))) {
            setAchStat('treeProbabilistBranchComplete', 1);
        }
    }

    // Lucky tile build requires a specific cross-branch set of nodes
    if (PT_LUCKY_BUILD_KEYS.every(k => allocatedKeys.has(k))) {
        trackAchStat('treeLuckyBuildActive');
    }
}

// Sets an achievement to 1 if all keys in the cluster are present in allocatedKeys
function _ptCheckCluster(keys, statName, allocatedKeys) {
    if (keys.every(k => allocatedKeys.has(k))) {
        if (typeof setAchStat === 'function') setAchStat(statName, 1);
    }
}

// Iterates PT_CLUSTER_CHECKS and fires any clusters that are now fully allocated
function _ptTrackClusterCompletions(allocatedKeys) {
    for (const [keys, statName] of PT_CLUSTER_CHECKS) {
        _ptCheckCluster(keys, statName, allocatedKeys);
    }
}

// Updates the outer-rim node count achievement (tracks how many outer-rim nodes are allocated)
function _ptTrackOuterRimCount(allocatedKeys) {
    if (typeof setAchStat !== 'function') return;
    const count = [...PT_OUTER_RIM_KEYS].filter(k => allocatedKeys.has(k)).length;
    setAchStat('treeOuterRimNodes', count);
}

// Master dispatcher — runs all achievement checks after a node is allocated.
// Requires trackAchStat to be available; bails silently if it is not.
function _ptTrackAllocationAchievements(nodeId, alloc) {
    if (typeof trackAchStat !== 'function') return;

    const statKey = _ptGetSkillStatKey(nodeId);
    const allocatedKeys = _ptGetAllAllocatedStatKeys();

    _ptTrackSimpleAchievements(statKey);
    _ptTrackGodNodeAchievements(statKey);
    _ptTrackKeystoneAchievements(alloc);
    _ptTrackBranchCompletions(allocatedKeys);
    _ptTrackClusterCompletions(allocatedKeys);
    _ptTrackOuterRimCount(allocatedKeys);
}




//------------------------------------------------------------------------
//----------CLICK HANDLER — ALLOCATION AND DEALLOCATION------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Handles the deallocation path when the player clicks an already-allocated node.
// Returns true if deallocation succeeded so the caller can exit early.
function _ptHandleDeallocation(id, alloc) {
    if (!_ptIsDeallocatable(id)) return false;

    alloc.delete(id);
    _ptRefundPoint();
    save();
    _ptRefreshAllStyles();

    if (typeof trackAchStat === 'function') {
        trackAchStat('treeNodesDeallocated');
    }
    return true;
}

// Handles the allocation path when the player clicks an unallocated node.
function _ptHandleAllocation(id, alloc) {
    alloc.add(id);
    _ptSpendPoint();
    STATE.passiveTreeLastNode = id;
    save();
    _ptRefreshAllStyles();
    _ptTrackAllocationAchievements(id, alloc);
}

// Entry point called when the player clicks any passive tree node.
// Routes to deallocation or allocation depending on the node's current state.
function _ptOnNodeClick(id) {
    const alloc = _ptAllocated();

    if (_ptIsAllocated(id)) {
        _ptHandleDeallocation(id, alloc);
        return;
    }

    if (!_ptIsUnlockable(id)) return;
    if (_ptPoints() < 1) return;

    _ptHandleAllocation(id, alloc);
}




//------------------------------------------------------------------------
//---------------------VISUAL STATE QUERY--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Used by passive-tree-ui.js to determine which colour set to apply to a node.
// Returns one of: 'allocated' | 'unlockable' | 'locked'
function _ptGetNodeVisualState(id) {
    if (_ptIsAllocated(id)) return 'allocated';
    if (_ptIsUnlockable(id)) return 'unlockable';
    return 'locked';
}




//------------------------------------------------------------------------
//-------------------PUBLIC SKILL QUERY----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns true if the player has allocated a node whose statKey matches the given key.
// This is the main public API used by the rest of the game to check passive bonuses.
//
// Example:  if (ptHasSkill('tutor_enable')) { ... }
function ptHasSkill(statKey) {
    // Treeless modifier: treat all nodes as unallocated
    if (typeof isTreeless === 'function' && isTreeless()) return false;

    // Ensure the skill map is populated before querying it
    if (!_pt_skills.length && typeof TALENT_TREE_DATA !== 'undefined') {
        PT.loadInline(TALENT_TREE_DATA);
    }

    const alloc = _ptAllocated();
    for (const id of alloc) {
        if (_ptGetSkillStatKey(id) === statKey) return true;
    }
    return false;
}