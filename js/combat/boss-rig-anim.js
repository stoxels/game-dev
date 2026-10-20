//------------------------------------------------------------------------
//-------------------BOSS RIG ANIMATIONS (ability cues)-------------------------
//------------------------------------------------------------------------
// Cosmetic only. When a boss mechanic fires, boss-framework.js dispatches
// an 'sx-boss-mechanic' event; for the bosses listed in RIGS this module
// swaps the boss card's flat art for a small canvas that plays a skeletal
// animation (arms raise, wings flap, shockwaves...) and then puts the
// original <img> back. Nothing here touches combat state, timing or damage,
// and every failure path degrades to "no animation".
//
// Art: images/endgame/monsters/rigs/<boss>/<part>.webp, cut from the normal
// boss art by dev/scratch/rigger/cut_ingame.py (authoring demo: boss.html).
// Pose numbers below are in the units of the large source art (px); each
// rig's S converts them to the 512px in-game art.
//------------------------------------------------------------------------

const RIG_DIR = 'images/endgame/monsters/rigs/';

const RIGS = {
    boss_mech: {
        S: 0.418, ox: 2, oy: 106,
        parts: [
            { n: 'legL', x: 157, y: 310, px: 218.1, py: 317.1, par: 'torso' },
            { n: 'legR', x: 288, y: 313, px: 333.5, py: 317.1, par: 'torso' },
            { n: 'torso', x: 170, y: 125, px: 275.8, py: 315.0, par: null },
            { n: 'pauldronL', x: 109, y: 122, px: 189.3, py: 216.1, par: 'torso' },
            { n: 'pauldronR', x: 313, y: 125, px: 362.3, py: 216.1, par: 'torso' },
            { n: 'fistL', x: 12, y: 225, px: 185.2, py: 271.8, par: 'torso' },
            { n: 'fistR', x: 353, y: 221, px: 352.0, py: 271.8, par: 'torso' },
        ],
        // mechanic name -> animation + length (ms); the charge anim releases
        // at 82% of its length, so it is stretched to land on the blast.
        mechanics: {
            self_destruct: { anim: 'charge', ms: (p) => ([0, 3200, 2800, 2400][p] || 3000) / 0.82 },
            soul_tithe: { anim: 'slam', ms: () => 1500 },
        },
    },
    boss_abyss: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 45, y: 100, px: 267, py: 330, par: null },
            { n: 'clawArm', x: 364, y: 188, px: 385, py: 295, par: 'body' },
            { n: 'staffArm', x: 8, y: 93, px: 150, py: 295, par: 'body' },
        ],
        mechanics: {
            fading_light: { anim: 'darkfall', ms: () => 2400 },
            frozen_cells: { anim: 'frostclaw', ms: () => 1800 },
        },
    },
    boss_aegis: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 142, y: 114, px: 260, py: 330, par: null },
            { n: 'hammerArm', x: 50, y: 229, px: 175, py: 238, par: 'body' },
            { n: 'shield', x: 357, y: 150, px: 366, py: 262, par: 'body' },
        ],
        mechanics: {
            aegis_protocol: { anim: 'bulwark', ms: () => 2200 },
            shield_charge: { anim: 'shieldrush', ms: () => 1500 },
            sentry_shields: { anim: 'sentry', ms: () => 1900 },
            guard_rotor: { anim: 'rotor', ms: () => 2200 },
        },
    },
    boss_arbiter: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 143, y: 105, px: 262, py: 340, par: null },
            { n: 'staff', x: 12, y: 134, px: 140, py: 288, par: 'body' },
            { n: 'scales', x: 305, y: 161, px: 405, py: 180, par: 'body' },
        ],
        mechanics: {
            stillness_trial: { anim: 'verdict', ms: () => 2400 },
            fated_cell: { anim: 'fate', ms: () => 1900 },
            probability_shift: { anim: 'dieshift', ms: () => 1600 },
        },
    },
    boss_architect: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 153, y: 118, px: 275, py: 330, par: null },
            { n: 'compassArm', x: 6, y: 123, px: 180, py: 265, par: 'body' },
            { n: 'blueprintArm', x: 305, y: 225, px: 400, py: 255, par: 'body' },
        ],
        mechanics: {
            sinking_platforms: { anim: 'platforms', ms: () => 2200 },
            probability_shift: { anim: 'blueprintshift', ms: () => 1700 },
        },
    },
    // >>> rig boss_barricade
    boss_barricade: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 66, y: 63, px: 255, py: 300, par: null },
            { n: 'leftArm', x: 8, y: 113, px: 130, py: 150, par: 'body' },
            { n: 'rightArm', x: 383, y: 130, px: 435, py: 150, par: 'body' },
        ],
        mechanics: {
            bullet_walls: { anim: 'bcd_walls', ms: () => 2400 },
            soul_tithe: { anim: 'bcd_tithe', ms: () => 2400 },
        },
    },
    // <<< rig boss_barricade
    // >>> rig boss_barrage
    boss_barrage: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 220, y: 87, px: 340, py: 330, par: null },
            { n: 'gatling', x: 98, y: 206, px: 240, py: 290, par: 'body' },
            { n: 'clawArm', x: 417, y: 267, px: 445, py: 285, par: 'body' },
            { n: 'shells', x: 3, y: 96, px: 215, py: 250, par: 'body' },
        ],
        mechanics: {
            shelling_curtain: { anim: 'bar_curtain', ms: () => 2400 },
            corrupt_cells: { anim: 'bar_corrupt', ms: () => 2000 },
            supply_drop: { anim: 'bar_supply', ms: () => 2200 },
            shot_shells: { anim: 'bar_shells', ms: () => 2000 },
        },
    },
    // <<< rig boss_barrage
    // >>> rig boss_bayes
    boss_bayes: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 110, y: 16, px: 250, py: 330, par: null },
            { n: 'capeL', x: 26, y: 331, px: 100, py: 340, par: 'body' },
            { n: 'staff', x: 8, y: 22, px: 95, py: 265, par: 'body' },
            { n: 'orb', x: 348, y: 99, px: 375, py: 300, par: 'body' },
        ],
        mechanics: {
            posterior_bolts: { anim: 'bay_bolts', ms: () => 2200 },
            prior_bomb: { anim: 'bay_bomb', ms: () => 1800 },
            evidence_wisps: { anim: 'bay_wisps', ms: () => 2400 },
            belief_veil: { anim: 'bay_veil', ms: () => 2600 },
        },
    },
    // <<< rig boss_bayes
    // >>> rig boss_belt
    boss_belt: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 78, y: 79, px: 256, py: 300, par: null },
            { n: 'iceFist', x: 3, y: 174, px: 110, py: 260, par: 'body' },
            { n: 'fireFist', x: 376, y: 163, px: 420, py: 270, par: 'body' },
        ],
        mechanics: {
            splitter_rocks: { anim: 'blt_rocks', ms: () => 2200 },
            fated_cell: { anim: 'blt_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_belt
    // >>> rig boss_bloom
    boss_bloom: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 27, y: 298, px: 256, py: 400, par: null },
            { n: 'flower', x: 18, y: 10, px: 240, py: 310, par: 'body' },
            { n: 'cloud', x: 253, y: 10, px: 280, py: 185, par: 'body' },
            { n: 'shard', x: 316, y: 253, px: 335, py: 350, par: 'body' },
        ],
        mechanics: {
            scarlet_blooms: { anim: 'blm_blooms', ms: () => 2000 },
            corrupt_cells: { anim: 'blm_corrupt', ms: () => 1900 },
            seed_volley: { anim: 'blm_volley', ms: () => 1800 },
            withering_bloom: { anim: 'blm_wither', ms: () => 2300 },
        },
    },
    // <<< rig boss_bloom
    // >>> rig boss_bomber
    boss_bomber: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 145, y: 78, px: 265, py: 330, par: null },
            { n: 'armL', x: 43, y: 220, px: 205, py: 275, par: 'body' },
            { n: 'armR', x: 328, y: 213, px: 340, py: 268, par: 'body' },
            { n: 'bombUL', x: 86, y: 48, px: 122, py: 100, par: 'body' },
            { n: 'bombTop', x: 218, y: 6, px: 255, py: 38, par: 'body' },
            { n: 'bombR', x: 381, y: 91, px: 420, py: 155, par: 'body' },
        ],
        mechanics: {
            mine_collar: { anim: 'bmb_collar', ms: () => 3000 },
            carpet_run: { anim: 'bmb_carpet', ms: () => 2600 },
            cluster_shells: { anim: 'bmb_cluster', ms: () => 2800 },
        },
    },
    // <<< rig boss_bomber
    // >>> rig boss_centipede
    boss_centipede: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 53, y: 101, px: 300, py: 300, par: null },
            { n: 'head', x: 3, y: 198, px: 190, py: 300, par: 'body' },
            { n: 'tail', x: 382, y: 208, px: 400, py: 300, par: 'body' },
        ],
        mechanics: {
            clue_scramble: { anim: 'cen_scramble', ms: () => 2000 },
        },
    },
    // <<< rig boss_centipede
    // >>> rig boss_bumper
    boss_bumper: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 68, y: 123, px: 256, py: 300, par: null },
            { n: 'hornL', x: 148, y: 83, px: 172, py: 150, par: 'body' },
            { n: 'hornR', x: 296, y: 80, px: 318, py: 150, par: 'body' },
            { n: 'jaw', x: 136, y: 241, px: 215, py: 255, par: 'body' },
        ],
        mechanics: {
            fog_bank: { anim: 'bmp_fog', ms: () => 2000 },
        },
    },
    // <<< rig boss_bumper
    // >>> rig boss_buzz
    boss_buzz: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 148, y: 120, px: 262, py: 330, par: null },
            { n: 'sawL', x: 18, y: 206, px: 172, py: 280, par: 'body' },
            { n: 'sawR', x: 348, y: 206, px: 358, py: 280, par: 'body' },
        ],
        mechanics: {
            ricochet_saws: { anim: 'buz_ricochet', ms: () => 2200 },
            cut_line: { anim: 'buz_cutline', ms: () => 2600 },
            saw_traps: { anim: 'buz_traps', ms: () => 2400 },
            pendulum_blades: { anim: 'buz_pendulum', ms: () => 2600 },
        },
    },
    // <<< rig boss_buzz
    // >>> rig boss_clock
    boss_clock: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 126, y: 118, px: 255, py: 340, par: null },
            { n: 'armL', x: 3, y: 237, px: 150, py: 252, par: 'body' },
            { n: 'armR', x: 370, y: 122, px: 372, py: 222, par: 'body' },
        ],
        mechanics: {
            clock_hands: { anim: 'clk_hands', ms: () => 2400 },
            probability_shift: { anim: 'clk_shift', ms: () => 1800 },
        },
    },
    // <<< rig boss_clock
    // >>> rig boss_brutus
    boss_brutus: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 134, y: 87, px: 255, py: 330, par: null },
            { n: 'armL', x: 5, y: 166, px: 135, py: 195, par: 'body' },
            { n: 'armR', x: 341, y: 170, px: 365, py: 200, par: 'body' },
        ],
        mechanics: {
            ground_slam: { anim: 'bru_slam', ms: () => 1900 },
            sacrificial_zombies: { anim: 'bru_zombies', ms: () => 2000 },
            corrupt_cells: { anim: 'bru_corrupt', ms: () => 1800 },
        },
    },
    // <<< rig boss_brutus
    // >>> rig boss_chaos
    boss_chaos: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 104, y: 80, px: 255, py: 300, par: null },
            { n: 'staffArm', x: 10, y: 95, px: 125, py: 215, par: 'body' },
            { n: 'diceArm', x: 398, y: 127, px: 395, py: 225, par: 'body' },
            { n: 'lowLeft', x: 25, y: 270, px: 155, py: 305, par: 'body' },
            { n: 'lowRight', x: 350, y: 285, px: 355, py: 310, par: 'body' },
        ],
        mechanics: {
            chaos_roulette: { anim: 'cha_roulette', ms: () => 2600 },
            war_shout: { anim: 'cha_roar', ms: () => 1900 },
            fog_bank: { anim: 'cha_fog', ms: () => 2300 },
        },
    },
    // <<< rig boss_chaos
    // >>> rig boss_coil
    boss_coil: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 28, y: 110, px: 250, py: 300, par: null },
            { n: 'head', x: 170, y: 109, px: 300, py: 270, par: 'body' },
            { n: 'tailCoil', x: 19, y: 170, px: 160, py: 255, par: 'body' },
        ],
        mechanics: {
            frozen_cells: { anim: 'coi_freeze', ms: () => 2200 },
        },
    },
    // <<< rig boss_coil
    // >>> rig boss_creeper
    boss_creeper: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 94, y: 110, px: 249, py: 300, par: null },
            { n: 'armL', x: 44, y: 278, px: 109, py: 295, par: 'body' },
            { n: 'armR', x: 357, y: 270, px: 374, py: 290, par: 'body' },
            { n: 'fuse', x: 204, y: 40, px: 249, py: 118, par: 'body' },
        ],
        mechanics: {
            creeper_pack: { anim: 'cre_pack', ms: () => 2300 },
            fuse_pounce: { anim: 'cre_pounce', ms: () => 1800 },
            tnt_chain: { anim: 'cre_tnt', ms: () => 2400 },
        },
    },
    // <<< rig boss_creeper
    // >>> rig boss_colossus
    boss_colossus: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 146, y: 98, px: 260, py: 330, par: null },
            { n: 'club', x: 3, y: 104, px: 170, py: 235, par: 'body' },
            { n: 'armR', x: 348, y: 137, px: 395, py: 190, par: 'body' },
            { n: 'legR', x: 312, y: 282, px: 350, py: 296, par: 'body' },
        ],
        mechanics: {
            seismic_stride: { anim: 'col_stride', ms: () => 2200 },
            corrupt_cells: { anim: 'col_corrupt', ms: () => 1900 },
            boulder_rain: { anim: 'col_boulders', ms: () => 2300 },
            granite_golems: { anim: 'col_golems', ms: () => 2200 },
        },
    },
    // <<< rig boss_colossus
    // >>> rig boss_cyclops
    boss_cyclops: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 188, y: 92, px: 320, py: 395, par: null },
            { n: 'club', x: 3, y: 134, px: 140, py: 320, par: 'body' },
            { n: 'rightArm', x: 393, y: 158, px: 440, py: 195, par: 'body' },
        ],
        mechanics: {
            eye_bursts: { anim: 'cyc_eyeburst', ms: () => 2200 },
            prior_bomb: { anim: 'cyc_clubbomb', ms: () => 1900 },
        },
    },
    // <<< rig boss_cyclops
    // >>> rig boss_duelist
    boss_duelist: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 156, y: 64, px: 300, py: 330, par: null },
            { n: 'rapierArm', x: 6, y: 214, px: 215, py: 248, par: 'body' },
            { n: 'offArm', x: 376, y: 232, px: 395, py: 252, par: 'body' },
        ],
        mechanics: {
            flurry: { anim: 'due_flurry', ms: () => 1900 },
            fated_cell: { anim: 'due_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_duelist
    // >>> rig boss_dancer
    boss_dancer: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 70, y: 45, px: 280, py: 300, par: null },
            { n: 'lArm', x: 3, y: 104, px: 205, py: 232, par: 'body' },
            { n: 'rArm', x: 333, y: 148, px: 335, py: 235, par: 'body' },
            { n: 'kickLeg', x: 340, y: 286, px: 352, py: 312, par: 'body' },
        ],
        mechanics: {
            dance_steps: { anim: 'dan_steps', ms: () => 2400 },
            fated_cell: { anim: 'dan_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_dancer
    // >>> rig boss_dreadnought
    boss_dreadnought: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 24, y: 183, px: 260, py: 330, par: null },
            { n: 'bridge', x: 193, y: 115, px: 255, py: 250, par: 'body' },
            { n: 'portGuns', x: 3, y: 153, px: 215, py: 258, par: 'body' },
            { n: 'starGuns', x: 298, y: 166, px: 325, py: 262, par: 'body' },
        ],
        mechanics: {
            broadsides: { anim: 'dre_broadsides', ms: () => 2400 },
            searchlight: { anim: 'dre_searchlight', ms: () => 2200 },
            corrupt_cells: { anim: 'dre_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_dreadnought
    // >>> rig boss_demolitionist
    boss_demolitionist: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 54, y: 91, px: 150, py: 300, par: null },
            { n: 'ball', x: 220, y: 126, px: 262, py: 180, par: 'rightArm' },
            { n: 'leftArm', x: 6, y: 210, px: 90, py: 262, par: 'body' },
            { n: 'rightArm', x: 213, y: 164, px: 228, py: 238, par: 'body' },
        ],
        mechanics: {
            sticky_bombs: { anim: 'dem_stickyvolley', ms: () => 2200 },
            big_bomb: { anim: 'dem_megaswing', ms: () => 2800 },
            corrupt_cells: { anim: 'dem_corruptfuse', ms: () => 2400 },
        },
    },
    // <<< rig boss_demolitionist
    // >>> rig boss_dynamo
    boss_dynamo: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 118, y: 37, px: 260, py: 380, par: null },
            { n: 'armL', x: 6, y: 188, px: 140, py: 290, par: 'body' },
            { n: 'armR', x: 370, y: 98, px: 375, py: 270, par: 'body' },
        ],
        mechanics: {
            spark_pillars: { anim: 'dyn_pillars', ms: () => 2400 },
            lightning_conductors: { anim: 'dyn_conductors', ms: () => 2600 },
            prior_bomb: { anim: 'dyn_bomb', ms: () => 2200 },
        },
    },
    // <<< rig boss_dynamo
    // >>> rig boss_ember
    boss_ember: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 73, y: 7, px: 250, py: 330, par: null },
            { n: 'smoke', x: 333, y: 54, px: 335, py: 215, par: 'body' },
            { n: 'armL', x: 6, y: 181, px: 110, py: 285, par: 'body' },
            { n: 'armR', x: 323, y: 294, px: 355, py: 305, par: 'body' },
        ],
        mechanics: {
            ember_drift: { anim: 'emb_drift', ms: () => 2400 },
            prior_bomb: { anim: 'emb_bombtoss', ms: () => 1900 },
        },
    },
    // <<< rig boss_ember
    // >>> rig boss_eclipse
    boss_eclipse: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 37, px: 253, py: 255, par: null },
            { n: 'core', x: 115, y: 123, px: 253, py: 255, par: 'body' },
            { n: 'diceL', x: 7, y: 280, px: 45, py: 310, par: 'body' },
            { n: 'diceR', x: 423, y: 176, px: 443, py: 198, par: 'body' },
            { n: 'diceT', x: 146, y: 54, px: 165, py: 74, par: 'body' },
        ],
        mechanics: {
            umbral_dashes: { anim: 'ecl_dash', ms: () => 1900 },
            fated_cell: { anim: 'ecl_fate', ms: () => 2200 },
        },
    },
    // <<< rig boss_eclipse
    // >>> rig boss_encore
    boss_encore: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 23, y: 4, px: 250, py: 330, par: null },
            { n: 'micArm', x: 336, y: 140, px: 350, py: 265, par: 'body' },
            { n: 'leftArm', x: 60, y: 316, px: 150, py: 335, par: 'body' },
        ],
        mechanics: {
            encore_circles: { anim: 'enc_circles', ms: () => 2600 },
            sound_bars: { anim: 'enc_bars', ms: () => 2200 },
            stage_lights: { anim: 'enc_lights', ms: () => 2400 },
            beat_mines: { anim: 'enc_mines', ms: () => 2600 },
        },
    },
    // <<< rig boss_encore
    // >>> rig boss_entropy
    boss_entropy: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 56, y: 98, px: 255, py: 330, par: null },
            { n: 'head', x: 183, y: 38, px: 262, py: 226, par: 'body' },
            { n: 'leftArm', x: 48, y: 258, px: 168, py: 290, par: 'body' },
            { n: 'rightArm', x: 356, y: 260, px: 368, py: 292, par: 'body' },
        ],
        mechanics: {
            heat_death_drift: { anim: 'ent_drift', ms: () => 2400 },
            recursive_decay: { anim: 'ent_decay', ms: () => 2200 },
            maxwells_door: { anim: 'ent_door', ms: () => 2200 },
        },
    },
    // <<< rig boss_entropy
    // >>> rig boss_gourmet
    boss_gourmet: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 8, y: 82, px: 250, py: 330, par: null },
            { n: 'plateL', x: 5, y: 108, px: 60, py: 255, par: 'body' },
            { n: 'plateR', x: 338, y: 222, px: 370, py: 300, par: 'body' },
        ],
        mechanics: {
            gourmet_gulp: { anim: 'gou_gulp', ms: () => 2400 },
            corrupt_cells: { anim: 'gou_corrupt', ms: () => 1900 },
        },
    },
    // <<< rig boss_gourmet
    // >>> rig boss_exarch
    boss_exarch: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 158, y: 183, px: 262, py: 330, par: null },
            { n: 'crown', x: 181, y: 92, px: 262, py: 190, par: 'body' },
            { n: 'book', x: 13, y: 178, px: 150, py: 310, par: 'body' },
            { n: 'staff', x: 325, y: 111, px: 385, py: 320, par: 'body' },
        ],
        mechanics: {
            constriction: { anim: 'exa_constrict', ms: () => 2400 },
            prior_bomb: { anim: 'exa_bomb', ms: () => 1900 },
        },
    },
    // <<< rig boss_exarch
    // >>> rig boss_gale
    boss_gale: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 148, y: 96, px: 255, py: 360, par: null },
            { n: 'cloakL', x: 17, y: 223, px: 190, py: 290, par: 'body' },
            { n: 'cloakR', x: 343, y: 213, px: 350, py: 300, par: 'body' },
            { n: 'scrap', x: 378, y: 156, px: 415, py: 210, par: 'body' },
        ],
        mechanics: {
            gale_vault: { anim: 'gal_vault', ms: () => 2100 },
            probability_shift: { anim: 'gal_shift', ms: () => 1800 },
        },
    },
    // <<< rig boss_gale
    // >>> rig boss_gambler
    boss_gambler: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 96, y: 138, px: 255, py: 330, par: null },
            { n: 'hat', x: 140, y: 4, px: 250, py: 125, par: 'body' },
            { n: 'cardArm', x: 56, y: 190, px: 190, py: 285, par: 'body' },
            { n: 'diceArm', x: 314, y: 145, px: 335, py: 278, par: 'body' },
        ],
        mechanics: {
            loaded_dice: { anim: 'gam_dice', ms: () => 1900 },
            soul_tithe: { anim: 'gam_tithe', ms: () => 2400 },
        },
    },
    // <<< rig boss_gambler
    // >>> rig boss_executioner
    boss_executioner: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 138, y: 116, px: 280, py: 330, par: null },
            { n: 'axe', x: 4, y: 102, px: 350, py: 135, par: 'body' },
            { n: 'cape', x: 358, y: 254, px: 385, py: 280, par: 'body' },
        ],
        mechanics: {
            axe_pendulum: { anim: 'exe_pendulum', ms: () => 2800 },
            prior_bomb: { anim: 'exe_bomb', ms: () => 2000 },
        },
    },
    // <<< rig boss_executioner
    boss_guardian: {
        S: 0.382, ox: 1, oy: 115,
        parts: [
            { n: 'wingL', x: 3, y: 136, px: 174.2, py: 229.9, par: 'body' },
            { n: 'wingR', x: 341, y: 137, px: 337.8, py: 229.9, par: 'body' },
            { n: 'body', x: 128, y: 148, px: 256.2, py: 275.0, par: null },
            { n: 'dice', x: 157, y: 115, px: 256.2, py: 158.4, par: 'body' },
        ],
        mechanics: {
            lock_on: { anim: 'nova', ms: () => 2200 },
            clue_scramble: { anim: 'flap', ms: () => 1600 },
        },
    },
};

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ---- poses (pose objects: rot deg, dx/dy source-art px, sc scale) --------
const POSES = {
    slam(P, u) {
        let h;
        if (u < 0.4) h = ease(u / 0.4); else if (u < 0.5) h = 1 - Math.pow((u - 0.4) / 0.1, 2); else h = 0;
        const pulse = u >= 0.5 ? Math.max(0, 1 - (u - 0.5) * 4) : 0;
        P.fistL.rot = 62 * h; P.fistR.rot = -62 * h; P.fistL.dy = -14 * h; P.fistR.dy = -14 * h;
        P.fistL.sc = P.fistR.sc = 1 + 0.2 * pulse + 0.05 * h;
        P.pauldronL.rot = 7 * h; P.pauldronR.rot = -7 * h;
        P.torso.rot = -3 * h + 1.5 * pulse; P.torso.dy = -12 * h + 18 * pulse;
        P.legL.dy = P.legR.dy = 6 * pulse;
    },
    charge(P, u) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        P.torso.sc = 1 + 0.035 * g * pl; P.torso.dy = -4 * g;
        P.fistL.rot = 16 * g; P.fistR.rot = -16 * g;
        P.fistL.dx = Math.sin(u * 70) * 3 * g; P.fistR.dx = -Math.sin(u * 70) * 3 * g;
        P.legL.dy = P.legR.dy = 4 * g; P.pauldronL.rot = 4 * g; P.pauldronR.rot = -4 * g;
    },
    nova(P, u) {
        const c = ease(u / 0.62), rel = u > 0.62 ? Math.exp(-(u - 0.62) * 6) : 0, fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            P.body.dy = -26 * c + Math.sin(u * 50) * 2 * c;
            P.wingL.rot = 32 * c + fl * 5 * c; P.wingR.rot = -32 * c - fl * 5 * c;
            P.dice.dy = -22 * c; P.dice.sc = 1 + 0.09 * c; P.dice.rot = Math.sin(u * 40) * 4 * c;
        } else {
            P.body.dy = -26 * rel + 10 * (1 - rel) * Math.exp(-(u - 0.66) * 3);
            P.wingL.rot = 32 * rel - 18 * (1 - rel) * Math.exp(-(u - 0.66) * 4); P.wingR.rot = -P.wingL.rot;
            P.dice.dy = -22 * rel; P.dice.sc = 1 + 0.09 * rel;
        }
    },
    flap(P, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        P.body.dy = -14 * g + Math.sin(u * 30) * 3 * g;
        P.wingL.rot = Math.sin(u * 70) * 26 * g + 8 * g; P.wingR.rot = -Math.sin(u * 70) * 26 * g - 8 * g;
        P.dice.rot = Math.sin(u * 45) * 9 * g; P.dice.dy = Math.sin(u * 55) * 8 * g;
    },
};

