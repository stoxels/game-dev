// ============================================================
//  audio.js  —  Sound effects and background music manager
// ============================================================
//  Structure:
//    1. Volume & State Variables
//    2. BGM Track Registry
//    3. Level → Track Mapping
//    4. SFX Registry
//    5. SFX Preload Cache
//    6. BGM Helper Functions
//    7. BGM Playback Functions
//    8. SFX Playback Functions
//    9. Volume & Toggle Controls
//   10. Public API
// ============================================================

// test

const Audio_Manager = (() => {

    //------------------------------------------------------------------------
    //-------------------VOLUME & STATE VARIABLES-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Default volume levels (0.0 – 1.0)
    let BGM_VOLUME = 0.4;
    let SFX_VOLUME = 0.7;

    // Master on/off switches — kept in sync with SETTINGS when available
    let bgmEnabled = true;
    let sfxEnabled = true;

    // Currently playing BGM track
    let currentBGM = null;   // active HTMLAudioElement
    let currentBGMSrc = '';     // file path of the active track (used for same-track guard)
    let _lastBGMKey = '';     // track key of the last requested BGM (used for resume after re-enable)

    // Holds the cleanup function that removes the autoplay-resume listeners,
    // so we can cancel them if a new track is requested before the user interacts.
    let _pendingResumeCleanup = null;

    // Stores the most recently played instance of each SFX key,
    // so individual sounds can be stopped via stopSFX(key).
    const _sfxInstances = {};


    //------------------------------------------------------------------------
    //-------------------BGM TRACK REGISTRY----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    // Maps internal track keys to their audio file paths.
    // All BGM files must live in the /audio/ folder next to index.html.
    // Add new tracks here and then reference them in LEVEL_BGM below.

    const BGM_TRACKS = {
        // Special / UI tracks
        title: 'audio/bgm_title.mp3',
        convergence: 'audio/bgm_convergence.mp3',

        // World 1
        level_1_1: 'audio/bgm_1.mp3',
        level_1_2: 'audio/bgm_1.mp3',
        level_1_3: 'audio/bgm_1.mp3',
        level_1_4: 'audio/bgm_2.mp3',
        level_1_5: 'audio/bgm_2.mp3',
        level_1_6: 'audio/bgm_2.mp3',
        level_1_7: 'audio/bgm_3.mp3',
        level_1_8: 'audio/bgm_3.mp3',
        level_1_9: 'audio/bgm_3.mp3',
        level_1_10: 'audio/bgm_4.mp3',
        level_1_11: 'audio/bgm_4.mp3',
        level_1_12: 'audio/bgm_4.mp3',
        level_1_13: 'audio/bgm_5.mp3',

        // World 2
        level_2_1: 'audio/bgm_5.mp3',
        level_2_2: 'audio/bgm_5.mp3',
        level_2_3: 'audio/bgm_6.mp3',
        level_2_4: 'audio/bgm_6.mp3',
        level_2_5: 'audio/bgm_6.mp3',
        level_2_6: 'audio/bgm_7.mp3',
        level_2_7: 'audio/bgm_7.mp3',
        level_2_8: 'audio/bgm_7.mp3',
        level_2_9: 'audio/bgm_8.mp3',
        level_2_10: 'audio/bgm_8.mp3',
        level_2_11: 'audio/bgm_8.mp3',

        // World 3
        level_3_1: 'audio/bgm_9.mp3',
        level_3_2: 'audio/bgm_9.mp3',
        level_3_3: 'audio/bgm_9.mp3',
        level_3_4: 'audio/bgm_10.mp3',
        level_3_5: 'audio/bgm_10.mp3',
        level_3_6: 'audio/bgm_10.mp3',
        level_3_7: 'audio/bgm_11.mp3',
        level_3_8: 'audio/bgm_11.mp3',
        level_3_9: 'audio/bgm_11.mp3',
        level_3_10: 'audio/bgm_12.mp3',
        level_3_11: 'audio/bgm_12.mp3',

        // World 4
        level_4_1: 'audio/bgm_12.mp3',
        level_4_2: 'audio/bgm_13.mp3',
        level_4_3: 'audio/bgm_13.mp3',
        level_4_4: 'audio/bgm_13.mp3',
        level_4_5: 'audio/bgm_14.mp3',
        level_4_6: 'audio/bgm_14.mp3',
        level_4_7: 'audio/bgm_14.mp3',
        level_4_8: 'audio/bgm_15.mp3',
        level_4_9: 'audio/bgm_15.mp3',
        level_4_10: 'audio/bgm_15.mp3',
        level_4_11: 'audio/bgm_16.mp3',
        level_4_12: 'audio/bgm_16.mp3',
        level_4_13: 'audio/bgm_16.mp3',
        level_4_14: 'audio/bgm_17.mp3',
        level_4_15: 'audio/bgm_17.mp3',
        level_4_16: 'audio/bgm_17.mp3',
        level_4_17: 'audio/bgm_18.mp3',
        level_4_18: 'audio/bgm_18.mp3',
        level_4_19: 'audio/bgm_18.mp3',

        // World 5
        level_5_1: 'audio/bgm_19.mp3',
        level_5_2: 'audio/bgm_19.mp3',
        level_5_3: 'audio/bgm_19.mp3',
        level_5_4: 'audio/bgm_20.mp3',
        level_5_5: 'audio/bgm_20.mp3',
        level_5_6: 'audio/bgm_20.mp3',
        level_5_7: 'audio/bgm_21.mp3',
        level_5_8: 'audio/bgm_21.mp3',
        level_5_9: 'audio/bgm_21.mp3',
        level_5_10: 'audio/bgm_22.mp3',
        level_5_11: 'audio/bgm_22.mp3',
        level_5_12: 'audio/bgm_22.mp3',
        level_5_13: 'audio/bgm_23.mp3',

        // World 6
        level_6_1: 'audio/bgm_23.mp3',
        level_6_2: 'audio/bgm_23.mp3',
        level_6_3: 'audio/bgm_24.mp3',
        level_6_4: 'audio/bgm_24.mp3',
        level_6_5: 'audio/bgm_24.mp3',
        level_6_6: 'audio/bgm_25.mp3',
        level_6_7: 'audio/bgm_25.mp3',
        level_6_8: 'audio/bgm_25.mp3',
        level_6_9: 'audio/bgm_26.mp3',
        level_6_10: 'audio/bgm_26.mp3',
        level_6_11: 'audio/bgm_26.mp3',
        level_6_12: 'audio/bgm_27.mp3',

        // World 7
        level_7_1: 'audio/bgm_27.mp3',
        level_7_2: 'audio/bgm_27.mp3',
        level_7_3: 'audio/bgm_28.mp3',
        level_7_4: 'audio/bgm_28.mp3',
        level_7_5: 'audio/bgm_28.mp3',
        level_7_6: 'audio/bgm_29.mp3',
        level_7_7: 'audio/bgm_29.mp3',
        level_7_8: 'audio/bgm_29.mp3',
        level_7_9: 'audio/bgm_30.mp3',
        level_7_10: 'audio/bgm_30.mp3',
        level_7_11: 'audio/bgm_30.mp3',
        level_7_12: 'audio/bgm_31.mp3',

        // World 8
        level_8_1: 'audio/bgm_31.mp3',
        level_8_2: 'audio/bgm_31.mp3',
        level_8_3: 'audio/bgm_32.mp3',
        level_8_4: 'audio/bgm_32.mp3',
        level_8_5: 'audio/bgm_32.mp3',
        level_8_6: 'audio/bgm_33.mp3',
        level_8_7: 'audio/bgm_33.mp3',
        level_8_8: 'audio/bgm_33.mp3',
        level_8_9: 'audio/bgm_34.mp3',

        // World 9
        level_9_1: 'audio/bgm_34.mp3',
        level_9_2: 'audio/bgm_34.mp3',
        level_9_3: 'audio/bgm_35.mp3',
        level_9_4: 'audio/bgm_35.mp3',
        level_9_5: 'audio/bgm_35.mp3',
        level_9_6: 'audio/bgm_36.mp3',
        level_9_7: 'audio/bgm_36.mp3',
        level_9_8: 'audio/bgm_36.mp3',
        level_9_9: 'audio/bgm_37.mp3',
        level_9_10: 'audio/bgm_37.mp3',
        level_9_11: 'audio/bgm_37.mp3',
        level_9_12: 'audio/bgm_38.mp3',
        level_9_13: 'audio/bgm_38.mp3',
        level_9_14: 'audio/bgm_38.mp3',
        level_9_15: 'audio/bgm_39.mp3',
        level_9_16: 'audio/bgm_39.mp3',

        // World 10
        level_10_1: 'audio/bgm_40.mp3',
        level_10_2: 'audio/bgm_40.mp3',
        level_10_3: 'audio/bgm_40.mp3',
        level_10_4: 'audio/bgm_41.mp3',
        level_10_5: 'audio/bgm_41.mp3',
        level_10_6: 'audio/bgm_41.mp3',
        level_10_7: 'audio/bgm_42.mp3',
        level_10_8: 'audio/bgm_42.mp3',
        level_10_9: 'audio/bgm_42.mp3',
        level_10_10: 'audio/bgm_43.mp3',
        level_10_11: 'audio/bgm_43.mp3',
        level_10_12: 'audio/bgm_43.mp3',

        // World 11
        level_11_1: 'audio/bgm_44.mp3',
        level_11_2: 'audio/bgm_44.mp3',
        level_11_3: 'audio/bgm_44.mp3',
        level_11_4: 'audio/bgm_45.mp3',
        level_11_5: 'audio/bgm_45.mp3',
        level_11_6: 'audio/bgm_45.mp3',
        level_11_7: 'audio/bgm_46.mp3',
        level_11_8: 'audio/bgm_46.mp3',
        level_11_9: 'audio/bgm_46.mp3',
        level_11_10: 'audio/bgm_47.mp3',
        level_11_11: 'audio/bgm_47.mp3',

    };


    //------------------------------------------------------------------------
    //-------------------LEVEL → TRACK MAPPING--------------------------------
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
    //-------------------SFX REGISTRY-----------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    // Maps SFX keys to their audio file paths.
    // Keys are used with playSFX(key) and stopSFX(key) throughout the game.

    const SFX = {
        // ── UI ───────────────────────────────────────────────
        click: 'audio/sfx_click.mp3',
        back: 'audio/sfx_back.mp3',
        button: 'audio/sfx_button.mp3',
        showtoast: 'audio/sfx_showtoast.mp3',

        // ── Puzzle Feedback ──────────────────────────────────
        cellFill: 'audio/sfx_cell_fill.mp3',
        cellMark: 'audio/sfx_cell_mark.mp3',
        cellWrong: 'audio/sfx_wrong.mp3',
        win: 'audio/sfx_win.mp3',
        lose: 'audio/sfx_lose.mp3',

        // ── Quiz & Mathgate ──────────────────────────────────
        quizCorrect: 'audio/sfx_quiz_correct.mp3',
        quizWrong: 'audio/sfx_quiz_wrong.mp3',
        tutorSuccess: 'audio/sfx_tutor_success.mp3',
        tutorFail: 'audio/sfx_tutor_fail.mp3',

        // ── Quest ────────────────────────────────────────────
        questRewardClaimed: 'audio/sfx_quest_reward_claimed.mp3',

        // ── Items ────────────────────────────────────────────
        candle: 'audio/sfx_candle.mp3',
        magnifier: 'audio/sfx_magnifier.mp3',
        spyglass: 'audio/sfx_spyglass.mp3',
        scanner: 'audio/sfx_scanner.mp3',
        eraser: 'audio/sfx_eraser.mp3',
        sweeper: 'audio/sfx_sweeper.mp3',
        magnet: 'audio/sfx_magnet.mp3',
        error_gem: 'audio/sfx_error_gem.mp3',
        hourglass: 'audio/sfx_hourglass.mp3',
        stopwatch: 'audio/sfx_stopwatch.mp3',
        clock: 'audio/sfx_clock.mp3',
        chronobolt: 'audio/sfx_chronobolt.mp3',
        shield: 'audio/sfx_shield.mp3',
        time_freeze: 'audio/sfx_time_freeze.mp3',
        tutor: 'audio/sfx_tutor.mp3',
        professor: 'audio/sfx_professor.mp3',
        scholar: 'audio/sfx_scholar.mp3',
        grand_mentor: 'audio/sfx_grand_mentor.mp3',
        scouts_primer: 'audio/sfx_scouts_primer.mp3',
        set_square: 'audio/sfx_set_square.mp3',
        ruler: 'audio/sfx_ruler.mp3',
        codex_of_completion: 'audio/sfx_codex_of_completion.mp3',
        cursed_lens: 'audio/sfx_cursed_lens.mp3',
        cursed_clock: 'audio/sfx_cursed_clock.mp3',
        demon_eye: 'audio/sfx_demon_eye.mp3',
        tidal_wave: 'audio/sfx_tidal_wave.mp3',
        vortex: 'audio/sfx_vortex.mp3',
        chaos_grid: 'audio/sfx_chaos_grid.mp3',
        pearl_of_haste: 'audio/sfx_pearl_of_haste.mp3',
        pearl_of_swiftness: 'audio/sfx_pearl_of_swiftness.mp3',
        grand_pearl: 'audio/sfx_grand_pearl.mp3',
        the_witch: 'audio/sfx_the_witch.mp3',
        golden_clock: 'audio/sfx_golden_clock.mp3',
        shadow_seal: 'audio/sfx_shadow_seal.mp3',
        shield_break: 'audio/sfx_shield_break.mp3',

        // ── Class Selection / Upgrade ────────────────────────
        classSelection: 'audio/sfx_class_selection.mp3',
        classSelected: 'audio/sfx_class_selected.mp3',
        classUpgraded: 'audio/sfx_class_upgraded.mp3',

        // ── Base Class Abilities ─────────────────────────────
        momentum: 'audio/sfx_momentum.mp3',
        dataStrike: 'audio/sfx_data_strike.mp3',
        diagonalStrike: 'audio/sfx_diagonal_strike.mp3',
        diagonalStrikeRepeat: 'audio/sfx_diagonal_strike_repeat_proc.mp3',
        varianceShield: 'audio/sfx_variance_shield.mp3',
        arcaneReveal: 'audio/sfx_arcane_reveal.mp3',
        absoluteZero: 'audio/sfx_absolute_zero.mp3',
        bayesianInsight: 'audio/sfx_bayesian_insight.mp3',
        fieldScan: 'audio/sfx_field_scan.mp3',
        precisionMark: 'audio/sfx_precision_mark.mp3',

        // ── Ascendancy: Random Walker ────────────────────────
        browneySummon: 'audio/sfx_browney_summon.mp3',
        browneyReveal: 'audio/sfx_browney_reveal.mp3',
        drifterSummon: 'audio/sfx_drifter_summon.mp3',
        drifterBark: 'audio/sfx_drifter_bark.mp3',
        drifterFinal: 'audio/sfx_drifter_final.mp3',
        drifterPoop: 'audio/sfx_drifter_poop.mp3',
        drifterExplosion: 'audio/sfx_drifter_explosion.mp3',
        drifterLevelUp: 'audio/sfx_drifter_level_up.mp3',

        // ── Ascendancy: Recursionist ─────────────────────────
        residualSummon: 'audio/sfx_residual_summon.mp3',
        residualDespawn: 'audio/sfx_residual_despawn.mp3',
        residualReveal: 'audio/sfx_residual_reveal.mp3',
        dofBurn: 'audio/sfx_dof_burn.mp3',

        // ── Ascendancy: Bayesian ─────────────────────────────
        bayesTrapSelect: 'audio/sfx_bayes_traps_select.mp3',
        bayesTrapExplosion: 'audio/sfx_bayes_traps_explosion.mp3',
        type1errorShieldBreak: 'audio/sfx_type1error_shield_break.mp3',
        type1errorShieldHide: 'audio/sfx_type1error_shield_hide.mp3',

        // ── Ascendancy: Markovian ────────────────────────────
        stateReversal: 'audio/sfx_state_reversal.mp3',
        transitionMatrix: 'audio/sfx_transition_matrix.mp3',
        transitionCascade: 'audio/sfx_transition_cascade.mp3',

        // ── Ascendancy: Outlaw ───────────────────────────────
        tailRiskResolve: 'audio/sfx_tail_risk_resolve.mp3',
        tailRiskStart: 'audio/sfx_tail_risk_start.mp3',
        speedforceEnter: 'audio/sfx_speedforce_enter.mp3',

        // ── Ascendancy: Actuary ──────────────────────────────
        holyHealing: 'audio/sfx_holy_healing.mp3',
        holySpell: 'audio/sfx_holy_spell.mp3',
        actuary_mistake_reversed: 'audio/sfx_actuary_mistake_reversed.mp3',
        actuary_shield_pop: 'audio/sfx_actuary_shield_pop.mp3',

        // ── Achievements / Milestones ────────────────────────
        achievement: 'audio/sfx_achievement.mp3',
        convergence: 'audio/sfx_convergence.mp3',
        milestone: 'audio/sfx_milestone.mp3',   
        abilityReady: 'audio/sfx_ability_ready.mp3',

        // ── Passive Tree Effects ─────────────────────────────
        luckyTileActivate: 'audio/sfx_lucky_tile_activate.mp3',
        binomial_burst: 'audio/sfx_binomial_burst.mp3',
        poisson_process: 'audio/sfx_poisson_process.mp3',
        residual_analysis: 'audio/sfx_residual_analysis.mp3',
        standard_deviation: 'audio/sfx_standard_deviation.mp3',
        overfitting_alert: 'audio/sfx_overfitting_alert.mp3',
        sample_efficiency: 'audio/sfx_sample_efficiency.mp3',
        sample_efficiency_pop: 'audio/sfx_sample_efficiency_pop.mp3',
        stochastic_resonance: 'audio/sfx_stochastic_resonance.mp3',
        stochastic_resonance_pop: 'audio/sfx_stochastic_resonance_pop.mp3',


        // --- Characters ---
        syla_nature: 'audio/sfx_syla_nature.mp3',


    };


    //------------------------------------------------------------------------
    //-------------------SFX PRELOAD CACHE------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------
    // Audio objects are created once at startup so the first playback of
    // any sound has no loading delay. playSFX() clones these cached objects.

    const _sfxCache = {};

    // Creates one Audio object per SFX entry and stores it in _sfxCache.
    // Call this once during game init (e.g. on the title screen).
    function preload() {
        Object.entries(SFX).forEach(([key, src]) => {
            const a = new Audio(src);
            a.preload = 'auto';
            _sfxCache[key] = a;
        });
    }


    //------------------------------------------------------------------------
    //-------------------BGM HELPER FUNCTIONS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Reads bgmEnabled from the global SETTINGS object if it exists.
    // This keeps the internal flag in sync even if SETTINGS was changed
    // without going through toggleBGM().
    function _syncBGMEnabledFromSettings() {
        if (typeof SETTINGS !== 'undefined') {
            bgmEnabled = SETTINGS.bgmEnabled;
        }
    }

    // Returns true if the given src is already playing as the active BGM track.
    function _isBGMAlreadyPlaying(src) {
        return currentBGMSrc === src && currentBGM && !currentBGM.paused;
    }

    // Creates a new looping Audio element for the given src,
    // sets its volume, and stores it as the active BGM track.
    function _createBGMAudioElement(src) {
        const audio = new Audio(src);
        audio.loop = true;
        audio.volume = BGM_VOLUME;
        currentBGM = audio;
        currentBGMSrc = src;
        return audio;
    }

    // Cancels the pending autoplay-resume event listeners if they exist.
    // Must be called before switching tracks so stale listeners don't fire.
    function _cancelPendingResumeListeners() {
        if (_pendingResumeCleanup) {
            _pendingResumeCleanup();
            _pendingResumeCleanup = null;
        }
    }

    // Registers click / keydown listeners that will retry audio.play() once
    // the user interacts with the page (required by browser autoplay policy).
    // Stores a cleanup function in _pendingResumeCleanup so it can be cancelled
    // if a new track is requested before the user interacts.
    function _registerAutoplayResumeListeners(audio) {
        const resume = () => {
            // Only resume if this audio element is still the active BGM track
            if (currentBGM === audio) {
                audio.play().catch(() => { });
            }
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
            _pendingResumeCleanup = null;
        };

        _pendingResumeCleanup = () => {
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };

        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
    }

    // Returns the track key for a given world and level number.
    // Priority: LEVEL_BGM entry → WORLD_BGM fallback → 'world1' last resort.
    function trackForLevel(worldNum, levelNum) {
        const levelKey = `${worldNum}-${levelNum}`;
        if (LEVEL_BGM[levelKey]) return LEVEL_BGM[levelKey];
        return WORLD_BGM[worldNum] || 'world1';
    }

    // Returns an array of all keys in BGM_TRACKS, optionally excluding
    // special tracks (title, convergence) that are not regular gameplay music.
    function _getAllBGMKeys(excludeSpecial = true) {
        const specialKeys = new Set(['title', 'convergence']);
        return Object.keys(BGM_TRACKS).filter(k => !excludeSpecial || !specialKeys.has(k));
    }


    //------------------------------------------------------------------------
    //-------------------BGM PLAYBACK FUNCTIONS-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Starts playing the BGM track identified by trackKey.
    // If the same track file is already playing, this is a no-op.
    // If BGM is disabled in SETTINGS or internally, the call is ignored.
    function playBGM(trackKey) {
        _syncBGMEnabledFromSettings();
        if (!bgmEnabled) return;

        const src = BGM_TRACKS[trackKey];
        if (!src) return;

        _lastBGMKey = trackKey;

        if (_isBGMAlreadyPlaying(src)) return;

        // Clean up any stale resume listeners before switching tracks
        _cancelPendingResumeListeners();
        stopBGM();

        const audio = _createBGMAudioElement(src);

        // Browser autoplay policy may block play() — register a fallback
        // that retries on the next user interaction if needed.
        audio.play().catch(() => {
            _registerAutoplayResumeListeners(audio);
        });
    }

    // Plays a random BGM track from BGM_TRACKS.
    // Pass excludeSpecial = false to also include title / convergence tracks.
    // Useful for menus, random events, or any context without a fixed track.
    function playRandomBGM(excludeSpecial = true) {
        const keys = _getAllBGMKeys(excludeSpecial);
        if (keys.length === 0) return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        playBGM(randomKey);
    }

    // Stops the current BGM with an optional fade-out.
    // fadeMs: duration of the linear fade in milliseconds (0 = instant stop).
    function stopBGM(fadeMs = 500) {
        if (!currentBGM) return;

        const dying = currentBGM;
        currentBGM = null;
        currentBGMSrc = '';

        if (fadeMs <= 0) {
            dying.pause();
            return;
        }

        // Tick every 50 ms and lower volume linearly until silence, then pause.
        const step = dying.volume / (fadeMs / 50);
        const fade = setInterval(() => {
            if (dying.volume > step) {
                dying.volume -= step;
            } else {
                dying.pause();
                clearInterval(fade);
            }
        }, 50);
    }


    //------------------------------------------------------------------------
    //-------------------SFX PLAYBACK FUNCTIONS-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Plays the sound effect identified by key.
    // Clones the preloaded Audio object so the same sound can overlap itself.
    // The played instance is stored in _sfxInstances so it can be stopped early.
    function playSFX(key) {
        if (!sfxEnabled) return;

        const src = SFX[key];
        if (!src) return;

        // Use the preloaded cache entry if available, otherwise create a fresh element
        const base = _sfxCache[key];
        const a = base ? base.cloneNode() : new Audio(src);
        a.volume = SFX_VOLUME;
        a.play().catch(() => { });

        // Keep track of the latest instance for this key so it can be cancelled
        _sfxInstances[key] = a;
    }

    // Immediately stops and resets the most recently played instance of the
    // given SFX key. Has no effect if the sound is not currently playing.
    function stopSFX(key) {
        const a = _sfxInstances[key];
        if (!a) return;

        a.pause();
        a.currentTime = 0;
        delete _sfxInstances[key];
    }


    //------------------------------------------------------------------------
    //-------------------VOLUME & TOGGLE CONTROLS-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Sets the BGM volume and applies it to the currently playing track.
    // Value is clamped to [0, 1].
    function setBGMVolume(v) {
        BGM_VOLUME = Math.max(0, Math.min(1, v));
        if (currentBGM) currentBGM.volume = BGM_VOLUME;
    }

    // Sets the SFX volume applied to all future playSFX() calls.
    // Value is clamped to [0, 1].
    function setSFXVolume(v) {
        SFX_VOLUME = Math.max(0, Math.min(1, v));
    }

    // Enables or disables BGM playback.
    // When re-enabling, resumes the last track that was requested via playBGM().
    function toggleBGM(enabled) {
        bgmEnabled = enabled;

        if (!bgmEnabled) {
            _cancelPendingResumeListeners();
            stopBGM(0);
        } else {
            if (_lastBGMKey) playBGM(_lastBGMKey);
        }
    }

    // Enables or disables SFX playback.
    // Does not affect sounds already in progress.
    function toggleSFX(enabled) {
        sfxEnabled = enabled;
    }


    //------------------------------------------------------------------------
    //-------------------PUBLIC API-------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    return {
        // BGM
        playBGM,
        playRandomBGM,
        stopBGM,
        trackForLevel,

        get lastBGMKey() { return _lastBGMKey; },

        // SFX
        playSFX,
        stopSFX,
        preload,

        // Volume & toggles
        toggleBGM,
        toggleSFX,
        setBGMVolume,
        setSFXVolume,
    };

})();