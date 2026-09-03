//------------------------------------------------------------------------
//-------------------ATLAS BOSS ROSTER (86 regions → 86 bosses)------------
//------------------------------------------------------------------------
// One specific boss per atlas region — no random rolls. Region ids are
// `atlas_t{tier}_{slot}` (slot = order in EG_ATLAS_TIER_NAMES).
//
// Difficulty rises with tier: outer tiers (T1–T5) hold simple, readable
// fights; mid tiers (T6–T8) hold layered mechanics; high tiers (T9–T14)
// hold punishing fights; the pinnacle (T15–T16) holds brutal multi-threat
// bosses with two signature mechanics each.
//
// To move a boss: change the id on its region line. To add a tier/region,
// add the node in endgame-atlas.js and a line here. Regions missing from
// this table fall back to the old seeded-random roll (see
// egAtlasChainBlueprint), so the atlas never breaks.
//------------------------------------------------------------------------

const EG_ATLAS_REGION_BOSSES = {
    // ── Tier 1 — first steps (simple, forgiving) ──
    'atlas_t1_0': 'boss_ember',
    'atlas_t1_1': 'boss_snail',
    'atlas_t1_2': 'boss_jelly',
    'atlas_t1_3': 'boss_brutus',
    // ── Tier 2 ──
    'atlas_t2_0': 'boss_gust',
    'atlas_t2_1': 'boss_sprout',
    'atlas_t2_2': 'boss_clock',
    'atlas_t2_3': 'boss_puddle',
    'atlas_t2_4': 'boss_firefly',
    'atlas_t2_5': 'boss_marksman',
    'atlas_t2_6': 'boss_dynamo',
    'atlas_t2_7': 'boss_crash',
    // ── Tier 3 ──
    'atlas_t3_0': 'boss_bumper',
    'atlas_t3_1': 'boss_striker',
    'atlas_t3_2': 'boss_centipede',
    'atlas_t3_3': 'boss_thwomp',
    // ── Tier 4 ──
    'atlas_t4_0': 'boss_dancer',
    'atlas_t4_1': 'boss_gambler',
    'atlas_t4_2': 'boss_tactician',
    'atlas_t4_3': 'boss_gourmet',
    'atlas_t4_4': 'boss_stack',
    'atlas_t4_5': 'boss_gale',
    'atlas_t4_6': 'boss_lodestone',
    'atlas_t4_7': 'boss_coil',
    // ── Tier 5 ──
    'atlas_t5_0': 'boss_encore',
    'atlas_t5_1': 'boss_bomber',
    'atlas_t5_2': 'boss_creeper',
    'atlas_t5_3': 'boss_maze',
    'atlas_t5_4': 'boss_buzz',
    'atlas_t5_5': 'boss_monsoon',
    'atlas_t5_6': 'boss_medusa',
    'atlas_t5_7': 'boss_needle',
    // ── Tier 6 ──
    'atlas_t6_0': 'boss_swarm',
    'atlas_t6_1': 'boss_siren',
    'atlas_t6_2': 'boss_aegis',
    'atlas_t6_3': 'boss_shaper',
    'atlas_t6_4': 'boss_jester',
    'atlas_t6_5': 'boss_gridlock',
    // ── Tier 7 ──
    'atlas_t7_0': 'boss_colossus',
    'atlas_t7_1': 'boss_inferno',
    'atlas_t7_2': 'boss_null',
    'atlas_t7_3': 'boss_entropy',
    'atlas_t7_4': 'boss_laplace',
    'atlas_t7_5': 'boss_bayes',
    // ── Tier 8 ──
    'atlas_t8_0': 'boss_vise',
    'atlas_t8_1': 'boss_barrage',
    'atlas_t8_2': 'boss_sirus',
    'atlas_t8_3': 'boss_overfitter',
    'atlas_t8_4': 'boss_razor',
    'atlas_t8_5': 'boss_shrine',
    'atlas_t8_6': 'boss_minotaur',
    'atlas_t8_7': 'boss_bloom',
    // ── Tier 9 ──
    'atlas_t9_0': 'boss_architect',
    'atlas_t9_1': 'boss_warden',
    'atlas_t9_2': 'boss_maelstrom',
    'atlas_t9_3': 'boss_tron',
    // ── Tier 10 ──
    'atlas_t10_0': 'boss_belt',
    'atlas_t10_1': 'boss_hunter',
    'atlas_t10_2': 'boss_cyclops',
    'atlas_t10_3': 'boss_barricade',
    // ── Tier 11 ──
    'atlas_t11_0': 'boss_guardian',
    'atlas_t11_1': 'boss_duelist',
    'atlas_t11_2': 'boss_mech',
    'atlas_t11_3': 'boss_phantom',
    // ── Tier 12 ──
    'atlas_t12_0': 'boss_weaver',
    'atlas_t12_1': 'boss_velocity',
    'atlas_t12_2': 'boss_wormhole',
    'atlas_t12_3': 'boss_eclipse',
    // ── Tier 13 ──
    'atlas_t13_0': 'boss_nightmare',
    'atlas_t13_1': 'boss_kraken',
    'atlas_t13_2': 'boss_executioner',
    'atlas_t13_3': 'boss_leviathan',
    // ── Tier 14 ──
    'atlas_t14_0': 'boss_abyss',
    'atlas_t14_1': 'boss_arbiter',
    'atlas_t14_2': 'boss_exarch',
    'atlas_t14_3': 'boss_maven',
    // ── Tier 15 — pinnacle approach (brutal, two signatures each) ──
    'atlas_t15_0': 'boss_nemesis',
    'atlas_t15_1': 'boss_oblivion',
    'atlas_t15_2': 'boss_juggernaut',
    'atlas_t15_3': 'boss_stormqueen',
    'atlas_t15_4': 'boss_dreadnought',
    'atlas_t15_5': 'boss_warlord',
    // ── Tier 16 — pinnacle (the four hardest fights) ──
    'atlas_t16_0': 'boss_seraph',
    'atlas_t16_1': 'boss_chaos',
    'atlas_t16_2': 'boss_voidborn',
    'atlas_t16_3': 'boss_zenith',
};