// ---- effects, drawn in source-art space on top of the parts ---------------
const FX = {
    slam(ctx, u) {
        if (u < 0.5) return 0;
        const v = (u - 0.5) / 0.5;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.12; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(255,235,190,' + (0.7 * (1 - r)) + ')'; ctx.lineWidth = 14 * (1 - r) + 2;
            ctx.beginPath(); ctx.ellipse(610, 690, 60 + r * 620, 18 + r * 120, 0, 0, 7); ctx.stroke();
        }
        for (let i = 0; i < 14; i++) {
            const a = i * 0.9 + 1, d = v * (180 + (i % 5) * 40), y = 690 - Math.sin(v * 3) * 60 * (1 + (i % 3) * 0.3);
            ctx.fillStyle = 'rgba(190,170,140,' + (0.6 * (1 - v)) + ')'; ctx.beginPath();
            ctx.arc(610 + Math.cos(a) * d * (i % 2 ? 1 : -1), y - Math.abs(Math.sin(a)) * 30, 8 + (i % 4) * 4 * (1 - v), 0, 7); ctx.fill();
        }
        return 0;
    },
    charge(ctx, u, dy) {
        const g = ease(u / 0.7), pl = Math.sin(u * 38) * 0.5 + 0.5;
        const gr = ctx.createRadialGradient(640, 160 + dy, 10, 640, 160 + dy, 170 + 60 * pl);
        gr.addColorStop(0, 'rgba(180,255,150,' + (0.8 * g) + ')'); gr.addColorStop(1, 'rgba(120,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(640, 160 + dy, 230, 0, 7); ctx.fill();
        for (let i = 0; i < 26; i++) {
            const ph = ((u * 1.4 + i / 26) % 1), ang = i * 2.399, rr = (1 - ph) * 520 * Math.min(1, g * 1.4);
            ctx.fillStyle = 'rgba(190,255,170,' + (g * ph) + ')'; ctx.beginPath();
            ctx.arc(650 + Math.cos(ang) * rr, 300 + dy + Math.sin(ang) * rr * 0.7, 5 + 6 * ph, 0, 7); ctx.fill();
        }
        if (u > 0.82) {
            const v = (u - 0.82) / 0.18;
            ctx.strokeStyle = 'rgba(210,255,190,' + (1 - v) + ')'; ctx.lineWidth = 26 * (1 - v) + 3;
            ctx.beginPath(); ctx.arc(650, 300 + dy, 60 + v * 620, 0, 7); ctx.stroke();
            return 0.45 * (1 - v);
        }
        return 0;
    },
    nova(ctx, u, dy) {
        const ex = 694, ey = 300 + dy, c = ease(u / 0.62), fl = Math.sin(u * 55) * 0.5 + 0.5;
        if (u < 0.66) {
            const gr = ctx.createRadialGradient(ex, ey, 5, ex, ey, 90 + 170 * c);
            gr.addColorStop(0, 'rgba(200,255,255,' + (0.95 * c) + ')'); gr.addColorStop(1, 'rgba(40,220,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, ey, 90 + 170 * c + fl * 20, 0, 7); ctx.fill();
            for (let i = 0; i < 30; i++) {
                const ph = ((u * 1.6 + i / 30) % 1), ang = i * 2.399, rr = (1 - ph) * 600 * Math.min(1, c * 1.5);
                ctx.fillStyle = 'rgba(150,240,255,' + (c * ph) + ')'; ctx.beginPath();
                ctx.arc(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr * 0.8, 4 + 6 * ph, 0, 7); ctx.fill();
            }
            return 0;
        }
        const v = (u - 0.66) / 0.34;
        for (let i = 0; i < 3; i++) {
            const r = v - i * 0.1; if (r <= 0) continue;
            ctx.strokeStyle = 'rgba(190,250,255,' + (0.9 * (1 - r)) + ')'; ctx.lineWidth = 30 * (1 - r) + 3;
            ctx.beginPath(); ctx.arc(ex, ey, 40 + r * 1100, 0, 7); ctx.stroke();
        }
        return 0.55 * Math.max(0, 1 - v * 2.5);
    },
    flap(ctx, u) {
        const g = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        for (let i = 0; i < 10; i++) {
            const ph = ((u * 2 + i / 10) % 1), side = i % 2 ? 1 : -1;
            ctx.strokeStyle = 'rgba(190,240,255,' + (0.5 * g * (1 - ph)) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(668 + side * (330 + ph * 380), 200 + ph * 260);
            ctx.lineTo(668 + side * (380 + ph * 470), 240 + ph * 300); ctx.stroke();
        }
        return 0;
    },
};

// ---- The Abyss -------------------------------------------------------------
// Fading Light: the Abyss raises its staff and inhales the light (motes spiral
// into its mouth, eyes flare), then exhales a wave of darkness.
// Frozen Cells: the clawed hand rises, then snaps down in a freezing slash.
Object.assign(POSES, {
    darkfall(P, u) {
        const c = ease(u / 0.55), rel = u > 0.6 ? Math.exp(-(u - 0.6) * 5) : 0;
        const exhale = u > 0.58 ? Math.sin(Math.min(1, (u - 0.58) / 0.25) * Math.PI) : 0;
        P.body.sc = 1 - 0.04 * c * (u < 0.58 ? 1 : 0) + 0.07 * exhale;
        P.body.dy = 2 * c - 4 * exhale;
        const hold = u < 0.62 ? 1 : rel / Math.exp(-0.02 * 5);   // staff stays up, then drops back
        P.staffArm.rot = 24 * c * hold + Math.sin(u * 45) * 1.5 * c;
        P.staffArm.dy = -8 * c * hold;
        P.clawArm.rot = -8 * c * hold;
    },
    frostclaw(P, u) {
        const g = ease(u / 0.5), slash = ease((u - 0.5) / 0.12), back = ease((u - 0.62) / 0.38);
        const rot = u < 0.5 ? -26 * g : (u < 0.62 ? -26 + 40 * slash : 14 * (1 - back));
        P.clawArm.rot = rot + (u < 0.5 ? Math.sin(u * 60) * 1.2 * g : 0);
        P.body.rot = u < 0.5 ? -2 * g : -2 + 4 * slash * (1 - back);
        P.body.dx = u < 0.5 ? -3 * g : -3 + 8 * slash * (1 - back);
        P.body.sc = 1 + 0.04 * slash * (1 - back);
        P.staffArm.rot = 4 * g * (1 - back);
    },
});
Object.assign(FX, {
    darkfall(ctx, u) {
        const c = ease(u / 0.55);
        // light motes streaming into the mouth
        if (u < 0.6) {
            for (let i = 0; i < 28; i++) {
                const ph = ((u * 1.5 + i / 28) % 1), ang = i * 2.399, rr = (1 - ph) * 300 * Math.min(1, c * 1.6);
                ctx.fillStyle = 'rgba(220,205,255,' + (c * ph * 0.9) + ')'; ctx.beginPath();
                ctx.arc(267 + Math.cos(ang) * rr, 262 + Math.sin(ang) * rr * 0.7, 2 + 3 * ph, 0, 7); ctx.fill();
            }
        }
        // eyes flare
        [[230, 207], [307, 207]].forEach((e) => {
            const g = ctx.createRadialGradient(e[0], e[1], 2, e[0], e[1], 14 + 34 * c);
            g.addColorStop(0, 'rgba(190,170,255,' + (0.9 * c) + ')'); g.addColorStop(1, 'rgba(120,90,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e[0], e[1], 14 + 34 * c, 0, 7); ctx.fill();
        });
        // darkness wells out of the body after the exhale
        if (u > 0.58) {
            const v = Math.min(1, (u - 0.58) / 0.42), r = 60 + v * 330;
            const g = ctx.createRadialGradient(267, 240, r * 0.3, 267, 240, r);
            g.addColorStop(0, 'rgba(8,4,18,' + (0.55 * (1 - v)) + ')'); g.addColorStop(1, 'rgba(8,4,18,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(267, 240, r, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(150,110,255,' + (0.8 * (1 - v)) + ')'; ctx.lineWidth = 8 * (1 - v) + 1;
            ctx.beginPath(); ctx.arc(267, 240, 40 + v * 300, 0, 7); ctx.stroke();
        }
        return 0;
    },
    frostclaw(ctx, u) {
        const g = ease(u / 0.5);
        // frost gathering round the claw while it rises
        if (u < 0.62) {
            const gr = ctx.createRadialGradient(448, 215, 3, 448, 215, 20 + 50 * g);
            gr.addColorStop(0, 'rgba(210,245,255,' + (0.85 * g) + ')'); gr.addColorStop(1, 'rgba(120,200,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(448, 215, 20 + 50 * g, 0, 7); ctx.fill();
            for (let i = 0; i < 14; i++) {
                const a = i * 0.9 + u * 6, r = 14 + 40 * g * (0.5 + 0.5 * ((i * 37) % 10) / 10);
                ctx.fillStyle = 'rgba(225,248,255,' + (0.8 * g) + ')'; ctx.beginPath();
                ctx.arc(448 + Math.cos(a) * r, 215 + Math.sin(a) * r, 2 + (i % 3), 0, 7); ctx.fill();
            }
        }
        // the slash: ice shards fan out and a frost ring spreads along the floor
        if (u >= 0.5) {
            const v = Math.min(1, (u - 0.5) / 0.5);
            for (let i = 0; i < 7; i++) {
                const a = -2.6 + i * 0.32, len = 20 + v * (120 + (i % 3) * 30);
                const x = 448 + Math.cos(a) * 20, y = 230 + Math.sin(a) * 20 + v * 40;
                ctx.strokeStyle = 'rgba(200,240,255,' + (0.9 * (1 - v)) + ')'; ctx.lineWidth = 5 * (1 - v) + 1;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 0.5) * -len * 0.6 + 0, y - Math.sin(a) * len * 0.5 + len * 0.8); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(170,225,255,' + (0.7 * (1 - v)) + ')'; ctx.lineWidth = 8 * (1 - v) + 1;
            ctx.beginPath(); ctx.ellipse(267, 405, 30 + v * 250, 8 + v * 40, 0, 0, 7); ctx.stroke();
            return 0.3 * Math.max(0, 1 - v * 3);
        }
        return 0;
    },
});

// ---- The Aegis -------------------------------------------------------------
// Aegis Protocol: shield and hammer go up, a ward bubble forms and the guard
//   squad rises from the floor.   Shield Charge: dig in, then lunge.
// Sentry Shields: hammer slam launches two homing orbs.   Guard Rotor: the
//   hammer sweeps while two orbs orbit and tether a radar beam.
Object.assign(POSES, {
    bulwark(P, u) {
        const g = ease(u / 0.35) * (1 - ease((u - 0.85) / 0.15)), pl = Math.sin(u * 20);
        P.shield.dy = -12 * g; P.shield.sc = 1 + 0.05 * g; P.shield.rot = -4 * g;
        P.hammerArm.rot = -20 * g; P.hammerArm.dy = -8 * g;
        P.body.dy = -3 * g; P.body.sc = 1 + 0.015 * pl * g;
    },
    shieldrush(P, u) {
        const back = ease(u / 0.35), l = ease((u - 0.35) / 0.25), r = ease((u - 0.6) / 0.4);
        let dx, rot;
        if (u < 0.35) { dx = 8 * back; rot = -3 * back; }
        else if (u < 0.6) { dx = 8 - 44 * l; rot = -3 + 12 * l; }
        else { dx = -36 * (1 - r); rot = 9 * (1 - r); }
        P.body.dx = dx; P.body.rot = rot;
        P.shield.sc = 1 + 0.16 * l * (1 - r); P.shield.dx = -8 * l * (1 - r);
        P.hammerArm.rot = 8 * back * (1 - l) - 6 * l * (1 - r);
    },
    sentry(P, u) {
        const g = ease(u / 0.4), s = ease((u - 0.4) / 0.1), r = ease((u - 0.5) / 0.5);
        let arm, lean;
        if (u < 0.4) { arm = -34 * g; lean = -2 * g; }
        else if (u < 0.5) { arm = -34 + 46 * s; lean = -2 + 4 * s; }
        else { arm = 12 * (1 - r); lean = 2 * (1 - r); }
        P.hammerArm.rot = arm; P.hammerArm.dy = u < 0.4 ? -10 * g : -10 * (1 - s);
        P.body.rot = lean; P.body.dy = 6 * s * (1 - r);
        P.shield.rot = 2 * s * (1 - r);
    },
    rotor(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 3);
        P.hammerArm.rot = 50 * w * env; P.hammerArm.dy = -6 * Math.abs(w) * env;
        P.body.rot = -4 * w * env; P.body.dy = -2 * Math.abs(w) * env;
        P.shield.rot = 3 * w * env;
    },
});
Object.assign(FX, {
    bulwark(ctx, u) {
        const g = ease(u / 0.35) * (1 - ease((u - 0.85) / 0.15)), pl = 0.7 + 0.3 * Math.sin(u * 22);
        const sg = ctx.createRadialGradient(428, 262, 5, 428, 262, 60 + 30 * pl);
        sg.addColorStop(0, 'rgba(120,240,255,' + (0.75 * g) + ')'); sg.addColorStop(1, 'rgba(60,200,255,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(428, 262, 60 + 30 * pl, 0, 7); ctx.fill();
        // ward bubble around the whole boss
        ctx.strokeStyle = 'rgba(140,235,255,' + (0.55 * g * pl) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(265, 260, 200, 150, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(100,220,255,' + (0.1 * g) + ')'; ctx.fill();
        // guard squad rising from the floor
        for (let i = 0; i < 3; i++) {
            const ring = u * 1.6 - i * 0.25;
            if (ring > 0 && ring < 1) {
                ctx.strokeStyle = 'rgba(140,235,255,' + (0.8 * (1 - ring)) + ')'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.ellipse(265, 392, 40 + ring * 220, 10 + ring * 40, 0, 0, 7); ctx.stroke();
            }
        }
        if (u > 0.45) {
            const k = ease((u - 0.45) / 0.3) * (1 - ease((u - 0.9) / 0.1));
            [[130, 392], [400, 396], [265, 405]].forEach((p) => {
                ctx.fillStyle = 'rgba(150,235,255,' + (0.85 * k) + ')'; ctx.beginPath();
                ctx.arc(p[0], p[1] - 24 * k, 13 * k, 0, 7); ctx.fill();
                ctx.fillRect(p[0] - 8 * k, p[1] - 24 * k + 6, 16 * k, 22 * k);
            });
        }
        return 0;
    },
    shieldrush(ctx, u) {
        const l = ease((u - 0.35) / 0.25), r = ease((u - 0.6) / 0.4), a = l * (1 - r);
        if (u > 0.2 && u < 0.45) {   // digging in: dust kicks up behind the heels
            const k = (u - 0.2) / 0.25;
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = 'rgba(200,190,170,' + (0.5 * (1 - k)) + ')'; ctx.beginPath();
                ctx.arc(330 + i * 12 + k * 20, 392 - k * 18 - (i % 3) * 6, 7 + 5 * k, 0, 7); ctx.fill();
            }
        }
        for (let i = 0; i < 7; i++) {   // speed streaks trailing behind the lunge
            const y = 170 + i * 36, len = 90 + (i % 3) * 40;
            ctx.strokeStyle = 'rgba(225,240,255,' + (0.95 * a) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(380 + (i % 2) * 20, y); ctx.lineTo(380 + len + (i % 2) * 20, y); ctx.stroke();
        }
        if (u > 0.6) {   // stone shards where the charge finishes
            const k = (u - 0.6) / 0.4;
            for (let i = 0; i < 8; i++) {
                const ang = -Math.PI * (0.15 + 0.7 * i / 8);
                ctx.fillStyle = 'rgba(190,190,200,' + (0.8 * (1 - k)) + ')'; ctx.beginPath();
                ctx.arc(240 - Math.cos(ang) * k * 90, 392 + Math.sin(ang) * k * 70, 4, 0, 7); ctx.fill();
            }
        }
        return 0;
    },
    sentry(ctx, u) {
        if (u < 0.4) {   // shield charges while the hammer is up
            const g = ease(u / 0.4);
            const sg = ctx.createRadialGradient(428, 262, 5, 428, 262, 70);
            sg.addColorStop(0, 'rgba(120,240,255,' + (0.6 * g) + ')'); sg.addColorStop(1, 'rgba(60,200,255,0)');
            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(428, 262, 70, 0, 7); ctx.fill();
            return 0;
        }
        const v = Math.min(1, (u - 0.45) / 0.55);
        if (u > 0.42) {
            const k = Math.min(1, (u - 0.42) / 0.5);
            ctx.strokeStyle = 'rgba(210,230,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(96, 376, 20 + k * 140, 6 + k * 24, 0, 0, 7); ctx.stroke();
        }
        if (u > 0.45) {   // two orbs fly out from the sentry shields
            [[96, 330, -1], [428, 262, 1]].forEach((o) => {
                const x = o[0] + o[2] * v * 190, y = o[1] - v * 150;
                for (let t = 0; t < 6; t++) {
                    const tv = Math.max(0, v - t * 0.04);
                    ctx.fillStyle = 'rgba(120,235,255,' + (0.5 * (1 - t / 6)) + ')'; ctx.beginPath();
                    ctx.arc(o[0] + o[2] * tv * 190, o[1] - tv * 150, 11 - t, 0, 7); ctx.fill();
                }
                const g = ctx.createRadialGradient(x, y, 2, x, y, 24);
                g.addColorStop(0, 'rgba(230,255,255,0.95)'); g.addColorStop(1, 'rgba(80,210,255,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
            });
        }
        return 0;
    },
    rotor(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), a = u * 16;
        const cx = 265, cy = 262, R = 170, ry = 0.55;
        const ax = cx + Math.cos(a) * R, ay = cy + Math.sin(a) * R * ry, bx = cx - Math.cos(a) * R, by = cy - Math.sin(a) * R * ry;
        for (let t = 1; t <= 6; t++) {   // fading sweep trail
            const a0 = a - t * 0.18;
            ctx.strokeStyle = 'rgba(110,230,255,' + (0.35 * env * (1 - t / 7)) + ')'; ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R * ry); ctx.lineTo(cx - Math.cos(a0) * R, cy - Math.sin(a0) * R * ry);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(210,255,255,' + (0.9 * env) + ')'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        [[ax, ay], [bx, by]].forEach((o) => {
            const g = ctx.createRadialGradient(o[0], o[1], 2, o[0], o[1], 26);
            g.addColorStop(0, 'rgba(235,255,255,' + env + ')'); g.addColorStop(1, 'rgba(80,210,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o[0], o[1], 26, 0, 7); ctx.fill();
        });
        return 0;
    },
});


// ---- The Arbiter -----------------------------------------------------------
// Stillness Trial: staff and scales rise, a BLUE judgment wave rolls out, then
//   an ORANGE one (blue = do not move, orange = keep moving).
// Fated Cell: the staff points, a doom-clock ring closes in on its crystal.
// Probability Shift: the scales lurch and the dice jump between the pans.
Object.assign(POSES, {
    verdict(P, u) {
        const g = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        const sway = Math.sin(u * Math.PI * 4) * 8 * g;
        P.staff.rot = -14 * g; P.staff.dy = -6 * g;
        P.scales.rot = sway; P.scales.dy = -4 * g;
        P.body.dy = -2 * g; P.body.sc = 1 + 0.012 * g;
    },
    fate(P, u) {
        const g = ease(u / 0.3) * (1 - ease((u - 0.85) / 0.15));
        P.staff.rot = -20 * g + Math.sin(u * 40) * 1.2 * g; P.staff.dy = -8 * g;
        P.body.rot = -2 * g; P.body.dx = -3 * g;
        P.scales.rot = 3 * g;
    },
    dieshift(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.2));
        const w = Math.sin(u * Math.PI * 6);
        P.scales.rot = 16 * w * env; P.scales.dy = -6 * Math.abs(w) * env;
        P.body.dy = -2 * Math.abs(w) * env; P.body.rot = 1.5 * w * env;
        P.staff.rot = 4 * -w * env;
    },
});
Object.assign(FX, {
    verdict(ctx, u) {
        const g = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        // crystal charges at the top of the staff
        const cg = ctx.createRadialGradient(85, 195, 4, 85, 195, 70);
        cg.addColorStop(0, 'rgba(180,240,255,' + (0.7 * g) + ')'); cg.addColorStop(1, 'rgba(80,170,255,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(85, 195, 70, 0, 7); ctx.fill();
        // first the blue wave (do not move), then the orange wave (keep moving)
        [[0.15, 0.55, '80,160,255'], [0.5, 0.92, '255,160,60']].forEach((w) => {
            if (u < w[0] || u > w[1]) return;
            const v = (u - w[0]) / (w[1] - w[0]);
            for (let i = 0; i < 2; i++) {
                const r = v - i * 0.15; if (r <= 0) continue;
                ctx.strokeStyle = 'rgba(' + w[2] + ',' + (0.85 * (1 - r)) + ')'; ctx.lineWidth = 14 * (1 - r) + 2;
                ctx.beginPath(); ctx.ellipse(262, 300, 40 + r * 330, 20 + r * 170, 0, 0, 7); ctx.stroke();
            }
            const eg = ctx.createRadialGradient(252, 205, 2, 252, 205, 40);
            eg.addColorStop(0, 'rgba(' + w[2] + ',0.9)'); eg.addColorStop(1, 'rgba(' + w[2] + ',0)');
            ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(252, 205, 40, 0, 7); ctx.fill();
        });
        // the two judgment colours shown on the pans while the scales sway
        ctx.fillStyle = 'rgba(80,160,255,' + (0.5 * g) + ')'; ctx.beginPath(); ctx.arc(350, 262, 22, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,60,' + (0.5 * g) + ')'; ctx.beginPath(); ctx.arc(450, 296, 22, 0, 7); ctx.fill();
        return 0;
    },
    fate(ctx, u) {
        const g = ease(u / 0.3) * (1 - ease((u - 0.85) / 0.15));
        const cx = 85, cy = 195;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
        cg.addColorStop(0, 'rgba(255,180,180,' + (0.8 * g) + ')'); cg.addColorStop(1, 'rgba(255,60,90,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, 7); ctx.fill();
        // doom clock: a ring that burns down around the crystal
        const left = Math.max(0, 1 - (u - 0.25) / 0.65);
        ctx.strokeStyle = 'rgba(255,90,110,' + (0.9 * g) + ')'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * g) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 82, 0, 7); ctx.stroke();
        // the fated mark appears out in front of the boss
        if (u > 0.3) {
            const k = ease((u - 0.3) / 0.2) * (1 - ease((u - 0.9) / 0.1)), mx = 300, my = 420;
            ctx.strokeStyle = 'rgba(255,90,110,' + (0.9 * k) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(mx, my, 28 * k, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mx - 40 * k, my); ctx.lineTo(mx + 40 * k, my);
            ctx.moveTo(mx, my - 40 * k); ctx.lineTo(mx, my + 40 * k); ctx.stroke();
        }
        return 0;
    },
    dieshift(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.2));
        // dice jumping from one pan to the other
        for (let i = 0; i < 5; i++) {
            const ph = ((u * 3 + i * 0.2) % 1), dir = i % 2 ? 1 : -1;
            const t = dir > 0 ? ph : 1 - ph;
            const x = 350 + t * 100, y = 262 + t * 36 - Math.sin(t * Math.PI) * 70;
            ctx.save(); ctx.translate(x, y); ctx.rotate(ph * 12 + i);
            ctx.fillStyle = 'rgba(245,245,255,' + (0.95 * env) + ')'; ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = 'rgba(40,50,90,' + env + ')'; ctx.fillRect(-3, -3, 4, 4);
            ctx.restore();
        }
        // glitch bars where the marks flicker
        for (let i = 0; i < 6; i++) {
            if (((u * 14 + i * 0.37) % 1) > 0.4) continue;
            ctx.fillStyle = 'rgba(120,220,255,' + (0.5 * env) + ')';
            ctx.fillRect(150 + ((i * 97) % 230), 150 + ((i * 53) % 220), 60 + (i % 3) * 30, 4);
        }
        return 0.18 * env * (Math.sin(u * 50) > 0.7 ? 1 : 0);
    },
});


