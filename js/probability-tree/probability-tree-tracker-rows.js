//------------------------------------------------------------------------
//-------------------TRACKER ROW DEFINITIONS------------------------------
//------------------------------------------------------------------------
// What each tracker row shows: countdown timers, fill counters, stacked bonuses
// and the passive-summary rows, plus the list of rows active for the current
// passive tree.
//------------------------------------------------------------------------

import { t } from '../translation/translations.js';
import { _overfittingGetPhase } from './probability-tree-special-nodes-logic.js';
import { ptHasSkill } from './probability-tree-state-points.js';
import { _state, INTERVAL_RANDOM_WALK, _getPoissonInterval, INTERVAL_TIMED_STASIS, INTERVAL_LOLN } from './probability-tree-tracker-state.js';

//------------------------------------------------------------------------
//-------------------ROW DEFINITIONS: COUNTDOWN TIMERS-------------------
//------------------------------------------------------------------------

// Each function below returns a row definition object if the relevant
// passive(s) are active, or null if not. The caller filters out nulls.

function _getRowRandomWalk() {
    if (!ptHasSkill('keystone_random_walk')) return null;
    return {
        id: 'random_walk',
        icon: '🚶',
        label: t('pt_row_random_walk'),
        type: 'countdown',
        current: _state.randomWalkTimer,
        max: INTERVAL_RANDOM_WALK,
        tooltip: t('pt_tip_random_walk'),
        color: '#e8a020',
    };
}

function _getRowPoissonProcess() {
    if (!ptHasSkill('poisson_process_1')) return null;
    const interval = _getPoissonInterval();
    return {
        id: 'poisson',
        icon: '⚗️',
        label: t('pt_row_poisson_process'),
        type: 'countdown',
        current: _state.poissonTimer,
        max: interval,
        tooltip: t('pt_tip_poisson').replace('{n}', interval),
        color: '#66fcf1',
    };
}

function _getRowTimedStasis() {
    if (!ptHasSkill('timed_stasis_1')) return null;
    let duration = 1;
    if (ptHasSkill('timed_stasis_2')) duration += 0.5;
    if (ptHasSkill('timed_stasis_3')) duration += 0.5;
    return {
        id: 'timed_stasis',
        icon: '⏸️',
        label: t('pt_row_timed_stasis'),
        type: 'countdown',
        current: _state.timedStasisTimer,
        max: INTERVAL_TIMED_STASIS,
        tooltip: t('pt_tip_timed_stasis').replace('{n}', duration),
        color: '#a0c8ff',
    };
}

function _getRowLawOfLargeNumbers() {
    if (!ptHasSkill('keystone_law_of_large_numbers')) return null;
    return {
        id: 'loln',
        icon: '📉',
        label: t('pt_row_loln'),
        type: 'countdown',
        current: _state.lawOfLargeNumbersTimer,
        max: INTERVAL_LOLN,
        tooltip: t('pt_tip_loln'),
        color: '#c8a0ff',
    };
}

function _getRowEmergencyScan() {
    if (!ptHasSkill('emergency_scan_1')) return null;
    let duration = 2;
    if (ptHasSkill('emergency_scan_2')) duration += 1;
    if (ptHasSkill('emergency_scan_3')) duration += 2;
    // Counts down with the level timer until the 5-minute threshold is reached.
    const fired = !!window._emergencyScanFired;
    const secsLeft = fired ? 0 : Math.max(0, Math.min(300, (typeof globalThis.timerSecs === 'number' ? globalThis.timerSecs : 300)));
    return {
        id: 'emerg_scan',
        icon: '🚨',
        label: t('pt_row_emergency_scan'),
        type: 'countdown',
        current: secsLeft,
        max: 300,
        tooltip: fired
            ? t('pt_tip_emergency_scan_done')
            : t('pt_tip_emergency_scan').replace('{n}', duration),
        color: fired ? '#8888a0' : '#ff9060',
    };
}

//------------------------------------------------------------------------
//-------------------ROW DEFINITIONS: FILL COUNTERS----------------------
//------------------------------------------------------------------------

