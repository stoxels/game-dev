// ============================================================
//  audio-data.js  —  Static audio registries (BGM + SFX)
// ============================================================
//  Pure data, no logic. Loaded before audio.js, which reads
//  these as globals (same pattern as item-definitions.js / item-pool.js,
//  quests-data.js / quests-logic.js, etc.)
//
//  Structure:
//    1. BGM Track Registry
//    2. Level → Track Mapping
//    3. World → Track Fallback
//    4. SFX Registry
// ============================================================

//------------------------------------------------------------------------
//-------------------BGM TRACK REGISTRY------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps internal track keys to their audio file paths.
// All BGM files must live in the /audio/bgm/ folder next to index.html.
// Add new tracks here and then reference them in LEVEL_BGM below.

const BGM_TRACKS = {
    // Special / UI tracks
    title: 'audio/bgm/bgm_title.mp3',
    convergence: 'audio/bgm/bgm_convergence.mp3',

    // World 1
    level_1_1: 'audio/bgm/bgm_1.mp3',
    level_1_2: 'audio/bgm/bgm_1.mp3',
    level_1_3: 'audio/bgm/bgm_1.mp3',
    level_1_4: 'audio/bgm/bgm_2.mp3',
    level_1_5: 'audio/bgm/bgm_2.mp3',
    level_1_6: 'audio/bgm/bgm_2.mp3',
    level_1_7: 'audio/bgm/bgm_3.mp3',
    level_1_8: 'audio/bgm/bgm_3.mp3',
    level_1_9: 'audio/bgm/bgm_3.mp3',
    level_1_10: 'audio/bgm/bgm_4.mp3',
    level_1_11: 'audio/bgm/bgm_4.mp3',
    level_1_12: 'audio/bgm/bgm_4.mp3',
    level_1_13: 'audio/bgm/bgm_5.mp3',

    // World 2
    level_2_1: 'audio/bgm/bgm_5.mp3',
    level_2_2: 'audio/bgm/bgm_5.mp3',
    level_2_3: 'audio/bgm/bgm_6.mp3',
    level_2_4: 'audio/bgm/bgm_6.mp3',
    level_2_5: 'audio/bgm/bgm_6.mp3',
    level_2_6: 'audio/bgm/bgm_7.mp3',
    level_2_7: 'audio/bgm/bgm_7.mp3',
    level_2_8: 'audio/bgm/bgm_7.mp3',
    level_2_9: 'audio/bgm/bgm_8.mp3',
    level_2_10: 'audio/bgm/bgm_8.mp3',
    level_2_11: 'audio/bgm/bgm_8.mp3',

    // World 3
    level_3_1: 'audio/bgm/bgm_9.mp3',
    level_3_2: 'audio/bgm/bgm_9.mp3',
    level_3_3: 'audio/bgm/bgm_9.mp3',
    level_3_4: 'audio/bgm/bgm_10.mp3',
    level_3_5: 'audio/bgm/bgm_10.mp3',
    level_3_6: 'audio/bgm/bgm_10.mp3',
    level_3_7: 'audio/bgm/bgm_11.mp3',
    level_3_8: 'audio/bgm/bgm_11.mp3',
    level_3_9: 'audio/bgm/bgm_11.mp3',
    level_3_10: 'audio/bgm/bgm_12.mp3',
    level_3_11: 'audio/bgm/bgm_12.mp3',

    // World 4
    level_4_1: 'audio/bgm/bgm_12.mp3',
    level_4_2: 'audio/bgm/bgm_13.mp3',
    level_4_3: 'audio/bgm/bgm_13.mp3',
    level_4_4: 'audio/bgm/bgm_13.mp3',
    level_4_5: 'audio/bgm/bgm_14.mp3',
    level_4_6: 'audio/bgm/bgm_14.mp3',
    level_4_7: 'audio/bgm/bgm_14.mp3',
    level_4_8: 'audio/bgm/bgm_15.mp3',
    level_4_9: 'audio/bgm/bgm_15.mp3',
    level_4_10: 'audio/bgm/bgm_15.mp3',
    level_4_11: 'audio/bgm/bgm_16.mp3',
    level_4_12: 'audio/bgm/bgm_16.mp3',
    level_4_13: 'audio/bgm/bgm_16.mp3',
    level_4_14: 'audio/bgm/bgm_17.mp3',
    level_4_15: 'audio/bgm/bgm_17.mp3',
    level_4_16: 'audio/bgm/bgm_17.mp3',
    level_4_17: 'audio/bgm/bgm_18.mp3',
    level_4_18: 'audio/bgm/bgm_18.mp3',
    level_4_19: 'audio/bgm/bgm_18.mp3',

    // World 5
    level_5_1: 'audio/bgm/bgm_19.mp3',
    level_5_2: 'audio/bgm/bgm_19.mp3',
    level_5_3: 'audio/bgm/bgm_19.mp3',
    level_5_4: 'audio/bgm/bgm_20.mp3',
    level_5_5: 'audio/bgm/bgm_20.mp3',
    level_5_6: 'audio/bgm/bgm_20.mp3',
    level_5_7: 'audio/bgm/bgm_21.mp3',
    level_5_8: 'audio/bgm/bgm_21.mp3',
    level_5_9: 'audio/bgm/bgm_21.mp3',
    level_5_10: 'audio/bgm/bgm_22.mp3',
    level_5_11: 'audio/bgm/bgm_22.mp3',
    level_5_12: 'audio/bgm/bgm_22.mp3',
    level_5_13: 'audio/bgm/bgm_23.mp3',

    // World 6
    level_6_1: 'audio/bgm/bgm_23.mp3',
    level_6_2: 'audio/bgm/bgm_23.mp3',
    level_6_3: 'audio/bgm/bgm_24.mp3',
    level_6_4: 'audio/bgm/bgm_24.mp3',
    level_6_5: 'audio/bgm/bgm_24.mp3',
    level_6_6: 'audio/bgm/bgm_25.mp3',
    level_6_7: 'audio/bgm/bgm_25.mp3',
    level_6_8: 'audio/bgm/bgm_25.mp3',
    level_6_9: 'audio/bgm/bgm_26.mp3',
    level_6_10: 'audio/bgm/bgm_26.mp3',
    level_6_11: 'audio/bgm/bgm_26.mp3',
    level_6_12: 'audio/bgm/bgm_27.mp3',

    // World 7
    level_7_1: 'audio/bgm/bgm_27.mp3',
    level_7_2: 'audio/bgm/bgm_27.mp3',
    level_7_3: 'audio/bgm/bgm_28.mp3',
    level_7_4: 'audio/bgm/bgm_28.mp3',
    level_7_5: 'audio/bgm/bgm_28.mp3',
    level_7_6: 'audio/bgm/bgm_29.mp3',
    level_7_7: 'audio/bgm/bgm_29.mp3',
    level_7_8: 'audio/bgm/bgm_29.mp3',
    level_7_9: 'audio/bgm/bgm_30.mp3',
    level_7_10: 'audio/bgm/bgm_30.mp3',
    level_7_11: 'audio/bgm/bgm_30.mp3',
    level_7_12: 'audio/bgm/bgm_31.mp3',

    // World 8
    level_8_1: 'audio/bgm/bgm_31.mp3',
    level_8_2: 'audio/bgm/bgm_31.mp3',
    level_8_3: 'audio/bgm/bgm_32.mp3',
    level_8_4: 'audio/bgm/bgm_32.mp3',
    level_8_5: 'audio/bgm/bgm_32.mp3',
    level_8_6: 'audio/bgm/bgm_33.mp3',
    level_8_7: 'audio/bgm/bgm_33.mp3',
    level_8_8: 'audio/bgm/bgm_33.mp3',
    level_8_9: 'audio/bgm/bgm_34.mp3',

    // World 9
    level_9_1: 'audio/bgm/bgm_34.mp3',
    level_9_2: 'audio/bgm/bgm_34.mp3',
    level_9_3: 'audio/bgm/bgm_35.mp3',
    level_9_4: 'audio/bgm/bgm_35.mp3',
    level_9_5: 'audio/bgm/bgm_35.mp3',
    level_9_6: 'audio/bgm/bgm_36.mp3',
    level_9_7: 'audio/bgm/bgm_36.mp3',
    level_9_8: 'audio/bgm/bgm_36.mp3',
    level_9_9: 'audio/bgm/bgm_37.mp3',
    level_9_10: 'audio/bgm/bgm_37.mp3',
    level_9_11: 'audio/bgm/bgm_37.mp3',
    level_9_12: 'audio/bgm/bgm_38.mp3',
    level_9_13: 'audio/bgm/bgm_38.mp3',
    level_9_14: 'audio/bgm/bgm_38.mp3',
    level_9_15: 'audio/bgm/bgm_39.mp3',
    level_9_16: 'audio/bgm/bgm_39.mp3',

    // World 10
    level_10_1: 'audio/bgm/bgm_40.mp3',
    level_10_2: 'audio/bgm/bgm_40.mp3',
    level_10_3: 'audio/bgm/bgm_40.mp3',
    level_10_4: 'audio/bgm/bgm_41.mp3',
    level_10_5: 'audio/bgm/bgm_41.mp3',
    level_10_6: 'audio/bgm/bgm_41.mp3',
    level_10_7: 'audio/bgm/bgm_42.mp3',
    level_10_8: 'audio/bgm/bgm_42.mp3',
    level_10_9: 'audio/bgm/bgm_42.mp3',
    level_10_10: 'audio/bgm/bgm_43.mp3',
    level_10_11: 'audio/bgm/bgm_43.mp3',
    level_10_12: 'audio/bgm/bgm_43.mp3',

    // World 11
    level_11_1: 'audio/bgm/bgm_44.mp3',
    level_11_2: 'audio/bgm/bgm_44.mp3',
    level_11_3: 'audio/bgm/bgm_44.mp3',
    level_11_4: 'audio/bgm/bgm_45.mp3',
    level_11_5: 'audio/bgm/bgm_45.mp3',
    level_11_6: 'audio/bgm/bgm_45.mp3',
    level_11_7: 'audio/bgm/bgm_46.mp3',
    level_11_8: 'audio/bgm/bgm_46.mp3',
    level_11_9: 'audio/bgm/bgm_46.mp3',
    level_11_10: 'audio/bgm/bgm_47.mp3',
    level_11_11: 'audio/bgm/bgm_47.mp3',
};