// ---- The Architect ---------------------------------------------------------
// Sinking Platforms: the compass is thrust up, the blueprints lift, then the
//   fist stamps down - four floor tiles light up, one sinks and another rises.
// Probability Shift: the blueprints flutter as marks vanish and reappear.
Object.assign(POSES, {
    platforms(P, u) {
        const up = ease(u / 0.35), stamp = ease((u - 0.45) / 0.08), rec = ease((u - 0.55) / 0.45);
        const raise = u < 0.45 ? up : 1 - stamp;
        P.compassArm.rot = -22 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.compassArm.dy = -12 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.blueprintArm.rot = 16 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        P.blueprintArm.dy = -14 * raise * (1 - rec * (u > 0.55 ? 1 : 0));
        const hit = u > 0.5 ? Math.max(0, 1 - (u - 0.5) * 4) : 0;
        P.body.dy = -4 * raise + 8 * hit;
        P.body.sc = 1 + 0.02 * hit;
    },
    blueprintshift(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 7);
        P.blueprintArm.rot = 9 * w * env; P.blueprintArm.dy = -5 * Math.abs(w) * env;
        P.compassArm.rot = -5 * w * env; P.compassArm.dy = 3 * w * env;
        P.body.dy = -2 * Math.abs(w) * env; P.body.rot = 1.2 * w * env;
    },
});
Object.assign(FX, {
    platforms(ctx, u) {
        // compass needle glow while the arm is up
        const raise = u < 0.45 ? ease(u / 0.35) : 1 - ease((u - 0.45) / 0.08);
        const cg = ctx.createRadialGradient(85, 190, 4, 85, 190, 90);
        cg.addColorStop(0, 'rgba(120,255,240,' + (0.65 * raise) + ')'); cg.addColorStop(1, 'rgba(60,200,230,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(85, 190, 90, 0, 7); ctx.fill();
        // four floor tiles light up (isometric diamonds); one sinks, one rises elsewhere
        const tiles = [[110, 400], [270, 432], [430, 410], [330, 395]];
        const show = ease((u - 0.1) / 0.25);
        tiles.forEach((t, i) => {
            let a = show, s = 1;
            if (i === 1 && u > 0.5) { const k = ease((u - 0.5) / 0.4); s = 1 - 0.85 * k; a = show * (1 - k); }
            if (i === 3 && u > 0.55) { const k = ease((u - 0.55) / 0.4); s = 0.15 + 0.85 * k; a = show * (0.3 + 0.7 * k); }
            if (i === 3 && u <= 0.55) { s = 0.15; a = show * 0.3; }
            ctx.fillStyle = 'rgba(80,200,210,' + (0.28 * a) + ')'; ctx.strokeStyle = 'rgba(150,255,245,' + (0.85 * a) + ')'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(t[0], t[1] - 26 * s); ctx.lineTo(t[0] + 60 * s, t[1]); ctx.lineTo(t[0], t[1] + 26 * s); ctx.lineTo(t[0] - 60 * s, t[1]);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        // stamp shock
        if (u > 0.5) {
            const k = Math.min(1, (u - 0.5) / 0.45);
            ctx.strokeStyle = 'rgba(200,255,250,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(400, 380, 20 + k * 200, 6 + k * 50, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    blueprintshift(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2));
        // marks (crosses) fade out in one place and blink back in another
        for (let i = 0; i < 4; i++) {
            const ph = ((u * 2 + i * 0.25) % 1);
            const ax = 320 + i * 40, ay = 150 + (i % 2) * 40, bx = 120 + i * 50, by = 420 - (i % 2) * 30;
            const out = 1 - ease(ph / 0.4), inn = ease((ph - 0.5) / 0.3);
            ctx.strokeStyle = 'rgba(255,230,120,' + (0.9 * out * env) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(ax - 17, ay - 17); ctx.lineTo(ax + 17, ay + 17); ctx.moveTo(ax + 17, ay - 17); ctx.lineTo(ax - 17, ay + 17); ctx.stroke();
            ctx.strokeStyle = 'rgba(120,255,240,' + (0.9 * inn * env) + ')';
            ctx.beginPath(); ctx.moveTo(bx - 17, by - 17); ctx.lineTo(bx + 17, by + 17); ctx.moveTo(bx + 17, by - 17); ctx.lineTo(bx - 17, by + 17); ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
            if (((u * 12 + i * 0.41) % 1) > 0.35) continue;
            ctx.fillStyle = 'rgba(120,255,240,' + (0.5 * env) + ')';
            ctx.fillRect(330 + ((i * 53) % 150), 230 + ((i * 41) % 110), 40 + (i % 3) * 20, 4);
        }
        return 0;
    },
});

// >>> poses boss_barricade
// ---- The Barricade ---------------------------------------------------------
// Bullet Walls: both arms heave up, then slam down; rows of shot fall with a
//   drifting gap.
// Soul Tithe: arms sweep wide, souls stream into the chest and a violet
//   shield dome forms.
Object.assign(POSES, {
    bcd_walls(P, u) {
        const up = ease(u / 0.3), slam = ease((u - 0.38) / 0.1), rec = ease((u - 0.6) / 0.4);
        let k = u < 0.38 ? up : 1 - slam;
        if (u > 0.48) k = -0.25 * (1 - rec);
        P.leftArm.rot = 38 * k; P.leftArm.dy = -16 * k;
        P.rightArm.rot = -38 * k; P.rightArm.dy = -16 * k;
        const hit = u > 0.48 ? Math.max(0, 1 - (u - 0.48) * 4) : 0;
        P.body.dy = -5 * up * (u < 0.38 ? 1 : 0) + 8 * hit;
    },
    bcd_tithe(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 6);
        P.leftArm.rot = (30 + 8 * w) * env; P.leftArm.dy = -8 * env;
        P.rightArm.rot = (-30 - 8 * w) * env; P.rightArm.dy = -8 * env;
        P.body.dy = -3 * env + 2 * w * env;
        P.body.rot = 1.5 * w * env;
    },
});
Object.assign(FX, {
    bcd_walls(ctx, u) {
        // two rows of shot fall; each has a gap that drifts sideways
        for (let r = 0; r < 2; r++) {
            const t = (u - 0.4 - r * 0.18) / 0.55;
            if (t <= 0 || t >= 1) continue;
            const y = -20 + t * 540, gap = 120 + 150 * r + Math.sin(t * 4 + r) * 70 + t * 40 * (r ? -1 : 1);
            const a = Math.min(1, t * 6) * (1 - Math.max(0, (t - 0.85) / 0.15));
            for (let x = 0; x < 512; x += 36) {
                if (x + 32 > gap && x < gap + 110) continue;
                ctx.fillStyle = 'rgba(255,140,30,' + (0.9 * a) + ')'; ctx.fillRect(x + 2, y, 30, 30);
                ctx.strokeStyle = 'rgba(255,240,170,' + a + ')'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y, 30, 30);
            }
        }
        // slam shock
        if (u > 0.48 && u < 0.8) {
            const k = (u - 0.48) / 0.32;
            ctx.strokeStyle = 'rgba(255,200,100,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(256, 430, 40 + k * 260, 10 + k * 40, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    bcd_tithe(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        // violet shield dome
        const g = ctx.createRadialGradient(256, 290, 120, 256, 290, 250);
        g.addColorStop(0, 'rgba(170,80,255,0)'); g.addColorStop(1, 'rgba(170,80,255,' + (0.45 * env) + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 290, 250, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(210,150,255,' + (0.8 * env) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(256, 290, 250, 0, 7); ctx.stroke();
        // souls spiral inward to the chest
        for (let i = 0; i < 9; i++) {
            const ph = (u * 2.2 + i / 9) % 1, ang = i * 0.7 + ph * 2.5, r = 260 * (1 - ph);
            const x = 256 + Math.cos(ang) * r * 1.2, y = 260 + Math.sin(ang) * r * 0.8;
            ctx.fillStyle = 'rgba(190,255,230,' + (0.9 * env * Math.min(1, ph * 4)) + ')';
            ctx.beginPath(); ctx.arc(x, y, 9 * (1 - ph * 0.5), 0, 7); ctx.fill();
        }
        return 0.12 * Math.max(0, Math.sin(u * Math.PI * 6)) * env;
    },
});
// <<< poses boss_barricade

// >>> poses boss_barrage
// ---- The Barrage -----------------------------------------------------------
// Shelling Curtain: gatling hoisted skyward, pumps; a wall of shells rains across.
// Corrupt Cells: gatling aims at the floor, claw slams; floor tiles corrupt.
// Supply Drop: claw signals up, gatling tilts to the sky; a crate parachutes in.
// Shot Shells: gatling fires in recoiling bursts; shells burst into shrapnel.
Object.assign(POSES, {
    bar_curtain(P, u) {
        const up = ease(u / 0.25), dn = ease((u - 0.8) / 0.2), k = up * (1 - dn);
        const pump = Math.sin(u * Math.PI * 10) * (u > 0.25 && u < 0.8 ? 1 : 0);
        P.gatling.rot = 30 * k + 5 * pump; P.gatling.dy = -8 * k; P.gatling.dx = 4 * pump;
        P.clawArm.rot = -22 * k; P.clawArm.dy = -6 * k;
        P.shells.rot = -8 * k + 3 * pump; P.shells.dy = -6 * k;
        P.body.dy = 2 * Math.abs(pump) * 0.6; P.body.rot = -1.5 * k;
    },
    bar_corrupt(P, u) {
        const aim = ease(u / 0.25), slam = ease((u - 0.5) / 0.1), rec = ease((u - 0.75) / 0.25);
        const k = aim * (1 - rec);
        P.gatling.rot = -22 * k; P.gatling.dy = 6 * k;
        const raise = u < 0.5 ? ease(u / 0.4) : 1 - slam;
        const r = u < 0.5 ? raise : raise * (1 - rec);
        P.clawArm.rot = -38 * r + 18 * (u > 0.55 ? (1 - rec) * slam : 0);
        P.clawArm.dy = -14 * r;
        const hit = u > 0.55 ? Math.max(0, 1 - (u - 0.55) * 4) : 0;
        P.body.dy = 9 * hit - 3 * r; P.shells.rot = 4 * Math.sin(u * 30) * k;
    },
    bar_supply(P, u) {
        const up = ease(u / 0.25), dn = ease((u - 0.75) / 0.25), k = up * (1 - dn);
        const wave = Math.sin(u * Math.PI * 8) * k;
        P.clawArm.rot = -42 * k + 10 * wave; P.clawArm.dy = -18 * k;
        P.gatling.rot = 24 * k; P.gatling.dy = -5 * k;
        P.shells.rot = 6 * wave; P.shells.dy = -4 * k;
        P.body.rot = 2 * wave; P.body.dy = -3 * k;
    },
    bar_shells(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const burst = Math.max(0, Math.sin(u * Math.PI * 8));
        const f = Math.pow(burst, 2) * env;
        P.gatling.rot = 8 * env - 16 * f; P.gatling.dx = 12 * f; P.gatling.dy = 5 * f;
        P.shells.rot = -6 * f; P.shells.dx = 4 * f;
        P.clawArm.rot = 8 * f - 5 * env; P.clawArm.dy = 2 * f;
        P.body.dx = 3 * f; P.body.rot = 1.5 * f; P.body.dy = -2 * f;
    },
});
Object.assign(FX, {
    bar_curtain(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.12));
        // advancing wall of falling shells, sweeping left -> right, with a gap
        const front = -40 + u * 640, gap = 330;
        for (let i = 0; i < 22; i++) {
            const x = front - i * 22;
            if (x < -20 || x > 560 || Math.abs(x - gap) < 55) continue;
            const ph = ((u * 3 + i * 0.37) % 1), y = -30 + ph * 470;
            const a = env * (1 - i / 26);
            ctx.strokeStyle = 'rgba(255,150,40,' + (0.55 * a) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(x - 6, y - 50); ctx.lineTo(x, y); ctx.stroke();
            ctx.fillStyle = 'rgba(255,230,120,' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
            if (ph > 0.88) {
                const g = (ph - 0.88) / 0.12;
                ctx.strokeStyle = 'rgba(255,120,30,' + (0.8 * a * (1 - g)) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, 440, 8 + g * 26, 4 + g * 10, 0, 0, 7); ctx.stroke();
            }
        }
        // muzzle glow while the gun is hoisted
        const gl = ctx.createRadialGradient(110, 205, 3, 110, 205, 60);
        gl.addColorStop(0, 'rgba(255,170,60,' + (0.7 * env) + ')'); gl.addColorStop(1, 'rgba(255,100,20,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(110, 205, 60, 0, 7); ctx.fill();
        return 0;
    },
    bar_corrupt(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        // aim beam from the muzzle to the floor
        const aim = ease(u / 0.3);
        ctx.strokeStyle = 'rgba(190,80,255,' + (0.7 * aim * env) + ')'; ctx.lineWidth = 6;
        ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(105, 300); ctx.lineTo(60 + aim * 90, 300 + aim * 130); ctx.stroke(); ctx.setLineDash([]);
        // floor grid tiles corrupting one after another
        for (let i = 0; i < 12; i++) {
            const cx = 70 + (i % 4) * 110 + (Math.floor(i / 4) % 2) * 25, cy = 380 + Math.floor(i / 4) * 24;
            const t = ease((u - 0.2 - i * 0.04) / 0.2);
            const fl = (Math.sin(u * 40 + i * 2) * 0.5 + 0.5);
            ctx.fillStyle = 'rgba(' + (120 + 60 * fl | 0) + ',40,220,' + (0.45 * t * env) + ')';
            ctx.strokeStyle = 'rgba(230,140,255,' + (0.9 * t * env) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx + 40, cy); ctx.lineTo(cx, cy + 11); ctx.lineTo(cx - 40, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // slam shock
        if (u > 0.55) {
            const k = Math.min(1, (u - 0.55) / 0.4);
            ctx.strokeStyle = 'rgba(210,130,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 7 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(455, 405, 20 + k * 180, 6 + k * 40, 0, 0, 7); ctx.stroke();
        }
        return u > 0.55 && u < 0.62 ? 0.25 * (1 - (u - 0.55) / 0.07) : 0;
    },
    bar_supply(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.12));
        // signal flare above the claw
        const fl = ease(u / 0.25) * env;
        const g = ctx.createRadialGradient(470, 200, 2, 470, 200, 60);
        g.addColorStop(0, 'rgba(255,230,120,' + (0.8 * fl) + ')'); g.addColorStop(1, 'rgba(255,160,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(470, 200, 60, 0, 7); ctx.fill();
        // crate parachutes in: lands at (340,430)
        const t = ease((u - 0.2) / 0.5), cx = 340 + 30 * (1 - t), cy = -60 + t * 480;
        if (u > 0.2) {
            const land = u > 0.7 ? 1 : 0;
            if (!land) {
                ctx.strokeStyle = 'rgba(230,230,200,0.8)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx - 34, cy - 70); ctx.lineTo(cx - 18, cy); ctx.moveTo(cx + 34, cy - 70); ctx.lineTo(cx + 18, cy); ctx.stroke();
                ctx.fillStyle = 'rgba(220,70,50,0.9)'; ctx.beginPath(); ctx.ellipse(cx, cy - 74, 44, 22, 0, Math.PI, 0); ctx.fill();
            }
            ctx.fillStyle = '#8a5a2a'; ctx.fillRect(cx - 20, cy - 4, 40, 34);
            ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3; ctx.strokeRect(cx - 20, cy - 4, 40, 34);
            ctx.beginPath(); ctx.moveTo(cx - 20, cy - 4); ctx.lineTo(cx + 20, cy + 30); ctx.moveTo(cx + 20, cy - 4); ctx.lineTo(cx - 20, cy + 30); ctx.stroke();
        }
        if (u > 0.7) {
            const k = Math.min(1, (u - 0.7) / 0.3);
            ctx.strokeStyle = 'rgba(255,220,150,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 6 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(340, 430, 20 + k * 130, 6 + k * 26, 0, 0, 7); ctx.stroke();
        }
        return u > 0.7 && u < 0.76 ? 0.22 * (1 - (u - 0.7) / 0.06) : 0;
    },
    bar_shells(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const burst = Math.max(0, Math.sin(u * Math.PI * 8));
        // muzzle flash
        const f = Math.pow(burst, 2) * env;
        const g = ctx.createRadialGradient(100, 225, 2, 100, 225, 70);
        g.addColorStop(0, 'rgba(255,240,160,' + (0.9 * f) + ')'); g.addColorStop(0.5, 'rgba(255,150,40,' + (0.5 * f) + ')'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(100, 225, 70, 0, 7); ctx.fill();
        // shells fly out and burst into shrapnel spokes
        for (let i = 0; i < 3; i++) {
            const ph = (u * 2 + i / 3) % 1;
            const sx = 90 - ph * 60, sy = 225 + ph * ph * 190 - ph * 40;
            if (ph < 0.6) {
                ctx.fillStyle = 'rgba(255,220,100,' + env + ')'; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 7); ctx.fill();
            } else {
                const k = (ph - 0.6) / 0.4, bx = 90 - 0.6 * 60 - 20 * i, by = 225 + 0.36 * 190 - 24 + 60;
                ctx.strokeStyle = 'rgba(255,170,50,' + (0.9 * (1 - k) * env) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(bx, by, 14 + k * 50, 8 + k * 24, 0, 0, 7); ctx.stroke();
                for (let s = 0; s < 6; s++) {
                    const an = s * Math.PI / 3 + i;
                    ctx.fillStyle = 'rgba(255,200,80,' + (0.9 * (1 - k) * env) + ')';
                    ctx.beginPath(); ctx.arc(bx + Math.cos(an) * k * 70, by + Math.sin(an) * k * 42, 4, 0, 7); ctx.fill();
                }
            }
        }
        return 0;
    },
});
// <<< poses boss_barrage

// >>> poses boss_bayes
// ---- Bayes -----------------------------------------------------------------
// Posterior Bolts: the staff is thrust up and charges, then slams down; lightning
//   columns crash onto one side (the favoured belief).
// Prior Bomb: the orb hand lobs a fuse-lit bomb in an arc to the floor.
// Evidence Wisps: the staff sweeps side to side, releasing drifting wisps.
// Belief Veil: both arms rise, a shimmering violet veil drapes over the scene.
Object.assign(POSES, {
    bay_bolts(P, u) {
        const up = ease(u / 0.4), slam = ease((u - 0.5) / 0.1), rec = ease((u - 0.65) / 0.35);
        const k = u < 0.5 ? up : 1 - slam;
        P.staff.rot = (-30 * k + 18 * slam) * (1 - rec);
        P.staff.dy = -14 * k * (1 - rec);
        P.orb.rot = 14 * up * (1 - rec);
        P.orb.dy = -10 * up * (1 - rec);
        P.body.dy = (-3 * up + 5 * slam) * (1 - rec);
        P.capeL.rot = -4 * up * (1 - rec);
    },
    bay_bomb(P, u) {
        const wind = ease(u / 0.3), toss = ease((u - 0.3) / 0.12), rec = ease((u - 0.55) / 0.45);
        P.orb.rot = (28 * wind - 62 * toss) * (1 - rec);
        P.orb.dy = (6 * wind - 18 * toss) * (1 - rec);
        P.orb.dx = (-8 * wind + 10 * toss) * (1 - rec);
        P.body.rot = (-2 * wind + 3 * toss) * (1 - rec);
        P.staff.rot = 6 * toss * (1 - rec);
    },
    bay_wisps(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15)), w = Math.sin(u * Math.PI * 4);
        P.staff.rot = 24 * w * env;
        P.staff.dx = 6 * w * env;
        P.orb.rot = -8 * Math.sin(u * Math.PI * 4 + 1.2) * env;
        P.orb.dy = -6 * Math.abs(w) * env;
        P.capeL.rot = -5 * w * env;
        P.body.rot = 1.5 * w * env;
    },
    bay_veil(P, u) {
        const up = ease(u / 0.35), rec = ease((u - 0.75) / 0.25), k = up * (1 - rec);
        const sh = Math.sin(u * Math.PI * 6) * 3 * k;
        P.staff.rot = -26 * k + sh;
        P.staff.dy = -10 * k;
        P.orb.rot = 22 * k - sh;
        P.orb.dy = -16 * k;
        P.body.dy = -5 * k;
        P.capeL.rot = 6 * k;
    },
});
Object.assign(FX, {
    bay_bolts(ctx, u) {
        const charge = ease(u / 0.45);
        const cx = 55, cy = 90;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 110);
        g.addColorStop(0, 'rgba(230,220,255,' + (0.9 * charge * (u < 0.55 ? 1 : 0.3)) + ')');
        g.addColorStop(1, 'rgba(140,90,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 110, 0, 7); ctx.fill();
        // warning strip on the favoured (right) half
        if (u > 0.2 && u < 0.5) {
            ctx.fillStyle = 'rgba(180,140,255,' + (0.18 * ease((u - 0.2) / 0.1)) + ')';
            ctx.fillRect(256, 0, 256, 512);
        }
        let flash = 0;
        if (u > 0.5 && u < 0.85) {
            const k = (u - 0.5) / 0.35, a = 1 - k;
            [300, 360, 420, 480].forEach((x0, i) => {
                if (k < i * 0.06) return;
                ctx.strokeStyle = 'rgba(210,190,255,' + a + ')'; ctx.lineWidth = 8 * a + 2;
                ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 16;
                ctx.beginPath(); let x = x0, y = -20; ctx.moveTo(x, y);
                for (let j = 0; j < 9; j++) { y += 60; x = x0 + (((j * 37 + i * 19) % 30) - 15); ctx.lineTo(x, y); }
                ctx.stroke(); ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * a) + ')';
                ctx.beginPath(); ctx.ellipse(x0, 470, 40 * (0.4 + k), 12, 0, 0, 7); ctx.fill();
            });
            flash = 0.3 * (1 - k);
        }
        return flash;
    },
    bay_bomb(ctx, u) {
        // bomb leaves the orb hand at u~0.38, arcs to the floor at (460, 430)
        const t = (u - 0.38) / 0.4;
        if (t > 0 && t < 1) {
            const x = 420 + 40 * t, y = 250 + 190 * t - 220 * Math.sin(t * Math.PI);
            ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 8, y - 34); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,60,0.9)';
            ctx.beginPath(); ctx.arc(x + 8, y - 36, 5 + (Math.sin(u * 90) + 1) * 2, 0, 7); ctx.fill();
        }
        if (t >= 1) {
            const k = Math.min(1, (t - 1) / 0.5);
            ctx.strokeStyle = 'rgba(200,170,255,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 6 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(460, 440, 20 + k * 90, 8 + k * 26, 0, 0, 7); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,60,' + (0.8 * (1 - k)) + ')';
            ctx.beginPath(); ctx.arc(460, 432, 10, 0, 7); ctx.fill();
        }
        return 0;
    },
    bay_wisps(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15));
        for (let i = 0; i < 6; i++) {
            const ph = (u * 1.6 + i / 6) % 1;
            const x = 60 + ph * 380 + Math.sin(ph * 9 + i) * 24;
            const y = 120 + 65 * (i % 3) - 70 * Math.sin(ph * Math.PI) + Math.cos(ph * 7 + i) * 18;
            const a = env * Math.sin(ph * Math.PI);
            const gr = ctx.createRadialGradient(x, y, 1, x, y, 26);
            gr.addColorStop(0, 'rgba(240,255,250,' + a + ')');
            gr.addColorStop(0.4, 'rgba(110,255,200,' + (0.6 * a) + ')');
            gr.addColorStop(1, 'rgba(60,200,160,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
        }
        const p = 0.5 + 0.5 * Math.sin(u * Math.PI * 8);
        ctx.fillStyle = 'rgba(110,255,200,' + (0.25 * p * env) + ')';
        ctx.beginPath(); ctx.arc(425, 190, 85, 0, 7); ctx.fill();
        return 0;
    },
    bay_veil(ctx, u) {
        const fall = ease((u - 0.2) / 0.4), out = 1 - ease((u - 0.8) / 0.2);
        const a = out * fall;
        if (a > 0) {
            const h = 560 * fall;
            const gr = ctx.createLinearGradient(0, -50, 0, h);
            gr.addColorStop(0, 'rgba(120,70,220,' + (0.55 * a) + ')');
            gr.addColorStop(1, 'rgba(170,120,255,' + (0.15 * a) + ')');
            ctx.fillStyle = gr; ctx.fillRect(-40, -50, 592, h + 50);
            ctx.strokeStyle = 'rgba(230,210,255,' + (0.5 * a) + ')'; ctx.lineWidth = 3;
            for (let i = 0; i < 9; i++) {
                const x = i * 64 - 10 + Math.sin(u * 14 + i) * 8;
                ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 10, Math.min(h, 520)); ctx.stroke();
            }
        }
        const k = ease(u / 0.35) * out;
        [[60, 90], [425, 190]].forEach((c) => {
            const g = ctx.createRadialGradient(c[0], c[1], 2, c[0], c[1], 90);
            g.addColorStop(0, 'rgba(230,210,255,' + (0.6 * k) + ')'); g.addColorStop(1, 'rgba(140,90,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 90, 0, 7); ctx.fill();
        });
        return u < 0.25 ? 0.25 * ease(u / 0.25) : 0;
    },
});
// <<< poses boss_bayes

// >>> poses boss_belt
// ---- The Belt --------------------------------------------------------------
// Splitter Rocks: both fists wind back then hurl outward; three rocks fly out
//   and each bursts into two shards.
// Fated Cell: fists rise, then slam down together; a cell on the floor is
//   marked with a ring that counts down.
Object.assign(POSES, {
    blt_rocks(P, u) {
        const wind = ease(u / 0.3), th = ease((u - 0.3) / 0.12), rec = ease((u - 0.6) / 0.4);
        const k = (wind * (1 - th) + th * (1 - rec) * 0) ; // wind-up amount
        const thr = th * (1 - rec);
        P.iceFist.rot = 30 * wind * (1 - th) - 38 * thr; P.iceFist.dx = -14 * wind * (1 - th) - 12 * thr; P.iceFist.dy = -16 * wind * (1 - th) - 8 * thr;
        P.fireFist.rot = -30 * wind * (1 - th) + 38 * thr; P.fireFist.dx = 14 * wind * (1 - th) + 12 * thr; P.fireFist.dy = -16 * wind * (1 - th) - 8 * thr;
        P.body.rot = 3 * Math.sin(u * Math.PI * 2) * (k + thr); P.body.dy = 4 * wind * (1 - th) - 3 * thr;
    },
    blt_fate(P, u) {
        const up = ease(u / 0.35), slam = ease((u - 0.38) / 0.07), rec = ease((u - 0.6) / 0.4);
        const raise = up * (1 - slam);
        const hold = slam * (1 - rec);
        P.iceFist.rot = -36 * raise + 12 * hold; P.iceFist.dy = -34 * raise + 10 * hold; P.iceFist.dx = 10 * raise + 14 * hold;
        P.fireFist.rot = 36 * raise - 12 * hold; P.fireFist.dy = -34 * raise + 10 * hold; P.fireFist.dx = -10 * raise - 14 * hold;
        P.body.dy = -5 * raise + 9 * hold; P.body.rot = 1.5 * Math.sin(u * 20) * hold;
    },
});
Object.assign(FX, {
    blt_rocks(ctx, u) {
        const dirs = [[-1, -0.35], [0, -0.9], [1, -0.35]];
        const t = Math.max(0, (u - 0.3) / 0.7);
        if (t <= 0) return 0;
        const rock = (x, y, r, a, rot, col) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
            ctx.fillStyle = col; ctx.strokeStyle = '#15121f'; ctx.lineWidth = 5;
            ctx.beginPath();
            for (let i = 0; i < 7; i++) { const an = i / 7 * 6.283, rr = r * (0.8 + 0.25 * ((i * 3) % 3) / 2); ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        };
        let flash = 0;
        dirs.forEach((d, i) => {
            const sx = 256 + d[0] * 60, sy = 300;
            const tx = 256 + d[0] * 230 + (d[0] === 0 ? 0 : 0), ty = 300 + d[1] * 330 + 120;
            const split = 0.45;
            if (t < split) {
                const k = ease(t / split);
                rock(sx + (tx - sx) * k, sy + (ty - sy) * k, 34 + 8 * k, 1, t * 9 + i, '#6a6478');
            } else {
                const k = (t - split) / (1 - split), bx = tx, by = ty;
                if (k < 0.12) flash = Math.max(flash, 0.35 * (1 - k / 0.12));
                [-1, 1].forEach((s) => {
                    const x = bx + s * (20 + 130 * ease(k)), y = by - 20 * Math.sin(k * 3.14) + 90 * k * k;
                    rock(x, y, 20, 1 - k * 0.7, k * 12 * s + i, '#8a82a0');
                });
            }
        });
        return flash;
    },
    blt_fate(ctx, u) {
        // marked cell on the floor, centre of the card
        const cx = 256, cy = 440;
        const a = ease((u - 0.38) / 0.1);
        if (a <= 0) return 0;
        const left = Math.max(0, 1 - (u - 0.48) / 0.52);
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = 'rgba(255,200,80,' + (0.25 * a) + ')'; ctx.strokeStyle = 'rgba(255,225,120,' + a + ')'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(80, 0); ctx.lineTo(0, 34); ctx.lineTo(-80, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        // doom clock arc
        ctx.strokeStyle = 'rgba(255,90,60,' + a + ')'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(0, 0, 112, 52, 0, -1.57, -1.57 + 6.283 * left); ctx.stroke();
        // slam shock rings
        const k = Math.min(1, (u - 0.38) / 0.4);
        ctx.strokeStyle = 'rgba(255,240,200,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 40 + 200 * k, 14 + 60 * k, 0, 0, 7); ctx.stroke();
        ctx.restore();
        const f = (u > 0.38 && u < 0.5) ? 0.35 * (1 - (u - 0.38) / 0.12) : 0;
        return f;
    },
});
// <<< poses boss_belt

// >>> poses boss_bloom
// ---- The Bloom -------------------------------------------------------------
// Scarlet Blooms: flower rears back, then snaps open; red blossoms open on the floor.
// Corrupt Cells: smoke cloud heaves, shard glitches; dark squares rain down.
// Seed Volley: flower winds back and hurls three seed pods.
// Withering Bloom: flower droops, cloud swells; petals fall as a veil.
Object.assign(POSES, {
    blm_blooms(P, u) {
        const back = ease(u / 0.3), snap = ease((u - 0.3) / 0.12), rec = ease((u - 0.6) / 0.4);
        const r = u < 0.3 ? -20 * back : (-20 + 50 * snap) * (1 - rec);
        P.flower.rot = r; P.flower.dy = -8 * Math.abs(r) / 30;
        P.body.dy = 4 * snap * (1 - rec);
        P.cloud.rot = -r * 0.5;
    },
    blm_corrupt(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 8);
        P.cloud.rot = 14 * w * env; P.cloud.dx = 12 * Math.abs(w) * env; P.cloud.dy = -8 * w * env;
        P.shard.rot = 10 * Math.sin(u * 40) * env; P.shard.dx = ((u * 30) % 1 > 0.5 ? 6 : -6) * env;
        P.flower.rot = -6 * w * env;
    },
    blm_volley(P, u) {
        const wind = ease(u / 0.35), thr = ease((u - 0.35) / 0.1), rec = ease((u - 0.6) / 0.4);
        const r = u < 0.35 ? -26 * wind : (-26 + 52 * thr) * (1 - rec);
        P.flower.rot = r; P.flower.dx = 10 * r / 26; P.flower.dy = 6 * Math.abs(r) / 26;
        P.body.rot = r * 0.12;
    },
    blm_wither(P, u) {
        const env = ease(Math.min(u / 0.35, 1, (1 - u) / 0.3)), tw = Math.sin(u * Math.PI * 6);
        P.flower.rot = -30 * env + 3 * tw * env; P.flower.dy = 18 * env; P.flower.dx = -10 * env;
        P.cloud.dx = 14 * env; P.cloud.dy = -10 * env + 4 * tw * env; P.cloud.rot = 8 * env;
        P.shard.rot = 6 * env; P.body.dy = 3 * env;
    },
});
Object.assign(FX, {
    blm_blooms(ctx, u) {
        const spots = [[110, 450], [270, 480], [420, 440]];
        const open = ease((u - 0.3) / 0.25), fade = u > 0.8 ? 1 - ease((u - 0.8) / 0.2) : 1;
        spots.forEach((s, i) => {
            const k = Math.min(1, Math.max(0, (u - 0.3 - i * 0.06) / 0.25));
            if (k <= 0) return;
            for (let j = 0; j < 8; j++) {
                const a = j * Math.PI / 4 + u * 0.8;
                ctx.fillStyle = 'rgba(255,70,110,' + (0.7 * fade) + ')';
                ctx.beginPath(); ctx.ellipse(s[0] + Math.cos(a) * 26 * k, s[1] + Math.sin(a) * 12 * k, 20 * k, 7 * k, a, 0, 7); ctx.fill();
            }
            ctx.fillStyle = 'rgba(255,220,120,' + (0.9 * fade) + ')';
            ctx.beginPath(); ctx.arc(s[0], s[1], 7 * k, 0, 7); ctx.fill();
        });
        const g = ctx.createRadialGradient(240, 190, 10, 240, 190, 170);
        g.addColorStop(0, 'rgba(255,90,130,' + (0.45 * open * fade) + ')'); g.addColorStop(1, 'rgba(255,60,100,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(240, 190, 170, 0, 7); ctx.fill();
        return 0;
    },
    blm_corrupt(ctx, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        for (let i = 0; i < 10; i++) {
            const ph = (u * 1.6 + i * 0.13) % 1;
            const x = 130 + ((i * 97) % 330), y = 200 + ph * 260;
            ctx.fillStyle = 'rgba(' + (i % 2 ? '170,80,255' : '255,70,110') + ',' + (0.8 * env * (1 - ph * 0.5)) + ')';
            ctx.fillRect(x, y, 16, 16);
        }
        const g = ctx.createRadialGradient(400, 110, 10, 400, 110, 140);
        g.addColorStop(0, 'rgba(190,100,255,' + (0.4 * env) + ')'); g.addColorStop(1, 'rgba(120,40,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(400, 110, 140, 0, 7); ctx.fill();
        return 0;
    },
    blm_volley(ctx, u) {
        for (let i = 0; i < 3; i++) {
            const k = (u - 0.38 - i * 0.07) / 0.5;
            if (k <= 0 || k >= 1) continue;
            const x = 240 - 40 + k * (160 + i * 130), y = 220 + i * 25 - Math.sin(k * Math.PI) * (120 - i * 20) + k * 230;
            ctx.fillStyle = 'rgba(40,20,60,0.95)'; ctx.strokeStyle = 'rgba(255,100,140,0.95)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(x, y, 14, 20, k * 6, 0, 7); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,100,140,' + (0.5 * (1 - k)) + ')';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 40, y + 18); ctx.stroke();
        }
        return 0;
    },
    blm_wither(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.25));
        ctx.fillStyle = 'rgba(120,20,60,' + (0.18 * env) + ')'; ctx.fillRect(-256, -256, 1024, 1024);
        for (let i = 0; i < 14; i++) {
            const ph = (u * 1.3 + i * 0.09) % 1;
            const x = 90 + ((i * 61) % 340) + Math.sin(ph * 9 + i) * 14, y = 40 + ph * 440;
            ctx.fillStyle = 'rgba(' + (i % 2 ? '230,60,100' : '150,60,170') + ',' + (0.8 * env) + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 11, 5, ph * 8 + i, 0, 7); ctx.fill();
        }
        return 0.12 * env * Math.max(0, Math.sin(u * Math.PI * 4));
    },
});
// <<< poses boss_bloom