function _getRowBinomialBurst() {
    if (!ptHasSkill('binomial_burst_1')) return null;
    let chance = 20;
    if (ptHasSkill('binomial_burst_2')) chance += 10;
    if (ptHasSkill('binomial_burst_3')) chance += 20;
    return {
        id: 'binomial',
        icon: '💢',
        label: t('pt_row_binomial_burst'),
        type: 'fill_counter',
        current: _state.binomialBurstFills % 10,
        max: 10,
        tooltip: t('pt_tip_binomial').replace('{n}', chance),
        color: '#ff9060',
    };
}

function _getRowSampleEfficiency() {
    if (!ptHasSkill('sample_efficiency_1')) return null;
    let threshold = 20;
    if (ptHasSkill('sample_efficiency_2')) threshold -= 2;
    if (ptHasSkill('sample_efficiency_3')) threshold -= 3;
    return {
        id: 'sample_eff',
        icon: '📈',
        label: t('pt_row_sample_efficiency'),
        type: 'fill_counter',
        current: _state.sampleEffFills,
        max: threshold,
        tooltip: t('pt_tip_sample_efficiency').replace('{n}', threshold),
        color: '#6dbf40',
    };
}

function _getRowStreakBonus() {
    if (!ptHasSkill('streak_bonus_1')) return null;
    let bonus = 15;
    if (ptHasSkill('streak_bonus_2')) bonus += 5;
    if (ptHasSkill('streak_bonus_3')) bonus += 10;
    return {
        id: 'streak',
        icon: '🔥',
        label: t('pt_row_focused_momentum'),
        type: 'fill_counter',
        current: _state.streakBonusFills,
        max: 15,
        tooltip: t('pt_tip_focused_momentum').replace('{n}', bonus),
        color: '#ffb830',
    };
}

function _getRowGamblersRuin() {
    if (!ptHasSkill('keystone_gamblers_ruin')) return null;
    return {
        id: 'gamblers',
        icon: '🎰',
        label: t('pt_row_gamblers_ruin'),
        type: 'fill_counter',
        current: _state.gamblersFills,
        max: 20,
        noReset: true,
        showCount: true,
        tooltip: t('pt_tip_gamblers_ruin'),
        color: '#e8a020',
    };
}

function _getRowErrorFeedback() {
    if (!ptHasSkill('standard_deviation_1')) return null;
    const threshold = 3;
    // Reveal count: 2 cells with standard_deviation_3, otherwise 1.
    const revealCount = ptHasSkill('standard_deviation_3') ? 2 : 1;
    return {
        id: 'error_feedback',
        icon: '📏',
        label: t('pt_row_error_feedback'),
        type: 'fill_counter',
        current: _state.errorFeedbackMistakes % threshold,
        max: threshold,
        tooltip: t('pt_tip_error_feedback').replace('{a}', threshold).replace('{b}', revealCount),
        color: '#ff6080',
    };
}

//------------------------------------------------------------------------
//-------------------ROW DEFINITIONS: STACKED BONUSES--------------------
//------------------------------------------------------------------------

function _getRowBayesianAdjustment() {
    if (!ptHasSkill('bayesian_update_1') && !ptHasSkill('bayesian_update_2') && !ptHasSkill('bayesian_update_3')) return null;
    return {
        id: 'bayesian',
        icon: '🔃',
        label: t('pt_row_bayesian_adjustment'),
        type: 'stacked_bonus',
        current: _state.bayesianBonus,
        max: 100,
        unit: '%',
        tooltip: t('pt_tip_bayesian_adjustment'),
        color: '#d4b870',
    };
}

function _getRowAsymptoticMastery() {
    if (!ptHasSkill('keystone_asymptotic_mastery')) return null;
    const lines = window._asymptoticLinesCompleted || 0;
    const reduction = lines * 5;
    return {
        id: 'asymptotic',
        icon: '♾️',
        label: t('pt_row_asymptotic_mastery'),
        type: 'stacked_bonus',
        current: lines,
        max: null,
        unit: t('pt_unit_lines'),
        tooltip: t('pt_tip_asymptotic_mastery').replace('{a}', lines).replace('{b}', reduction),
        color: '#ff6080',
    };
}