//------------------------------------------------------------------------
//-------------------LEVEL → TRACK MAPPING----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps 'world-level' strings to a BGM_TRACKS key.
// If a level has no entry here, trackForLevel() falls back to WORLD_BGM,
// then finally to 'world1' as a last resort.

const LEVEL_BGM = {
    // World 1
    '1-1': 'level_1_1', '1-2': 'level_1_2', '1-3': 'level_1_3',
    '1-4': 'level_1_4', '1-5': 'level_1_5', '1-6': 'level_1_6',
    '1-7': 'level_1_7', '1-8': 'level_1_8', '1-9': 'level_1_9',
    '1-10': 'level_1_10', '1-11': 'level_1_11', '1-12': 'level_1_12',
    '1-13': 'level_1_13',

    // World 2
    '2-1': 'level_2_1', '2-2': 'level_2_2', '2-3': 'level_2_3',
    '2-4': 'level_2_4', '2-5': 'level_2_5', '2-6': 'level_2_6',
    '2-7': 'level_2_7', '2-8': 'level_2_8', '2-9': 'level_2_9',
    '2-10': 'level_2_10', '2-11': 'level_2_11',

    // World 3
    '3-1': 'level_3_1', '3-2': 'level_3_2', '3-3': 'level_3_3',
    '3-4': 'level_3_4', '3-5': 'level_3_5', '3-6': 'level_3_6',
    '3-7': 'level_3_7', '3-8': 'level_3_8', '3-9': 'level_3_9',
    '3-10': 'level_3_10', '3-11': 'level_3_11',

    // World 4
    '4-1': 'level_4_1', '4-2': 'level_4_2', '4-3': 'level_4_3',
    '4-4': 'level_4_4', '4-5': 'level_4_5', '4-6': 'level_4_6',
    '4-7': 'level_4_7', '4-8': 'level_4_8', '4-9': 'level_4_9',
    '4-10': 'level_4_10', '4-11': 'level_4_11', '4-12': 'level_4_12',
    '4-13': 'level_4_13', '4-14': 'level_4_14', '4-15': 'level_4_15',
    '4-16': 'level_4_16', '4-17': 'level_4_17', '4-18': 'level_4_18',
    '4-19': 'level_4_19',

    // World 5
    '5-1': 'level_5_1', '5-2': 'level_5_2', '5-3': 'level_5_3',
    '5-4': 'level_5_4', '5-5': 'level_5_5', '5-6': 'level_5_6',
    '5-7': 'level_5_7', '5-8': 'level_5_8', '5-9': 'level_5_9',
    '5-10': 'level_5_10', '5-11': 'level_5_11', '5-12': 'level_5_12',
    '5-13': 'level_5_13',

    // World 6
    '6-1': 'level_6_1', '6-2': 'level_6_2', '6-3': 'level_6_3',
    '6-4': 'level_6_4', '6-5': 'level_6_5', '6-6': 'level_6_6',
    '6-7': 'level_6_7', '6-8': 'level_6_8', '6-9': 'level_6_9',
    '6-10': 'level_6_10', '6-11': 'level_6_11', '6-12': 'level_6_12',

    // World 7
    '7-1': 'level_7_1', '7-2': 'level_7_2', '7-3': 'level_7_3',
    '7-4': 'level_7_4', '7-5': 'level_7_5', '7-6': 'level_7_6',
    '7-7': 'level_7_7', '7-8': 'level_7_8', '7-9': 'level_7_9',
    '7-10': 'level_7_10', '7-11': 'level_7_11', '7-12': 'level_7_12',

    // World 8
    '8-1': 'level_8_1', '8-2': 'level_8_2', '8-3': 'level_8_3',
    '8-4': 'level_8_4', '8-5': 'level_8_5', '8-6': 'level_8_6',
    '8-7': 'level_8_7', '8-8': 'level_8_8', '8-9': 'level_8_9',

    // World 9
    '9-1': 'level_9_1', '9-2': 'level_9_2', '9-3': 'level_9_3',
    '9-4': 'level_9_4', '9-5': 'level_9_5', '9-6': 'level_9_6',
    '9-7': 'level_9_7', '9-8': 'level_9_8', '9-9': 'level_9_9',
    '9-10': 'level_9_10', '9-11': 'level_9_11', '9-12': 'level_9_12',
    '9-13': 'level_9_13', '9-14': 'level_9_14', '9-15': 'level_9_15',
    '9-16': 'level_9_16',

    // World 10
    '10-1': 'level_10_1', '10-2': 'level_10_2', '10-3': 'level_10_3',
    '10-4': 'level_10_4', '10-5': 'level_10_5', '10-6': 'level_10_6',
    '10-7': 'level_10_7', '10-8': 'level_10_8', '10-9': 'level_10_9',
    '10-10': 'level_10_10', '10-11': 'level_10_11', '10-12': 'level_10_12',

    // World 11
    '11-1': 'level_11_1', '11-2': 'level_11_2', '11-3': 'level_11_3',
    '11-4': 'level_11_4', '11-5': 'level_11_5', '11-6': 'level_11_6',
    '11-7': 'level_11_7', '11-8': 'level_11_8', '11-9': 'level_11_9',
    '11-10': 'level_11_10', '11-11': 'level_11_11',
};