// >>> poses boss_bomber
// ---- The Bomber ------------------------------------------------------------
// Mine Collar: the juggled bombs spin faster and faster in a ring around him,
//   then he flings both arms out and the ring of mines flies off.
// Carpet Run: a bomber plane sweeps overhead, he points up at it and a line
//   of bombs drops and detonates along the floor.
// Cluster Shells: he crouches, thrusts both arms up and a shell is lobbed high;
//   it bursts into bomblets that rain down.
Object.assign(POSES, {
    bmb_collar(P, u) {
        const wind = Math.min(1, u / 0.7), fling = ease((u - 0.72) / 0.1), rec = ease((u - 0.85) / 0.15);
        const k = (1 - rec) * (u < 0.72 ? wind : 1);
        const a = u * Math.PI * 2 * (2 + 5 * wind * wind);
        const ring = (ph, r) => ({ dx: Math.cos(a + ph) * r * k, dy: Math.sin(a + ph) * r * 0.55 * k });
        const b1 = ring(0, 30), b2 = ring(2.1, 30), b3 = ring(4.2, 30);
        P.bombUL.dx = b1.dx; P.bombUL.dy = b1.dy;
        P.bombTop.dx = b2.dx; P.bombTop.dy = b2.dy;
        P.bombR.dx = b3.dx; P.bombR.dy = b3.dy;
        const s = Math.sin(u * Math.PI * 2 * (3 + 5 * wind));
        const pull = u < 0.72 ? 1 : 1 - fling;
        P.armL.rot = (28 * s * pull + 30 * (u < 0.72 ? 0 : fling) * -1) * (1 - rec);
        P.armR.rot = (-28 * s * pull + 30 * (u < 0.72 ? 0 : fling)) * (1 - rec);
        P.armL.dy = -8 * Math.abs(s) * pull * (1 - rec);
        P.armR.dy = -8 * Math.abs(s) * pull * (1 - rec);
        P.body.rot = 3 * s * wind * (1 - fling) * (1 - rec);
        P.body.dy = -5 * Math.abs(s) * wind * (1 - rec) + 6 * fling * (1 - rec);
    },
    bmb_carpet(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.15));
        const track = Math.sin(u * Math.PI * 1.0 - 0.1);
        P.armR.rot = -42 * env;
        P.armR.dy = -8 * env;
        P.body.rot = (-4 + 8 * u) * env;
        P.body.dx = (u - 0.5) * 26 * env;
        const drop = Math.sin(u * Math.PI * 9);
        P.armL.rot = 25 * Math.max(0, drop) * env - 10 * env;
        P.armL.dy = -6 * Math.abs(drop) * env;
        P.bombUL.dy = -14 * Math.abs(Math.sin(u * Math.PI * 4)) * env - 10 * track * env;
        P.bombTop.dy = -16 * Math.abs(Math.sin(u * Math.PI * 4 + 1)) * env;
        P.bombR.dy = -14 * Math.abs(Math.sin(u * Math.PI * 4 + 2)) * env;
    },
    bmb_cluster(P, u) {
        const crouch = ease(u / 0.25) * (u < 0.3 ? 1 : 0);
        const thrust = ease((u - 0.3) / 0.1);
        const rec = ease((u - 0.65) / 0.3);
        const up = thrust * (1 - rec);
        P.body.dy = 10 * crouch + (-8 * up);
        P.body.rot = -2 * crouch;
        P.armL.rot = (-18 * crouch + 40 * up) ;
        P.armR.rot = (18 * crouch - 40 * up);
        P.armL.dy = 6 * crouch - 16 * up;
        P.armR.dy = 6 * crouch - 16 * up;
        // the top bomb is the shell: it is shoved skyward and gone
        const fly = ease((u - 0.33) / 0.2);
        P.bombTop.dy = 14 * crouch - 200 * fly + 200 * ease((u - 0.8) / 0.2);
        P.bombTop.sc = 1 - 0.5 * fly + 0.5 * ease((u - 0.8) / 0.2);
        P.bombTop.rot = 360 * fly;
        const sh = Math.sin(u * Math.PI * 14) * (1 - rec) * (u > 0.25 ? 1 : 0.2);
        P.bombUL.dx = 4 * sh; P.bombUL.dy = -10 * up;
        P.bombR.dx = -4 * sh; P.bombR.dy = -10 * up;
    },
});
Object.assign(FX, {
    bmb_collar(ctx, u) {
        const wind = Math.min(1, u / 0.7), fling = u < 0.72 ? 0 : (u - 0.72) / 0.28;
        const cx = 255, cy = 190, n = 5;
        const a0 = u * Math.PI * 2 * (2 + 5 * wind * wind);
        // tether ring
        if (fling < 1) {
            ctx.strokeStyle = 'rgba(255,120,40,' + (0.45 * wind * (1 - fling)) + ')'; ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath(); ctx.ellipse(cx, cy, 190, 105, 0, 0, 7); ctx.stroke();
            ctx.setLineDash([]);
        }
        for (let i = 0; i < n; i++) {
            const a = a0 + (Math.PI * 2 * i) / n;
            let x = cx + Math.cos(a) * 190 * (0.5 + 0.5 * Math.min(1, u / 0.25));
            let y = cy + Math.sin(a) * 105 * (0.5 + 0.5 * Math.min(1, u / 0.25));
            if (fling > 0) {
                const e = ease(fling);
                x += Math.cos(a) * 240 * e; y += Math.sin(a) * 90 * e + 160 * e * e;
            }
            const al = 1 - Math.max(0, fling - 0.6) / 0.4;
            ctx.globalAlpha = al;
            ctx.fillStyle = '#2a1014'; ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,80,' + (0.5 + 0.5 * Math.sin(u * 60 + i)) + ')';
            ctx.beginPath(); ctx.arc(x + 11, y - 14, 5, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
        }
        return fling > 0 && fling < 0.15 ? 0.25 * (1 - fling / 0.15) : 0;
    },
    bmb_carpet(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.1));
        // plane sweeping left -> right overhead
        const px = -120 + u * 760, py = 38 + 10 * Math.sin(u * 9);
        ctx.save(); ctx.translate(px, py);
        ctx.fillStyle = '#4a4f59'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-10, -12); ctx.lineTo(48, -4); ctx.lineTo(62, 4); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6a707c';
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-28, -34); ctx.lineTo(-14, -34); ctx.lineTo(18, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-28, 36); ctx.lineTo(-14, 36); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c4553a'; ctx.beginPath(); ctx.arc(60, 0, 6, 0, 7); ctx.fill();
        ctx.restore();
        // bombs falling and detonating along the floor
        let flash = 0;
        const n = 7;
        for (let i = 0; i < n; i++) {
            const drop = 0.08 + i * 0.1, bx = -120 + drop * 760 + 20, fall = (u - drop) / 0.18;
            if (fall < 0) continue;
            if (fall < 1) {
                const y = 50 + 420 * fall * fall;
                ctx.fillStyle = '#2a1014'; ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(bx, y, 12, 0, 7); ctx.fill(); ctx.stroke();
            } else {
                const k = Math.min(1, (fall - 1) / 0.8);
                if (k >= 1) continue;
                const g = ctx.createRadialGradient(bx, 480, 4, bx, 480, 20 + 70 * k);
                g.addColorStop(0, 'rgba(255,240,170,' + (0.95 * (1 - k)) + ')');
                g.addColorStop(0.5, 'rgba(255,120,30,' + (0.7 * (1 - k)) + ')');
                g.addColorStop(1, 'rgba(160,30,0,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, 480, 20 + 70 * k, 0, 7); ctx.fill();
                if (k < 0.2) flash = Math.max(flash, 0.12);
            }
        }
        return flash * env;
    },
    bmb_cluster(ctx, u) {
        let flash = 0;
        // shell trail while it rises
        if (u > 0.33 && u < 0.6) {
            const k = ease((u - 0.33) / 0.2);
            ctx.strokeStyle = 'rgba(255,170,70,' + (0.8 * (1 - (u - 0.33) / 0.27)) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(255, 40 - 0); ctx.lineTo(255, 40 - 230 * k); ctx.stroke();
        }
        // burst high above, bomblets scatter and fall
        const bu = (u - 0.52) / 0.48;
        if (bu > 0) {
            const bx = 255, by = -140;
            if (bu < 0.2) {
                const k = bu / 0.2;
                const g = ctx.createRadialGradient(bx, by, 4, bx, by, 30 + 150 * k);
                g.addColorStop(0, 'rgba(255,250,200,' + (0.95 * (1 - k)) + ')');
                g.addColorStop(0.5, 'rgba(255,130,40,' + (0.7 * (1 - k)) + ')');
                g.addColorStop(1, 'rgba(180,40,0,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 30 + 150 * k, 0, 7); ctx.fill();
                flash = 0.3 * (1 - k);
            }
            for (let j = 0; j < 9; j++) {
                const ang = (Math.PI * 2 * j) / 9 + 0.3, sp = 120 + (j % 3) * 50;
                const t = Math.min(bu, 1);
                const x = bx + Math.cos(ang) * sp * t * 1.3;
                const y = by + Math.sin(ang) * sp * t * 0.6 + 780 * t * t;
                const land = 1 - Math.max(0, (t - 0.85) / 0.15);
                if (y > 500) {
                    const gk = Math.min(1, (y - 500) / 60);
                    ctx.fillStyle = 'rgba(255,150,50,' + (0.7 * (1 - gk)) + ')';
                    ctx.beginPath(); ctx.arc(x, 500, 10 + 30 * gk, 0, 7); ctx.fill();
                    continue;
                }
                ctx.fillStyle = '#2a1014'; ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 3;
                ctx.globalAlpha = land;
                ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
        return flash;
    },
});
// <<< poses boss_bomber

// >>> poses boss_centipede
// ---- The Centipede ---------------------------------------------------------
// Clue Scramble: the head rears up and whips side to side, a ripple runs down the
//   body to the lashing tail, and digits shuffle in the air around it.
Object.assign(POSES, {
    cen_scramble(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        const w = Math.sin(u * Math.PI * 6);
        const w2 = Math.sin(u * Math.PI * 6 - 1.2);
        const w3 = Math.sin(u * Math.PI * 6 - 2.4);
        P.head.rot = 26 * w * env - 8 * env;
        P.head.dy = -14 * env - 6 * Math.abs(w) * env;
        P.head.dx = 8 * w * env;
        P.body.rot = 4 * w2 * env;
        P.body.dy = -5 * env * Math.abs(w2);
        P.tail.rot = -34 * w3 * env;
        P.tail.dy = -10 * Math.abs(w3) * env;
        P.tail.dx = 6 * w3 * env;
    },
});
Object.assign(FX, {
    cen_scramble(ctx, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const n = 7;
        for (let i = 0; i < n; i++) {
            // digits orbit above the arched back and swap places as they swirl
            const ph = u * 2.2 + i / n;
            const a = ph * Math.PI * 2;
            const cx = 250 + Math.cos(a) * (150 + 20 * Math.sin(u * 20 + i));
            const cy = 120 + Math.sin(a) * 50 - 30 * Math.sin(u * Math.PI);
            const digit = (Math.floor(u * 14 + i * 3) * 7 + i * 5) % 9 + 1;
            const alpha = 0.9 * env;
            ctx.strokeStyle = 'rgba(40,20,60,' + alpha + ')'; ctx.lineWidth = 6;
            ctx.fillStyle = 'rgba(255,220,120,' + alpha + ')';
            ctx.strokeText(String(digit), cx, cy); ctx.fillText(String(digit), cx, cy);
        }
        // violet shimmer streaks along the body
        for (let i = 0; i < 4; i++) {
            const k = (u * 3 + i * 0.25) % 1;
            ctx.strokeStyle = 'rgba(190,140,255,' + (0.6 * (1 - k) * env) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(250, 240, 120 + k * 160, -2.6 + i * 0.1, -0.5 - i * 0.1); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_centipede

// >>> poses boss_bumper
// ---- The Bumper ------------------------------------------------------------
// Fog Bank: the car rears back and sucks in a breath (horns flare, jaw gapes),
//   then belches a thick grey fog bank that rolls out over the board.
Object.assign(POSES, {
    bmp_fog(P, u) {
        const inh = ease(u / 0.3), blow = ease((u - 0.3) / 0.12), rec = ease((u - 0.75) / 0.25);
        const k = u < 0.3 ? inh : (u < 0.75 ? 1 : 1 - rec);
        const shake = u > 0.3 && u < 0.75 ? Math.sin(u * 90) : 0;
        P.body.rot = (u < 0.3 ? -4 * inh : 3 * blow * (1 - rec)) + 0.6 * shake;
        P.body.dy = -6 * inh * (1 - blow) + 4 * blow * (1 - rec);
        P.jaw.dy = 22 * k + 3 * shake;
        P.jaw.rot = -10 * k;
        P.hornL.rot = -26 * k + 5 * shake;
        P.hornR.rot = 26 * k - 5 * shake;
        P.hornL.dy = -6 * k; P.hornR.dy = -6 * k;
    },
});
Object.assign(FX, {
    bmp_fog(ctx, u) {
        const inh = u < 0.3 ? ease(u / 0.3) : 0;
        // inhale: wisps streaming toward the mouth
        if (inh > 0 || u < 0.32) {
            for (let i = 0; i < 6; i++) {
                const ph = (u * 3.2 + i / 6) % 1, a = 0.55 * (1 - ph) * Math.min(1, u / 0.1);
                const ang = i * 1.05 + 0.4, r = 150 * (1 - ph) + 20;
                const x = 225 + Math.cos(ang) * r * 1.3, y = 290 + Math.sin(ang) * r * 0.8;
                ctx.fillStyle = 'rgba(210,215,225,' + a + ')';
                ctx.beginPath(); ctx.arc(x, y, 10 + 8 * ph, 0, 7); ctx.fill();
            }
        }
        // exhale: big fog puffs rolling out of the mouth and spreading
        if (u > 0.3) {
            const k = Math.min(1, (u - 0.3) / 0.6), fade = u > 0.8 ? 1 - ease((u - 0.8) / 0.2) : 1;
            for (let i = 0; i < 9; i++) {
                const dir = (i - 4) / 4, d = ease(k) * (110 + (i % 3) * 40);
                const x = 225 + dir * d * 2.1, y = 300 + Math.abs(dir) * 30 + (i % 2) * 14 - d * 0.1;
                const r = 26 + k * (34 + (i % 3) * 10);
                const g = ctx.createRadialGradient(x, y, 2, x, y, r);
                g.addColorStop(0, 'rgba(225,230,238,' + (0.8 * fade) + ')');
                g.addColorStop(1, 'rgba(190,198,212,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
            }
            const ww = 40 + k * 260;
            const bg = ctx.createRadialGradient(256, 300, 10, 256, 300, ww + 60);
            bg.addColorStop(0, 'rgba(200,208,220,' + (0.45 * fade) + ')'); bg.addColorStop(1, 'rgba(200,208,220,0)');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(256, 300, ww + 60, 0, 7); ctx.fill();
        }
        return 0;
    },
});
// <<< poses boss_bumper


// >>> poses boss_buzz
// ---- The Buzzsaw -----------------------------------------------------------
// Ricochet Saws: both saws wind back, then are flung out - discs ricochet off the frame.
// Cut Line: saws rise overhead, then chop down together; a dashed line flashes and slices.
// Saw Traps: stomps, saws point at the floor; blade circles flash then erupt.
// Pendulum Blades: the saws swing in alternation like scythes, chains hang overhead.
Object.assign(POSES, {
    buz_ricochet(P, u) {
        const wind = ease(u / 0.3), thr = ease((u - 0.3) / 0.12), rec = ease((u - 0.6) / 0.4);
        const k = wind * (1 - thr) * (1 - rec);       // wound back
        const f = thr * (1 - rec);                    // thrown
        P.sawL.rot = -34 * k + 30 * f; P.sawL.dx = -16 * k + 14 * f;
        P.sawR.rot = 34 * k - 30 * f; P.sawR.dx = 16 * k - 14 * f;
        P.body.rot = -4 * k + 4 * f; P.body.dy = 3 * k - 3 * f;
    },
    buz_cutline(P, u) {
        const up = ease(u / 0.35), chop = ease((u - 0.5) / 0.1), rec = ease((u - 0.65) / 0.35);
        const raise = u < 0.5 ? up : 1 - chop;
        const r = raise * (1 - rec);
        P.sawL.rot = 38 * r; P.sawL.dy = -14 * r;
        P.sawR.rot = -38 * r; P.sawR.dy = -14 * r;
        const hit = u > 0.5 ? Math.max(0, 1 - (u - 0.5) * 3) : 0;
        P.sawL.rot -= 22 * hit; P.sawR.rot += 22 * hit;
        P.body.dy = -6 * r + 7 * hit;
    },
    buz_traps(P, u) {
        const e = Math.min(u / 0.1, 1, (1 - u) / 0.12);
        const st = Math.abs(Math.sin(u * Math.PI * 3));
        P.sawL.rot = -26 * ease(e); P.sawR.rot = 26 * ease(e);
        P.sawL.dy = 6 * st * e; P.sawR.dy = 6 * st * e;
        P.body.dy = -10 * (1 - st) * e;
        P.body.rot = 2.5 * Math.sin(u * Math.PI * 3) * e;
    },
    buz_pendulum(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15)), w = Math.sin(u * Math.PI * 5);
        P.sawL.rot = 34 * w * env; P.sawL.dy = -8 * Math.abs(w) * env;
        P.sawR.rot = 34 * w * env; P.sawR.dy = 8 * (1 - Math.abs(w)) * env - 8 * env;
        P.body.rot = -4 * w * env; P.body.dx = -6 * w * env;
    },
});
Object.assign(FX, {
    buz_ricochet(ctx, u) {
        const wind = ease(u / 0.3), thr = ease((u - 0.3) / 0.12), rec = ease((u - 0.6) / 0.4);
        // wind-up flicker on the hubs
        const gl = wind * (1 - thr);
        [[130, 285], [395, 285]].forEach(p => {
            const g = ctx.createRadialGradient(p[0], p[1], 4, p[0], p[1], 60);
            g.addColorStop(0, 'rgba(255,230,150,' + (0.6 * gl) + ')'); g.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 60, 0, 7); ctx.fill();
        });
        if (u < 0.3) return 0;
        // two discs zig-zag through the frame, bouncing at the edges with sparks
        const t = (u - 0.3) / 0.7;
        const disc = (x, y, r, a, spin) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
            ctx.fillStyle = 'rgba(210,215,225,' + a + ')'; ctx.strokeStyle = 'rgba(40,45,55,' + a + ')'; ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2, rr = i % 2 ? r : r * 0.78; ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(70,75,90,' + a + ')'; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.fill();
            ctx.restore();
        };
        const tri = v => 1 - Math.abs(((v % 2) + 2) % 2 - 1);   // 0..1..0 bounce
        const a = 1 - rec * 0.9;
        // disc 1 from left, disc 2 from right, bouncing vertically between y 60 and 440
        const x1 = -40 + t * 600, y1 = 60 + tri(t * 3) * 380;
        const x2 = 552 - t * 600, y2 = 440 - tri(t * 3 + 0.5) * 380;
        disc(x1, y1, 34, a, t * 40); disc(x2, y2, 34, a, -t * 40);
        // trail
        ctx.strokeStyle = 'rgba(255,240,180,' + (0.5 * a) + ')'; ctx.lineWidth = 3;
        for (let i = 1; i < 6; i++) {
            const tt = t - i * 0.025; if (tt < 0) break;
            ctx.beginPath(); ctx.arc(-40 + tt * 600, 60 + tri(tt * 3) * 380, 4, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.arc(552 - tt * 600, 440 - tri(tt * 3 + 0.5) * 380, 4, 0, 7); ctx.stroke();
        }
        // sparks at the bounce points
        const bounces = [1 / 3, 2 / 3, 1 / 6, 1 / 2, 5 / 6];
        bounces.forEach((b, i) => {
            const d = t - b; if (d < 0 || d > 0.07) return;
            const k = d / 0.07, bx = i < 2 ? -40 + b * 600 : 552 - b * 600, by = (i % 2 === 0) ? 60 : 440;
            ctx.strokeStyle = 'rgba(255,230,120,' + (1 - k) + ')'; ctx.lineWidth = 3;
            for (let s = 0; s < 8; s++) {
                const q = s / 8 * Math.PI * 2, r0 = 6 + k * 14, r1 = 14 + k * 40;
                ctx.beginPath(); ctx.moveTo(bx + Math.cos(q) * r0, by + Math.sin(q) * r0); ctx.lineTo(bx + Math.cos(q) * r1, by + Math.sin(q) * r1); ctx.stroke();
            }
        });
        return 0;
    },
    buz_cutline(ctx, u) {
        // telegraph: dashed diagonal band, then it ignites and a saw sweeps along it
        const tele = ease(u / 0.25), live = u > 0.5, sw = Math.min(1, Math.max(0, (u - 0.5) / 0.3));
        const fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
        const x0 = -60, y0 = 140, x1 = 572, y1 = 420;
        ctx.save();
        ctx.lineCap = 'butt';
        if (!live) {
            ctx.strokeStyle = 'rgba(255,190,60,' + (0.6 * tele) + ')'; ctx.lineWidth = 22; ctx.setLineDash([26, 18]);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        } else {
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255,90,40,' + (0.55 * fade) + ')'; ctx.lineWidth = 30;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,245,200,' + fade + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * sw, y0 + (y1 - y0) * sw); ctx.stroke();
            // sweeping saw
            const sx = x0 + (x1 - x0) * sw, sy = y0 + (y1 - y0) * sw;
            ctx.translate(sx, sy); ctx.rotate(u * 60);
            ctx.fillStyle = 'rgba(220,225,235,' + fade + ')'; ctx.strokeStyle = 'rgba(40,45,55,' + fade + ')'; ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 28; i++) { const q = i / 28 * Math.PI * 2, rr = i % 2 ? 46 : 36; ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        return u > 0.5 && u < 0.58 ? 0.35 * (1 - (u - 0.5) / 0.08) : 0;
    },
    buz_traps(ctx, u) {
        const spots = [[70, 430], [190, 455], [330, 450], [450, 425], [260, 470]];
        const warn = ease(u / 0.35);
        const out = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1;
        spots.forEach((s, i) => {
            const e = ease((u - 0.45 - i * 0.04) / 0.15);
            if (e <= 0) {
                const fl = 0.5 + 0.5 * Math.sin(u * 40 + i);
                ctx.strokeStyle = 'rgba(255,80,50,' + (0.9 * warn * fl) + ')'; ctx.lineWidth = 5; ctx.setLineDash([8, 6]);
                ctx.beginPath(); ctx.ellipse(s[0], s[1], 34, 14, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
                return;
            }
            ctx.save(); ctx.globalAlpha = out; ctx.translate(s[0], s[1] - 8 * e);
            ctx.scale(1, 0.55); ctx.rotate(u * 25 + i);
            ctx.fillStyle = 'rgb(215,220,230)'; ctx.strokeStyle = 'rgb(40,45,55)'; ctx.lineWidth = 3;
            ctx.beginPath();
            for (let q2 = 0; q2 < 22; q2++) { const q = q2 / 22 * Math.PI * 2, rr = (q2 % 2 ? 36 : 28) * e; ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
            if (e < 1) { // eruption sparks
                ctx.strokeStyle = 'rgba(255,230,120,' + (1 - e) + ')'; ctx.lineWidth = 3;
                for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.15 + k * 0.14); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] + Math.cos(a) * (14 + e * 40), s[1] + Math.sin(a) * (14 + e * 40)); ctx.stroke(); }
            }
        });
        return 0;
    },
    buz_pendulum(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15)), w = Math.sin(u * Math.PI * 5);
        // two chained saws hanging from above the card, swinging in opposition
        [[130, w], [394, -w]].forEach((p, i) => {
            const ang = p[1] * 0.85 * env, L = 190, px = p[0], py = -10;
            const sx = px + Math.sin(ang) * L, sy = py + Math.cos(ang) * L;
            ctx.strokeStyle = 'rgba(90,95,110,' + env + ')'; ctx.lineWidth = 7; ctx.setLineDash([12, 5]);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]);
            ctx.save(); ctx.globalAlpha = env; ctx.translate(sx, sy); ctx.rotate(u * 50 * (i ? -1 : 1));
            ctx.fillStyle = 'rgb(215,220,230)'; ctx.strokeStyle = 'rgb(40,45,55)'; ctx.lineWidth = 3;
            ctx.beginPath();
            for (let k = 0; k < 26; k++) { const q = k / 26 * Math.PI * 2, rr = k % 2 ? 44 : 34; ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgb(70,75,90)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
            ctx.restore();
            // swoosh arc
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 * env) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(px, py, L, Math.PI / 2 - 0.85, Math.PI / 2 + 0.85); ctx.stroke();
        });
        return 0;
    },
});
// <<< poses boss_buzz

// >>> poses boss_clock
// ---- The Clock -------------------------------------------------------------
// Clock Hands: both arms swing up like clock hands, the face flares and three
//   glowing hands sweep around it, leaving a fading trail.
// Probability Shift: the arms jitter in alternation while marks tick out in
//   one place and tick back in somewhere else.
Object.assign(POSES, {
    clk_hands(P, u) {
        const up = ease(Math.min(u / 0.25, 1)), down = ease((u - 0.8) / 0.2), k = up * (1 - down);
        const w = Math.sin(u * Math.PI * 6);
        P.armR.rot = (-34 + 10 * w) * k; P.armR.dy = -10 * k;
        P.armL.rot = (30 - 10 * w) * k; P.armL.dy = -8 * k;
        P.body.dy = -5 * k; P.body.rot = 1.5 * w * k;
    },
    clk_shift(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15)), w = Math.sin(u * Math.PI * 8);
        P.armR.rot = 28 * w * env; P.armR.dy = -6 * Math.abs(w) * env;
        P.armL.rot = -28 * w * env; P.armL.dy = -6 * Math.abs(w) * env;
        P.body.dx = 4 * Math.sin(u * Math.PI * 14) * env; P.body.dy = -2 * Math.abs(w) * env;
    },
});
Object.assign(FX, {
    clk_hands(ctx, u) {
        const up = ease(Math.min(u / 0.25, 1)), down = ease((u - 0.8) / 0.2), k = up * (1 - down);
        const cx = 247, cy = 197;
        const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, 110);
        g.addColorStop(0, 'rgba(255,240,120,' + (0.6 * k) + ')'); g.addColorStop(1, 'rgba(255,200,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 110, 0, 7); ctx.fill();
        const lens = [150, 120, 85], spd = [3.2, 1.6, 0.8];
        for (let h = 0; h < 3; h++) {
            const a0 = -Math.PI / 2 + h * 2.094 + u * Math.PI * 2 * spd[h];
            for (let t = 0; t < 7; t++) {
                const a = a0 - t * 0.12;
                ctx.strokeStyle = 'rgba(255,230,90,' + (0.9 * k * (1 - t / 7)) + ')';
                ctx.lineWidth = 7 - h * 1.5;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * lens[h], cy + Math.sin(a) * lens[h]); ctx.stroke();
            }
        }
        // ring of tick marks
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6;
            ctx.strokeStyle = 'rgba(255,240,150,' + (0.7 * k) + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 160, cy + Math.sin(a) * 160); ctx.lineTo(cx + Math.cos(a) * 176, cy + Math.sin(a) * 176); ctx.stroke();
        }
        return 0.25 * Math.max(0, 1 - Math.abs(u - 0.25) * 12);
    },
    clk_shift(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        for (let i = 0; i < 5; i++) {
            const ph = ((u * 1.6 + i * 0.2) % 1);
            const ax = 120 + i * 70, ay = 100 + (i % 2) * 30, bx = 400 - i * 60, by = 420 + (i % 2) * 20;
            const out = 1 - ease(ph / 0.4), inn = ease((ph - 0.5) / 0.3);
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(255,230,110,' + (0.9 * out * env) + ')';
            ctx.beginPath(); ctx.arc(ax, ay, 12, 0, 7); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 9); ctx.moveTo(ax, ay); ctx.lineTo(ax + 6, ay); ctx.stroke();
            ctx.strokeStyle = 'rgba(150,230,255,' + (0.9 * inn * env) + ')';
            ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.moveTo(bx, by); ctx.lineTo(bx - 7, by - 4); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 9); ctx.stroke();
        }
        // time glitch slashes
        for (let i = 0; i < 5; i++) {
            if (((u * 12 + i * 0.37) % 1) > 0.35) continue;
            ctx.fillStyle = 'rgba(255,230,110,' + (0.5 * env) + ')';
            ctx.fillRect(150 + ((i * 61) % 220), 160 + ((i * 47) % 200), 50 + (i % 3) * 20, 4);
        }
        return 0;
    },
});
// <<< poses boss_clock