//------------------------------------------------------------------------
//-------------------ROW DEFINITIONS: DYNAMIC SUMMARY ROWS---------------
//------------------------------------------------------------------------
// These rows show their current state visually (color / warn flag) but
// do not have a numeric bar - they use the summary dot style.

function _getRowOverfitting() {
    if (!ptHasSkill('keystone_overfitting')) return null;
    // Fetch the current phase from the game module if available.
    const phase = typeof _overfittingGetPhase === 'function' ? _overfittingGetPhase() : 'free';
    const isHardMode = phase === 'hard';
    const isNormal = phase === 'normal';
    let tooltip;
    if (isHardMode) {
        tooltip = t('pt_tip_overfitting_hard');
    } else if (isNormal) {
        tooltip = t('pt_tip_overfitting_normal');
    } else {
        tooltip = t('pt_tip_overfitting_free');
    }
    return {
        id: 'overfitting',
        icon: '📉',
        label: t('pt_row_overfitting'),
        type: 'summary',
        tooltip,
        // Color flips green → amber → red as the phases advance.
        color: isHardMode ? '#ff6080' : isNormal ? '#e8a020' : '#6dbf40',
        warn: isHardMode,
    };
}

//------------------------------------------------------------------------
//-------------------ROW DEFINITIONS: PASSIVE SUMMARIES------------------
//------------------------------------------------------------------------
// Static summary rows: these don't track a live counter but remind the
// player which passive modifiers are affecting the current level.

function _getSummaryMomentum() {
    const hasMomentum = ptHasSkill('chain_reaction') || ptHasSkill('precise_momentum')
        || ptHasSkill('exponential_growth') || ptHasSkill('god_of_statistics');
    if (!hasMomentum) return null;

    const bonusParts = [];
    if (ptHasSkill('chain_reaction')) bonusParts.push(t('pt_momentum_plus1'));
    if (ptHasSkill('precise_momentum')) bonusParts.push(t('pt_momentum_plus2'));
    if (ptHasSkill('exponential_growth')) bonusParts.push(t('pt_momentum_stack'));
    if (ptHasSkill('god_of_statistics')) bonusParts.push(t('pt_momentum_double'));

    // Penalty description depends on which damage-reduction passives are active.
    const hasBoth = ptHasSkill('learning_from_mistakes') && ptHasSkill('mistakes_no_matter');
    const hasEither = ptHasSkill('learning_from_mistakes') || ptHasSkill('mistakes_no_matter');
    const penalty = hasBoth ? '−10' : hasEither ? '−12' : t('pt_momentum_penalty_reset');

    return {
        id: 'momentum',
        icon: '⚡',
        label: t('pt_row_momentum'),
        type: 'summary',
        tooltip: t('pt_tip_momentum').replace('{a}', bonusParts.join(', ')).replace('{b}', penalty),
        color: '#6dbf40',
    };
}

function _getSummaryShieldBoost() {
    if (!ptHasSkill('reinforced_shield') && !ptHasSkill('fortified_shield') && !ptHasSkill('frozen_resilience')) return null;

    const extraAbsorb = (ptHasSkill('reinforced_shield') ? 1 : 0) + (ptHasSkill('fortified_shield') ? 1 : 0);
    const parts = [];
    if (extraAbsorb > 0) parts.push(t('pt_shield_boost_absorb').replace('{n}', extraAbsorb));
    if (ptHasSkill('frozen_resilience')) parts.push(t('pt_shield_boost_frozen'));

    return {
        id: 'shield_boost',
        icon: '🛡️',
        label: t('pt_row_shield_boost'),
        type: 'summary',
        tooltip: parts.join('<br>'),
        color: '#a0c8ff',
    };
}

