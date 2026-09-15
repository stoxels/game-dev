// ============================================================
//  audio-data.js  -  Static audio registries (BGM + SFX)
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
// Campaign BGM lives in /audio/bgm/, tutorial tracks in /audio/Tutorial/,
// boss themes in /audio/Boss_Music/ (all next to index.html).
// Add new tracks here and then reference them in LEVEL_BGM below.
//
// NOTE: campaign levels (level_*) now use boss music - each campaign level
// got its own boss track (round-robin over the sorted boss catalogue; only
// worlds 13-14 re-use a few tracks since there are 184 levels vs 167 tracks).
// The old bgm_1..bgm_47 files stay on disk as spares/fallbacks.

export const BGM_TRACKS = {
    // Special / UI tracks
    // 'title' is the NEW title screen music; 'overworld' is the OLD title
    // theme (bgm_title1), now playing on the level-selection overworld.
    title: 'audio/bgm/bgm_title2.ogg',
    overworld: 'audio/bgm/bgm_title1.ogg',
    convergence: 'audio/bgm/bgm_convergence.ogg',

    // Tutorial tracks (random one plays on tutorial entry)
    tutorial_1: 'audio/Tutorial/tutorial_1.ogg',
    tutorial_2: 'audio/Tutorial/tutorial_2.ogg',

    // ── Boss themes (one key per file; BOSS_BGM groups them per boss) ──
    boss_abyss_1: 'audio/Boss_Music/abyss_1.ogg',
    boss_abyss_2: 'audio/Boss_Music/abyss_2.ogg',
    boss_aegis_1: 'audio/Boss_Music/aegis_1.ogg',
    boss_aegis_2: 'audio/Boss_Music/aegis_2.ogg',
    boss_arbiter_1: 'audio/Boss_Music/arbiter_1.ogg',
    boss_arbiter_2: 'audio/Boss_Music/arbiter_2.ogg',
    boss_arbiter_3: 'audio/Boss_Music/arbiter_3.ogg',
    boss_architect_1: 'audio/Boss_Music/architect_1.ogg',
    boss_architect_2: 'audio/Boss_Music/architect_2.ogg',
    boss_barrage_1: 'audio/Boss_Music/barrage_1.ogg',
    boss_barrage_2: 'audio/Boss_Music/barrage_2.ogg',
    boss_barricade_1: 'audio/Boss_Music/barricade_1.ogg',
    boss_barricade_2: 'audio/Boss_Music/barricade_2.ogg',
    boss_bayes_1: 'audio/Boss_Music/bayes_1.ogg',
    boss_bayes_2: 'audio/Boss_Music/bayes_2.ogg',
    boss_belt_1: 'audio/Boss_Music/belt_1.ogg',
    boss_belt_2: 'audio/Boss_Music/belt_2.ogg',
    boss_bloom_1: 'audio/Boss_Music/bloom_1.ogg',
    boss_bloom_2: 'audio/Boss_Music/bloom_2.ogg',
    boss_bloom_3: 'audio/Boss_Music/bloom_3.ogg',
    boss_bomber_1: 'audio/Boss_Music/bomber_1.ogg',
    boss_bomber_2: 'audio/Boss_Music/bomber_2.ogg',
    boss_bumper_1: 'audio/Boss_Music/bumper_1.ogg',
    boss_bumper_2: 'audio/Boss_Music/bumper_2.ogg',
    boss_buzz_1: 'audio/Boss_Music/buzz_1.ogg',
    boss_buzz_2: 'audio/Boss_Music/buzz_2.ogg',
    boss_centipede_1: 'audio/Boss_Music/centipede_1.ogg',
    boss_centipede_2: 'audio/Boss_Music/centipede_2.ogg',
    boss_chaos_1: 'audio/Boss_Music/chaos_1.ogg',
    boss_chaos_2: 'audio/Boss_Music/chaos_2.ogg',
    boss_clock_1: 'audio/Boss_Music/clock_1.ogg',
    boss_clock_2: 'audio/Boss_Music/clock_2.ogg',
    boss_clock_3: 'audio/Boss_Music/clock_3.ogg',
    boss_coil_1: 'audio/Boss_Music/coil_1.ogg',
    boss_coil_2: 'audio/Boss_Music/coil_2.ogg',
    boss_coil_3: 'audio/Boss_Music/coil_3.ogg',
    boss_colossus_1: 'audio/Boss_Music/colossus_1.ogg',
    boss_colossus_2: 'audio/Boss_Music/colossus_2.ogg',
    boss_creeper_1: 'audio/Boss_Music/creeper_1.ogg',
    boss_cyclops_1: 'audio/Boss_Music/cyclops_1.ogg',
    boss_cyclops_2: 'audio/Boss_Music/cyclops_2.ogg',
    boss_dancer_1: 'audio/Boss_Music/dancer_1.ogg',
    boss_dancer_2: 'audio/Boss_Music/dancer_2.ogg',
    boss_demolitionist_1: 'audio/Boss_Music/demolitionist_1.ogg',
    boss_demolitionist_2: 'audio/Boss_Music/demolitionist_2.ogg',
    boss_dreadnought_1: 'audio/Boss_Music/dreadnought_1.ogg',
    boss_dreadnought_2: 'audio/Boss_Music/dreadnought_2.ogg',
    boss_duelist_1: 'audio/Boss_Music/duelist_1.ogg',
    boss_duelist_2: 'audio/Boss_Music/duelist_2.ogg',
    boss_dynamo_1: 'audio/Boss_Music/dynamo_1.ogg',
    boss_dynamo_2: 'audio/Boss_Music/dynamo_2.ogg',
    boss_eclipse_1: 'audio/Boss_Music/eclipse_1.ogg',
    boss_eclipse_2: 'audio/Boss_Music/eclipse_2.ogg',
    boss_ember_1: 'audio/Boss_Music/ember_1.ogg',
    boss_ember_2: 'audio/Boss_Music/ember_2.ogg',
    boss_encore_1: 'audio/Boss_Music/encore_1.ogg',
    boss_encore_2: 'audio/Boss_Music/encore_2.ogg',
    boss_entropy_1: 'audio/Boss_Music/entropy_1.ogg',
    boss_exarch_1: 'audio/Boss_Music/exarch_1.ogg',
    boss_exarch_2: 'audio/Boss_Music/exarch_2.ogg',
    boss_executioner_1: 'audio/Boss_Music/executioner_1.ogg',
    boss_executioner_2: 'audio/Boss_Music/executioner_2.ogg',
    boss_firefly_1: 'audio/Boss_Music/firefly_1.ogg',
    boss_firefly_2: 'audio/Boss_Music/firefly_2.ogg',
    boss_gale_1: 'audio/Boss_Music/gale_1.ogg',
    boss_gale_2: 'audio/Boss_Music/gale_2.ogg',
    boss_gambler_1: 'audio/Boss_Music/gambler_1.ogg',
    boss_gambler_2: 'audio/Boss_Music/gambler_2.ogg',
    boss_gambler_3: 'audio/Boss_Music/gambler_3.ogg',
    boss_gourmet_1: 'audio/Boss_Music/gourmet_1.ogg',
    boss_gourmet_2: 'audio/Boss_Music/gourmet_2.ogg',
    boss_gridlock_1: 'audio/Boss_Music/gridlock_1.ogg',
    boss_gridlock_2: 'audio/Boss_Music/gridlock_2.ogg',
    boss_guardian_1: 'audio/Boss_Music/guardian_1.ogg',
    boss_guardian_2: 'audio/Boss_Music/guardian_2.ogg',
    boss_gust_1: 'audio/Boss_Music/gust_1.ogg',
    boss_gust_2: 'audio/Boss_Music/gust_2.ogg',
    boss_hunter_1: 'audio/Boss_Music/hunter_1.ogg',
    boss_hunter_2: 'audio/Boss_Music/hunter_2.ogg',
    boss_inferno_1: 'audio/Boss_Music/inferno_1.ogg',
    boss_inferno_2: 'audio/Boss_Music/inferno_2.ogg',
    boss_jelly_1: 'audio/Boss_Music/jelly_1.ogg',
    boss_jelly_2: 'audio/Boss_Music/jelly_2.ogg',
    boss_jester_1: 'audio/Boss_Music/jester_1.ogg',
    boss_juggernaut_1: 'audio/Boss_Music/juggernaut_1.ogg',
    boss_juggernaut_2: 'audio/Boss_Music/juggernaut_2.ogg',
    boss_kraken_1: 'audio/Boss_Music/kraken_1.ogg',
    boss_kraken_2: 'audio/Boss_Music/kraken_2.ogg',
    boss_laplace_1: 'audio/Boss_Music/laplace_1.ogg',
    boss_laplace_2: 'audio/Boss_Music/laplace_2.ogg',
    boss_leviathan_1: 'audio/Boss_Music/leviathan_1.ogg',
    boss_leviathan_2: 'audio/Boss_Music/leviathan_2.ogg',
    boss_lodestone_1: 'audio/Boss_Music/lodestone_1.ogg',
    boss_lodestone_2: 'audio/Boss_Music/lodestone_2.ogg',
    boss_maelstrom_1: 'audio/Boss_Music/maelstrom_1.ogg',
    boss_maelstrom_2: 'audio/Boss_Music/maelstrom_2.ogg',
    boss_marksman_1: 'audio/Boss_Music/marksman_1.ogg',
    boss_marksman_2: 'audio/Boss_Music/marksman_2.ogg',
    boss_maven_1: 'audio/Boss_Music/maven_1.ogg',
    boss_maven_2: 'audio/Boss_Music/maven_2.ogg',
    boss_maze_1: 'audio/Boss_Music/maze_1.ogg',
    boss_mech_1: 'audio/Boss_Music/mech_1.ogg',
    boss_mech_2: 'audio/Boss_Music/mech_2.ogg',
    boss_medusa_1: 'audio/Boss_Music/medusa_1.ogg',
    boss_medusa_2: 'audio/Boss_Music/medusa_2.ogg',
    boss_minotaur_1: 'audio/Boss_Music/minotaur_1.ogg',
    boss_minotaur_2: 'audio/Boss_Music/minotaur_2.ogg',
    boss_monsoon_1: 'audio/Boss_Music/monsoon_1.ogg',
    boss_needle_1: 'audio/Boss_Music/needle_1.ogg',
    boss_nemesis_1: 'audio/Boss_Music/nemesis_1.ogg',
    boss_nemesis_2: 'audio/Boss_Music/nemesis_2.ogg',
    boss_nightmare_1: 'audio/Boss_Music/nightmare_1.ogg',
    boss_nightmare_2: 'audio/Boss_Music/nightmare_2.ogg',
    boss_null_1: 'audio/Boss_Music/null_1.ogg',
    boss_null_2: 'audio/Boss_Music/null_2.ogg',
    boss_oblivion_1: 'audio/Boss_Music/oblivion_1.ogg',
    boss_oblivion_2: 'audio/Boss_Music/oblivion_2.ogg',
    boss_overfitter_1: 'audio/Boss_Music/overfitter_1.ogg',
    boss_overfitter_2: 'audio/Boss_Music/overfitter_2.ogg',
    boss_phantom_1: 'audio/Boss_Music/phantom_1.ogg',
    boss_phantom_2: 'audio/Boss_Music/phantom_2.ogg',
    boss_puddle_1: 'audio/Boss_Music/puddle_1.ogg',
    boss_puddle_2: 'audio/Boss_Music/puddle_2.ogg',
    boss_razor_1: 'audio/Boss_Music/razor_1.ogg',
    boss_razor_2: 'audio/Boss_Music/razor_2.ogg',
    boss_seraph_1: 'audio/Boss_Music/seraph_1.ogg',
    boss_seraph_2: 'audio/Boss_Music/seraph_2.ogg',
    boss_shaper_1: 'audio/Boss_Music/shaper_1.ogg',
    boss_shaper_2: 'audio/Boss_Music/shaper_2.ogg',
    boss_shrine_1: 'audio/Boss_Music/shrine_1.ogg',
    boss_shrine_2: 'audio/Boss_Music/shrine_2.ogg',
    boss_siren_1: 'audio/Boss_Music/siren_1.ogg',
    boss_siren_2: 'audio/Boss_Music/siren_2.ogg',
    boss_siren_3: 'audio/Boss_Music/siren_3.ogg',
    boss_sirus_1: 'audio/Boss_Music/sirus_1.ogg',
    boss_sirus_2: 'audio/Boss_Music/sirus_2.ogg',
    boss_snail_1: 'audio/Boss_Music/snail_1.ogg',
    boss_snail_2: 'audio/Boss_Music/snail_2.ogg',
    boss_sprout_1: 'audio/Boss_Music/sprout_1.ogg',
    boss_sprout_2: 'audio/Boss_Music/sprout_2.ogg',
    boss_stack_1: 'audio/Boss_Music/stack_1.ogg',
    boss_stack_2: 'audio/Boss_Music/stack_2.ogg',
    boss_stormqueen_1: 'audio/Boss_Music/stormqueen_1.ogg',
    boss_stormqueen_2: 'audio/Boss_Music/stormqueen_2.ogg',
    boss_striker_1: 'audio/Boss_Music/striker_1.ogg',
    boss_striker_2: 'audio/Boss_Music/striker_2.ogg',
    boss_swarm_1: 'audio/Boss_Music/swarm_1.ogg',
    boss_swarm_2: 'audio/Boss_Music/swarm_2.ogg',
    boss_tactician_1: 'audio/Boss_Music/tactician_1.ogg',
    boss_tactician_2: 'audio/Boss_Music/tactician_2.ogg',
    boss_thwomp_1: 'audio/Boss_Music/thwomp_1.ogg',
    boss_tron_1: 'audio/Boss_Music/tron_1.ogg',
    boss_velocity_1: 'audio/Boss_Music/velocity_1.ogg',
    boss_velocity_2: 'audio/Boss_Music/velocity_2.ogg',
    boss_vise_1: 'audio/Boss_Music/vise_1.ogg',
    boss_vise_2: 'audio/Boss_Music/vise_2.ogg',
    boss_voidborn_1: 'audio/Boss_Music/voidborn_1.ogg',
    boss_voidborn_2: 'audio/Boss_Music/voidborn_2.ogg',
    boss_warden_1: 'audio/Boss_Music/warden_1.ogg',
    boss_warlord_1: 'audio/Boss_Music/warlord_1.ogg',
    boss_warlord_2: 'audio/Boss_Music/warlord_2.ogg',
    boss_weaver_1: 'audio/Boss_Music/weaver_1.ogg',
    boss_weaver_2: 'audio/Boss_Music/weaver_2.ogg',
    boss_wormhole_1: 'audio/Boss_Music/wormhole_1.ogg',
    boss_wormhole_2: 'audio/Boss_Music/wormhole_2.ogg',
    boss_zenith_1: 'audio/Boss_Music/zenith_1.ogg',
    boss_zenith_2: 'audio/Boss_Music/zenith_2.ogg',

    // World 1 (campaign uses boss music now - one boss track per level)
    level_1_1: 'audio/Boss_Music/abyss_1.ogg',
    level_1_2: 'audio/Boss_Music/abyss_2.ogg',
    level_1_3: 'audio/Boss_Music/aegis_1.ogg',
    level_1_4: 'audio/Boss_Music/aegis_2.ogg',
    level_1_5: 'audio/Boss_Music/arbiter_1.ogg',
    level_1_6: 'audio/Boss_Music/arbiter_2.ogg',
    level_1_7: 'audio/Boss_Music/arbiter_3.ogg',
    level_1_8: 'audio/Boss_Music/architect_1.ogg',
    level_1_9: 'audio/Boss_Music/architect_2.ogg',
    level_1_10: 'audio/Boss_Music/barrage_1.ogg',
    level_1_11: 'audio/Boss_Music/barrage_2.ogg',
    level_1_12: 'audio/Boss_Music/barricade_1.ogg',
    level_1_13: 'audio/Boss_Music/barricade_2.ogg',

    // World 2
    level_2_1: 'audio/Boss_Music/bayes_1.ogg',
    level_2_2: 'audio/Boss_Music/bayes_2.ogg',
    level_2_3: 'audio/Boss_Music/belt_1.ogg',
    level_2_4: 'audio/Boss_Music/belt_2.ogg',
    level_2_5: 'audio/Boss_Music/bloom_1.ogg',
    level_2_6: 'audio/Boss_Music/bloom_2.ogg',
    level_2_7: 'audio/Boss_Music/bloom_3.ogg',
    level_2_8: 'audio/Boss_Music/bomber_1.ogg',
    level_2_9: 'audio/Boss_Music/bomber_2.ogg',
    level_2_10: 'audio/Boss_Music/bumper_1.ogg',
    level_2_11: 'audio/Boss_Music/bumper_2.ogg',

    // World 3
    level_3_1: 'audio/Boss_Music/buzz_1.ogg',
    level_3_2: 'audio/Boss_Music/buzz_2.ogg',
    level_3_3: 'audio/Boss_Music/centipede_1.ogg',
    level_3_4: 'audio/Boss_Music/centipede_2.ogg',
    level_3_5: 'audio/Boss_Music/chaos_1.ogg',
    level_3_6: 'audio/Boss_Music/chaos_2.ogg',
    level_3_7: 'audio/Boss_Music/clock_1.ogg',
    level_3_8: 'audio/Boss_Music/clock_2.ogg',
    level_3_9: 'audio/Boss_Music/clock_3.ogg',
    level_3_10: 'audio/Boss_Music/coil_1.ogg',
    level_3_11: 'audio/Boss_Music/coil_2.ogg',

    // World 4
    level_4_1: 'audio/Boss_Music/coil_3.ogg',
    level_4_2: 'audio/Boss_Music/colossus_1.ogg',
    level_4_3: 'audio/Boss_Music/colossus_2.ogg',
    level_4_4: 'audio/Boss_Music/creeper_1.ogg',
    level_4_5: 'audio/Boss_Music/cyclops_1.ogg',
    level_4_6: 'audio/Boss_Music/cyclops_2.ogg',
    level_4_7: 'audio/Boss_Music/dancer_1.ogg',
    level_4_8: 'audio/Boss_Music/dancer_2.ogg',
    level_4_9: 'audio/Boss_Music/demolitionist_1.ogg',
    level_4_10: 'audio/Boss_Music/demolitionist_2.ogg',
    level_4_11: 'audio/Boss_Music/dreadnought_1.ogg',
    level_4_12: 'audio/Boss_Music/dreadnought_2.ogg',
    level_4_13: 'audio/Boss_Music/duelist_1.ogg',
    level_4_14: 'audio/Boss_Music/duelist_2.ogg',
    level_4_15: 'audio/Boss_Music/dynamo_1.ogg',
    level_4_16: 'audio/Boss_Music/dynamo_2.ogg',
    level_4_17: 'audio/Boss_Music/eclipse_1.ogg',
    level_4_18: 'audio/Boss_Music/eclipse_2.ogg',
    level_4_19: 'audio/Boss_Music/ember_1.ogg',

    // World 5
    level_5_1: 'audio/Boss_Music/ember_2.ogg',
    level_5_2: 'audio/Boss_Music/encore_1.ogg',
    level_5_3: 'audio/Boss_Music/encore_2.ogg',
    level_5_4: 'audio/Boss_Music/entropy_1.ogg',
    level_5_5: 'audio/Boss_Music/exarch_1.ogg',
    level_5_6: 'audio/Boss_Music/exarch_2.ogg',
    level_5_7: 'audio/Boss_Music/executioner_1.ogg',
    level_5_8: 'audio/Boss_Music/executioner_2.ogg',
    level_5_9: 'audio/Boss_Music/firefly_1.ogg',
    level_5_10: 'audio/Boss_Music/firefly_2.ogg',
    level_5_11: 'audio/Boss_Music/gale_1.ogg',
    level_5_12: 'audio/Boss_Music/gale_2.ogg',
    level_5_13: 'audio/Boss_Music/gambler_1.ogg',

    // World 6
    level_6_1: 'audio/Boss_Music/gambler_2.ogg',
    level_6_2: 'audio/Boss_Music/gambler_3.ogg',
    level_6_3: 'audio/Boss_Music/gourmet_1.ogg',
    level_6_4: 'audio/Boss_Music/gourmet_2.ogg',
    level_6_5: 'audio/Boss_Music/gridlock_1.ogg',
    level_6_6: 'audio/Boss_Music/gridlock_2.ogg',
    level_6_7: 'audio/Boss_Music/guardian_1.ogg',
    level_6_8: 'audio/Boss_Music/guardian_2.ogg',
    level_6_9: 'audio/Boss_Music/gust_1.ogg',
    level_6_10: 'audio/Boss_Music/gust_2.ogg',
    level_6_11: 'audio/Boss_Music/hunter_1.ogg',
    level_6_12: 'audio/Boss_Music/hunter_2.ogg',

    // World 7
    level_7_1: 'audio/Boss_Music/inferno_1.ogg',
    level_7_2: 'audio/Boss_Music/inferno_2.ogg',
    level_7_3: 'audio/Boss_Music/jelly_1.ogg',
    level_7_4: 'audio/Boss_Music/jelly_2.ogg',
    level_7_5: 'audio/Boss_Music/jester_1.ogg',
    level_7_6: 'audio/Boss_Music/juggernaut_1.ogg',
    level_7_7: 'audio/Boss_Music/juggernaut_2.ogg',
    level_7_8: 'audio/Boss_Music/kraken_1.ogg',
    level_7_9: 'audio/Boss_Music/kraken_2.ogg',
    level_7_10: 'audio/Boss_Music/laplace_1.ogg',
    level_7_11: 'audio/Boss_Music/laplace_2.ogg',
    level_7_12: 'audio/Boss_Music/leviathan_1.ogg',

    // World 8
    level_8_1: 'audio/Boss_Music/leviathan_2.ogg',
    level_8_2: 'audio/Boss_Music/lodestone_1.ogg',
    level_8_3: 'audio/Boss_Music/lodestone_2.ogg',
    level_8_4: 'audio/Boss_Music/maelstrom_1.ogg',
    level_8_5: 'audio/Boss_Music/maelstrom_2.ogg',
    level_8_6: 'audio/Boss_Music/marksman_1.ogg',
    level_8_7: 'audio/Boss_Music/marksman_2.ogg',
    level_8_8: 'audio/Boss_Music/maven_1.ogg',
    level_8_9: 'audio/Boss_Music/maven_2.ogg',

    // World 9
    level_9_1: 'audio/Boss_Music/maze_1.ogg',
    level_9_2: 'audio/Boss_Music/mech_1.ogg',
    level_9_3: 'audio/Boss_Music/mech_2.ogg',
    level_9_4: 'audio/Boss_Music/medusa_1.ogg',
    level_9_5: 'audio/Boss_Music/medusa_2.ogg',
    level_9_6: 'audio/Boss_Music/minotaur_1.ogg',
    level_9_7: 'audio/Boss_Music/minotaur_2.ogg',
    level_9_8: 'audio/Boss_Music/monsoon_1.ogg',
    level_9_9: 'audio/Boss_Music/needle_1.ogg',
    level_9_10: 'audio/Boss_Music/nemesis_1.ogg',
    level_9_11: 'audio/Boss_Music/nemesis_2.ogg',
    level_9_12: 'audio/Boss_Music/nightmare_1.ogg',
    level_9_13: 'audio/Boss_Music/nightmare_2.ogg',
    level_9_14: 'audio/Boss_Music/null_1.ogg',
    level_9_15: 'audio/Boss_Music/null_2.ogg',
    level_9_16: 'audio/Boss_Music/oblivion_1.ogg',

    // World 10
    level_10_1: 'audio/Boss_Music/oblivion_2.ogg',
    level_10_2: 'audio/Boss_Music/overfitter_1.ogg',
    level_10_3: 'audio/Boss_Music/overfitter_2.ogg',
    level_10_4: 'audio/Boss_Music/phantom_1.ogg',
    level_10_5: 'audio/Boss_Music/phantom_2.ogg',
    level_10_6: 'audio/Boss_Music/puddle_1.ogg',
    level_10_7: 'audio/Boss_Music/puddle_2.ogg',
    level_10_8: 'audio/Boss_Music/razor_1.ogg',
    level_10_9: 'audio/Boss_Music/razor_2.ogg',
    level_10_10: 'audio/Boss_Music/seraph_1.ogg',
    level_10_11: 'audio/Boss_Music/seraph_2.ogg',
    level_10_12: 'audio/Boss_Music/shaper_1.ogg',

    // World 11
    level_11_1: 'audio/Boss_Music/shaper_2.ogg',
    level_11_2: 'audio/Boss_Music/shrine_1.ogg',
    level_11_3: 'audio/Boss_Music/shrine_2.ogg',
    level_11_4: 'audio/Boss_Music/siren_1.ogg',
    level_11_5: 'audio/Boss_Music/siren_2.ogg',
    level_11_6: 'audio/Boss_Music/siren_3.ogg',
    level_11_7: 'audio/Boss_Music/sirus_1.ogg',
    level_11_8: 'audio/Boss_Music/sirus_2.ogg',
    level_11_9: 'audio/Boss_Music/snail_1.ogg',
    level_11_10: 'audio/Boss_Music/snail_2.ogg',
    level_11_11: 'audio/Boss_Music/sprout_1.ogg',

    // World 12 (Bayesian Bay - Correlation & Regression)
    level_12_1: 'audio/Boss_Music/sprout_2.ogg',
    level_12_2: 'audio/Boss_Music/stack_1.ogg',
    level_12_3: 'audio/Boss_Music/stack_2.ogg',
    level_12_4: 'audio/Boss_Music/stormqueen_1.ogg',
    level_12_5: 'audio/Boss_Music/stormqueen_2.ogg',
    level_12_6: 'audio/Boss_Music/striker_1.ogg',
    level_12_7: 'audio/Boss_Music/striker_2.ogg',
    level_12_8: 'audio/Boss_Music/swarm_1.ogg',
    level_12_9: 'audio/Boss_Music/swarm_2.ogg',
    level_12_10: 'audio/Boss_Music/tactician_1.ogg',
    level_12_11: 'audio/Boss_Music/tactician_2.ogg',
    level_12_12: 'audio/Boss_Music/thwomp_1.ogg',
    level_12_13: 'audio/Boss_Music/tron_1.ogg',
    level_12_14: 'audio/Boss_Music/velocity_1.ogg',
    level_12_15: 'audio/Boss_Music/velocity_2.ogg',

    // World 13 (Expectation Plateau - Wilcoxon & Contingency)
    level_13_1: 'audio/Boss_Music/vise_1.ogg',
    level_13_2: 'audio/Boss_Music/vise_2.ogg',
    level_13_3: 'audio/Boss_Music/voidborn_1.ogg',
    level_13_4: 'audio/Boss_Music/voidborn_2.ogg',
    level_13_5: 'audio/Boss_Music/warden_1.ogg',
    level_13_6: 'audio/Boss_Music/warlord_1.ogg',
    level_13_7: 'audio/Boss_Music/warlord_2.ogg',
    level_13_8: 'audio/Boss_Music/weaver_1.ogg',
    level_13_9: 'audio/Boss_Music/weaver_2.ogg',
    level_13_10: 'audio/Boss_Music/wormhole_1.ogg',
    level_13_11: 'audio/Boss_Music/wormhole_2.ogg',
    level_13_12: 'audio/Boss_Music/zenith_1.ogg',
    level_13_13: 'audio/Boss_Music/zenith_2.ogg',
    level_13_14: 'audio/Boss_Music/abyss_1.ogg',
    level_13_15: 'audio/Boss_Music/abyss_2.ogg',

    // World 14 (Nexus World - Descriptive Statistics)
    level_14_1: 'audio/Boss_Music/aegis_1.ogg',
    level_14_2: 'audio/Boss_Music/aegis_2.ogg',
    level_14_3: 'audio/Boss_Music/arbiter_1.ogg',
    level_14_4: 'audio/Boss_Music/arbiter_2.ogg',
    level_14_5: 'audio/Boss_Music/arbiter_3.ogg',
    level_14_6: 'audio/Boss_Music/architect_1.ogg',
    level_14_7: 'audio/Boss_Music/architect_2.ogg',
    level_14_8: 'audio/Boss_Music/barrage_1.ogg',
    level_14_9: 'audio/Boss_Music/barrage_2.ogg',
    level_14_10: 'audio/Boss_Music/barricade_1.ogg',
    level_14_11: 'audio/Boss_Music/barricade_2.ogg',
    level_14_12: 'audio/Boss_Music/bayes_1.ogg',
    level_14_13: 'audio/Boss_Music/bayes_2.ogg',
    level_14_14: 'audio/Boss_Music/belt_1.ogg',
    level_14_15: 'audio/Boss_Music/belt_2.ogg',
};