// >>> poses boss_brutus
// ---- Brutus ----------------------------------------------------------------
// Ground Slam: both stone fists rise slowly overhead, hang, then smash down;
//   a shock band races across the floor.
// Sacrificial Zombies: alternating fist-pounds on the ground; green hands claw up.
// Corrupt Cells: arms thrown wide, fists tremble while purple corruption pulses.
Object.assign(POSES, {
    bru_slam(P, u) {
        const up = ease(u / 0.6), hold = u >= 0.6 && u < 0.66;
        const smash = u >= 0.66 ? ease((u - 0.66) / 0.08) : 0;
        const rec = ease((u - 0.8) / 0.2);
        const raise = u < 0.66 ? up : 1 - smash;
        const k = raise * (1 - (u >= 0.8 ? rec : 0)) + (u >= 0.8 ? 0 : 0);
        const over = u >= 0.66 && u < 0.8 ? Math.sin((u - 0.66) / 0.14 * Math.PI) : 0;
        P.armL.rot = 42 * k - 6 * over; P.armL.dy = -16 * k;
        P.armR.rot = -42 * k + 6 * over; P.armR.dy = -16 * k;
        P.body.dy = -14 * k + 14 * over;
        P.body.rot = hold ? Math.sin(u * 90) * 0.8 : 0;
    },
    bru_zombies(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const w = Math.sin(u * Math.PI * 6);
        const l = Math.max(0, w), r = Math.max(0, -w);
        P.armL.rot = 30 * l * env; P.armL.dy = -14 * l * env;
        P.armR.rot = -30 * r * env; P.armR.dy = -14 * r * env;
        P.body.dy = 4 * (Math.abs(w)) * env; P.body.rot = 1.5 * w * env;
    },
    bru_corrupt(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        const sh = Math.sin(u * 60) * env;
        P.armL.rot = 24 * env + 4 * sh; P.armL.dy = -8 * env; P.armL.dx = -10 * env;
        P.armR.rot = -24 * env - 4 * sh; P.armR.dy = -8 * env; P.armR.dx = 10 * env;
        P.body.dy = -5 * env + sh; P.body.rot = 1.2 * sh;
    },
});
Object.assign(FX, {
    bru_slam(ctx, u) {
        const up = u < 0.66 ? ease(u / 0.6) : 0;
        // wind-up glow on the raised stone fists
        if (up > 0) {
            [[60, 260], [450, 250]].forEach((c) => {
                const y = c[1] - 90 * up;
                const g = ctx.createRadialGradient(c[0], y, 4, c[0], y, 70);
                g.addColorStop(0, 'rgba(255,170,90,' + (0.6 * up) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], y, 70, 0, 7); ctx.fill();
            });
        }
        if (u >= 0.66) {
            const k = Math.min(1, (u - 0.66) / 0.34);
            // shock band across the floor
            ctx.fillStyle = 'rgba(255,140,60,' + (0.55 * (1 - k)) + ')';
            ctx.fillRect(-256, 400 - 18 * (1 - k), 1024, 36 * (1 - k) + 6);
            ctx.strokeStyle = 'rgba(255,230,190,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(256, 410, 40 + k * 460, 10 + k * 60, 0, 0, 7); ctx.stroke();
            // debris
            ctx.fillStyle = 'rgba(120,100,90,' + (0.9 * (1 - k)) + ')';
            for (let i = 0; i < 10; i++) {
                const a = i / 10 * Math.PI, d = 60 + k * 190;
                ctx.fillRect(256 + Math.cos(a) * d * (i % 2 ? 1 : -1) - 5, 410 - Math.sin(a) * d * 0.5 * (1 - k) - 20 * k - 5, 10, 10);
            }
            const f = u - 0.66;
            return f < 0.06 ? 0.45 * (1 - f / 0.06) : 0;
        }
        return 0;
    },
    bru_zombies(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const w = Math.sin(u * Math.PI * 6);
        // impact rings where fists pound
        [[70, 410, Math.max(0, w)], [445, 395, Math.max(0, -w)]].forEach((c) => {
            if (c[2] > 0.1) {
                ctx.strokeStyle = 'rgba(180,255,150,' + (0.6 * c[2] * env) + ')'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.ellipse(c[0], c[1], 20 + 60 * (1 - c[2]), 6 + 16 * (1 - c[2]), 0, 0, 7); ctx.stroke();
            }
        });
        // green zombie hands clawing out of the ground
        const spots = [60, 150, 360, 450, 250];
        spots.forEach((x, i) => {
            const k = ease((u - 0.15 - i * 0.1) / 0.3) * ease((1 - u) / 0.12 + 0.0);
            if (k <= 0) return;
            const h = 52 * k, y = 440 + (i % 2) * 14;
            ctx.fillStyle = 'rgba(40,20,30,' + (0.8 * k) + ')'; ctx.beginPath(); ctx.ellipse(x, y, 26 * k + 4, 8, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(120,200,110,' + k + ')'; ctx.lineWidth = 8; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(u * 9 + i) * 6, y - h); ctx.stroke();
            ctx.lineWidth = 4;
            for (let f = -1; f <= 1; f++) {
                ctx.beginPath(); ctx.moveTo(x + Math.sin(u * 9 + i) * 6, y - h); ctx.lineTo(x + f * 10, y - h - 14 * k); ctx.stroke();
            }
        });
        return 0;
    },
    bru_corrupt(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        // purple orbs spiralling into the fists
        [[40, 300], [470, 290]].forEach((c, s) => {
            const g = ctx.createRadialGradient(c[0], c[1], 4, c[0], c[1], 80);
            g.addColorStop(0, 'rgba(210,90,255,' + (0.6 * env) + ')'); g.addColorStop(1, 'rgba(120,30,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 80, 0, 7); ctx.fill();
            for (let i = 0; i < 6; i++) {
                const a = u * 9 + i * 1.05 + s * 2, r = 100 * (1 - ((u * 2 + i / 6) % 1));
                ctx.fillStyle = 'rgba(230,140,255,' + (0.8 * env) + ')';
                ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.7, 5, 0, 7); ctx.fill();
            }
        });
        // corrupted floor cells pulsing
        const cells = [[130, 430], [256, 450], [380, 430], [60, 400], [450, 405]];
        cells.forEach((c, i) => {
            const a = env * (0.4 + 0.4 * Math.sin(u * 14 + i * 1.7)) * ease((u - i * 0.06) / 0.2);
            ctx.fillStyle = 'rgba(150,40,210,' + (0.4 * a) + ')'; ctx.strokeStyle = 'rgba(230,130,255,' + a + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(c[0], c[1] - 16); ctx.lineTo(c[0] + 36, c[1]); ctx.lineTo(c[0], c[1] + 16); ctx.lineTo(c[0] - 36, c[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        return 0;
    },
});
// <<< poses boss_brutus


// >>> poses boss_chaos
// ---- The Chaos -------------------------------------------------------------
// Roulette of Ruin: all four arms flail out of sync while a coloured wheel
//   spins over the chest and flings out shrapnel, orbs and a pulse ring.
// War Shout: it rears back, then all arms fling wide as red shock rings roar out.
// Fog Bank: the arms sweep low and the staff waves while grey-violet fog billows.
Object.assign(POSES, {
    cha_roulette(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const w = Math.sin(u * Math.PI * 8), w2 = Math.sin(u * Math.PI * 8 + 2.1), w3 = Math.sin(u * Math.PI * 8 + 4.2);
        P.staffArm.rot = 32 * w * env; P.staffArm.dy = -6 * Math.abs(w) * env;
        P.diceArm.rot = -32 * w2 * env; P.diceArm.dy = -6 * Math.abs(w2) * env;
        P.lowLeft.rot = 26 * w3 * env; P.lowLeft.dy = 5 * w3 * env;
        P.lowRight.rot = -26 * w * env; P.lowRight.dy = 5 * w2 * env;
        P.body.rot = 2.5 * w2 * env; P.body.dy = -3 * Math.abs(w3) * env;
    },
    cha_roar(P, u) {
        const back = ease(u / 0.3), fling = ease((u - 0.3) / 0.12), rec = ease((u - 0.65) / 0.35);
        const k = (u < 0.3 ? back * 0.4 : 0.4 + 0.6 * fling) * (1 - rec);
        const shake = u > 0.35 && u < 0.8 ? Math.sin(u * 90) : 0;
        P.body.rot = (u < 0.3 ? -5 * back : 4 * fling) * (1 - rec) + 1.2 * shake;
        P.body.dy = (u < 0.3 ? 6 * back : -8 * fling) * (1 - rec);
        P.staffArm.rot = -38 * k + 3 * shake; P.staffArm.dy = -12 * k;
        P.diceArm.rot = 38 * k - 3 * shake; P.diceArm.dy = -12 * k;
        P.lowLeft.rot = -30 * k; P.lowLeft.dy = -10 * k;
        P.lowRight.rot = 30 * k; P.lowRight.dy = -10 * k;
    },
    cha_fog(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        const w = Math.sin(u * Math.PI * 4);
        P.staffArm.rot = 28 * w * env; P.staffArm.dy = -4 * env;
        P.diceArm.rot = -28 * w * env; P.diceArm.dy = -4 * env;
        P.lowLeft.rot = 30 * env * (0.5 + 0.5 * w); P.lowLeft.dx = -10 * env;
        P.lowRight.rot = -30 * env * (0.5 + 0.5 * w); P.lowRight.dx = 10 * env;
        P.body.dy = 4 * env; P.body.rot = -2 * w * env;
    },
});
Object.assign(FX, {
    cha_roulette(ctx, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const cx = 255, cy = 260, R = 105;
        const cols = ['#ff4d6d', '#ffd23f', '#4dd2ff', '#b06bff', '#4dff9a', '#ff8a3d'];
        const rot = u * Math.PI * 9 * (1 - 0.5 * u);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.globalAlpha = 0.36 * env;
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, i * Math.PI / 3, (i + 1) * Math.PI / 3); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 0.9 * env; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
        ctx.restore();
        // pointer
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * env) + ')';
        ctx.beginPath(); ctx.moveTo(cx, cy - R - 4); ctx.lineTo(cx - 14, cy - R - 28); ctx.lineTo(cx + 14, cy - R - 28); ctx.fill();
        // ejected bits: shrapnel, orbs, pulse ring
        for (let i = 0; i < 4; i++) {
            const t = ((u * 2.2 + i * 0.25) % 1);
            const a = i * 1.7 + Math.floor(u * 2.2 + i * 0.25) * 0.9;
            const d = R + t * 170, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
            ctx.fillStyle = cols[(i + Math.floor(u * 2.2)) % 6]; ctx.globalAlpha = (1 - t) * env;
            ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
        }
        const p = (u * 1.6) % 1;
        ctx.globalAlpha = (1 - p) * 0.8 * env; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6 * (1 - p) + 1;
        ctx.beginPath(); ctx.arc(cx, cy, R + p * 180, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
        return 0;
    },
    cha_roar(ctx, u) {
        const hx = 300, hy = 190;
        const aura = ease((u - 0.25) / 0.15) * (1 - ease((u - 0.7) / 0.3));
        const g = ctx.createRadialGradient(hx, 260, 20, hx, 260, 280);
        g.addColorStop(0, 'rgba(255,60,60,' + (0.45 * aura) + ')'); g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, 260, 280, 0, 7); ctx.fill();
        if (u > 0.3) {
            for (let i = 0; i < 3; i++) {
                const k = (u - 0.3 - i * 0.1) / 0.55;
                if (k <= 0 || k >= 1) continue;
                ctx.strokeStyle = 'rgba(255,90,70,' + (0.85 * (1 - k)) + ')'; ctx.lineWidth = 12 * (1 - k) + 2;
                ctx.beginPath(); ctx.ellipse(hx, hy + 40, 30 + k * 300, 25 + k * 240, 0, 0, 7); ctx.stroke();
            }
            // radiating spikes
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6, k = Math.min(1, (u - 0.3) / 0.35);
                if (u > 0.8) continue;
                ctx.strokeStyle = 'rgba(255,200,120,' + (0.8 * (1 - k * 0.5)) + ')'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * (70 + 40 * k), hy + 40 + Math.sin(a) * (70 + 40 * k));
                ctx.lineTo(hx + Math.cos(a) * (110 + 120 * k), hy + 40 + Math.sin(a) * (110 + 120 * k)); ctx.stroke();
            }
        }
        return 0.35 * Math.max(0, 1 - Math.abs(u - 0.33) * 14);
    },
    cha_fog(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.25));
        for (let i = 0; i < 14; i++) {
            const bx = 40 + ((i * 97) % 440), by = 330 + ((i * 53) % 110);
            const drift = Math.sin(u * 3 + i) * 30 + u * (i % 2 ? 40 : -40);
            const r = 50 + (i % 4) * 14 + env * 35;
            const x = bx + drift, y = by - env * (30 + (i % 3) * 25);
            const g = ctx.createRadialGradient(x, y, 4, x, y, r);
            g.addColorStop(0, 'rgba(190,170,225,' + (0.55 * env) + ')'); g.addColorStop(1, 'rgba(150,130,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
        // staff eye gleams in the mist
        ctx.fillStyle = 'rgba(255,90,90,' + (0.4 * env) + ')';
        ctx.beginPath(); ctx.arc(75, 170, 24 + 6 * Math.sin(u * 20), 0, 7); ctx.fill();
        return 0;
    },
});
// <<< poses boss_chaos


// >>> poses boss_coil
// ---- The Coil --------------------------------------------------------------
// Frozen Cells: the head rears back and inhales, then lunges and breathes a
//   frost cone; the tail coil whips. Ice cells crust over the floor and creep
//   outward, then crack and thaw.
Object.assign(POSES, {
    coi_freeze(P, u) {
        const rear = ease(u / 0.3), lunge = ease((u - 0.34) / 0.1), rec = ease((u - 0.62) / 0.35);
        let h = 18 * rear;
        if (u > 0.34) h = 18 * (1 - lunge) - 20 * lunge;
        if (u > 0.62) h = -20 * (1 - rec);
        P.head.rot = h;
        P.head.dy = -10 * rear * (1 - lunge) + 6 * lunge * (1 - rec);
        const w = Math.sin(u * Math.PI * 5) * Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.2);
        P.tailCoil.rot = 28 * w;
        P.tailCoil.dy = -6 * Math.abs(w);
        P.body.dy = 3 * lunge * (1 - rec);
    },
});
Object.assign(FX, {
    coi_freeze(ctx, u) {
        const breath = u > 0.36 && u < 0.7 ? Math.sin((u - 0.36) / 0.34 * Math.PI) : 0;
        if (breath > 0) {
            const g = ctx.createRadialGradient(205, 245, 4, 110, 330, 190);
            g.addColorStop(0, 'rgba(230,255,255,' + (0.85 * breath) + ')');
            g.addColorStop(0.5, 'rgba(120,210,255,' + (0.5 * breath) + ')');
            g.addColorStop(1, 'rgba(80,160,255,0)');
            ctx.fillStyle = g; ctx.beginPath();
            ctx.moveTo(205, 235); ctx.lineTo(10, 330); ctx.lineTo(60, 470); ctx.lineTo(215, 270); ctx.closePath(); ctx.fill();
        }
        // ice cells: appear after the breath, creep to neighbours, then thaw
        const cells = [[70, 410], [140, 450], [230, 440], [320, 450], [410, 420], [455, 360]];
        const born = ease((u - 0.42) / 0.2), melt = ease((u - 0.8) / 0.2);
        cells.forEach((c, i) => {
            const k = Math.max(0, Math.min(1, born * 1.6 - i * 0.12));
            if (k <= 0) return;
            const s = 30 * k * (1 - 0.6 * melt), a = (1 - melt);
            ctx.fillStyle = 'rgba(150,225,255,' + (0.45 * a) + ')';
            ctx.strokeStyle = 'rgba(235,255,255,' + (0.95 * a) + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.rect(c[0] - s, c[1] - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c[0] - s, c[1] - s); ctx.lineTo(c[0] + s * 0.3, c[1] + s * 0.2); ctx.lineTo(c[0] + s, c[1] + s); ctx.stroke();
        });
        return u > 0.34 && u < 0.46 ? 0.3 * (1 - Math.abs(u - 0.4) / 0.06) : 0;
    },
});
// <<< poses boss_coil

// >>> poses boss_creeper
// ---- The Creeper -----------------------------------------------------------
// Creeper Pack: the nest-mother rears, arms flung wide, and hisses out small
//   creepers that scuttle off to both sides.
// Fuse Pounce: crouch with a lit fuse, spring up, slam down (flash + ring).
// TNT Chain: both arms hoisted high, then hurled down as TNT rains and chains.
Object.assign(POSES, {
    cre_pack(P, u) {
        const rear = ease(u / 0.3), spit = ease((u - 0.3) / 0.15), rec = ease((u - 0.75) / 0.25);
        const k = (rear - 0.25 * spit) * (1 - rec);
        const pulse = Math.sin(u * Math.PI * 10) * (u > 0.3 && u < 0.8 ? 1 : 0);
        P.armL.rot = 38 * k + 8 * pulse; P.armR.rot = -38 * k - 8 * pulse;
        P.armL.dy = -10 * k; P.armR.dy = -10 * k;
        P.body.dy = -8 * rear * (1 - rec) + 6 * pulse * 0.5;
        P.body.rot = 2 * pulse;
        P.fuse.rot = 14 * Math.sin(u * Math.PI * 14) * (1 - rec);
    },
    cre_pounce(P, u) {
        const crouch = ease(u / 0.3), leap = ease((u - 0.3) / 0.18), slam = ease((u - 0.5) / 0.1), rec = ease((u - 0.65) / 0.35);
        const air = leap * (1 - slam);
        const hiss = u > 0.6 ? Math.sin(u * Math.PI * 24) * (1 - rec) : 0;
        P.body.dy = 16 * crouch * (1 - leap) - 48 * air + 12 * slam * (1 - rec);
        P.armL.rot = -20 * crouch * (1 - leap) + 40 * air - 15 * slam * (1 - rec);
        P.armR.rot = 20 * crouch * (1 - leap) - 40 * air + 15 * slam * (1 - rec);
        P.fuse.rot = -18 * crouch * (1 - leap) + 12 * hiss;
        P.body.rot = 4 * hiss;
    },
    cre_tnt(P, u) {
        const up = ease(u / 0.3), hurl = ease((u - 0.45) / 0.1), rec = ease((u - 0.7) / 0.3);
        const k = (up * (1 - hurl) + 0.0) * (1 - rec);
        const smash = hurl * (1 - rec);
        P.armL.rot = 45 * k - 18 * smash; P.armR.rot = -45 * k + 18 * smash;
        P.armL.dy = -16 * k; P.armR.dy = -16 * k;
        P.body.dy = -6 * k + 8 * smash;
        P.fuse.rot = 10 * Math.sin(u * Math.PI * 9) * (1 - rec);
    },
});
Object.assign(FX, {
    cre_pack(ctx, u) {
        // spark on the fuse
        const sp = 0.5 + 0.5 * Math.sin(u * 60);
        ctx.fillStyle = 'rgba(255,220,90,' + (0.6 + 0.4 * sp) + ')';
        ctx.beginPath(); ctx.arc(296, 52, 6 + 5 * sp, 0, 7); ctx.fill();
        // mini creepers pop out and run to both sides
        const t = ease((u - 0.3) / 0.65);
        if (u > 0.3) {
            for (let i = 0; i < 4; i++) {
                const dir = i % 2 ? 1 : -1, d = Math.floor(i / 2);
                const x = 249 + dir * (60 + t * (170 + d * 90)), y = 440 - Math.abs(Math.sin(t * 9 + i)) * 22 + d * 14;
                const s = 0.5 + 0.5 * Math.min(1, (u - 0.3) / 0.1);
                ctx.fillStyle = 'rgba(90,185,70,' + (1 - 0.3 * t) + ')'; ctx.fillRect(x - 22 * s, y - 40 * s, 44 * s, 40 * s);
                ctx.fillStyle = 'rgba(20,50,20,1)';
                ctx.fillRect(x - 14 * s, y - 32 * s, 9 * s, 9 * s); ctx.fillRect(x + 5 * s, y - 32 * s, 9 * s, 9 * s);
                ctx.fillRect(x - 6 * s, y - 20 * s, 12 * s, 12 * s);
                ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * Math.abs(Math.sin(u * 40 + i))) * 0.5 + ')'; ctx.fillRect(x - 22 * s, y - 40 * s, 44 * s, 6 * s);
            }
        }
        // puff of green smoke at the belly
        const g = ease((u - 0.28) / 0.2) * (1 - ease((u - 0.5) / 0.3));
        ctx.fillStyle = 'rgba(140,255,120,' + (0.35 * g) + ')';
        ctx.beginPath(); ctx.arc(249, 400, 40 + 90 * g, 0, 7); ctx.fill();
        return 0;
    },
    cre_pounce(ctx, u) {
        // fuse fizz
        const sp = 0.5 + 0.5 * Math.sin(u * 70);
        ctx.fillStyle = 'rgba(255,200,70,' + (0.5 + 0.5 * sp) + ')';
        ctx.beginPath(); ctx.arc(296, 52, 7 + 6 * sp, 0, 7); ctx.fill();
        // target shadow on the ground grows while airborne
        const air = ease((u - 0.3) / 0.2) * (1 - ease((u - 0.5) / 0.1));
        ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + 0.3 * air) + ')';
        ctx.beginPath(); ctx.ellipse(249, 500, 70 + 40 * air, 14 + 8 * air, 0, 0, 7); ctx.fill();
        // landing shockwave
        if (u > 0.5) {
            const k = Math.min(1, (u - 0.5) / 0.4);
            ctx.strokeStyle = 'rgba(255,230,120,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 10 * (1 - k) + 2;
            ctx.beginPath(); ctx.ellipse(249, 495, 40 + k * 230, 10 + k * 55, 0, 0, 7); ctx.stroke();
        }
        // hiss blink on the land, short flash on slam
        const hiss = u > 0.6 ? (Math.sin(u * Math.PI * 24) > 0 ? 0.3 : 0) * (1 - ease((u - 0.6) / 0.4)) : 0;
        const slam = u > 0.5 && u < 0.6 ? 0.45 * (1 - (u - 0.5) / 0.1) : 0;
        return Math.max(hiss, slam);
    },
    cre_tnt(ctx, u) {
        // fuse fizz
        const sp = 0.5 + 0.5 * Math.sin(u * 50);
        ctx.fillStyle = 'rgba(255,210,80,' + (0.5 + 0.5 * sp) + ')';
        ctx.beginPath(); ctx.arc(296, 52, 6 + 6 * sp, 0, 7); ctx.fill();
        const spots = [[249, 330], [130, 380], [370, 370], [60, 300], [440, 310], [190, 460], [320, 460]];
        for (let i = 0; i < spots.length; i++) {
            const t0 = 0.45 + i * 0.03;
            if (u < t0) continue;
            const fall = Math.min(1, (u - t0) / 0.1), y = spots[i][1] - (1 - fall) * 360;
            const boom = Math.max(0, (u - t0 - 0.12) / 0.2);
            const x = spots[i][0];
            if (boom < 1 && boom <= 0) {
                ctx.fillStyle = 'rgba(210,40,30,1)'; ctx.fillRect(x - 24, y - 40, 48, 40);
                ctx.fillStyle = 'rgba(255,240,230,1)'; ctx.fillRect(x - 24, y - 26, 48, 12);
                ctx.fillStyle = 'rgba(40,20,20,1)'; ctx.fillRect(x - 14, y - 25, 28, 10);
            } else if (boom > 0 && boom < 1) {
                ctx.fillStyle = 'rgba(255,' + Math.round(220 - 140 * boom) + ',60,' + (0.85 * (1 - boom)) + ')';
                ctx.beginPath(); ctx.arc(x, y - 20, 25 + 70 * boom, 0, 7); ctx.fill();
            }
        }
        const f = u > 0.5 && u < 0.85 ? 0.12 + 0.1 * Math.sin(u * 60) : 0;
        return Math.max(0, f);
    },
});
// <<< poses boss_creeper

// >>> poses boss_colossus
// ---- The Colossus ----------------------------------------------------------
// Seismic Stride: the right leg lifts and stomps, the body lurches - a dashed
//   shockwave ring spreads from the footprint.
// Corrupt Cells: mace and fist rise and tremble, purple floor cells flare.
// Boulder Rain: mace and fist thrust skyward, boulders fall with shadows.
// Granite Golems: the mace is raised and slammed down, rock lumps rise.
Object.assign(POSES, {
    col_stride(P, u) {
        const lift = ease(u / 0.35), stomp = ease((u - 0.38) / 0.1), rec = ease((u - 0.6) / 0.4);
        const l = u < 0.38 ? lift : (1 - stomp);
        const hit = u > 0.48 ? Math.max(0, 1 - (u - 0.48) * 3) : 0;
        const k = 1 - rec * (u > 0.6 ? 1 : 0);
        P.legR.rot = -26 * l * k; P.legR.dy = -26 * l * k; P.legR.dx = 8 * l * k;
        P.body.dx = -8 * l * k; P.body.dy = -5 * l * k + 7 * hit;
        P.club.rot = 14 * l * k - 10 * hit; P.club.dy = -8 * l * k;
        P.armR.rot = -18 * l * k + 12 * hit; P.armR.dy = -6 * l * k;
    },
    col_corrupt(P, u) {
        const env = ease(Math.min(u / 0.22, 1, (1 - u) / 0.2)), sh = Math.sin(u * 58) * env;
        P.club.rot = 36 * env + 4 * sh; P.club.dy = -16 * env;
        P.armR.rot = 34 * env - 4 * sh; P.armR.dy = -14 * env; P.armR.dx = -6 * env;
        P.body.dy = -4 * env + sh * 1.5; P.body.rot = 1.2 * sh;
    },
    col_boulders(P, u) {
        const up = ease(u / 0.3), hold = u < 0.8 ? 1 : 1 - ease((u - 0.8) / 0.2);
        const b = Math.sin(u * 40) * 0.5;
        P.club.rot = 42 * up * hold + b; P.club.dy = -20 * up * hold;
        P.armR.rot = 46 * up * hold - b; P.armR.dy = -18 * up * hold; P.armR.dx = -10 * up * hold;
        P.body.dy = 3 * up * hold; P.body.rot = -1.5 * up * hold;
    },
    col_golems(P, u) {
        const up = ease(u / 0.3), slam = ease((u - 0.38) / 0.1), rec = ease((u - 0.65) / 0.35);
        const r = u < 0.38 ? up : (1 - slam);
        const hit = u > 0.48 ? Math.max(0, 1 - (u - 0.48) * 2.5) : 0;
        const k = u > 0.65 ? 1 - rec : 1;
        P.club.rot = (38 * r - 20 * (u >= 0.38 ? slam : 0)) * k; P.club.dy = (-18 * r + 10 * (u >= 0.38 ? slam : 0)) * k;
        P.armR.rot = (-28 * up * (u < 0.38 ? 1 : 1 - slam) + 10 * hit) * k; P.armR.dy = -10 * up * k;
        P.body.dy = (-4 * r + 8 * hit) * k; P.legR.dy = 3 * hit; P.legR.rot = 4 * hit;
    },
});
Object.assign(FX, {
    col_stride(ctx, u) {
        // stomp footprint (right foot) and an expanding dashed shockwave ring
        const lift = u < 0.38 ? ease(u / 0.35) : 0;
        if (lift > 0) {
            ctx.fillStyle = 'rgba(0,0,0,' + (0.25 * lift) + ')';
            ctx.beginPath(); ctx.ellipse(355, 410, 40, 12, 0, 0, 7); ctx.fill();
        }
        if (u > 0.45) {
            const k = Math.min(1, (u - 0.45) / 0.5), a = 1 - k;
            ctx.save();
            ctx.setLineDash([22, 14]); ctx.lineDashOffset = -k * 60;
            ctx.strokeStyle = 'rgba(255,220,150,' + (0.9 * a) + ')'; ctx.lineWidth = 7 * a + 2;
            ctx.beginPath(); ctx.ellipse(355, 405, 30 + k * 230, 10 + k * 60, 0, 0, 7); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(200,170,110,' + (0.35 * a) + ')';
            for (let i = 0; i < 7; i++) {
                const x = 355 + (i - 3) * 30 * (0.6 + k), y = 400 - Math.sin(k * 3 + i) * 40 * k - 8;
                ctx.beginPath(); ctx.arc(x, y, 7 * a + 2, 0, 7); ctx.fill();
            }
            ctx.restore();
        }
        return u > 0.46 && u < 0.56 ? 0.2 * (1 - (u - 0.46) / 0.1) : 0;
    },
    col_corrupt(ctx, u) {
        const env = ease(Math.min(u / 0.22, 1, (1 - u) / 0.2));
        // violet glow on the mace head and the fist, spiralling motes
        [[50, 140], [440, 260]].forEach((c, s) => {
            const g = ctx.createRadialGradient(c[0], c[1], 4, c[0], c[1], 85);
            g.addColorStop(0, 'rgba(210,90,255,' + (0.6 * env) + ')'); g.addColorStop(1, 'rgba(120,30,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 85, 0, 7); ctx.fill();
            for (let i = 0; i < 6; i++) {
                const a = u * 10 + i * 1.05 + s * 2, r = 100 * (1 - ((u * 2 + i / 6) % 1));
                ctx.fillStyle = 'rgba(230,140,255,' + (0.8 * env) + ')';
                ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.7, 5, 0, 7); ctx.fill();
            }
        });
        // corrupted floor cells
        [[110, 435], [250, 445], [390, 435], [180, 415], [330, 420]].forEach((c, i) => {
            const a = env * (0.4 + 0.4 * Math.sin(u * 14 + i * 1.7)) * ease((u - i * 0.06) / 0.2);
            ctx.fillStyle = 'rgba(150,40,210,' + (0.4 * a) + ')'; ctx.strokeStyle = 'rgba(230,130,255,' + a + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(c[0], c[1] - 16); ctx.lineTo(c[0] + 36, c[1]); ctx.lineTo(c[0], c[1] + 16); ctx.lineTo(c[0] - 36, c[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        return 0;
    },
    col_boulders(ctx, u) {
        // three boulders drop one after another, each with a growing landing shadow
        const spots = [[120, 430, 0.22], [260, 450, 0.38], [400, 425, 0.54]];
        let flash = 0;
        spots.forEach((s) => {
            const t = (u - s[2]) / 0.22;
            const warn = ease((u - s[2] + 0.2) / 0.2);
            if (t < 1) {
                ctx.fillStyle = 'rgba(0,0,0,' + (0.35 * warn) + ')';
                ctx.beginPath(); ctx.ellipse(s[0], s[1], 20 + 30 * warn, 7 + 10 * warn, 0, 0, 7); ctx.fill();
            }
            if (t >= 0 && t < 1) {
                const y = -80 + (s[1] - 20 + 80) * t * t;
                ctx.fillStyle = '#8a8372'; ctx.strokeStyle = '#2a261e'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.arc(s[0], y, 32, 0, 7); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(s[0] - 9, y - 10, 12, 0, 7); ctx.fill();
            } else if (t >= 1 && t < 1.5) {
                const k = (t - 1) / 0.5;
                ctx.fillStyle = 'rgba(150,140,115,' + (1 - k) + ')';
                for (let i = 0; i < 5; i++) {
                    const a = -0.4 - i * 0.55, r = 20 + k * 55;
                    ctx.beginPath(); ctx.arc(s[0] + Math.cos(a) * r * (i % 2 ? -1 : 1), s[1] - 12 + Math.sin(a) * r * 0.8, 9 * (1 - k) + 2, 0, 7); ctx.fill();
                }
                if (t < 1.08) flash = 0.2;
            }
        });
        return flash;
    },
    col_golems(ctx, u) {
        // slam impact where the mace lands, then rock lumps pushing out of the floor
        if (u > 0.46) {
            const k = Math.min(1, (u - 0.46) / 0.3);
            ctx.strokeStyle = 'rgba(230,200,140,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 7 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(125, 408, 15 + k * 150, 5 + k * 34, 0, 0, 7); ctx.stroke();
        }
        [[40, 430, 0.5], [210, 450, 0.56], [330, 440, 0.62], [470, 430, 0.68]].forEach((s) => {
            const g = ease((u - s[2]) / 0.2); if (g <= 0) return;
            const fade = u > 0.85 ? 1 - ease((u - 0.85) / 0.15) : 1;
            const h = 70 * g;
            ctx.save(); ctx.globalAlpha = fade;
            ctx.fillStyle = '#8f8878'; ctx.strokeStyle = '#2a261e'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(s[0] - 30, s[1]); ctx.lineTo(s[0] - 22, s[1] - h * 0.7); ctx.lineTo(s[0] - 8, s[1] - h);
            ctx.lineTo(s[0] + 12, s[1] - h * 0.95); ctx.lineTo(s[0] + 28, s[1] - h * 0.6); ctx.lineTo(s[0] + 32, s[1]);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            if (g > 0.6) { ctx.fillStyle = 'rgba(120,255,230,' + fade + ')'; ctx.fillRect(s[0] - 14, s[1] - h * 0.7, 7, 5); ctx.fillRect(s[0] + 3, s[1] - h * 0.7, 7, 5); }
            ctx.restore();
        });
        return u > 0.47 && u < 0.55 ? 0.22 * (1 - (u - 0.47) / 0.08) : 0;
    },
});
// <<< poses boss_colossus



// >>> poses boss_cyclops
// ---- The Cyclops -----------------------------------------------------------
// Eye Bursts: he rears back, arms flung wide, the eye flares and rings of orbs
//   shoot out of it in rotating volleys.
// Prior Bomb: the club is heaved overhead then slammed down; fused bombs
//   bounce out of the impact.
Object.assign(POSES, {
    cyc_eyeburst(P, u) {
        const wind = ease(u / 0.25), rec = ease((u - 0.85) / 0.15), k = wind * (1 - rec);
        const pulse = Math.sin(u * Math.PI * 8) * k;
        P.body.rot = -4 * k + 1.5 * pulse; P.body.dy = 3 * Math.abs(pulse);
        P.rightArm.rot = -28 * k + 6 * pulse; P.rightArm.dy = -6 * k;
        P.club.rot = 24 * k - 5 * pulse; P.club.dy = -8 * k;
    },
    cyc_clubbomb(P, u) {
        const up = ease(u / 0.3), slam = ease((u - 0.42) / 0.08), rec = ease((u - 0.65) / 0.35);
        const raise = u < 0.42 ? up : (1 - slam) * (1 - rec * 0) ;
        const low = slam * (1 - rec);
        P.club.rot = 38 * raise - 22 * low; P.club.dy = -14 * raise + 10 * low;
        P.rightArm.rot = 26 * raise - 14 * low; P.rightArm.dy = -8 * raise;
        P.body.rot = -3 * raise + 5 * low; P.body.dy = -4 * raise + 9 * low;
    },
});
Object.assign(FX, {
    cyc_eyeburst(ctx, u) {
        const ex = 290, ey = 172;
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.12));
        const g = ctx.createRadialGradient(ex, ey, 3, ex, ey, 70);
        g.addColorStop(0, 'rgba(255,230,120,' + (0.9 * env) + ')'); g.addColorStop(0.5, 'rgba(255,110,30,' + (0.45 * env) + ')'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 70, 0, 7); ctx.fill();
        // four volleys of eight orbs, each turned a little
        for (let v = 0; v < 4; v++) {
            const t = (u - 0.18 - v * 0.17) / 0.5;
            if (t < 0 || t > 1) continue;
            const r = 20 + t * 330, spin = v * 0.39 + t * 0.3;
            for (let i = 0; i < 8; i++) {
                const a = spin + i * Math.PI / 4, x = ex + Math.cos(a) * r, y = ey + Math.sin(a) * r;
                ctx.fillStyle = 'rgba(255,120,30,' + (0.9 * (1 - t * 0.5)) + ')';
                ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,240,170,0.95)';
                ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
            }
        }
        return 0.18 * Math.max(0, 1 - Math.abs(u - 0.2) * 12);
    },
    cyc_clubbomb(ctx, u) {
        // impact shockwave at the ground in front of the club
        const hit = (u - 0.5) / 0.4;
        if (hit > 0 && hit < 1) {
            ctx.strokeStyle = 'rgba(255,210,140,' + (0.85 * (1 - hit)) + ')'; ctx.lineWidth = 9 * (1 - hit) + 1;
            ctx.beginPath(); ctx.ellipse(100, 415, 20 + hit * 190, 6 + hit * 42, 0, 0, 7); ctx.stroke();
        }
        // three fused bombs arc out of the impact and land
        const dest = [[40, 440], [190, 450], [330, 440]];
        dest.forEach((d, i) => {
            const t = (u - 0.5 - i * 0.04) / 0.35;
            if (t < 0) return;
            const k = Math.min(1, t);
            const x = 100 + (d[0] - 100) * k, y = 410 + (d[1] - 410) * k - Math.sin(k * Math.PI) * 140;
            ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - 4, y - 4, 9, 3.6, 4.9); ctx.stroke();
            const sp = 0.5 + 0.5 * Math.sin(u * 60 + i);
            ctx.strokeStyle = '#a88'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x + 6, y - 28); ctx.stroke();
            ctx.fillStyle = 'rgba(255,' + (150 + 100 * sp | 0) + ',40,1)'; ctx.beginPath(); ctx.arc(x + 6, y - 30, 5 + 3 * sp, 0, 7); ctx.fill();
            if (k >= 1) { // landed: red arming ring
                ctx.strokeStyle = 'rgba(255,60,40,' + (0.4 + 0.4 * sp) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, y + 12, 34, 11, 0, 0, 7); ctx.stroke();
            }
        });
        return hit > 0 && hit < 0.15 ? 0.3 * (1 - hit / 0.15) : 0;
    },
});
// <<< poses boss_cyclops