function _getSummaryBayesianInsight() {
    const hasAny = ptHasSkill('prior_knowledge') || ptHasSkill('updated_beliefs')
        || ptHasSkill('posterior_insight') || ptHasSkill('convergent_evidence')
        || ptHasSkill('god_of_probabilities');
    if (!hasAny) return null;

    const marks = (ptHasSkill('prior_knowledge') ? 1 : 0)
        + (ptHasSkill('updated_beliefs') ? 1 : 0)
        + (ptHasSkill('posterior_insight') ? 1 : 0)
        + (ptHasSkill('convergent_evidence') ? 1 : 0);

    let reveals = ptHasSkill('confirmed_hypothesis') ? 1 : 0;
    if (ptHasSkill('god_of_probabilities')) reveals++;

    const revealPart = reveals > 0 ? ' ' + t('pt_bayesian_insight_reveals').replace('{n}', reveals) : '';

    return {
        id: 'bayesian_insight',
        icon: '🧪',
        label: t('pt_row_bayesian_insight'),
        type: 'summary',
        tooltip: t('pt_tip_bayesian_insight').replace('{n}', marks).replace('{extra}', revealPart),
        color: '#66fcf1',
    };
}

function _getSummaryConfidenceInterval() {
    if (!ptHasSkill('confidence_interval_1')) return null;
    let secs = 1;
    if (ptHasSkill('confidence_interval_2')) secs++;
    if (ptHasSkill('confidence_interval_3')) secs++;
    return {
        id: 'conf_interval',
        icon: '📐',
        label: t('pt_row_confidence_interval'),
        type: 'summary',
        tooltip: t('pt_tip_confidence_interval').replace('{n}', secs),
        color: '#a0c8ff',
    };
}

function _getSummaryPatternMomentum() {
    if (!ptHasSkill('regression_reward_1')) return null;
    let time = 5;
    if (ptHasSkill('regression_reward_2')) time += 5;
    if (ptHasSkill('regression_reward_3')) time += 5;
    return {
        id: 'pattern_momentum',
        icon: '📉',
        label: t('pt_row_pattern_momentum'),
        type: 'summary',
        tooltip: t('pt_tip_pattern_momentum').replace('{n}', time),
        color: '#6dbf40',
    };
}

function _getSummaryResidualAnalysis() {
    if (!ptHasSkill('residual_analysis_1')) return null;
    let chance = 10;
    if (ptHasSkill('residual_analysis_2')) chance += 5;
    if (ptHasSkill('residual_analysis_3')) chance += 10;
    return {
        id: 'residual',
        icon: '🔄',
        label: t('pt_row_residual_analysis'),
        type: 'summary',
        tooltip: t('pt_tip_residual_analysis').replace('{n}', chance),
        color: '#66fcf1',
    };
}

// --- Keystone summary rows (simple on/off, no scaling) ---

function _getSummaryVeilOfPurity() {
    if (!ptHasSkill('keystone_veil_of_purity')) return null;
    return {
        id: 'veil_purity', icon: '✨', label: t('pt_row_veil_of_purity'), type: 'summary',
        tooltip: t('pt_tip_veil_of_purity'), color: '#d4b870'
    };
}

function _getSummaryBlindingTruth() {
    if (!ptHasSkill('keystone_blinding_truth')) return null;
    return {
        id: 'blinding_truth', icon: '💡', label: t('pt_row_blinding_truth'), type: 'summary',
        tooltip: t('pt_tip_blinding_truth'), color: '#ffb830'
    };
}

function _getSummaryApexCollector() {
    if (!ptHasSkill('keystone_apex_collector')) return null;
    return {
        id: 'apex_collector', icon: '🌟', label: t('pt_row_apex_collector'), type: 'summary',
        tooltip: t('pt_tip_apex_collector'), color: '#d4b870'
    };
}

function _getSummaryIronDoctrine() {
    if (!ptHasSkill('keystone_iron_doctrine')) return null;
    return {
        id: 'iron_doctrine', icon: '⚔️', label: t('pt_row_iron_doctrine'), type: 'summary', warn: true,
        tooltip: t('pt_tip_iron_doctrine'), color: '#ff6080'
    };
}

function _getSummaryCurseEmbrace() {
    if (!ptHasSkill('keystone_curse_embrace')) return null;
    return {
        id: 'curse_embrace', icon: '👁️', label: t('pt_row_curse_embrace'), type: 'summary',
        tooltip: t('pt_tip_curse_embrace'), color: '#c080ff'
    };
}