//------------------------------------------------------------------------
//-------------------BOSS → TRACK KEYS-------------------------------------
//------------------------------------------------------------------------
// Groups the boss_* track keys above by endgame boss id (EG_BOSS_DEFS id).
// playBossBGM(bossId) picks one at random. Bosses with a single theme just
// list one key. NOTE: boss_brutus has no music files yet - it is
// intentionally absent and falls back to a random boss theme at play time.

export const BOSS_BGM = {
    boss_abyss: ['boss_abyss_1', 'boss_abyss_2'],
    boss_aegis: ['boss_aegis_1', 'boss_aegis_2'],
    boss_arbiter: ['boss_arbiter_1', 'boss_arbiter_2', 'boss_arbiter_3'],
    boss_architect: ['boss_architect_1', 'boss_architect_2'],
    boss_barrage: ['boss_barrage_1', 'boss_barrage_2'],
    boss_barricade: ['boss_barricade_1', 'boss_barricade_2'],
    boss_bayes: ['boss_bayes_1', 'boss_bayes_2'],
    boss_belt: ['boss_belt_1', 'boss_belt_2'],
    boss_bloom: ['boss_bloom_1', 'boss_bloom_2', 'boss_bloom_3'],
    boss_bomber: ['boss_bomber_1', 'boss_bomber_2'],
    boss_bumper: ['boss_bumper_1', 'boss_bumper_2'],
    boss_buzz: ['boss_buzz_1', 'boss_buzz_2'],
    boss_centipede: ['boss_centipede_1', 'boss_centipede_2'],
    boss_chaos: ['boss_chaos_1', 'boss_chaos_2'],
    boss_clock: ['boss_clock_1', 'boss_clock_2', 'boss_clock_3'],
    boss_coil: ['boss_coil_1', 'boss_coil_2', 'boss_coil_3'],
    boss_colossus: ['boss_colossus_1', 'boss_colossus_2'],
    boss_creeper: ['boss_creeper_1'],
    boss_cyclops: ['boss_cyclops_1', 'boss_cyclops_2'],
    boss_dancer: ['boss_dancer_1', 'boss_dancer_2'],
    boss_demolitionist: ['boss_demolitionist_1', 'boss_demolitionist_2'],
    boss_dreadnought: ['boss_dreadnought_1', 'boss_dreadnought_2'],
    boss_duelist: ['boss_duelist_1', 'boss_duelist_2'],
    boss_dynamo: ['boss_dynamo_1', 'boss_dynamo_2'],
    boss_eclipse: ['boss_eclipse_1', 'boss_eclipse_2'],
    boss_ember: ['boss_ember_1', 'boss_ember_2'],
    boss_encore: ['boss_encore_1', 'boss_encore_2'],
    boss_entropy: ['boss_entropy_1'],
    boss_exarch: ['boss_exarch_1', 'boss_exarch_2'],
    boss_executioner: ['boss_executioner_1', 'boss_executioner_2'],
    boss_firefly: ['boss_firefly_1', 'boss_firefly_2'],
    boss_gale: ['boss_gale_1', 'boss_gale_2'],
    boss_gambler: ['boss_gambler_1', 'boss_gambler_2', 'boss_gambler_3'],
    boss_gourmet: ['boss_gourmet_1', 'boss_gourmet_2'],
    boss_gridlock: ['boss_gridlock_1', 'boss_gridlock_2'],
    boss_guardian: ['boss_guardian_1', 'boss_guardian_2'],
    boss_gust: ['boss_gust_1', 'boss_gust_2'],
    boss_hunter: ['boss_hunter_1', 'boss_hunter_2'],
    boss_inferno: ['boss_inferno_1', 'boss_inferno_2'],
    boss_jelly: ['boss_jelly_1', 'boss_jelly_2'],
    boss_jester: ['boss_jester_1'],
    boss_juggernaut: ['boss_juggernaut_1', 'boss_juggernaut_2'],
    boss_kraken: ['boss_kraken_1', 'boss_kraken_2'],
    boss_laplace: ['boss_laplace_1', 'boss_laplace_2'],
    boss_leviathan: ['boss_leviathan_1', 'boss_leviathan_2'],
    boss_lodestone: ['boss_lodestone_1', 'boss_lodestone_2'],
    boss_maelstrom: ['boss_maelstrom_1', 'boss_maelstrom_2'],
    boss_marksman: ['boss_marksman_1', 'boss_marksman_2'],
    boss_maven: ['boss_maven_1', 'boss_maven_2'],
    boss_maze: ['boss_maze_1'],
    boss_mech: ['boss_mech_1', 'boss_mech_2'],
    boss_medusa: ['boss_medusa_1', 'boss_medusa_2'],
    boss_minotaur: ['boss_minotaur_1', 'boss_minotaur_2'],
    boss_monsoon: ['boss_monsoon_1'],
    boss_needle: ['boss_needle_1'],
    boss_nemesis: ['boss_nemesis_1', 'boss_nemesis_2'],
    boss_nightmare: ['boss_nightmare_1', 'boss_nightmare_2'],
    boss_null: ['boss_null_1', 'boss_null_2'],
    boss_oblivion: ['boss_oblivion_1', 'boss_oblivion_2'],
    boss_overfitter: ['boss_overfitter_1', 'boss_overfitter_2'],
    boss_phantom: ['boss_phantom_1', 'boss_phantom_2'],
    boss_puddle: ['boss_puddle_1', 'boss_puddle_2'],
    boss_razor: ['boss_razor_1', 'boss_razor_2'],
    boss_seraph: ['boss_seraph_1', 'boss_seraph_2'],
    boss_shaper: ['boss_shaper_1', 'boss_shaper_2'],
    boss_shrine: ['boss_shrine_1', 'boss_shrine_2'],
    boss_siren: ['boss_siren_1', 'boss_siren_2', 'boss_siren_3'],
    boss_sirus: ['boss_sirus_1', 'boss_sirus_2'],
    boss_snail: ['boss_snail_1', 'boss_snail_2'],
    boss_sprout: ['boss_sprout_1', 'boss_sprout_2'],
    boss_stack: ['boss_stack_1', 'boss_stack_2'],
    boss_stormqueen: ['boss_stormqueen_1', 'boss_stormqueen_2'],
    boss_striker: ['boss_striker_1', 'boss_striker_2'],
    boss_swarm: ['boss_swarm_1', 'boss_swarm_2'],
    boss_tactician: ['boss_tactician_1', 'boss_tactician_2'],
    boss_thwomp: ['boss_thwomp_1'],
    boss_tron: ['boss_tron_1'],
    boss_velocity: ['boss_velocity_1', 'boss_velocity_2'],
    boss_vise: ['boss_vise_1', 'boss_vise_2'],
    boss_voidborn: ['boss_voidborn_1', 'boss_voidborn_2'],
    boss_warden: ['boss_warden_1'],
    boss_warlord: ['boss_warlord_1', 'boss_warlord_2'],
    boss_weaver: ['boss_weaver_1', 'boss_weaver_2'],
    boss_wormhole: ['boss_wormhole_1', 'boss_wormhole_2'],
    boss_zenith: ['boss_zenith_1', 'boss_zenith_2'],
};