// >>> poses boss_duelist
// ---- The Duelist -----------------------------------------------------------
// Flurry: three lightning-fast rapier slashes (up-left, down-left, thrust),
//   each leaving a bright slash streak; the body lunges with every strike.
// Fated Cell: the off hand flicks a glowing die; the rapier points as a
//   target ring locks onto a cell and a fate mark stamps down.
Object.assign(POSES, {
    due_flurry(P, u) {
        const env = ease(Math.min(u / 0.08, 1, (1 - u) / 0.12));
        const k = Math.min(2, Math.floor(u * 3)), f = (u * 3) % 1;
        const hit = Math.sin(Math.min(1, f / 0.55) * Math.PI);
        const rots = [-30, 26, -4], dys = [-14, 12, 0];
        P.rapierArm.rot = rots[k] * hit * env;
        P.rapierArm.dy = dys[k] * hit * env;
        P.rapierArm.dx = -22 * hit * env * (k === 2 ? 1.5 : 1);
        P.offArm.rot = 14 * hit * env; P.offArm.dy = -6 * hit * env;
        P.body.dx = -7 * hit * env; P.body.rot = -1.5 * hit * env;
    },
    due_fate(P, u) {
        const up = ease(u / 0.3), flick = ease((u - 0.35) / 0.1), rec = ease((u - 0.7) / 0.3);
        const a = u < 0.35 ? up : 1 - 0.6 * flick;
        const r = 1 - rec;
        P.offArm.rot = -38 * a * r; P.offArm.dy = -22 * a * r; P.offArm.dx = -8 * a * r;
        const pt = ease((u - 0.3) / 0.25) * r;
        P.rapierArm.rot = 12 * pt; P.rapierArm.dy = 6 * pt; P.rapierArm.dx = -14 * pt;
        P.body.dy = 3 * Math.sin(u * Math.PI);
    },
});
Object.assign(FX, {
    due_flurry(ctx, u) {
        const k = Math.min(2, Math.floor(u * 3)), f = (u * 3) % 1;
        const a = f < 0.15 ? 0 : Math.max(0, 1 - (f - 0.15) / 0.45);
        const paths = [[[40, 190], [160, 235], [30, 290]], [[40, 300], [150, 250], [20, 195]], [[0, 246], [90, 246], [215, 246]]];
        const p = paths[k];
        ctx.lineCap = 'round';
        for (let j = 0; j < 3; j++) {
            ctx.strokeStyle = 'rgba(' + (j === 0 ? '255,240,160' : '255,200,60') + ',' + (0.9 * a * (1 - j * 0.3)) + ')';
            ctx.lineWidth = 12 - j * 4;
            ctx.beginPath();
            ctx.moveTo(p[0][0] - 20, p[0][1] + j * 6);
            ctx.quadraticCurveTo(p[1][0], p[1][1] + j * 6, p[2][0], p[2][1] + j * 6);
            ctx.stroke();
        }
        // sparks
        for (let i = 0; i < 6; i++) {
            const sx = 20 + i * 24, sy = 246 + Math.sin(i * 2 + k) * 50;
            ctx.fillStyle = 'rgba(255,240,170,' + (0.8 * a) + ')';
            ctx.fillRect(sx, sy, 8, 3);
        }
        return a > 0.7 ? 0.12 : 0;
    },
    due_fate(ctx, u) {
        const lock = ease((u - 0.3) / 0.25) * (1 - ease((u - 0.78) / 0.2)), stamp = u > 0.6 ? ease((u - 0.6) / 0.35) : 0;
        // glowing die above the off hand
        const dA = Math.min(1, u / 0.2) * (1 - ease((u - 0.4) / 0.15));
        if (dA > 0.02) {
            const t = u * 14, dx = 430 - 60 * ease((u - 0.3) / 0.15), dy = 215 - 40 * Math.sin(Math.min(1, u / 0.4) * Math.PI);
            ctx.save(); ctx.translate(dx, dy); ctx.rotate(t);
            ctx.fillStyle = 'rgba(255,215,90,' + (0.9 * dA) + ')'; ctx.strokeStyle = 'rgba(255,250,200,' + dA + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.rect(-14, -14, 28, 28); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        // target ring locking onto a cell in front of the blade
        if (lock > 0) {
            const cx = 70, cy = 380, s = 60 - 24 * lock;
            ctx.strokeStyle = 'rgba(255,215,90,' + (0.9 * lock) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.rect(cx - s, cy - s, s * 2, s * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - s - 14, cy); ctx.lineTo(cx + s + 14, cy); ctx.moveTo(cx, cy - s - 14); ctx.lineTo(cx, cy + s + 14); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,230,140,' + (0.5 * lock) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(40, 250); ctx.lineTo(cx, cy - s); ctx.stroke();
        }
        if (stamp > 0) {
            ctx.fillStyle = 'rgba(255,215,90,' + (0.35 * (1 - stamp)) + ')';
            ctx.fillRect(10, 320, 120, 120);
            ctx.strokeStyle = 'rgba(255,240,170,' + (0.9 * (1 - stamp)) + ')'; ctx.lineWidth = 6 * (1 - stamp) + 1;
            ctx.beginPath(); ctx.arc(70, 380, 40 + stamp * 110, 0, 7); ctx.stroke();
        }
        return u > 0.6 && u < 0.7 ? 0.15 : 0;
    },
});
// <<< poses boss_duelist


// >>> poses boss_dancer
// ---- The Dancer ------------------------------------------------------------
// Dance Steps: three beats - each beat the leg kicks out, the arms flare
//   opposite and a spotlight circle stamps onto the floor.
// Fated Cell: the left ribbon-arm winds back, the right arm snaps forward and
//   throws a die that lands as a glowing fate-mark cell.
Object.assign(POSES, {
    dan_steps(P, u) {
        const env = ease(Math.min(u / 0.08, 1, (1 - u) / 0.1));
        const ph = (u * 3) % 1, beat = Math.floor(u * 3);
        const hit = Math.sin(Math.min(ph / 0.5, 1) * Math.PI);
        const s = beat % 2 ? -1 : 1;
        P.kickLeg.rot = -32 * hit * env;
        P.kickLeg.dy = -10 * hit * env;
        P.kickLeg.dx = 6 * hit * env;
        P.lArm.rot = (22 * s * hit - 4) * env;
        P.lArm.dy = -10 * hit * env;
        P.rArm.rot = (-22 * s * hit + 4) * env;
        P.rArm.dy = -10 * hit * env;
        P.body.rot = 5 * s * hit * env;
        P.body.dy = -7 * hit * env;
        P.body.dx = 6 * s * hit * env;
    },
    dan_fate(P, u) {
        const wind = ease(u / 0.3), snap = ease((u - 0.3) / 0.1), rec = ease((u - 0.65) / 0.35);
        const f = (wind - snap * 1.0) ; // -? wind-up (1) -> throw (0)
        P.lArm.rot = -26 * wind * (1 - rec) + 14 * snap * (1 - rec);
        P.lArm.dx = -12 * wind * (1 - rec);
        P.rArm.rot = (-34 * wind + 62 * snap) * (1 - rec);
        P.rArm.dy = (10 * wind - 18 * snap) * (1 - rec);
        P.rArm.dx = (-8 * wind + 18 * snap) * (1 - rec);
        P.body.rot = (-6 * wind + 9 * snap) * (1 - rec) + 0 * f;
        P.body.dy = -4 * snap * (1 - rec);
        P.kickLeg.rot = 10 * snap * (1 - rec);
    },
});
Object.assign(FX, {
    dan_steps(ctx, u) {
        const env = ease(Math.min(u / 0.08, 1, (1 - u) / 0.12));
        const spots = [[150, 430], [270, 462], [390, 425]];
        // stage spotlight cone from above
        const cg = ctx.createRadialGradient(256, 100, 10, 256, 320, 230);
        cg.addColorStop(0, 'rgba(255,230,250,' + (0.18 * env) + ')'); cg.addColorStop(1, 'rgba(255,200,240,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(256, 320, 240, 0, 7); ctx.fill();
        spots.forEach((p, i) => {
            const t0 = i / 3, k = (u - t0) * 3;
            if (k < 0) { // upcoming: faint outline
                ctx.strokeStyle = 'rgba(249,168,212,' + (0.28 * env) + ')'; ctx.lineWidth = 3;
                ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.ellipse(p[0], p[1], 52, 18, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
                return;
            }
            const pulse = 1 - Math.min(1, k * 0.9);
            const a = (0.35 + 0.65 * Math.max(0, 1 - k * 0.35)) * env;
            ctx.fillStyle = 'rgba(255,170,220,' + (0.28 * a) + ')'; ctx.strokeStyle = 'rgba(255,230,250,' + a + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(p[0], p[1], 56, 20, 0, 0, 7); ctx.fill(); ctx.stroke();
            if (k < 0.8) {
                const r = ease(k / 0.8);
                ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - r)) + ')'; ctx.lineWidth = 6 * (1 - r) + 1;
                ctx.beginPath(); ctx.ellipse(p[0], p[1], 56 + r * 90, 20 + r * 32, 0, 0, 7); ctx.stroke();
            }
            // musical beat marks
            ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * pulse * env) + ')';
            for (let j = 0; j < 4; j++) {
                const ang = j * 1.57 + k * 2;
                ctx.beginPath(); ctx.arc(p[0] + Math.cos(ang) * 70, p[1] - 14 - (1 - pulse) * 30 + Math.sin(ang) * 10, 5 * pulse + 1, 0, 7); ctx.fill();
            }
        });
        return 0;
    },
    dan_fate(ctx, u) {
        const cx = 440, cy = 380;
        const throwT = ease((u - 0.38) / 0.22), land = u > 0.6 ? ease((u - 0.6) / 0.15) : 0, fade = ease((u - 0.85) / 0.15);
        // charge glow in the throwing hand
        if (u < 0.45) {
            const g = ease(u / 0.3) * (1 - ease((u - 0.35) / 0.1));
            const rg = ctx.createRadialGradient(400, 200, 2, 400, 200, 60);
            rg.addColorStop(0, 'rgba(255,240,170,' + (0.8 * g) + ')'); rg.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(400, 200, 60, 0, 7); ctx.fill();
        }
        // the die in flight
        if (u > 0.38 && u < 0.62) {
            const x = 400 + (cx - 400) * throwT, y = 200 + (cy - 200) * throwT - Math.sin(throwT * Math.PI) * 70;
            ctx.save(); ctx.translate(x, y); ctx.rotate(throwT * 9);
            ctx.fillStyle = '#f5f0ff'; ctx.strokeStyle = '#4a2f8a'; ctx.lineWidth = 4;
            ctx.fillRect(-16, -16, 32, 32); ctx.strokeRect(-16, -16, 32, 32);
            ctx.fillStyle = '#4a2f8a'; ctx.beginPath(); ctx.arc(-6, -6, 3.5, 0, 7); ctx.arc(6, 6, 3.5, 0, 7); ctx.arc(0, 0, 3.5, 0, 7); ctx.fill();
            ctx.restore();
        }
        // the fated cell mark
        if (land > 0) {
            const a = land * (1 - fade), s = 0.6 + 0.4 * land;
            ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s * 0.6);
            ctx.fillStyle = 'rgba(255,200,90,' + (0.3 * a) + ')'; ctx.strokeStyle = 'rgba(255,230,140,' + a + ')'; ctx.lineWidth = 7;
            ctx.fillRect(-48, -48, 96, 96); ctx.strokeRect(-48, -48, 96, 96);
            ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke();
            ctx.restore();
            const r = Math.min(1, (u - 0.6) / 0.25);
            ctx.strokeStyle = 'rgba(255,240,170,' + (0.8 * (1 - r)) + ')'; ctx.lineWidth = 6 * (1 - r) + 1;
            ctx.beginPath(); ctx.ellipse(cx, cy, 40 + r * 140, 14 + r * 50, 0, 0, 7); ctx.stroke();
        }
        return u > 0.6 && u < 0.68 ? 0.3 * (1 - (u - 0.6) / 0.08) : 0;
    },
});
// <<< poses boss_dancer

// >>> poses boss_dreadnought
// ---- The Dreadnought -------------------------------------------------------
// Broadsides: port battery fires then starboard; guns kick back, hull rocks, shells fly.
// Searchlight: the bridge swings left-right while a lamp cone sweeps the water.
// Corrupt Cells: both batteries drop to aim at the floor; violet cells corrupt.
Object.assign(POSES, {
    dre_broadsides(P, u) {
        // port at u~0.2, starboard at u~0.6
        const kp = Math.max(0, 1 - Math.abs(u - 0.2) / 0.12), ks = Math.max(0, 1 - Math.abs(u - 0.6) / 0.12);
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.1));
        P.portGuns.rot = -10 * env + 18 * kp; P.portGuns.dx = 14 * kp; P.portGuns.dy = 8 * kp;
        P.starGuns.rot = 10 * env - 18 * ks; P.starGuns.dx = -14 * ks; P.starGuns.dy = 8 * ks;
        P.body.rot = 2.2 * (kp - ks); P.body.dy = 4 * (kp + ks);
        P.bridge.rot = -3 * kp + 3 * ks;
    },
    dre_searchlight(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.12)), w = Math.sin(u * Math.PI * 3);
        P.bridge.rot = 18 * w * env; P.bridge.dy = -5 * env;
        P.portGuns.rot = -6 * w * env; P.starGuns.rot = -6 * w * env;
        P.body.rot = 0.8 * w * env;
    },
    dre_corrupt(P, u) {
        const aim = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        const sh = Math.sin(u * Math.PI * 14) * ease((u - 0.3) / 0.1) * (1 - ease((u - 0.8) / 0.2));
        P.portGuns.rot = -26 * aim + 2 * sh; P.starGuns.rot = 26 * aim - 2 * sh;
        P.bridge.rot = 0; P.bridge.dy = 5 * aim;
        P.body.dy = 3 * Math.abs(sh);
    },
});
Object.assign(FX, {
    dre_broadsides(ctx, u) {
        const shots = [
            { t: 0.2, mx: [[45, 232], [120, 190], [30, 255]], dir: -1 },
            { t: 0.6, mx: [[440, 218], [488, 228], [410, 205]], dir: 1 },
        ];
        shots.forEach(s => {
            const k = (u - s.t) / 0.4;
            if (k < 0 || k > 1) return;
            s.mx.forEach((m, i) => {
                // muzzle flash
                const f = Math.max(0, 1 - k / 0.25);
                if (f > 0) {
                    const g = ctx.createRadialGradient(m[0], m[1], 2, m[0], m[1], 44);
                    g.addColorStop(0, 'rgba(255,255,255,' + f + ')'); g.addColorStop(0.4, 'rgba(180,140,255,' + 0.7 * f + ')'); g.addColorStop(1, 'rgba(120,80,230,0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m[0], m[1], 44, 0, 7); ctx.fill();
                }
                // shell streaking outward and down
                const d = ease(k) * 260 + i * 8;
                const x = m[0] + s.dir * d * 0.85, y = m[1] + d * 0.35 - 30 + 70 * k * k;
                ctx.strokeStyle = 'rgba(210,190,255,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s.dir * 34, y - 12); ctx.stroke();
                ctx.fillStyle = 'rgba(255,240,255,' + (1 - k) + ')'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
            });
        });
        const fl = Math.max(0, 1 - Math.abs(u - 0.2) / 0.04, 1 - Math.abs(u - 0.6) / 0.04);
        return 0.22 * fl;
    },
    dre_searchlight(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.12)), w = Math.sin(u * Math.PI * 3);
        const ox = 255, oy = 160, ang = Math.PI / 2 + w * 0.7, len = 330, half = 0.2;
        const ex = ox + Math.cos(ang) * len, ey = oy + Math.sin(ang) * len;
        const g = ctx.createLinearGradient(ox, oy, ex, Math.min(ey, 470));
        g.addColorStop(0, 'rgba(255,250,200,' + 0.9 * env + ')'); g.addColorStop(1, 'rgba(255,240,150,' + 0.35 * env + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(ang - half) * len * 1.2, oy + Math.sin(ang - half) * len * 1.2);
        ctx.lineTo(ox + Math.cos(ang + half) * len * 1.2, oy + Math.sin(ang + half) * len * 1.2);
        ctx.closePath(); ctx.fill();
        // lit pool on the water
        ctx.fillStyle = 'rgba(255,245,170,' + 0.5 * env + ')'; ctx.strokeStyle = 'rgba(255,255,230,' + 0.9 * env + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(ex, Math.min(ey, 470), 70, 24, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,230,' + env + ')'; ctx.beginPath(); ctx.arc(ox, oy, 11, 0, 7); ctx.fill();
        return 0;
    },
    dre_corrupt(ctx, u) {
        const aim = ease((u - 0.2) / 0.15);
        // tracer lines from muzzles to the floor
        const mz = [[40, 262, 120, 470], [118, 230, 190, 470], [440, 245, 380, 470], [470, 235, 450, 470]];
        mz.forEach((m, i) => {
            const k = ease((u - 0.3 - i * 0.03) / 0.15) * (1 - ease((u - 0.8) / 0.15));
            if (k <= 0) return;
            ctx.strokeStyle = 'rgba(190,120,255,' + 0.8 * k + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[0] + (m[2] - m[0]) * k, m[1] + (m[3] - m[1]) * k); ctx.stroke();
        });
        // floor cells corrupting one after another
        for (let i = 0; i < 7; i++) {
            const x = 40 + i * 70, y = 440 + (i % 2) * 22;
            const k = ease((u - 0.4 - i * 0.05) / 0.15) * (1 - ease((u - 0.88) / 0.12));
            if (k <= 0) continue;
            const pulse = 0.75 + 0.25 * Math.sin(u * 40 + i);
            ctx.fillStyle = 'rgba(110,40,200,' + 0.45 * k * pulse + ')'; ctx.strokeStyle = 'rgba(220,150,255,' + 0.95 * k + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 34, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 34, y); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - 8, y + 4); ctx.lineTo(x, y - 6); ctx.lineTo(x + 8, y + 4); ctx.stroke();
        }
        return aim > 0 ? 0 : 0;
    },
});
// <<< poses boss_dreadnought

// >>> poses boss_demolitionist
// ---- The Demolitionist -----------------------------------------------------
// Sticky Bombs: the free hand winds back and flings three small bombs that
//   arc out and splat down with a small blast ring each.
// Mega Bomb: the wrecking ball is hauled back overhead, slammed down; a big
//   dashed ring telegraphs and then a huge blast ring + flash.
// Corrupt Cells: arms raised, ball glows purple and shakes; purple cells appear
//   on the floor and their fuses spark, then pop.
Object.assign(POSES, {
    dem_stickyvolley(P, u) {
        // three throws at u = 0.12/0.4/0.68 (each ~0.2 long)
        const env = ease(Math.min(u / 0.08, 1, (1 - u) / 0.12));
        const k = (u - 0.04) / 0.2;
        const ph = (k < 0 || u > 0.64) ? 0 : (k % 1);
        const wind = ph < 0.45 ? ease(ph / 0.45) : 0;
        const thr = ph >= 0.45 ? 1 - ease((ph - 0.45) / 0.55) : 0;
        const a = wind * -34 + (ph >= 0.45 ? 42 * thr : 0);
        P.leftArm.rot = a * env;
        P.leftArm.dy = -6 * thr * env;
        P.body.rot = (wind * -3 + thr * 4) * env;
        P.body.dy = -3 * thr * env;
        P.rightArm.rot = 6 * Math.sin(u * 20) * env;
        P.ball.rot = 5 * Math.sin(u * 14 + 1) * env;
    },
    dem_megaswing(P, u) {
        const back = ease(u / 0.38), hold = u > 0.38 && u < 0.45, slam = ease((u - 0.45) / 0.1), rec = ease((u - 0.62) / 0.38);
        let ar = -28 * back, br = -62 * back;
        if (u >= 0.45) { ar = -28 + 62 * slam; br = -62 + 100 * slam; }
        if (u >= 0.62) { ar *= 1 - rec; br *= 1 - rec; }
        P.rightArm.rot = ar; P.ball.rot = br;
        P.rightArm.dy = -10 * back * (u < 0.45 ? 1 : 1 - slam) * (1 - rec);
        P.leftArm.rot = -18 * back * (1 - rec) + (u >= 0.45 ? 20 * slam * (1 - rec) : 0);
        const hit = u > 0.55 ? Math.max(0, 1 - (u - 0.55) * 3) : 0;
        P.body.rot = -4 * back * (1 - rec) + 8 * slam * (1 - rec);
        P.body.dy = 7 * hit - (hold ? 2 : 0);
    },
    dem_corruptfuse(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        const sh = Math.sin(u * Math.PI * 22);
        P.rightArm.rot = -22 * env + 5 * sh * env;
        P.rightArm.dy = -10 * env;
        P.ball.rot = -25 * env + 7 * Math.sin(u * 18) * env;
        P.leftArm.rot = 24 * env + 5 * sh * env;
        P.leftArm.dy = -12 * env;
        P.body.rot = 2 * sh * env;
        P.body.dy = -3 * Math.abs(sh) * env;
    },
});
Object.assign(FX, {
    dem_stickyvolley(ctx, u) {
        const env = ease(Math.min(u / 0.08, 1, (1 - u) / 0.12));
        const T = [[170, 450], [300, 470], [400, 430]];
        T.forEach((t, i) => {
            const t0 = 0.13 + i * 0.2, fly = 0.14;
            const k = (u - t0) / fly;
            const sx = 40, sy = 235;
            if (k > 0 && k < 1) {
                const x = sx + (t[0] - sx) * k, y = sy + (t[1] - sy) * k - Math.sin(k * Math.PI) * 130;
                ctx.fillStyle = 'rgba(30,30,35,0.95)'; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill();
                ctx.strokeStyle = 'rgba(255,200,80,0.9)'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.stroke();
                ctx.fillStyle = 'rgba(255,170,40,0.9)'; ctx.beginPath(); ctx.arc(x + 9, y - 16, 5, 0, 7); ctx.fill();
            } else if (k >= 1) {
                const s = Math.min(1, (u - t0 - fly) / 0.2);
                // stuck bomb + fuse-blink + dashed danger ring
                const fuse = u - t0 - fly;
                ctx.fillStyle = 'rgba(30,30,35,0.95)'; ctx.beginPath(); ctx.arc(t[0], t[1], 14 * (1 - 0.0), 0, 7); ctx.fill();
                ctx.strokeStyle = 'rgba(255,90,40,' + (0.7 * (fuse < 0.25 ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(fuse * 40)))) + ')';
                ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
                ctx.beginPath(); ctx.ellipse(t[0], t[1], 55 * ease(s * 3), 22 * ease(s * 3), 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
                if (fuse > 0.22 && fuse < 0.4) {
                    const b = (fuse - 0.22) / 0.18;
                    ctx.fillStyle = 'rgba(255,200,60,' + (0.8 * (1 - b)) + ')';
                    ctx.beginPath(); ctx.ellipse(t[0], t[1], 20 + 70 * b, 10 + 30 * b, 0, 0, 7); ctx.fill();
                }
            }
        });
        // little motion lines at the hand
        ctx.strokeStyle = 'rgba(255,230,160,' + (0.5 * env) + ')'; ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(30 - i * 8, 215 + i * 18); ctx.lineTo(8 - i * 8, 228 + i * 18); ctx.stroke(); }
        return 0;
    },
    dem_megaswing(ctx, u) {
        const tele = ease((u - 0.1) / 0.3);
        const cx = 330, cy = 440;
        if (u < 0.7) {
            ctx.strokeStyle = 'rgba(255,70,50,' + (0.85 * tele * (u < 0.55 ? 1 : 0.6)) + ')';
            ctx.lineWidth = 7; ctx.setLineDash([22, 14]);
            ctx.beginPath(); ctx.ellipse(cx, cy, 190, 62, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,60,40,' + (0.14 * tele) + ')';
            ctx.beginPath(); ctx.ellipse(cx, cy, 190, 62, 0, 0, 7); ctx.fill();
        }
        // ball motion trail on the slam
        if (u > 0.43 && u < 0.58) {
            const k = (u - 0.43) / 0.15;
            ctx.strokeStyle = 'rgba(255,220,150,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(262, 180, 160, -1.2, 0.3 + k * 0.2); ctx.stroke();
        }
        if (u > 0.55) {
            const k = Math.min(1, (u - 0.55) / 0.4);
            ctx.strokeStyle = 'rgba(255,200,90,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 14 * (1 - k) + 2;
            ctx.beginPath(); ctx.ellipse(cx, cy, 30 + k * 250, 10 + k * 85, 0, 0, 7); ctx.stroke();
            const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, 160 * (0.4 + k));
            g.addColorStop(0, 'rgba(255,240,170,' + (0.9 * (1 - k)) + ')'); g.addColorStop(0.5, 'rgba(255,110,30,' + (0.55 * (1 - k)) + ')'); g.addColorStop(1, 'rgba(255,60,20,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 160 * (0.4 + k), 110 * (0.4 + k), 0, 0, 7); ctx.fill();
            for (let i = 0; i < 10; i++) {
                const a = i * 0.63, d = 30 + k * (110 + (i % 3) * 40);
                ctx.fillStyle = 'rgba(255,190,70,' + (0.9 * (1 - k)) + ')';
                ctx.fillRect(cx + Math.cos(a) * d * 1.5 - 4, cy - 20 + Math.sin(a) * d * 0.7 - k * 50 - 4, 8, 8);
            }
            return u < 0.62 ? 0.4 * (1 - (u - 0.55) / 0.07) : 0;
        }
        return 0;
    },
    dem_corruptfuse(ctx, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        // purple glow on the ball
        const g = ctx.createRadialGradient(415, 241, 10, 415, 241, 130);
        g.addColorStop(0, 'rgba(200,100,255,' + (0.6 * env) + ')'); g.addColorStop(1, 'rgba(140,40,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(415, 241, 130, 0, 7); ctx.fill();
        // corrupted cells on the floor, fuse sparks, then pop
        const cells = [[110, 440], [210, 470], [320, 445], [430, 480], [150, 395], [400, 420]];
        cells.forEach((c, i) => {
            const t0 = 0.12 + i * 0.07, a = ease((u - t0) / 0.1);
            if (a <= 0) return;
            const pop = u > 0.6 + i * 0.05 ? Math.min(1, (u - 0.6 - i * 0.05) / 0.12) : 0;
            const s = 26 * (1 - 0.3 * pop);
            ctx.fillStyle = 'rgba(150,50,230,' + (0.65 * a * (1 - pop)) + ')';
            ctx.strokeStyle = 'rgba(230,150,255,' + (0.9 * a * (1 - pop)) + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(c[0], c[1] - s * 0.5); ctx.lineTo(c[0] + s, c[1]); ctx.lineTo(c[0], c[1] + s * 0.5); ctx.lineTo(c[0] - s, c[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
            if (pop === 0 && Math.sin(u * 50 + i * 2) > 0) {
                ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.beginPath(); ctx.arc(c[0], c[1] - 14, 6, 0, 7); ctx.fill();
            }
            if (pop > 0) {
                ctx.strokeStyle = 'rgba(255,170,80,' + (0.9 * (1 - pop)) + ')'; ctx.lineWidth = 8 * (1 - pop) + 1;
                ctx.beginPath(); ctx.ellipse(c[0], c[1], 20 + 70 * pop, 8 + 28 * pop, 0, 0, 7); ctx.stroke();
                ctx.fillStyle = 'rgba(255,220,100,' + (0.6 * (1 - pop)) + ')';
                ctx.beginPath(); ctx.ellipse(c[0], c[1], 14 + 40 * pop, 6 + 16 * pop, 0, 0, 7); ctx.fill();
            }
        });
        return 0;
    },
});
// <<< poses boss_demolitionist

// >>> poses boss_dynamo
// ---- The Dynamo ------------------------------------------------------------
// Spark Pillars: raised fist slams down; lightning columns crack down across the field.
// Lightning Conductors: both arms thrown wide, arcs leap out to charged nodes.
// Prior Bomb: left hand winds back and lobs a glowing die-bomb.
Object.assign(POSES, {
    dyn_pillars(P, u) {
        const up = ease(u / 0.35), slam = ease((u - 0.4) / 0.1), rec = ease((u - 0.65) / 0.35);
        const r = u < 0.4 ? up : 1 - slam;
        const k = r * (1 - rec);
        P.armR.rot = -38 * k; P.armR.dy = -16 * k;
        P.armL.rot = 14 * k;
        const hit = u > 0.45 ? Math.max(0, 1 - (u - 0.45) * 3.5) : 0;
        P.armR.rot += 16 * hit;
        P.body.dy = -5 * k + 8 * hit; P.body.rot = -3 * k + 2 * hit;
    },
    dyn_conductors(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 6);
        P.armL.rot = 30 * env + 6 * w * env; P.armL.dx = -10 * env;
        P.armR.rot = -32 * env - 6 * w * env; P.armR.dx = 10 * env;
        P.body.dy = -4 * env + 2 * w * env;
    },
    dyn_bomb(P, u) {
        const wind = ease(u / 0.35), thr = ease((u - 0.35) / 0.1), rec = ease((u - 0.6) / 0.4);
        const k = wind * (1 - thr) * (1 - rec), f = thr * (1 - rec);
        P.armL.rot = 36 * k - 34 * f; P.armL.dx = -14 * k + 10 * f; P.armL.dy = 6 * k - 8 * f;
        P.body.rot = -5 * k + 5 * f; P.body.dx = -6 * k + 5 * f;
        P.armR.rot = -10 * k + 8 * f;
    },
});
Object.assign(FX, {
    dyn_pillars(ctx, u) {
        const warn = ease(u / 0.4);
        const cols = [90, 180, 270, 360, 450];
        if (u < 0.45) {
            cols.forEach(x => {
                ctx.strokeStyle = 'rgba(120,230,255,' + (0.5 * warn) + ')'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
                ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 470); ctx.stroke(); ctx.setLineDash([]);
            });
            const g = ctx.createRadialGradient(440, 190, 4, 440, 190, 70);
            g.addColorStop(0, 'rgba(180,250,255,' + (0.8 * warn) + ')'); g.addColorStop(1, 'rgba(60,200,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(440, 190, 70, 0, 7); ctx.fill();
            return 0;
        }
        const t = (u - 0.45) / 0.55, a = Math.max(0, 1 - t * 1.2);
        cols.forEach((x, i) => {
            const d = i * 0.05; if (t < d) return;
            const aa = Math.max(0, 1 - (t - d) * 1.6);
            ctx.strokeStyle = 'rgba(200,250,255,' + aa + ')'; ctx.lineWidth = 16 * aa + 3;
            ctx.shadowColor = 'rgba(60,220,255,' + aa + ')'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.moveTo(x, -20);
            for (let y = 20; y <= 480; y += 36) ctx.lineTo(x + ((y / 36 | 0) % 2 ? 16 : -16), y);
            ctx.stroke(); ctx.shadowBlur = 0;
        });
        return 0.35 * Math.max(0, 1 - t * 5) * (a > 0 ? 1 : 0);
    },
    dyn_conductors(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        const nodes = [[30, 120], [60, 440], [260, 20], [480, 60], [470, 440]];
        const hands = [[45, 310], [45, 310], [440, 190], [440, 190], [440, 190]];
        nodes.forEach((n, i) => {
            const h = hands[i], a = env;
            ctx.fillStyle = 'rgba(255,220,90,' + (0.9 * a) + ')'; ctx.strokeStyle = 'rgba(80,60,0,' + a + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(n[0], n[1], 16, 0, 7); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(170,245,255,' + a + ')'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(60,220,255,' + a + ')'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.moveTo(h[0], h[1]);
            for (let s = 1; s < 8; s++) {
                const q = s / 8, j = (Math.sin(u * 40 + s * 3 + i) * 14);
                ctx.lineTo(h[0] + (n[0] - h[0]) * q + j, h[1] + (n[1] - h[1]) * q - j);
            }
            ctx.lineTo(n[0], n[1]); ctx.stroke(); ctx.shadowBlur = 0;
        });
        return 0;
    },
    dyn_bomb(ctx, u) {
        const wind = ease(u / 0.35), thr = (u - 0.4) / 0.6;
        if (u < 0.4) {
            const g = ctx.createRadialGradient(60, 260, 4, 60, 260, 70);
            g.addColorStop(0, 'rgba(255,240,150,' + (0.8 * wind) + ')'); g.addColorStop(1, 'rgba(255,170,40,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(60, 260, 70, 0, 7); ctx.fill();
            return 0;
        }
        const x = 60 + 380 * thr, y = 260 - 190 * Math.sin(thr * Math.PI) + 60 * thr;
        const pulse = 0.5 + 0.5 * Math.sin(u * 60);
        const g = ctx.createRadialGradient(x, y, 2, x, y, 38);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,200,60,' + (0.6 + 0.3 * pulse) + ')'); g.addColorStop(1, 'rgba(255,120,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(40,50,60,0.95)'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,120,1)'; ctx.lineWidth = 3; ctx.stroke();
        if (thr > 0.85) {
            const b = (thr - 0.85) / 0.15;
            ctx.strokeStyle = 'rgba(255,200,80,' + (1 - b) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.arc(x, y, 20 + 70 * b, 0, 7); ctx.stroke();
            return 0.25 * (1 - b);
        }
        return 0;
    },
});
// <<< poses boss_dynamo

// >>> poses boss_ember
// ---- The Ember -------------------------------------------------------------
// Ember Drift: both arms sweep up and out, the body heaves and embers rise
//   off its shoulders, then drift down in lanes (slow, falling).
// Prior Bomb: it huffs a smoke puff, the right arm winds back and lobs three
//   fused bombs that land on the board and start arming.
Object.assign(POSES, {
    emb_drift(P, u) {
        const up = ease(u / 0.25), rec = ease((u - 0.8) / 0.2), k = up * (1 - rec);
        const w = Math.sin(u * Math.PI * 6) * k;
        P.armL.rot = 36 * k + 8 * w; P.armL.dy = -6 * k;
        P.armR.rot = -36 * k - 8 * w; P.armR.dy = -6 * k;
        P.body.dy = -5 * k + 2 * Math.abs(w); P.body.rot = 1.5 * w;
        P.smoke.rot = 8 * w; P.smoke.dy = -6 * k;
    },
    emb_bombtoss(P, u) {
        const wind = ease(u / 0.3), toss = ease((u - 0.38) / 0.1), rec = ease((u - 0.65) / 0.35);
        const raise = u < 0.38 ? wind : (1 - toss);
        const thr = toss * (1 - rec);
        P.armR.rot = -42 * raise + 22 * thr; P.armR.dy = -12 * raise + 6 * thr;
        P.armL.rot = 10 * raise; P.armL.dy = -3 * raise;
        P.smoke.rot = -10 * wind * (1 - rec) + 6 * Math.sin(u * 14) * wind * (1 - rec);
        P.smoke.dy = -4 * wind * (1 - rec);
        P.body.rot = 4 * raise - 5 * thr; P.body.dy = -3 * raise + 6 * thr;
    },
});
Object.assign(FX, {
    emb_drift(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15));
        // glow at both shoulders while the arms are up
        [[90, 290], [380, 310]].forEach(g => {
            const rg = ctx.createRadialGradient(g[0], g[1], 4, g[0], g[1], 80);
            rg.addColorStop(0, 'rgba(255,190,60,' + (0.6 * env) + ')'); rg.addColorStop(1, 'rgba(255,90,0,0)');
            ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(g[0], g[1], 80, 0, 7); ctx.fill();
        });
        // embers: spawn near the top, then fall slowly down their lanes with a sideways wobble
        for (let i = 0; i < 9; i++) {
            const lane = 30 + i * 56, t = (u - 0.12 - (i % 3) * 0.08 - i * 0.02) / 0.62;
            if (t < 0 || t > 1) continue;
            const x = lane + Math.sin(t * 9 + i) * 14, y = -30 + t * 520;
            const a = Math.min(1, t * 6) * (1 - Math.max(0, t - 0.85) * 6);
            ctx.fillStyle = 'rgba(255,100,20,' + (0.35 * a) + ')'; ctx.beginPath(); ctx.arc(x, y - 14, 10, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,150,40,' + (0.95 * a) + ')'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,240,170,' + a + ')'; ctx.beginPath(); ctx.arc(x, y + 1, 5, 0, 7); ctx.fill();
        }
        return 0.12 * Math.max(0, 1 - Math.abs(u - 0.25) * 8);
    },
    emb_bombtoss(ctx, u) {
        // smoke puffs drifting from the mouth during the wind-up
        const sm = ease(Math.min(u / 0.15, 1, (0.5 - u) / 0.15));
        for (let i = 0; i < 4; i++) {
            const t = ((u * 2.2 + i * 0.25) % 1);
            ctx.fillStyle = 'rgba(120,115,120,' + (0.5 * sm * (1 - t)) + ')';
            ctx.beginPath(); ctx.arc(330 + t * 110, 215 - t * 50 - i * 6, 10 + t * 18, 0, 7); ctx.fill();
        }
        // three fused bombs leave the right hand and land low on the board
        const dest = [[90, 440], [250, 465], [440, 450]];
        dest.forEach((d, i) => {
            const t = (u - 0.45 - i * 0.05) / 0.3;
            if (t < 0) return;
            const k = Math.min(1, t);
            const x = 395 + (d[0] - 395) * k, y = 300 + (d[1] - 300) * k - Math.sin(k * Math.PI) * 170;
            ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - 4, y - 4, 9, 3.6, 4.9); ctx.stroke();
            const sp = 0.5 + 0.5 * Math.sin(u * 60 + i);
            ctx.strokeStyle = '#a88'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x + 6, y - 28); ctx.stroke();
            ctx.fillStyle = 'rgba(255,' + (150 + 100 * sp | 0) + ',40,1)'; ctx.beginPath(); ctx.arc(x + 6, y - 30, 5 + 3 * sp, 0, 7); ctx.fill();
            if (k >= 1) {
                ctx.strokeStyle = 'rgba(255,60,40,' + (0.4 + 0.4 * sp) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, y + 12, 34, 11, 0, 0, 7); ctx.stroke();
            }
        });
        const h = (u - 0.4) / 0.1;
        return h > 0 && h < 1 ? 0.25 * (1 - h) : 0;
    },
});
// <<< poses boss_ember