//------------------------------------------------------------------------
//-------------------WORLD → TRACK FALLBACK---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Fallback BGM per world number, used when a level has no LEVEL_BGM entry.
// Uncomment and set a BGM_TRACKS key for each world as needed.

const WORLD_BGM = {
    1: 'world1',
    //2: 'world2',
    //3: 'world3',
    //4: 'world4',
    //5: 'world5',
    //6: 'world6',
};


//------------------------------------------------------------------------
//-------------------SFX REGISTRY-------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps SFX keys to their audio file paths.
// Keys are used with playSFX(key) and stopSFX(key) throughout the game.

const SFX = {
    // ── UI ───────────────────────────────────────────────
    click: 'audio/sfx/ui/sfx_click.mp3',
    back: 'audio/sfx/ui/sfx_back.mp3',
    button: 'audio/sfx/ui/sfx_button.mp3',
    showtoast: 'audio/sfx/ui/sfx_showtoast.mp3',
    questRewardClaimed: 'audio/sfx/ui/sfx_quest_reward_claimed.mp3',

    // ── Puzzle Feedback ──────────────────────────────────
    cellFill: 'audio/sfx/puzzle/sfx_cell_fill.mp3',
    cellMark: 'audio/sfx/puzzle/sfx_cell_mark.mp3',
    cellWrong: 'audio/sfx/puzzle/sfx_wrong.mp3',
    win: 'audio/sfx/puzzle/sfx_win.mp3',
    lose: 'audio/sfx/puzzle/sfx_lose.mp3',

    // ── Quiz & Mathgate ──────────────────────────────────
    quizCorrect: 'audio/sfx/puzzle/sfx_quiz_correct.mp3',
    quizWrong: 'audio/sfx/puzzle/sfx_quiz_wrong.mp3',
    tutorSuccess: 'audio/sfx/puzzle/sfx_tutor_success.mp3',
    tutorFail: 'audio/sfx/puzzle/sfx_tutor_fail.mp3',

    // ── Items ────────────────────────────────────────────
    candle: 'audio/sfx/items/sfx_candle.mp3',
    magnifier: 'audio/sfx/items/sfx_magnifier.mp3',
    spyglass: 'audio/sfx/items/sfx_spyglass.mp3',
    scanner: 'audio/sfx/items/sfx_scanner.mp3',
    eraser: 'audio/sfx/items/sfx_eraser.mp3',
    sweeper: 'audio/sfx/items/sfx_sweeper.mp3',
    magnet: 'audio/sfx/items/sfx_magnet.mp3',
    error_gem: 'audio/sfx/items/sfx_error_gem.mp3',
    hourglass: 'audio/sfx/items/sfx_hourglass.mp3',
    stopwatch: 'audio/sfx/items/sfx_stopwatch.mp3',
    clock: 'audio/sfx/items/sfx_clock.mp3',
    chronobolt: 'audio/sfx/items/sfx_chronobolt.mp3',
    shield: 'audio/sfx/items/sfx_shield.mp3',
    time_freeze: 'audio/sfx/items/sfx_time_freeze.mp3',
    tutor: 'audio/sfx/items/sfx_tutor.mp3',
    professor: 'audio/sfx/items/sfx_professor.mp3',
    scholar: 'audio/sfx/items/sfx_scholar.mp3',
    grand_mentor: 'audio/sfx/items/sfx_grand_mentor.mp3',
    scouts_primer: 'audio/sfx/items/sfx_scouts_primer.mp3',
    set_square: 'audio/sfx/items/sfx_set_square.mp3',
    ruler: 'audio/sfx/items/sfx_ruler.mp3',
    codex_of_completion: 'audio/sfx/items/sfx_codex_of_completion.mp3',
    cursed_lens: 'audio/sfx/items/sfx_cursed_lens.mp3',
    cursed_clock: 'audio/sfx/items/sfx_cursed_clock.mp3',
    demon_eye: 'audio/sfx/items/sfx_demon_eye.mp3',
    tidal_wave: 'audio/sfx/items/sfx_tidal_wave.mp3',
    vortex: 'audio/sfx/items/sfx_vortex.mp3',
    chaos_grid: 'audio/sfx/items/sfx_chaos_grid.mp3',
    pearl_of_haste: 'audio/sfx/items/sfx_pearl_of_haste.mp3',
    pearl_of_swiftness: 'audio/sfx/items/sfx_pearl_of_swiftness.mp3',
    grand_pearl: 'audio/sfx/items/sfx_grand_pearl.mp3',
    the_witch: 'audio/sfx/items/sfx_the_witch.mp3',
    golden_clock: 'audio/sfx/items/sfx_golden_clock.mp3',
    shadow_seal: 'audio/sfx/items/sfx_shadow_seal.mp3',
    shield_break: 'audio/sfx/items/sfx_shield_break.mp3',

    // ── Class Selection / Upgrade ────────────────────────
    classSelection: 'audio/sfx/classes/sfx_class_selection.mp3',
    classSelected: 'audio/sfx/classes/sfx_class_selected.mp3',
    classUpgraded: 'audio/sfx/classes/sfx_class_upgraded.mp3',

    // ── Base Class Abilities ─────────────────────────────
    momentum: 'audio/sfx/classes/sfx_momentum.mp3',
    dataStrike: 'audio/sfx/classes/sfx_data_strike.mp3',
    diagonalStrike: 'audio/sfx/classes/sfx_diagonal_strike.mp3',
    diagonalStrikeRepeat: 'audio/sfx/classes/sfx_diagonal_strike_repeat_proc.mp3',
    varianceShield: 'audio/sfx/classes/sfx_variance_shield.mp3',
    arcaneReveal: 'audio/sfx/classes/sfx_arcane_reveal.mp3',
    absoluteZero: 'audio/sfx/classes/sfx_absolute_zero.mp3',
    bayesianInsight: 'audio/sfx/classes/sfx_bayesian_insight.mp3',
    fieldScan: 'audio/sfx/classes/sfx_field_scan.mp3',
    precisionMark: 'audio/sfx/classes/sfx_precision_mark.mp3',

    // ── Ascendancy: Random Walker ────────────────────────
    browneySummon: 'audio/sfx/classes/sfx_browney_summon.mp3',
    browneyReveal: 'audio/sfx/classes/sfx_browney_reveal.mp3',
    drifterSummon: 'audio/sfx/classes/sfx_drifter_summon.mp3',
    drifterBark: 'audio/sfx/classes/sfx_drifter_bark.mp3',
    drifterFinal: 'audio/sfx/classes/sfx_drifter_final.mp3',
    drifterPoop: 'audio/sfx/classes/sfx_drifter_poop.mp3',
    drifterExplosion: 'audio/sfx/classes/sfx_drifter_explosion.mp3',
    drifterLevelUp: 'audio/sfx/classes/sfx_drifter_level_up.mp3',

    // ── Ascendancy: Recursionist ─────────────────────────
    residualSummon: 'audio/sfx/classes/sfx_residual_summon.mp3',
    residualDespawn: 'audio/sfx/classes/sfx_residual_despawn.mp3',
    residualReveal: 'audio/sfx/classes/sfx_residual_reveal.mp3',
    dofBurn: 'audio/sfx/classes/sfx_dof_burn.mp3',

    // ── Ascendancy: Bayesian ─────────────────────────────
    bayesTrapSelect: 'audio/sfx/classes/sfx_bayes_traps_select.mp3',
    bayesTrapExplosion: 'audio/sfx/classes/sfx_bayes_traps_explosion.mp3',
    type1errorShieldBreak: 'audio/sfx/classes/sfx_type1error_shield_break.mp3',
    type1errorShieldHide: 'audio/sfx/classes/sfx_type1error_shield_hide.mp3',

    // ── Ascendancy: Markovian ────────────────────────────
    stateReversal: 'audio/sfx/classes/sfx_state_reversal.mp3',
    transitionMatrix: 'audio/sfx/classes/sfx_transition_matrix.mp3',
    transitionCascade: 'audio/sfx/classes/sfx_transition_cascade.mp3',

    // ── Ascendancy: Outlaw ───────────────────────────────
    tailRiskResolve: 'audio/sfx/classes/sfx_tail_risk_resolve.mp3',
    tailRiskStart: 'audio/sfx/classes/sfx_tail_risk_start.mp3',
    speedforceEnter: 'audio/sfx/classes/sfx_speedforce_enter.mp3',

    // ── Ascendancy: Actuary ──────────────────────────────
    holyHealing: 'audio/sfx/classes/sfx_holy_healing.mp3',
    holySpell: 'audio/sfx/classes/sfx_holy_spell.mp3',
    actuary_mistake_reversed: 'audio/sfx/classes/sfx_actuary_mistake_reversed.mp3',
    actuary_shield_pop: 'audio/sfx/classes/sfx_actuary_shield_pop.mp3',

    // ── Achievements / Milestones ────────────────────────
    achievement: 'audio/sfx/achievements/sfx_achievement.mp3',
    convergence: 'audio/sfx/achievements/sfx_convergence.mp3',
    milestone: 'audio/sfx/achievements/sfx_milestone.mp3',
    abilityReady: 'audio/sfx/achievements/sfx_ability_ready.mp3',

    // ── Passive Tree Effects ─────────────────────────────
    luckyTileActivate: 'audio/sfx/passive/sfx_lucky_tile_activate.mp3',
    binomial_burst: 'audio/sfx/passive/sfx_binomial_burst.mp3',
    poisson_process: 'audio/sfx/passive/sfx_poisson_process.mp3',
    residual_analysis: 'audio/sfx/passive/sfx_residual_analysis.mp3',
    standard_deviation: 'audio/sfx/passive/sfx_standard_deviation.mp3',
    overfitting_alert: 'audio/sfx/passive/sfx_overfitting_alert.mp3',
    sample_efficiency: 'audio/sfx/passive/sfx_sample_efficiency.mp3',
    sample_efficiency_pop: 'audio/sfx/passive/sfx_sample_efficiency_pop.mp3',
    stochastic_resonance: 'audio/sfx/passive/sfx_stochastic_resonance.mp3',
    stochastic_resonance_pop: 'audio/sfx/passive/sfx_stochastic_resonance_pop.mp3',

    // --- Characters ---
    syla_nature: 'audio/sfx/characters/sfx_syla_nature.mp3',

    // --- Endgame ---
    // ── Endgame: base combat feedback ──────────────
    player_damage_taken: 'audio/sfx/endgame/sfx_player_damage_taken.mp3',
    player_shield_damage_taken: 'audio/sfx/endgame/sfx_player_shield_damage_taken.mp3',
    heart_heals: 'audio/sfx/endgame/sfx_heart_heals.mp3',
    heart_destroyed: 'audio/sfx/endgame/sfx_heart_destroyed.mp3',
    mana_pickup: 'audio/sfx/endgame/sfx_mana_pickup.wav',
    player_equip_pickup: 'audio/sfx/endgame/sfx_player_equip_pickup.mp3',
    player_equip_not_pickup: 'audio/sfx/endgame/sfx_player_equip_not_pickup.mp3',
    player_defeated: 'audio/sfx/endgame/sfx_player_defeated.mp3',

    // ── Endgame: menus & systems ───────────────────
    vendor_buy: 'audio/sfx/endgame/sfx_vendor_buy.wav',
    vendor_sell: 'audio/sfx/endgame/sfx_vendor_sell.wav',
    loot_filter_save: 'audio/sfx/endgame/sfx_loot_filter_save.wav',
    craft_apply: 'audio/sfx/endgame/sfx_craft_apply.wav',

    // ── Endgame: items & loot ──────────────────────
    currency_pickup: 'audio/sfx/endgame/sfx_currency_pickup.wav',
    essence_pickup: 'audio/sfx/endgame/sfx_essence_pickup.wav',
    map_pickup: 'audio/sfx/endgame/sfx_map_pickup.wav',
    item_claim_unique: 'audio/sfx/endgame/sfx_item_claim_unique.wav',
    loot_explosion: 'audio/sfx/endgame/sfx_loot_explosion.wav',
    level_up: 'audio/sfx/endgame/sfx_level_up.wav',

    // ── Endgame: combat layer ──────────────────────
    player_block: 'audio/sfx/endgame/sfx_player_block.wav',
    player_parry: 'audio/sfx/endgame/sfx_player_parry.wav',
    player_deflect: 'audio/sfx/endgame/sfx_player_deflect.wav',
    monster_kill: 'audio/sfx/endgame/sfx_monster_kill.wav',
    monster_swing: 'audio/sfx/endgame/sfx_monster_swing.wav',
    monster_shoot: 'audio/sfx/endgame/sfx_monster_shoot.wav',
    hazard_spawn: 'audio/sfx/endgame/sfx_hazard_spawn.wav',
    ailment_apply: 'audio/sfx/endgame/sfx_ailment_apply.wav',
    // Elemental ailment variants — chosen per key via _egAilmentSfxKey()
    ailment_fire: 'audio/sfx/endgame/sfx_ailment_fire.wav',
    ailment_cold: 'audio/sfx/endgame/sfx_ailment_cold.wav',
    ailment_lightning: 'audio/sfx/endgame/sfx_ailment_lightning.wav',
    ailment_shadow: 'audio/sfx/endgame/sfx_ailment_shadow.wav',
    shadow_veil_lift: 'audio/sfx/endgame/sfx_shadow_veil_lift.wav',
    puzzle_fire: 'audio/sfx/endgame/sfx_puzzle_fire.wav',
    puzzle_cold: 'audio/sfx/endgame/sfx_puzzle_cold.wav',
    puzzle_lightning: 'audio/sfx/endgame/sfx_puzzle_lightning.wav',
    puzzle_shadow: 'audio/sfx/endgame/sfx_puzzle_shadow.wav',
    puzzle_arcane: 'audio/sfx/endgame/sfx_puzzle_arcane.wav',
    puzzle_arcane_blast: 'audio/sfx/endgame/sfx_puzzle_arcane_blast.wav',
    ailment_arcane: 'audio/sfx/endgame/sfx_ailment_arcane.wav',
    ailment_dot_tick: 'audio/sfx/endgame/sfx_ailment_dot_tick.wav',
    ailment_dot_tick_fire: 'audio/sfx/endgame/sfx_ailment_dot_tick_fire.wav',
    ailment_dot_tick_shadow: 'audio/sfx/endgame/sfx_ailment_dot_tick_shadow.wav',
    ailment_dot_tick_monster: 'audio/sfx/endgame/sfx_ailment_dot_tick_monster.wav',
    ailment_dot_end: 'audio/sfx/endgame/sfx_ailment_dot_end.wav',
    ground_fire_tick: 'audio/sfx/endgame/sfx_ground_fire_tick.wav',

    // ── Endgame: bosses ────────────────────────────
    boss_roar: 'audio/sfx/endgame/sfx_boss_roar.wav',
    boss_phase_shift: 'audio/sfx/endgame/sfx_boss_phase_shift.wav',
    // Dedicated wide-swing sweep for boss cleaves (was a placeholder
    // reusing the diagonal-strike sound)
    cleave: 'audio/sfx/endgame/sfx_boss_cleave_sweep.wav',

};