// Tutorial track keys (random one plays on tutorial entry).
export const TUTORIAL_BGM = ['tutorial_1', 'tutorial_2'];


//------------------------------------------------------------------------
//-------------------LEVEL → TRACK MAPPING----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Maps 'world-level' strings to a BGM_TRACKS key.
// If a level has no entry here, trackForLevel() falls back to WORLD_BGM,
// then finally to 'world1' as a last resort.

export const LEVEL_BGM = {
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

    // World 12
    '12-1': 'level_12_1', '12-2': 'level_12_2', '12-3': 'level_12_3',
    '12-4': 'level_12_4', '12-5': 'level_12_5', '12-6': 'level_12_6',
    '12-7': 'level_12_7', '12-8': 'level_12_8', '12-9': 'level_12_9',
    '12-10': 'level_12_10', '12-11': 'level_12_11', '12-12': 'level_12_12',
    '12-13': 'level_12_13', '12-14': 'level_12_14', '12-15': 'level_12_15',

    // World 13
    '13-1': 'level_13_1', '13-2': 'level_13_2', '13-3': 'level_13_3',
    '13-4': 'level_13_4', '13-5': 'level_13_5', '13-6': 'level_13_6',
    '13-7': 'level_13_7', '13-8': 'level_13_8', '13-9': 'level_13_9',
    '13-10': 'level_13_10', '13-11': 'level_13_11', '13-12': 'level_13_12',
    '13-13': 'level_13_13', '13-14': 'level_13_14', '13-15': 'level_13_15',

    // World 14
    '14-1': 'level_14_1', '14-2': 'level_14_2', '14-3': 'level_14_3',
    '14-4': 'level_14_4', '14-5': 'level_14_5', '14-6': 'level_14_6',
    '14-7': 'level_14_7', '14-8': 'level_14_8', '14-9': 'level_14_9',
    '14-10': 'level_14_10', '14-11': 'level_14_11', '14-12': 'level_14_12',
    '14-13': 'level_14_13', '14-14': 'level_14_14', '14-15': 'level_14_15',
};