// >>> poses boss_eclipse
// ---- The Eclipse -----------------------------------------------------------
// Umbral Dashes: the disc recoils and fades, then lunges three times along
//   shadow streaks with ghost discs trailing.
// Fated Cell: the dice spin up and fly in, a grid appears and one cell is
//   struck by a lock sigil.
Object.assign(POSES, {
    ecl_dash(P, u) {
        const wind = ease(u / 0.22);
        let lx = 0, ly = 0;
        if (u > 0.22) {
            const k = (u - 0.22) / 0.78, n = Math.min(2, Math.floor(k * 3)), f = k * 3 - n;
            const out = ease(Math.min(1, f / 0.35)), back = ease((f - 0.35) / 0.65);
            const dirs = [[1, -0.3], [-1, 0.2], [0.6, 0.8]];
            const s = out * (1 - back);
            lx = dirs[n][0] * 55 * s; ly = dirs[n][1] * 55 * s;
        }
        const w = u < 0.22 ? wind : 0;
        P.core.dx = lx - 14 * w; P.core.dy = ly;
        P.core.rot = 8 * w + lx * 0.25;
        P.body.rot = -6 * w + lx * 0.12; P.body.dx = lx * 0.3; P.body.dy = ly * 0.3;
        const sh = Math.sin(u * Math.PI * 9);
        P.diceL.rot = -38 * w + 30 * sh * (u > 0.22 ? 1 : 0); P.diceL.dx = -lx * 0.6;
        P.diceR.rot = 38 * w - 30 * sh * (u > 0.22 ? 1 : 0); P.diceR.dx = -lx * 0.6;
        P.diceT.rot = 40 * Math.sin(u * Math.PI * 6); P.diceT.dy = -10 * w;
    },
    ecl_fate(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        const spin = u * 540;
        P.diceL.rot = spin; P.diceL.dx = 70 * env; P.diceL.dy = -55 * env;
        P.diceR.rot = -spin; P.diceR.dx = -70 * env; P.diceR.dy = 50 * env;
        P.diceT.rot = spin * 1.3; P.diceT.dy = 90 * env; P.diceT.dx = 30 * env;
        const st = u > 0.6 ? Math.max(0, 1 - (u - 0.6) * 5) : 0;
        P.core.dy = -8 * env + 9 * st; P.core.rot = 4 * Math.sin(u * 20) * env;
        P.body.rot = 5 * st;
    },
});
Object.assign(FX, {
    ecl_dash(ctx, u) {
        const warn = ease(Math.min(u / 0.2, 1));
        if (u < 0.25) {
            ctx.strokeStyle = 'rgba(255,170,60,' + (0.8 * warn) + ')'; ctx.lineWidth = 6; ctx.setLineDash([18, 12]);
            ctx.beginPath(); ctx.moveTo(253, 255); ctx.lineTo(253 + 330 * warn, 255 - 100 * warn); ctx.stroke(); ctx.setLineDash([]);
        }
        if (u > 0.22) {
            const k = (u - 0.22) / 0.78, n = Math.min(2, Math.floor(k * 3)), f = k * 3 - n;
            const dirs = [[1, -0.3], [-1, 0.2], [0.6, 0.8]];
            const d = dirs[n], len = Math.hypot(d[0], d[1]);
            const out = ease(Math.min(1, f / 0.35)), fade = 1 - ease((f - 0.35) / 0.65);
            for (let i = 4; i >= 1; i--) {
                const t = out * (1 - i * 0.18);
                if (t <= 0) continue;
                const gx = 253 + d[0] / len * 150 * t, gy = 255 + d[1] / len * 150 * t;
                ctx.fillStyle = 'rgba(20,0,30,' + (0.28 * fade) + ')';
                ctx.beginPath(); ctx.arc(gx, gy, 128, 0, 7); ctx.fill();
            }
            ctx.strokeStyle = 'rgba(40,10,60,' + (0.8 * fade) + ')'; ctx.lineWidth = 14;
            ctx.beginPath(); ctx.moveTo(253, 255);
            ctx.lineTo(253 + d[0] / len * 260 * out, 255 + d[1] / len * 260 * out); ctx.stroke();
            if (f < 0.12) return 0.3 * (1 - f / 0.12);
        }
        return 0;
    },
    ecl_fate(ctx, u) {
        const show = ease((u - 0.15) / 0.2), out = ease((u - 0.9) / 0.1);
        const a = show * (1 - out);
        const gx = 156, gy = 360, cs = 66;
        ctx.lineWidth = 4;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            const hot = r === 1 && c === 2;
            ctx.strokeStyle = 'rgba(255,200,90,' + (0.8 * a) + ')';
            ctx.fillStyle = 'rgba(255,170,40,' + (hot ? 0.1 + 0.3 * ease((u - 0.45) / 0.15) : 0.08) * a + ')';
            ctx.beginPath(); ctx.rect(gx + c * cs, gy + r * cs - 20, cs - 4, cs - 4); ctx.fill(); ctx.stroke();
        }
        // lock sigil falls onto the chosen cell
        const k = ease((u - 0.4) / 0.2);
        if (k > 0) {
            const cx = gx + 2 * cs + 30, cy = gy + cs + 12 - (1 - k) * 160;
            ctx.strokeStyle = 'rgba(255,230,140,' + a + ')'; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.moveTo(cx - 18, cy); ctx.lineTo(cx + 18, cy); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 18); ctx.stroke();
            if (u > 0.6) {
                const s = (u - 0.6) / 0.3;
                ctx.strokeStyle = 'rgba(255,240,180,' + (0.9 * (1 - Math.min(1, s)) * a) + ')'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.arc(cx, cy, 30 + s * 110, 0, 7); ctx.stroke();
                return 0.3 * Math.max(0, 1 - s * 4);
            }
        }
        return 0;
    },
});
// <<< poses boss_eclipse

// >>> poses boss_encore
// ---- The Encore ------------------------------------------------------------
// Encore Circles: mic arm conducts (up, then sweeping down per ring) as gold rings close in.
// Sound Bars: free hand slams down, mic arm hammers; EQ bars shoot up from the floor.
// Stage Lights: mic arm points out, spotlight cones converge, lock ring, flash.
// Beat Mines: both arms pump on the beat while mines pulse and pop in sequence.
Object.assign(POSES, {
    enc_circles(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.15));
        const w = Math.sin(u * Math.PI * 6);
        P.micArm.rot = (-10 + 34 * w) * env;
        P.micArm.dy = -8 * Math.abs(w) * env;
        P.leftArm.rot = 20 * Math.sin(u * Math.PI * 3) * env;
        P.body.rot = -2 * w * env;
        P.body.dy = -3 * Math.abs(w) * env;
    },
    enc_bars(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        const hit = Math.abs(Math.sin(u * Math.PI * 3));
        P.leftArm.rot = (28 - 52 * hit) * env;
        P.leftArm.dy = 10 * hit * env;
        P.micArm.rot = (-24 + 40 * hit) * env;
        P.body.dy = 5 * hit * env;
        P.body.rot = 3 * Math.sin(u * Math.PI * 3) * env;
    },
    enc_lights(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.15));
        const lock = u > 0.6 && u < 0.72 ? Math.sin((u - 0.6) / 0.12 * Math.PI) : 0;
        P.micArm.rot = (34 + 8 * Math.sin(u * Math.PI * 4) - 14 * lock) * env;
        P.micArm.dx = 6 * env;
        P.leftArm.rot = (-18 + 10 * Math.sin(u * Math.PI * 5)) * env;
        P.body.rot = 4 * env;
        P.body.dy = -3 * lock;
    },
    enc_mines(P, u) {
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.12));
        const b = Math.sin(u * Math.PI * 8);
        P.micArm.rot = 26 * b * env;
        P.leftArm.rot = -26 * b * env;
        P.body.dy = -5 * Math.abs(b) * env;
        P.body.rot = 2 * b * env;
    },
});
Object.assign(FX, {
    enc_circles(ctx, u) {
        const spots = [[110, 420, 0.1], [260, 450, 0.3], [410, 420, 0.5], [190, 120, 0.65]];
        spots.forEach(s => {
            const k = Math.min(1, Math.max(0, (u - s[2]) / 0.3));
            if (u < s[2]) return;
            const fade = u > s[2] + 0.3 ? Math.max(0, 1 - (u - s[2] - 0.3) / 0.15) : 1;
            ctx.strokeStyle = 'rgba(255,210,80,' + (0.9 * fade) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.ellipse(s[0], s[1], 28 + 90 * (1 - k), 10 + 32 * (1 - k), 0, 0, 7); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,240,170,' + (0.6 * fade) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(s[0], s[1], 28, 10, 0, 0, 7); ctx.stroke();
            if (k > 0.95) { ctx.fillStyle = 'rgba(255,230,120,' + (0.35 * fade) + ')'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 28, 10, 0, 0, 7); ctx.fill(); }
        });
        // musical notes drifting off the mic
        for (let i = 0; i < 4; i++) {
            const t = (u * 1.5 + i * 0.25) % 1;
            ctx.fillStyle = 'rgba(255,220,100,' + (0.8 * (1 - t)) + ')';
            ctx.beginPath(); ctx.arc(420 + i * 10 + 20 * t, 150 - 80 * t, 7, 0, 7); ctx.fill();
            ctx.fillRect(426 + i * 10 + 20 * t, 120 - 80 * t, 3, 30);
        }
        return 0;
    },
    enc_bars(ctx, u) {
        const xs = [90, 200, 320, 430];
        xs.forEach((x, i) => {
            const t = u - i * 0.1;
            if (t < 0) return;
            const tele = Math.min(1, t / 0.15);
            const rise = t < 0.15 ? 0 : Math.min(1, (t - 0.15) / 0.12);
            const fade = t > 0.6 ? Math.max(0, 1 - (t - 0.6) / 0.25) : 1;
            ctx.fillStyle = 'rgba(255,80,160,' + (0.35 * tele * fade) + ')';
            ctx.fillRect(x - 30, 470, 60, 14);
            const h = 190 * rise * (0.75 + 0.25 * Math.sin(u * 30 + i));
            const g = ctx.createLinearGradient(0, 480 - h, 0, 480);
            g.addColorStop(0, 'rgba(120,255,240,' + (0.9 * fade) + ')'); g.addColorStop(1, 'rgba(220,60,220,' + (0.9 * fade) + ')');
            ctx.fillStyle = g; ctx.fillRect(x - 28, 480 - h, 56, h);
        });
        return 0;
    },
    enc_lights(ctx, u) {
        const lock = u > 0.6;
        const cx = 200 + 120 * Math.sin(u * 5) * (lock ? 0 : 1) + (lock ? 0 : 0), cy = 430;
        const tx = lock ? 270 : 150 + 220 * ease(u / 0.6);
        const a = Math.min(1, u / 0.15);
        [[60, 0], [460, 1]].forEach(l => {
            const g = ctx.createLinearGradient(l[0], -20, tx, cy);
            g.addColorStop(0, 'rgba(255,255,200,' + (0.55 * a) + ')'); g.addColorStop(1, 'rgba(255,255,200,' + (0.15 * a) + ')');
            ctx.fillStyle = g; ctx.beginPath();
            ctx.moveTo(l[0] - 12, -20); ctx.lineTo(l[0] + 12, -20); ctx.lineTo(tx + 60, cy); ctx.lineTo(tx - 60, cy); ctx.closePath(); ctx.fill();
        });
        void cx;
        ctx.strokeStyle = lock ? 'rgba(255,90,60,' + 0.95 * a + ')' : 'rgba(255,255,200,' + 0.8 * a + ')';
        ctx.lineWidth = lock ? 10 : 5;
        ctx.beginPath(); ctx.ellipse(tx, cy, 62, 22, 0, 0, 7); ctx.stroke();
        if (u > 0.78) {
            const k = (u - 0.78) / 0.22;
            ctx.fillStyle = 'rgba(255,240,200,' + (0.7 * (1 - k)) + ')';
            ctx.beginPath(); ctx.ellipse(tx, cy, 62 + 40 * k, 22 + 14 * k, 0, 0, 7); ctx.fill();
            return 0.3 * (1 - k);
        }
        return 0;
    },
    enc_mines(ctx, u) {
        const ms = [[100, 410], [230, 455], [350, 420], [440, 380], [160, 300], [400, 300]];
        ms.forEach((m, i) => {
            const pop = 0.35 + i * 0.09;
            if (u < pop) {
                const p = 0.5 + 0.5 * Math.sin(u * Math.PI * 16 + i);
                ctx.fillStyle = 'rgba(255,160,40,' + (0.5 + 0.4 * p) + ')';
                ctx.beginPath(); ctx.arc(m[0], m[1], 10 + 6 * p, 0, 7); ctx.fill();
                ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(m[0], m[1], 16 + 6 * p, 0, 7); ctx.stroke();
            } else {
                const k = Math.min(1, (u - pop) / 0.2);
                ctx.strokeStyle = 'rgba(255,200,80,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 10 * (1 - k) + 1;
                ctx.beginPath(); ctx.arc(m[0], m[1], 14 + 70 * k, 0, 7); ctx.stroke();
                ctx.fillStyle = 'rgba(255,240,180,' + (0.4 * (1 - k)) + ')';
                ctx.beginPath(); ctx.arc(m[0], m[1], 14 + 40 * k, 0, 7); ctx.fill();
            }
        });
        return 0;
    },
});
// <<< poses boss_encore


// >>> poses boss_entropy
// ---- Entropy ---------------------------------------------------------------
// Heat Death Drift: arms sweep slowly outward and down, head bows; cold pools
//   spread across the floor while golden order rings shrink.
// Recursive Decay: arms rise and clench together; circles keep splitting in two.
// Maxwell's Door: arms fling wide like opening a door; a doorway of light
//   sorts warm and cold motes to either side.
Object.assign(POSES, {
    ent_drift(P, u) {
        const a = ease(Math.min(u / 0.4, 1)) * ease(Math.min(1, (1 - u) / 0.25));
        const w = Math.sin(u * Math.PI * 3);
        P.leftArm.rot = -26 * a + 5 * w * a; P.leftArm.dy = 8 * a;
        P.rightArm.rot = 26 * a - 5 * w * a; P.rightArm.dy = 8 * a;
        P.head.rot = 12 * a; P.head.dy = 8 * a;
        P.body.dy = 5 * a; P.body.rot = -1.5 * w * a;
    },
    ent_decay(P, u) {
        const up = ease(Math.min(u / 0.35, 1)), rel = ease(Math.min(1, (1 - u) / 0.3));
        const a = up * rel, t = Math.sin(u * Math.PI * 10);
        P.leftArm.rot = 36 * a + 4 * t * a; P.leftArm.dy = -6 * a;
        P.rightArm.rot = -36 * a - 4 * t * a; P.rightArm.dy = -6 * a;
        P.head.rot = -8 * a + 2 * t * a; P.head.dy = -4 * a;
        P.body.dx = 1.8 * t * a; P.body.dy = -3 * a;
    },
    ent_door(P, u) {
        const open = ease(Math.min(u / 0.3, 1)), close = ease((u - 0.8) / 0.2), a = open * (1 - close);
        const w = Math.sin(u * Math.PI * 4);
        P.leftArm.rot = 22 * a; P.leftArm.dx = -14 * a; P.leftArm.dy = -8 * a + 3 * w * a;
        P.rightArm.rot = -22 * a; P.rightArm.dx = 14 * a; P.rightArm.dy = -8 * a - 3 * w * a;
        P.head.rot = 5 * w * a; P.head.dy = -3 * a;
        P.body.dy = 3 * a;
    },
});
Object.assign(FX, {
    ent_drift(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        // cold pools spread
        [[120, 440, 70], [390, 450, 80], [255, 480, 60]].forEach((p, i) => {
            const k = ease(Math.min(1, u * 1.2));
            const r = p[2] * (0.4 + 0.9 * k) * (1 + 0.04 * Math.sin(u * 20 + i));
            const g = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], r);
            g.addColorStop(0, 'rgba(150,230,255,' + 0.55 * env + ')'); g.addColorStop(1, 'rgba(60,140,230,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 1.5, r * 0.5, 0, 0, 7); ctx.fill();
        });
        // golden order rings shrinking
        const s = 1 - 0.75 * ease(u);
        ctx.strokeStyle = 'rgba(255,215,110,' + 0.8 * env + ')'; ctx.lineWidth = 5;
        ctx.setLineDash([14, 10]);
        ctx.beginPath(); ctx.ellipse(255, 440, 170 * s, 48 * s, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        // drifting cold motes from the hands
        for (let i = 0; i < 12; i++) {
            const ph = (u * 1.5 + i * 0.083) % 1, side = i % 2 ? 1 : -1;
            ctx.fillStyle = 'rgba(190,240,255,' + 0.7 * (1 - ph) * env + ')';
            ctx.fillRect(255 + side * (110 + ph * 140), 300 + ph * 110 + (i % 3) * 10, 6, 6);
        }
        return 0;
    },
    ent_decay(ctx, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        // a circle splits into two, each splits again
        const split = (x, y, r, depth, k) => {
            ctx.strokeStyle = 'rgba(170,130,255,' + (0.85 * env) + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
            if (depth > 0 && k > 0) {
                const d = r * 1.1 * k;
                split(x - d, y + d * 0.35, r * 0.55, depth - 1, k * 0.9);
                split(x + d, y + d * 0.35, r * 0.55, depth - 1, k * 0.9);
            }
        };
        const k = ease(Math.min(1, u * 1.6));
        split(255, 420, 60 * (1 - 0.3 * k), 2, k);
        // cracks radiate from clenched hands
        for (let i = 0; i < 6; i++) {
            const ang = i * 1.05 + u * 2, l = 30 + 50 * k;
            ctx.strokeStyle = 'rgba(200,170,255,' + 0.7 * env + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(255, 250); ctx.lineTo(255 + Math.cos(ang) * l, 250 + Math.sin(ang) * l); ctx.stroke();
        }
        return 0;
    },
    ent_door(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.2));
        // doorway
        const h = 240 * ease(Math.min(1, u * 3));
        ctx.fillStyle = 'rgba(255,255,230,' + 0.18 * env + ')';
        ctx.fillRect(235, 400 - h, 40, h);
        ctx.strokeStyle = 'rgba(255,255,230,' + 0.9 * env + ')'; ctx.lineWidth = 5;
        ctx.strokeRect(235, 400 - h, 40, h);
        // warm motes slip left, cold motes slip right (sorted)
        for (let i = 0; i < 14; i++) {
            const ph = (u * 2 + i * 0.071) % 1, y = 190 + ((i * 37) % 190);
            const side = i % 2 ? 1 : -1;
            const x = 255 + side * (10 + ph * 190);
            ctx.fillStyle = side < 0 ? 'rgba(255,140,60,' + 0.85 * env + ')' : 'rgba(110,200,255,' + 0.85 * env + ')';
            ctx.beginPath(); ctx.arc(x, y + Math.sin(ph * 9 + i) * 8, 6, 0, 7); ctx.fill();
        }
        return 0;
    },
});
// <<< poses boss_entropy