function _getSummaryInterquartileVision() {
    if (!ptHasSkill('interquartile_vision_1')) return null;
    let duration = 2;
    if (ptHasSkill('interquartile_vision_2')) duration += 1;
    if (ptHasSkill('interquartile_vision_3')) duration += 1;
    return {
        id: 'iqv', icon: '🔭', label: t('pt_row_interquartile_vision'), type: 'summary',
        tooltip: t('pt_tip_interquartile_vision').replace('{n}', duration), color: '#88aaff'
    };
}

function _getSummaryCovarianceShift() {
    if (!ptHasSkill('covariance_shift_1')) return null;
    let extra = 0;
    if (ptHasSkill('covariance_shift_2')) extra += 1;
    if (ptHasSkill('covariance_shift_3')) extra += 1;
    return {
        id: 'covariance', icon: '🔗', label: t('pt_row_covariance_shift'), type: 'summary',
        tooltip: t('pt_tip_covariance_shift').replace('{n}', 1 + extra), color: '#66fcf1'
    };
}

function _getSummaryEntropyDrain() {
    if (!ptHasSkill('keystone_entropy_drain')) return null;
    return {
        id: 'entropy_drain', icon: '🌡️', label: t('pt_row_entropy_drain'), type: 'summary', warn: true,
        tooltip: t('pt_tip_entropy_drain'), color: '#ff6080'
    };
}

function _getSummaryCountdownCrisis() {
    if (!ptHasSkill('keystone_countdown_crisis')) return null;
    return {
        id: 'countdown_crisis', icon: '⚡', label: t('pt_row_countdown_crisis'), type: 'summary', warn: true,
        tooltip: t('pt_tip_countdown_crisis'), color: '#ff9060'
    };
}

function _getSummaryStochasticResonance() {
    if (!ptHasSkill('keystone_stochastic_resonance')) return null;
    return {
        id: 'stochastic_res', icon: '〰️', label: t('pt_row_stochastic_resonance'), type: 'summary',
        tooltip: t('pt_tip_stochastic_resonance'), color: '#66fcf1'
    };
}

function _getSummaryNullHypothesis() {
    if (!ptHasSkill('keystone_null_hypothesis')) return null;
    return {
        id: 'null_hyp', icon: '🔬', label: t('pt_row_null_hypothesis'), type: 'summary', warn: true,
        tooltip: t('pt_tip_null_hypothesis'), color: '#ff9060'
    };
}

function _getSummaryVarianceCollapse() {
    if (!ptHasSkill('keystone_variance_collapse')) return null;
    return {
        id: 'variance_collapse', icon: '💥', label: t('pt_row_variance_collapse'), type: 'summary', warn: true,
        tooltip: t('pt_tip_variance_collapse'), color: '#e8a020'
    };
}

function _getSummaryTheOracle() {
    if (!ptHasSkill('keystone_the_oracle')) return null;
    return {
        id: 'oracle', icon: '👁️', label: t('pt_row_the_oracle'), type: 'summary', warn: true,
        tooltip: t('pt_tip_the_oracle'), color: '#c080ff'
    };
}

function _getSummaryMaximumLikelihood() {
    if (!ptHasSkill('keystone_maximum_likelihood')) return null;
    return {
        id: 'max_likelihood', icon: '🏔️', label: t('pt_row_maximum_likelihood'), type: 'summary', warn: true,
        tooltip: t('pt_tip_maximum_likelihood'), color: '#ff6080'
    };
}

function _getSummarySignalToNoise() {
    if (!ptHasSkill('keystone_signal_to_noise')) return null;
    return {
        id: 'signal_noise', icon: '📡', label: t('pt_row_signal_to_noise'), type: 'summary',
        tooltip: t('pt_tip_signal_to_noise'), color: '#a0c8ff'
    };
}

function _getSummaryDeadReckoning() {
    if (!ptHasSkill('keystone_dead_reckoning')) return null;
    return {
        id: 'dead_reckoning', icon: '🧭', label: t('pt_row_dead_reckoning'), type: 'summary',
        tooltip: t('pt_tip_dead_reckoning'), color: '#d4b870'
    };
}