//------------------------------------------------------------------------
//-------------------WORLD → TRACK FALLBACK---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Fallback BGM per world number, used when a level has no LEVEL_BGM entry.
// Uncomment and set a BGM_TRACKS key for each world as needed.

export const WORLD_BGM = {
    1: 'level_1_1',
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

export const SFX = {
    // ── UI ───────────────────────────────────────────────
    click: 'audio/sfx/ui/sfx_click.ogg',
    back: 'audio/sfx/ui/sfx_back.ogg',
    button: 'audio/sfx/ui/sfx_button.ogg',
    showtoast: 'audio/sfx/ui/sfx_showtoast.ogg',
    questRewardClaimed: 'audio/sfx/ui/sfx_quest_reward_claimed.ogg',

    // ── Puzzle Feedback ──────────────────────────────────
    cellFill: 'audio/sfx/puzzle/sfx_cell_fill.ogg',
    cellMark: 'audio/sfx/puzzle/sfx_cell_mark.ogg',
    cellWrong: 'audio/sfx/puzzle/sfx_wrong.ogg',
    win: 'audio/sfx/puzzle/sfx_win.ogg',
    lose: 'audio/sfx/puzzle/sfx_lose.ogg',

    // ── Quiz & Mathgate ──────────────────────────────────
    quizCorrect: 'audio/sfx/puzzle/sfx_quiz_correct.ogg',
    quizWrong: 'audio/sfx/puzzle/sfx_quiz_wrong.ogg',
    tutorSuccess: 'audio/sfx/puzzle/sfx_tutor_success.ogg',
    tutorFail: 'audio/sfx/puzzle/sfx_tutor_fail.ogg',

    // ── Items ────────────────────────────────────────────
    candle: 'audio/sfx/items/sfx_candle.ogg',
    magnifier: 'audio/sfx/items/sfx_magnifier.ogg',
    spyglass: 'audio/sfx/items/sfx_spyglass.ogg',
    scanner: 'audio/sfx/items/sfx_scanner.ogg',
    eraser: 'audio/sfx/items/sfx_eraser.ogg',
    sweeper: 'audio/sfx/items/sfx_sweeper.ogg',
    magnet: 'audio/sfx/items/sfx_magnet.ogg',
    error_gem: 'audio/sfx/items/sfx_error_gem.ogg',
    hourglass: 'audio/sfx/items/sfx_hourglass.ogg',
    stopwatch: 'audio/sfx/items/sfx_stopwatch.ogg',
    clock: 'audio/sfx/items/sfx_clock.ogg',
    chronobolt: 'audio/sfx/items/sfx_chronobolt.ogg',
    shield: 'audio/sfx/items/sfx_shield.ogg',
    time_freeze: 'audio/sfx/items/sfx_time_freeze.ogg',
    tutor: 'audio/sfx/items/sfx_tutor.ogg',
    professor: 'audio/sfx/items/sfx_professor.ogg',
    scholar: 'audio/sfx/items/sfx_scholar.ogg',
    grand_mentor: 'audio/sfx/items/sfx_grand_mentor.ogg',
    scouts_primer: 'audio/sfx/items/sfx_scouts_primer.ogg',
    set_square: 'audio/sfx/items/sfx_set_square.ogg',
    ruler: 'audio/sfx/items/sfx_ruler.ogg',
    codex_of_completion: 'audio/sfx/items/sfx_codex_of_completion.ogg',
    cursed_lens: 'audio/sfx/items/sfx_cursed_lens.ogg',
    cursed_clock: 'audio/sfx/items/sfx_cursed_clock.ogg',
    demon_eye: 'audio/sfx/items/sfx_demon_eye.ogg',
    tidal_wave: 'audio/sfx/items/sfx_tidal_wave.ogg',
    vortex: 'audio/sfx/items/sfx_vortex.ogg',
    chaos_grid: 'audio/sfx/items/sfx_chaos_grid.ogg',
    pearl_of_haste: 'audio/sfx/items/sfx_pearl_of_haste.ogg',
    pearl_of_swiftness: 'audio/sfx/items/sfx_pearl_of_swiftness.ogg',
    grand_pearl: 'audio/sfx/items/sfx_grand_pearl.ogg',
    the_witch: 'audio/sfx/items/sfx_the_witch.ogg',
    golden_clock: 'audio/sfx/items/sfx_golden_clock.ogg',
    shadow_seal: 'audio/sfx/items/sfx_shadow_seal.ogg',
    shield_break: 'audio/sfx/items/sfx_shield_break.ogg',

    // ── Class Selection / Upgrade ────────────────────────
    classSelection: 'audio/sfx/classes/sfx_class_selection.ogg',
    classSelected: 'audio/sfx/classes/sfx_class_selected.ogg',
    classUpgraded: 'audio/sfx/classes/sfx_class_upgraded.ogg',

    // ── Base Class Abilities ─────────────────────────────
    momentum: 'audio/sfx/classes/sfx_momentum.ogg',
    dataStrike: 'audio/sfx/classes/sfx_data_strike.ogg',
    diagonalStrike: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    diagonalStrikeRepeat: 'audio/sfx/classes/sfx_diagonal_strike_repeat_proc.ogg',
    varianceShield: 'audio/sfx/classes/sfx_variance_shield.ogg',
    arcaneReveal: 'audio/sfx/classes/sfx_arcane_reveal.ogg',
    absoluteZero: 'audio/sfx/classes/sfx_absolute_zero.ogg',
    bayesianInsight: 'audio/sfx/classes/sfx_bayesian_insight.ogg',
    fieldScan: 'audio/sfx/classes/sfx_field_scan.ogg',
    precisionMark: 'audio/sfx/classes/sfx_precision_mark.ogg',

    // ── Ascendancy: Random Walker ────────────────────────
    browneySummon: 'audio/sfx/classes/sfx_browney_summon.ogg',
    browneyReveal: 'audio/sfx/classes/sfx_browney_reveal.ogg',
    drifterSummon: 'audio/sfx/classes/sfx_drifter_summon.ogg',
    drifterBark: 'audio/sfx/classes/sfx_drifter_bark.ogg',
    drifterFinal: 'audio/sfx/classes/sfx_drifter_final.ogg',
    drifterPoop: 'audio/sfx/classes/sfx_drifter_poop.ogg',
    drifterExplosion: 'audio/sfx/classes/sfx_drifter_explosion.ogg',
    drifterLevelUp: 'audio/sfx/classes/sfx_drifter_level_up.ogg',

    // ── Ascendancy: Recursionist ─────────────────────────
    residualSummon: 'audio/sfx/classes/sfx_residual_summon.ogg',
    residualDespawn: 'audio/sfx/classes/sfx_residual_despawn.ogg',
    residualReveal: 'audio/sfx/classes/sfx_residual_reveal.ogg',
    dofBurn: 'audio/sfx/classes/sfx_dof_burn.ogg',

    // ── Ascendancy: Bayesian ─────────────────────────────
    bayesTrapSelect: 'audio/sfx/classes/sfx_bayes_traps_select.ogg',
    bayesTrapExplosion: 'audio/sfx/classes/sfx_bayes_traps_explosion.ogg',
    type1errorShieldBreak: 'audio/sfx/classes/sfx_type1error_shield_break.ogg',
    type1errorShieldHide: 'audio/sfx/classes/sfx_type1error_shield_hide.ogg',

    // ── Ascendancy: Markovian ────────────────────────────
    stateReversal: 'audio/sfx/classes/sfx_state_reversal.ogg',
    transitionMatrix: 'audio/sfx/classes/sfx_transition_matrix.ogg',
    transitionCascade: 'audio/sfx/classes/sfx_transition_cascade.ogg',

    // ── Ascendancy: Outlaw ───────────────────────────────
    tailRiskResolve: 'audio/sfx/classes/sfx_tail_risk_resolve.ogg',
    tailRiskStart: 'audio/sfx/classes/sfx_tail_risk_start.ogg',
    speedforceEnter: 'audio/sfx/classes/sfx_speedforce_enter.ogg',

    // ── Ascendancy: Actuary ──────────────────────────────
    holyHealing: 'audio/sfx/classes/sfx_holy_healing.ogg',
    holySpell: 'audio/sfx/classes/sfx_holy_spell.ogg',
    actuary_mistake_reversed: 'audio/sfx/classes/sfx_actuary_mistake_reversed.ogg',
    actuary_shield_pop: 'audio/sfx/classes/sfx_actuary_shield_pop.ogg',

    // ── Achievements / Milestones ────────────────────────
    achievement: 'audio/sfx/achievements/sfx_achievement.ogg',
    convergence: 'audio/sfx/achievements/sfx_convergence.ogg',
    milestone: 'audio/sfx/achievements/sfx_milestone.ogg',
    abilityReady: 'audio/sfx/achievements/sfx_ability_ready.ogg',

    // ── Passive Tree Effects ─────────────────────────────
    luckyTileActivate: 'audio/sfx/passive/sfx_lucky_tile_activate.ogg',
    binomial_burst: 'audio/sfx/passive/sfx_binomial_burst.ogg',
    poisson_process: 'audio/sfx/passive/sfx_poisson_process.ogg',
    residual_analysis: 'audio/sfx/passive/sfx_residual_analysis.ogg',
    standard_deviation: 'audio/sfx/passive/sfx_standard_deviation.ogg',
    overfitting_alert: 'audio/sfx/passive/sfx_overfitting_alert.ogg',
    sample_efficiency: 'audio/sfx/passive/sfx_sample_efficiency.ogg',
    sample_efficiency_pop: 'audio/sfx/passive/sfx_sample_efficiency_pop.ogg',
    stochastic_resonance: 'audio/sfx/passive/sfx_stochastic_resonance.ogg',
    stochastic_resonance_pop: 'audio/sfx/passive/sfx_stochastic_resonance_pop.ogg',

    // --- Characters ---
    syla_nature: 'audio/sfx/characters/sfx_syla_nature.ogg',

    // --- Endgame ---
    // ── Endgame: base combat feedback ──────────────
    player_damage_taken: 'audio/sfx/endgame/sfx_player_damage_taken.ogg',
    player_shield_damage_taken: 'audio/sfx/endgame/sfx_player_shield_damage_taken.ogg',
    heart_heals: 'audio/sfx/endgame/sfx_heart_heals.ogg',
    heart_destroyed: 'audio/sfx/endgame/sfx_heart_destroyed.ogg',
    // Placeholder: reuses the heart heal sound until a dedicated mana
    // pickup sound is added to audio/
    mana_pickup: 'audio/sfx/endgame/sfx_heart_heals.ogg',
    // Placeholder: reuses the shield-break crack until a dedicated thunder
    // crack is added to audio/ (plays for The Gust's lightning pre-warning)
    gust_thunder: 'audio/sfx/items/sfx_shield_break.ogg',
    pud_pop: 'audio/sfx/passive/sfx_sample_efficiency_pop.ogg',
    pud_fountain: 'audio/sfx/items/sfx_tidal_wave.ogg',
    sprout_prune: 'audio/sfx/passive/sfx_sample_efficiency_pop.ogg',
    sprout_thorn: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    sprout_bloom: 'audio/sfx/items/sfx_tidal_wave.ogg',
    bump_thwack: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    cent_skitter: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    thwomp_slam: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    dancer_beat: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    gale_howl: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    gambler_deal: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    gourmet_bite: 'audio/sfx/items/sfx_tidal_wave.ogg',
    lds_snap: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    stk_thud: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    tct_move: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    coil_hiss: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    striker_kick: 'audio/sfx/classes/sfx_diagonal_strike.ogg',
    cent_venom: 'audio/sfx/items/sfx_tidal_wave.ogg',
    pud_wave: 'audio/sfx/items/sfx_tidal_wave.ogg',
    player_equip_pickup: 'audio/sfx/endgame/sfx_player_equip_pickup.ogg',
    player_equip_not_pickup: 'audio/sfx/endgame/sfx_player_equip_not_pickup.ogg',
    player_defeated: 'audio/sfx/endgame/sfx_player_defeated.ogg',
    // Placeholder: reuses the diagonal strike sound until a dedicated
    // cleave sweep sound is added to audio/
    cleave: 'audio/sfx/classes/sfx_diagonal_strike.ogg',

};