// >>> poses boss_gourmet
// ---- The Gourmet -----------------------------------------------------------
// Gourmet Gulp: both platters swing in toward the maw, the body leans in and
//   gulps; cherries stream into the mouth and a swallow pulse runs down.
// Corrupt Cells: the platters shake, the body shudders and purple rot spores
//   spill out over the board.
Object.assign(POSES, {
    gou_gulp(P, u) {
        const swing = ease(Math.min(u / 0.3, 1)) * (1 - ease((u - 0.8) / 0.2));
        const gulp = Math.sin(Math.max(0, Math.min(1, (u - 0.35) / 0.4)) * Math.PI * 3);
        P.plateL.rot = 32 * swing; P.plateL.dx = 16 * swing; P.plateL.dy = -6 * swing;
        P.plateR.rot = -32 * swing; P.plateR.dx = -16 * swing; P.plateR.dy = -6 * swing;
        P.body.dy = 6 * swing + 6 * Math.max(0, gulp) * (u > 0.35 && u < 0.8 ? 1 : 0);
        P.body.rot = -2 * swing;
    },
    gou_corrupt(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 14);
        P.plateL.rot = -14 * env + 10 * w * env; P.plateL.dy = -8 * env;
        P.plateR.rot = 14 * env - 10 * w * env; P.plateR.dy = -8 * env;
        P.body.dx = 4 * w * env; P.body.rot = 2 * Math.sin(u * Math.PI * 9) * env;
    },
});
Object.assign(FX, {
    gou_gulp(ctx, u) {
        const env = Math.min(ease(u / 0.12), 1 - ease((u - 0.85) / 0.15));
        // cherries fly from both plates into the maw (190, 225)
        const srcs = [[70, 150], [95, 175], [420, 240], [400, 250]];
        for (let i = 0; i < 8; i++) {
            const s = srcs[i % 4], ph = (u * 2.2 + i * 0.13) % 1, k = ease(ph);
            const x = s[0] + (190 - s[0]) * k, y = s[1] + (225 - s[1]) * k - Math.sin(k * Math.PI) * 30;
            const r = 11 * (1 - 0.5 * k);
            ctx.fillStyle = 'rgba(230,40,70,' + (0.95 * env * (1 - k * 0.5)) + ')';
            ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,200,200,' + (0.8 * env) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x - 3, y - 3, r * 0.5, 3.4, 4.8); ctx.stroke();
        }
        // suction rings converging on the maw
        for (let i = 0; i < 3; i++) {
            const ph = (u * 2 + i / 3) % 1, rr = 150 * (1 - ph);
            ctx.strokeStyle = 'rgba(255,170,220,' + (0.5 * ph * env) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(190, 225, rr, rr * 0.7, 0, 0, 7); ctx.stroke();
        }
        // swallow pulse down the belly
        if (u > 0.4 && u < 0.85) {
            const k = (u - 0.4) / 0.45;
            ctx.fillStyle = 'rgba(255,120,190,' + (0.45 * (1 - k)) + ')';
            ctx.beginPath(); ctx.ellipse(210, 280 + k * 90, 40, 25, 0, 0, 7); ctx.fill();
        }
        return 0;
    },
    gou_corrupt(ctx, u) {
        const env = Math.min(ease(u / 0.15), 1 - ease((u - 0.8) / 0.2));
        // dark violet haze from the maw
        const g = ctx.createRadialGradient(190, 230, 10, 190, 230, 200);
        g.addColorStop(0, 'rgba(150,40,200,' + (0.5 * env) + ')'); g.addColorStop(1, 'rgba(60,0,90,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(190, 230, 200, 0, 7); ctx.fill();
        // rot spores flung outward, plus corrupted cell squares on the floor
        for (let i = 0; i < 14; i++) {
            const a = i * 2.4, ph = (u * 1.4 + i * 0.07) % 1, d = 40 + ph * 230;
            const x = 190 + Math.cos(a) * d, y = 230 + Math.sin(a) * d * 0.8 - ph * 30;
            ctx.fillStyle = 'rgba(' + (i % 2 ? '170,60,230' : '90,20,120') + ',' + (0.85 * (1 - ph) * env) + ')';
            ctx.beginPath(); ctx.arc(x, y, 9 - ph * 5, 0, 7); ctx.fill();
        }
        for (let i = 0; i < 5; i++) {
            const k = ease((u - 0.3 - i * 0.07) / 0.2);
            if (k <= 0) continue;
            const x = 90 + i * 80, y = 450 + (i % 2) * 20;
            ctx.fillStyle = 'rgba(110,30,150,' + (0.7 * k * env) + ')'; ctx.strokeStyle = 'rgba(220,120,255,' + (0.9 * k * env) + ')'; ctx.lineWidth = 3;
            ctx.fillRect(x - 24, y - 12, 48, 26); ctx.strokeRect(x - 24, y - 12, 48, 26);
        }
        return u > 0.3 && u < 0.4 ? 0.3 * (1 - (u - 0.3) / 0.1) : 0;
    },
});
// <<< poses boss_gourmet

// >>> poses boss_exarch
// ---- The Exarch ------------------------------------------------------------
// Constriction: book and staff are thrown wide, then both snap inward while a
//   ring of fire closes in around the whole figure.
// Prior Bomb: the staff swings back, the die-crystal charges, then it is
//   lobbed out as a fused bomb that detonates.
Object.assign(POSES, {
    exa_constrict(P, u) {
        const open = ease(u / 0.3), snap = ease((u - 0.5) / 0.15), rec = ease((u - 0.75) / 0.25);
        const k = u < 0.5 ? open : 1 - snap * 1.4;
        const f = (1 - rec);
        P.book.rot = -30 * k * f; P.book.dx = -14 * k * f; P.book.dy = -8 * k * f;
        P.staff.rot = 28 * k * f; P.staff.dx = 14 * k * f; P.staff.dy = -8 * k * f;
        P.crown.rot = 6 * Math.sin(u * 30) * (u < 0.75 ? 1 : 0) * f; P.crown.dy = -6 * open * f;
        P.body.dy = 3 * snap * f;
    },
    exa_bomb(P, u) {
        const back = ease(u / 0.35), swing = ease((u - 0.4) / 0.12), rec = ease((u - 0.65) / 0.35);
        const k = (u < 0.4 ? back : 1 - swing * 1.5) * (1 - rec);
        P.staff.rot = -34 * k; P.staff.dx = -8 * k; P.staff.dy = -6 * k;
        P.book.rot = 18 * k; P.book.dy = -10 * k;
        P.crown.rot = -5 * k;
        P.body.rot = 3 * k;
    },
});
Object.assign(FX, {
    exa_constrict(ctx, u) {
        const e = ease(u / 0.9);
        const r = 330 - 190 * e, a = Math.min(1, u / 0.1) * (1 - ease((u - 0.9) / 0.1));
        ctx.save();
        ctx.lineWidth = 14 + 6 * Math.sin(u * 40);
        ctx.strokeStyle = 'rgba(255,120,30,' + (0.85 * a) + ')';
        ctx.beginPath(); ctx.arc(256, 300, r, 0, 7); ctx.stroke();
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,230,140,' + (0.9 * a) + ')';
        ctx.beginPath(); ctx.arc(256, 300, r, 0, 7); ctx.stroke();
        // flame tongues pointing inward
        for (let i = 0; i < 16; i++) {
            const an = i / 16 * 6.283 + u * 2, l = 28 + 10 * Math.sin(u * 25 + i);
            ctx.strokeStyle = 'rgba(255,160,40,' + (0.8 * a) + ')'; ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(256 + Math.cos(an) * r, 300 + Math.sin(an) * r);
            ctx.lineTo(256 + Math.cos(an) * (r - l), 300 + Math.sin(an) * (r - l)); ctx.stroke();
        }
        // book glow
        const g = ctx.createRadialGradient(110, 270, 4, 110, 270, 80);
        g.addColorStop(0, 'rgba(255,170,50,' + (0.6 * a) + ')'); g.addColorStop(1, 'rgba(255,100,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(110, 270, 80, 0, 7); ctx.fill();
        ctx.restore();
        return u > 0.55 && u < 0.7 ? 0.3 * (1 - Math.abs(u - 0.62) / 0.08) : 0;
    },
    exa_bomb(ctx, u) {
        const charge = ease(u / 0.4);
        // crystal in the staff head charges
        const g = ctx.createRadialGradient(420, 215, 4, 420, 215, 20 + 60 * charge);
        const ca = u < 0.45 ? charge : 0;
        g.addColorStop(0, 'rgba(180,255,235,' + (0.9 * ca) + ')'); g.addColorStop(1, 'rgba(60,200,180,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(420, 215, 80, 0, 7); ctx.fill();
        // thrown bomb: arc from the staff to the left-front, then explosion
        const t = ease((u - 0.45) / 0.35);
        let fl = 0;
        if (u >= 0.45 && u < 0.8) {
            const x = 420 - 330 * t, y = 215 - 150 * Math.sin(t * Math.PI) + 220 * t;
            ctx.fillStyle = '#2a2a30'; ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x + 8, y - 17); ctx.lineTo(x + 18, y - 30); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,60,' + (0.6 + 0.4 * Math.sin(u * 80)) + ')';
            ctx.beginPath(); ctx.arc(x + 18, y - 31, 6, 0, 7); ctx.fill();
        } else if (u >= 0.8) {
            const k = (u - 0.8) / 0.2, x = 90, y = 370;
            ctx.fillStyle = 'rgba(255,140,30,' + (0.8 * (1 - k)) + ')';
            ctx.beginPath(); ctx.arc(x, y, 20 + 90 * k, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,240,180,' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 8 * (1 - k) + 1;
            ctx.beginPath(); ctx.arc(x, y, 30 + 150 * k, 0, 7); ctx.stroke();
            fl = 0.35 * (1 - k);
        }
        return fl;
    },
});
// <<< poses boss_exarch

// >>> poses boss_gale
// ---- The Gale --------------------------------------------------------------
// Gale Vault: the Gale coils low, vaults upward with both cloaks whipping
//   down, and leaves twin cyclone funnels spinning on either side.
// Probability Shift: runes and loose pages flicker as numbers reshuffle.
Object.assign(POSES, {
    gal_vault(P, u) {
        const crouch = ease(u / 0.22), leap = ease((u - 0.22) / 0.2), land = ease((u - 0.62) / 0.3);
        const lift = leap * (1 - land);
        P.body.dy = 14 * crouch * (1 - leap) - 44 * lift;
        P.body.rot = -4 * crouch * (1 - leap) + 3 * lift;
        const flap = Math.sin(u * Math.PI * 6) * 0.5;
        // cloaks sweep up while coiling, then whip down when launching
        P.cloakL.rot = 26 * crouch * (1 - leap) - 30 * lift + 8 * flap * lift;
        P.cloakR.rot = -26 * crouch * (1 - leap) + 30 * lift - 8 * flap * lift;
        P.cloakL.dy = -6 * crouch * (1 - leap);
        P.cloakR.dy = -6 * crouch * (1 - leap);
        P.scrap.rot = 25 * Math.sin(u * Math.PI * 5) * (u > 0.2 ? 1 : 0.3);
        P.scrap.dy = -30 * lift + 4 * Math.sin(u * 20);
        P.scrap.dx = 14 * Math.sin(u * 12);
    },
    gal_shift(P, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2)), w = Math.sin(u * Math.PI * 8);
        P.cloakL.rot = 14 * w * env;
        P.cloakR.rot = -14 * w * env;
        P.scrap.rot = 30 * Math.sin(u * Math.PI * 11) * env;
        P.scrap.dx = 12 * w * env; P.scrap.dy = -8 * Math.abs(w) * env;
        P.body.rot = 2.5 * Math.sin(u * Math.PI * 4) * env;
        P.body.dy = -5 * Math.abs(w) * env;
    },
});
Object.assign(FX, {
    gal_vault(ctx, u) {
        const crouch = ease(u / 0.22), leap = ease((u - 0.22) / 0.2), land = ease((u - 0.62) / 0.3);
        // gathering wind streaks around the coiling body
        if (u < 0.3) {
            ctx.strokeStyle = 'rgba(190,240,255,' + (0.8 * crouch) + ')'; ctx.lineWidth = 5; ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const a = i * 1.05 + u * 14, r = 150 - 60 * crouch;
                ctx.beginPath(); ctx.arc(255, 340, r + (i % 2) * 22, a, a + 0.9); ctx.stroke();
            }
        }
        // twin funnels rise on both sides after the launch
        const fa = ease((u - 0.38) / 0.2) * (1 - 0.5 * ease((u - 0.85) / 0.15));
        [[70, 400, 1], [450, 400, -1]].forEach(f => {
            if (fa <= 0) return;
            for (let k = 0; k < 7; k++) {
                const t = k / 6, w = (16 + 46 * t) * fa, y = f[1] - 150 * fa * (1 - t);
                const sw = Math.sin(u * 22 + k * 1.3) * 10 * f[2];
                ctx.strokeStyle = 'rgba(170,235,250,' + (0.75 * fa) + ')'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.ellipse(f[0] + sw, y, w, 9 + 5 * t, 0, 0, 7); ctx.stroke();
            }
            ctx.fillStyle = 'rgba(120,200,230,' + (0.18 * fa) + ')';
            ctx.beginPath(); ctx.moveTo(f[0] - 16, f[1] - 150 * fa); ctx.lineTo(f[0] + 16, f[1] - 150 * fa); ctx.lineTo(f[0] + 62, f[1]); ctx.lineTo(f[0] - 62, f[1]); ctx.closePath(); ctx.fill();
        });
        // landing ring
        if (land > 0 && land < 1) {
            ctx.strokeStyle = 'rgba(200,250,255,' + (0.7 * (1 - land)) + ')'; ctx.lineWidth = 7 * (1 - land) + 1;
            ctx.beginPath(); ctx.ellipse(255, 430, 40 + land * 190, 10 + land * 36, 0, 0, 7); ctx.stroke();
        }
        return leap > 0.05 && leap < 0.9 ? 0.18 * (1 - leap) : 0;
    },
    gal_shift(ctx, u) {
        const env = ease(Math.min(u / 0.12, 1, (1 - u) / 0.2));
        const glyphs = ['Σ', 'μ', 'R', 'Δ', 'π', 'σ'];
        ctx.font = 'bold 36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 7; i++) {
            const ph = (u * 2.2 + i * 0.14) % 1;
            const ax = 180 + (i * 47) % 190, ay = 270 + ((i * 59) % 120);
            const bx = 60 + (i * 71) % 400, by = 120 + ((i * 83) % 300);
            const out = 1 - ease(ph / 0.35), inn = ease((ph - 0.5) / 0.3);
            ctx.fillStyle = 'rgba(255,230,120,' + (0.9 * out * env) + ')';
            ctx.fillText(glyphs[i % 6], ax, ay);
            ctx.fillStyle = 'rgba(120,255,240,' + (0.9 * inn * env) + ')';
            ctx.fillText(glyphs[(i + 2) % 6], bx, by);
        }
        // little wind swirls near the scrap
        ctx.strokeStyle = 'rgba(170,235,250,' + (0.6 * env) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const a = u * 12 + i * 2.1;
            ctx.beginPath(); ctx.arc(415, 195, 50 + i * 14, a, a + 1.2); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_gale




// >>> poses boss_gambler
// ---- The Gambler -----------------------------------------------------------
// Loaded Dice: the dice hand flicks up and tosses the three dice, they tumble
//   and settle with a gold "rigged" glint while the card hand fans and the hat tips.
// Soul Tithe: the card hand lifts the ante, the open palm beckons, and violet
//   soul wisps stream from below into the palm and the EV coin on the chest.
Object.assign(POSES, {
    gam_dice(P, u) {
        const wind = ease(u / 0.2), toss = ease((u - 0.2) / 0.12), rest = ease((u - 0.65) / 0.35);
        const k = 1 - rest;
        // wind down, then flick up
        P.diceArm.rot = (14 * wind * (1 - toss) - 34 * toss) * k;
        P.diceArm.dy = (8 * wind * (1 - toss) - 12 * toss) * k;
        P.cardArm.rot = 16 * Math.sin(u * Math.PI * 4) * k * ease(u / 0.1);
        P.cardArm.dy = -5 * Math.abs(Math.sin(u * Math.PI * 4)) * k;
        P.hat.rot = -9 * Math.sin(Math.min(1, u / 0.5) * Math.PI) * k;
        P.hat.dy = -4 * Math.sin(Math.min(1, u / 0.5) * Math.PI) * k;
        P.body.rot = -2.5 * toss * k;
        P.body.dy = 3 * wind * k - 4 * toss * k;
    },
    gam_tithe(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        const w = Math.sin(u * Math.PI * 6);
        P.cardArm.rot = 32 * env;
        P.cardArm.dy = -8 * env;
        P.diceArm.rot = (-22 + 12 * w) * env;
        P.diceArm.dy = -10 * env;
        P.hat.rot = 7 * env + 3 * w * env;
        P.body.rot = -3 * env;
        P.body.dy = 4 * env * Math.abs(w);
    },
});
Object.assign(FX, {
    gam_dice(ctx, u) {
        // three dice tumble up from the open hand and settle back down
        const t = (u - 0.2) / 0.65;
        const starts = [[400, 235], [415, 210], [385, 215]];
        const ends = [[375, 205], [425, 195], [395, 165]];
        if (t > 0 && t < 1.1) {
            for (let i = 0; i < 3; i++) {
                const tt = Math.min(1, Math.max(0, t - i * 0.06));
                const arc = Math.sin(tt * Math.PI);
                const x = starts[i][0] + (ends[i][0] - starts[i][0]) * ease(tt) + (i - 1) * 25 * arc;
                const y = starts[i][1] + (ends[i][1] - starts[i][1]) * ease(tt) - 150 * arc;
                const s = 15 + (u > 0.6 ? 3 : 0);
                ctx.save(); ctx.translate(x, y); ctx.rotate(tt * (6 + i * 2) * (i % 2 ? -1 : 1));
                ctx.fillStyle = 'rgba(255,248,220,0.95)'; ctx.strokeStyle = 'rgba(30,40,40,0.9)'; ctx.lineWidth = 3;
                ctx.fillRect(-s, -s, s * 2, s * 2); ctx.strokeRect(-s, -s, s * 2, s * 2);
                ctx.fillStyle = '#222';
                const pips = 1 + ((Math.floor(tt * 12) + i * 2) % 6);
                for (let p = 0; p < Math.min(pips, 5); p++) {
                    ctx.beginPath(); ctx.arc(((p % 3) - 1) * 9, (Math.floor(p / 3) - 0.5) * 12, 3, 0, 7); ctx.fill();
                }
                ctx.restore();
            }
        }
        // rigged glint once they land
        if (u > 0.62) {
            const k = (u - 0.62) / 0.38;
            const a = Math.sin(k * Math.PI);
            const g = ctx.createRadialGradient(400, 200, 4, 400, 200, 90);
            g.addColorStop(0, 'rgba(255,215,90,' + (0.75 * a) + ')'); g.addColorStop(1, 'rgba(255,190,40,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(400, 200, 90, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(255,240,170,' + a + ')'; ctx.lineWidth = 4;
            for (let i = 0; i < 4; i++) {
                const an = i * Math.PI / 2 + 0.6, r1 = 30 + 20 * k, r2 = r1 + 18;
                ctx.beginPath(); ctx.moveTo(400 + Math.cos(an) * r1, 200 + Math.sin(an) * r1);
                ctx.lineTo(400 + Math.cos(an) * r2, 200 + Math.sin(an) * r2); ctx.stroke();
            }
        }
        // a few chips scatter from the card hand
        for (let i = 0; i < 4; i++) {
            const k = Math.min(1, Math.max(0, (u - 0.3 - i * 0.06) / 0.4));
            if (k <= 0 || k >= 1) continue;
            const x = 110 - 40 * k * (i + 1) / 2, y = 230 - 60 * Math.sin(k * Math.PI) + 40 * k;
            ctx.fillStyle = 'rgba(255,210,80,' + (1 - k) + ')'; ctx.strokeStyle = 'rgba(120,80,0,' + (1 - k) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(x, y, 11, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
        }
        return 0;
    },
    gam_tithe(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        // violet aura around the grasping palm
        const g = ctx.createRadialGradient(410, 285, 4, 410, 285, 80);
        g.addColorStop(0, 'rgba(190,110,255,' + (0.6 * env) + ')'); g.addColorStop(1, 'rgba(120,40,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(410, 285, 80, 0, 7); ctx.fill();
        // soul wisps streaming up from below into the palm, then to the chest coin
        for (let i = 0; i < 7; i++) {
            const k = ((u * 1.6 + i / 7) % 1);
            const sx = 120 + i * 50, sy = 470;
            const tx = i % 2 ? 410 : 310, ty = i % 2 ? 285 : 385;
            const x = sx + (tx - sx) * ease(k) + Math.sin(k * 9 + i) * 14;
            const y = sy + (ty - sy) * ease(k);
            const a = Math.sin(k * Math.PI) * env;
            ctx.fillStyle = 'rgba(210,150,255,' + (0.85 * a) + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 7, 11, 0, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(160,90,240,' + (0.35 * a) + ')';
            ctx.beginPath(); ctx.ellipse(x, y + 14, 4, 12, 0, 0, 7); ctx.fill();
        }
        // ante: stack of gold chips floats above the raised card hand
        for (let i = 0; i < 3; i++) {
            const y = 170 - i * 9 - 10 * Math.sin(u * 8 + i);
            ctx.fillStyle = 'rgba(255,205,70,' + (0.95 * env) + ')'; ctx.strokeStyle = 'rgba(110,70,0,' + env + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(115, y, 20, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
        }
        // chest coin pulses as it drinks
        const p = 0.5 + 0.5 * Math.sin(u * 30);
        ctx.strokeStyle = 'rgba(225,170,255,' + (0.7 * env * p) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(312, 392, 28 + 6 * p, 0, 7); ctx.stroke();
        return 0.12 * Math.max(0, 1 - Math.abs(u - 0.5) * 8) * 0;
    },
});
// <<< poses boss_gambler

// >>> poses boss_executioner
// ---- The Executioner -------------------------------------------------------
// Axe Pendulum: the great axe is heaved back, then swings like a pendulum
//   three times across the lower arena, a blade arc glowing beneath it.
// Prior Bomb: the cape snaps, a chained die is yanked loose and lobbed to the
//   floor where it detonates.
Object.assign(POSES, {
    exe_pendulum(P, u) {
        const rec = ease((u - 0.88) / 0.12);
        const sw = u < 0.18 ? -ease(u / 0.18) : -Math.cos((u - 0.18) / 0.7 * Math.PI * 3) * (1 - 0.5 * (u - 0.18));
        P.axe.rot = 30 * sw * (1 - rec);
        P.axe.dx = 8 * sw * (1 - rec);
        P.body.rot = 6 * sw * (1 - rec);
        P.body.dy = -3 * Math.abs(sw) * (1 - rec);
        P.cape.rot = -10 * sw * (1 - rec);
    },
    exe_bomb(P, u) {
        const wind = ease(u / 0.3), snap = ease((u - 0.3) / 0.1), rec = ease((u - 0.6) / 0.4);
        const k = (wind - snap) * (1 - rec);
        P.cape.rot = (-34 * wind + 62 * snap) * (1 - rec);
        P.cape.dx = (-8 * wind + 10 * snap) * (1 - rec);
        P.body.rot = (-6 * wind + 9 * snap) * (1 - rec);
        P.axe.rot = (-16 * wind + 22 * snap) * (1 - rec);
        P.body.dy = -3 * k;
    },
});
Object.assign(FX, {
    exe_pendulum(ctx, u) {
        const env = ease(Math.min((u - 0.1) / 0.1, 1, (1 - u) / 0.12));
        if (env <= 0) return 0;
        const sw = u < 0.18 ? -ease(u / 0.18) : -Math.cos((u - 0.18) / 0.7 * Math.PI * 3) * (1 - 0.5 * (u - 0.18));
        // pendulum track: arc across the lower arena
        ctx.strokeStyle = 'rgba(255,90,60,' + (0.55 * env) + ')'; ctx.lineWidth = 6;
        ctx.setLineDash([16, 12]);
        ctx.beginPath(); ctx.arc(256, -60, 470, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
        ctx.setLineDash([]);
        // glowing blade at the current swing position
        const a = Math.PI / 2 - sw * 0.9, bx = 256 + Math.cos(a) * 470, by = -60 + Math.sin(a) * 470;
        ctx.strokeStyle = 'rgba(200,200,210,' + (0.5 * env) + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(256, -60); ctx.lineTo(bx, by); ctx.stroke();
        const g = ctx.createRadialGradient(bx, by, 4, bx, by, 70);
        g.addColorStop(0, 'rgba(255,120,70,' + (0.8 * env) + ')'); g.addColorStop(1, 'rgba(255,60,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 70, 0, 7); ctx.fill();
        return 0;
    },
    exe_bomb(ctx, u) {
        const t = (u - 0.4) / 0.35;
        if (t > 0 && t < 1) {
            const x = 440 - 230 * t, y = 280 + 170 * t - 200 * Math.sin(t * Math.PI);
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * 9);
            ctx.fillStyle = '#2a2a30'; ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 4;
            ctx.fillRect(-18, -18, 36, 36); ctx.strokeRect(-18, -18, 36, 36);
            ctx.fillStyle = '#ff7043';
            ctx.beginPath(); ctx.arc(-6, -6, 4, 0, 7); ctx.arc(6, 6, 4, 0, 7); ctx.fill();
            ctx.restore();
            ctx.fillStyle = 'rgba(255,200,60,0.9)';
            ctx.beginPath(); ctx.arc(x + 14, y - 26, 5 + (Math.sin(u * 90) + 1) * 2, 0, 7); ctx.fill();
        }
        if (t >= 1) {
            const k = Math.min(1, (t - 1) / 0.6);
            ctx.strokeStyle = 'rgba(255,130,60,' + (0.85 * (1 - k)) + ')'; ctx.lineWidth = 7 * (1 - k) + 1;
            ctx.beginPath(); ctx.ellipse(210, 450, 20 + k * 110, 8 + k * 30, 0, 0, 7); ctx.stroke();
            ctx.fillStyle = 'rgba(255,200,80,' + (0.8 * (1 - k)) + ')';
            ctx.beginPath(); ctx.arc(210, 440, 30 * (1 - k) + 6, 0, 7); ctx.fill();
            return 0.25 * (1 - k);
        }
        return 0;
    },
});
// <<< poses boss_executioner

const SHAKE = { slam: (u) => (u >= 0.5 ? 9 * Math.max(0, 1 - (u - 0.5) * 4) : 0) };

// ---- plumbing ------------------------------------------------------------
const _imgCache = {};
function _partImg(bossId, part) {
    const key = bossId + '/' + part;
    if (!_imgCache[key]) {
        const im = new Image();
        im.src = RIG_DIR + bossId + '/' + part + '.webp';
        _imgCache[key] = im;
    }
    return _imgCache[key];
}

const _running = {};   // monsterId -> true while an animation owns that card

function _findArt(monsterId) {
    const card = document.getElementById('sx-card-' + monsterId);
    return card ? card.querySelector('.sx-monster-emoji-compact') : null;
}

// Draws one frame of an animation (progress u in 0..1) into a 1024px canvas
// context: the 512px art sits in the middle, effects may spill into the margin.
function _renderFrame(ctx, rig, imgs, animName, u) {
    const S = rig.S, by = {}, poses = {};
    rig.parts.forEach((p) => { by[p.n] = p; poses[p.n] = { rot: 0, dx: 0, dy: 0, sc: 1 }; });
    const chainOf = (p) => { const c = []; for (let q = p; q; q = q.par ? by[q.par] : null) c.unshift(q); return c; };
    const rootName = rig.parts.find((p) => !p.par).n;
    POSES[animName](poses, u);
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.save();
    ctx.translate(256, 256);                      // the 512px art sits in the middle of the canvas
    const sh = SHAKE[animName] ? SHAKE[animName](u) : 0;
    if (sh) ctx.translate((Math.random() - 0.5) * sh * S, (Math.random() - 0.5) * sh * S);
    rig.parts.forEach((p, i) => {
        ctx.save();
        for (const q of chainOf(p)) {
            const o = poses[q.n];
            ctx.translate(o.dx * S, o.dy * S);
            ctx.translate(q.px, q.py); ctx.rotate(o.rot * Math.PI / 180); ctx.scale(o.sc, o.sc); ctx.translate(-q.px, -q.py);
        }
        ctx.drawImage(imgs[i], p.x, p.y);
        ctx.restore();
    });
    ctx.save();
    ctx.translate(rig.ox, rig.oy); ctx.scale(S, S);
    const flash = FX[animName](ctx, u, poses[rootName].dy);
    ctx.restore();
    ctx.restore();
    if (flash > 0) {
        const g = ctx.createRadialGradient(512, 512, 10, 512, 512, 420);
        g.addColorStop(0, 'rgba(255,255,255,' + flash + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    }
}

function _play(monsterId, bossId, animName, ms) {
    const rig = RIGS[bossId];
    if (!rig || !POSES[animName] || _running[monsterId]) return;
    const imgs = rig.parts.map((p) => _partImg(bossId, p.n));
    // Art not decoded yet (first use): skip this cue, it will be ready next time.
    if (!imgs.every((im) => im.complete && im.naturalWidth)) return;
    let art = _findArt(monsterId);
    if (!art) return;

    _running[monsterId] = true;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;           // art centred in a 2x area so rings can spill out
    canvas.style.cssText = 'position:absolute;left:50%;top:50%;width:200%;height:200%;'
        + 'transform:translate(-50%,-50%);pointer-events:none;z-index:6;';
    const ctx = canvas.getContext('2d');
    let hiddenImg = null;

    const attach = () => {
        art = _findArt(monsterId);
        if (!art) return false;
        if (getComputedStyle(art).position === 'static') art.style.position = 'relative';
        hiddenImg = art.querySelector('img');
        if (hiddenImg) hiddenImg.style.visibility = 'hidden';
        art.appendChild(canvas);
        return true;
    };
    const finish = () => {
        if (hiddenImg) hiddenImg.style.visibility = '';
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        const a = _findArt(monsterId);
        if (a) { const im = a.querySelector('img'); if (im) im.style.visibility = ''; }
        delete _running[monsterId];
    };
    if (!attach()) { delete _running[monsterId]; return; }

    const t0 = performance.now();
    const frame = (now) => {
        const u = (now - t0) / ms;
        if (u >= 1) return finish();
        // The encounter re-renders cards; follow the live one if ours was dropped.
        if (!canvas.isConnected && !attach()) return finish();
        _renderFrame(ctx, rig, imgs, animName, u);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

function _onBossMechanic(ev) {
    try {
        const d = (ev && ev.detail) || {};
        const art = _findArt(d.monsterId);
        if (!art) return;
        const img = art.querySelector('img');
        const src = img ? String(img.getAttribute('src') || '') : '';
        const bossId = Object.keys(RIGS).find((id) => src.indexOf('/' + id + '.') !== -1);
        if (!bossId) return;
        const m = RIGS[bossId].mechanics[d.mech];
        if (!m) return;
        _play(d.monsterId, bossId, m.anim, m.ms(Number(d.phase) || 1));
    } catch (e) { /* purely cosmetic - never let it surface */ }
}

document.addEventListener('sx-boss-mechanic', _onBossMechanic);

// Warm the part images shortly after boot (~170 KB total) so the very first
// ability of a fight already has its art decoded and is not skipped.
setTimeout(() => {
    try { Object.keys(RIGS).forEach((id) => RIGS[id].parts.forEach((p) => _partImg(id, p.n))); } catch (e) { /* cosmetic only */ }
}, 4000);

// Review hook for the rigging tool (dev/scratch/rigger): draw frame u of an
// animation into any 1024px canvas. Not used by the game itself.
globalThis.BOSS_RIG_REVIEW = {
    anims: () => Object.keys(POSES),
    render(ctx, bossId, animName, u) {
        const rig = RIGS[bossId];
        if (!rig || !POSES[animName]) return false;
        const imgs = rig.parts.map((p) => _partImg(bossId, p.n));
        if (!imgs.every((im) => im.complete && im.naturalWidth)) return false;
        _renderFrame(ctx, rig, imgs, animName, u);
        return true;
    },
    mechanics: (bossId) => (RIGS[bossId] ? RIGS[bossId].mechanics : null),
};