function _getSummaryFrequentistsBurden() {
    if (!ptHasSkill('keystone_frequentists_burden')) return null;
    return {
        id: 'freq_burden', icon: '📜', label: t('pt_row_frequentists_burden'), type: 'summary',
        tooltip: t('pt_tip_frequentists_burden'), color: '#c080ff'
    };
}

function _getSummarySparsePrior() {
    if (!ptHasSkill('keystone_sparse_prior')) return null;
    return {
        id: 'sparse_prior', icon: '🫥', label: t('pt_row_sparse_prior'), type: 'summary',
        tooltip: t('pt_tip_sparse_prior'), color: '#a0c8ff'
    };
}

function _getSummaryErgodicField() {
    if (!ptHasSkill('keystone_ergodic_field')) return null;
    return {
        id: 'ergodic', icon: '🌊', label: t('pt_row_ergodic_field'), type: 'summary', warn: true,
        tooltip: t('pt_tip_ergodic_field'), color: '#66fcf1'
    };
}

function _getSummaryDegreesOfFreedom() {
    if (!ptHasSkill('keystone_degrees_of_freedom')) return null;
    return {
        id: 'dof', icon: '🎛️', label: t('pt_row_degrees_of_freedom'), type: 'summary',
        tooltip: t('pt_tip_degrees_of_freedom'), color: '#d4b870'
    };
}

function _getSummaryAdjacencyMatrix() {
    if (!ptHasSkill('adjacency_matrix')) return null;
    return {
        id: 'adj_matrix', icon: '🔢', label: t('pt_row_adjacency_matrix'), type: 'summary',
        tooltip: t('pt_tip_adjacency_matrix'), color: '#66fcf1'
    };
}

//------------------------------------------------------------------------
//-------------------ACTIVE ROW AGGREGATION-------------------------------
//------------------------------------------------------------------------

// Collects all passive summaries (static informational rows) into one array.
// Each helper returns a row definition or null; nulls are filtered out.
function _buildSummaryRows() {
    return [
        _getSummaryMomentum(),
        _getSummaryShieldBoost(),
        _getSummaryBayesianInsight(),
        _getSummaryConfidenceInterval(),
        _getSummaryPatternMomentum(),
        _getSummaryResidualAnalysis(),
        _getSummaryVeilOfPurity(),
        _getSummaryBlindingTruth(),
        _getSummaryApexCollector(),
        _getSummaryIronDoctrine(),
        _getSummaryCurseEmbrace(),
        _getSummaryCountdownCrisis(),
        _getSummaryStochasticResonance(),
        _getSummaryNullHypothesis(),
        _getSummaryVarianceCollapse(),
        _getSummaryTheOracle(),
        _getSummaryMaximumLikelihood(),
        _getSummarySignalToNoise(),
        _getSummaryDeadReckoning(),
        _getSummaryFrequentistsBurden(),
        _getSummarySparsePrior(),
        _getSummaryErgodicField(),
        _getSummaryDegreesOfFreedom(),
        _getSummaryAdjacencyMatrix(),
        _getSummaryInterquartileVision(),
        _getSummaryCovarianceShift(),
        _getSummaryEntropyDrain(),
    ].filter(Boolean);
}

// Returns the full ordered list of row definitions that should currently
// be visible in the panel. Sections appear in this order:
//   1. Countdown timers
//   2. Fill counters
//   3. Stacked bonuses
//   4. Dynamic summary rows (state-dependent appearance)
//   5. Static passive summaries
export function _getActiveRows() {
    return [
        // - Countdown timers -
        _getRowRandomWalk(),
        _getRowPoissonProcess(),
        _getRowTimedStasis(),
        _getRowLawOfLargeNumbers(),
        _getRowEmergencyScan(),

        // - Fill counters -
        _getRowBinomialBurst(),
        _getRowSampleEfficiency(),
        _getRowStreakBonus(),
        _getRowGamblersRuin(),
        _getRowErrorFeedback(),

        // - Stacked bonuses -
        _getRowBayesianAdjustment(),
        _getRowAsymptoticMastery(),

        // - Dynamic summary rows -
        _getRowOverfitting(),

        // - Static passive summaries -
        ..._buildSummaryRows(),
    ].filter(Boolean);
}

