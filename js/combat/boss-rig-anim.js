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
// Art: images/combat/monsters/rigs/<boss>/<part>.webp, cut from the normal
// boss art by dev/scratch/rigger/cut_ingame.py (authoring demo: boss.html).
// Pose numbers below are in the units of the large source art (px); each
// rig's S converts them to the 512px in-game art.
//------------------------------------------------------------------------

const RIG_DIR = 'images/combat/monsters/rigs/';

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
    // >>> rig boss_gridlock
    boss_gridlock: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 78, px: 256, py: 380, par: null },
            { n: 'dishL', x: 101, y: 102, px: 192, py: 170, par: 'body' },
            { n: 'dishR', x: 314, y: 102, px: 322, py: 170, par: 'body' },
            { n: 'head', x: 193, y: 78, px: 256, py: 250, par: 'body' },
            { n: 'staffArm', x: 4, y: 129, px: 145, py: 290, par: 'body' },
            { n: 'handR', x: 378, y: 212, px: 385, py: 275, par: 'body' },
        ],
        mechanics: {
            laser_lattice: { anim: 'grd_lattice', ms: () => 2200 },
            probability_shift: { anim: 'grd_shift', ms: () => 1600 },
            signal_scramble: { anim: 'grd_scramble', ms: () => 2000 },
            surge_chaser: { anim: 'grd_surge', ms: () => 1900 },
        },
    },
    // <<< rig boss_gridlock
    // >>> rig boss_gust
    boss_gust: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 1, y: 108, px: 256, py: 380, par: null },
            { n: 'head', x: 196, y: 125, px: 265, py: 245, par: 'body' },
            { n: 'leafL', x: 5, y: 275, px: 95, py: 372, par: 'body' },
            { n: 'leafR', x: 416, y: 266, px: 425, py: 376, par: 'body' },
        ],
        mechanics: {
            corrupt_cells: { anim: 'gst_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_gust
    // >>> rig boss_hunter
    boss_hunter: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 33, px: 256, py: 400, par: null },
            { n: 'bow', x: 266, y: 36, px: 372, py: 265, par: 'body' },
            { n: 'drawHand', x: 82, y: 222, px: 90, py: 258, par: 'body' },
        ],
        mechanics: {
            dormant_seekers: { anim: 'hnt_seekers', ms: () => 2000 },
            fog_bank: { anim: 'hnt_fog', ms: () => 2200 },
        },
    },
    // <<< rig boss_hunter
    // >>> rig boss_jelly
    boss_jelly: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 3, y: 10, px: 256, py: 480, par: null },
            { n: 'eyeL', x: 66, y: 190, px: 110, py: 240, par: 'body' },
            { n: 'eyeR', x: 194, y: 194, px: 244, py: 245, par: 'body' },
            { n: 'crown', x: 196, y: 12, px: 265, py: 74, par: 'body' },
        ],
        mechanics: {
            jelly_hops: { anim: 'jly_hop', ms: () => 1800 },
            probability_shift: { anim: 'jly_shift', ms: () => 1600 },
        },
    },
    // <<< rig boss_jelly
    // >>> rig boss_jester
    boss_jester: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 11, px: 256, py: 420, par: null },
            { n: 'armUL', x: 60, y: 209, px: 170, py: 280, par: 'body' },
            { n: 'armUR', x: 356, y: 184, px: 365, py: 272, par: 'body' },
            { n: 'ballA', x: 43, y: 153, px: 73, py: 183, par: 'body' },
            { n: 'ballB', x: 73, y: 46, px: 104, py: 77, par: 'body' },
            { n: 'ballC', x: 396, y: 63, px: 425, py: 92, par: 'body' },
            { n: 'ballD', x: 428, y: 131, px: 458, py: 161, par: 'body' },
            { n: 'ballE', x: 420, y: 249, px: 455, py: 284, par: 'body' },
        ],
        mechanics: {
            bouncing_mayhem: { anim: 'jst_mayhem', ms: () => 1900 },
            clue_swap: { anim: 'jst_swap', ms: () => 1600 },
            card_toss: { anim: 'jst_cards', ms: () => 1800 },
            jugglers_jinx: { anim: 'jst_jinx', ms: () => 2200 },
        },
    },
    // <<< rig boss_jester
    // >>> rig boss_inferno
    boss_inferno: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 41, px: 256, py: 420, par: null },
            { n: 'crown', x: 129, y: 41, px: 260, py: 138, par: 'body' },
            { n: 'armL', x: 6, y: 250, px: 92, py: 266, par: 'body' },
            { n: 'fistR', x: 336, y: 248, px: 355, py: 290, par: 'body' },
        ],
        mechanics: {
            magma_tides: { anim: 'inf_tides', ms: () => 2200 },
            prior_bomb: { anim: 'inf_bomb', ms: () => 1800 },
            pyroclastic_surge: { anim: 'inf_surge', ms: () => 2000 },
            eruption_vents: { anim: 'inf_vents', ms: () => 2000 },
        },
    },
    // <<< rig boss_inferno
    // >>> rig boss_juggernaut
    boss_juggernaut: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 52, px: 256, py: 400, par: null },
            { n: 'head', x: 154, y: 131, px: 225, py: 265, par: 'body' },
            { n: 'fistL', x: 13, y: 206, px: 120, py: 235, par: 'body' },
            { n: 'fistR', x: 364, y: 236, px: 378, py: 280, par: 'body' },
        ],
        mechanics: {
            bull_barrage: { anim: 'jug_charge', ms: () => 1800 },
            thwomp_trio: { anim: 'jug_thwomp', ms: () => 2000 },
            prior_bomb: { anim: 'jug_bomb', ms: () => 1800 },
        },
    },
    // <<< rig boss_juggernaut
    // >>> rig boss_kraken
    boss_kraken: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 1, y: 107, px: 256, py: 330, par: null },
            { n: 'head', x: 164, y: 107, px: 256, py: 300, par: 'body' },
            { n: 'tentUL', x: 67, y: 155, px: 130, py: 228, par: 'body' },
            { n: 'tentUR', x: 358, y: 169, px: 375, py: 245, par: 'body' },
            { n: 'tentL', x: 5, y: 291, px: 120, py: 360, par: 'body' },
            { n: 'tentR', x: 406, y: 291, px: 420, py: 360, par: 'body' },
        ],
        mechanics: {
            tentacle_sweep: { anim: 'krk_sweep', ms: () => 1800 },
            fog_bank: { anim: 'krk_ink', ms: () => 2200 },
        },
    },
    // <<< rig boss_kraken
    // >>> rig boss_leviathan
    boss_leviathan: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 102, px: 200, py: 300, par: null },
            { n: 'tail', x: 328, y: 102, px: 370, py: 200, par: 'body' },
            { n: 'finF', x: 258, y: 314, px: 275, py: 330, par: 'body' },
        ],
        mechanics: {
            rising_tide: { anim: 'lev_tide', ms: () => 2200 },
            corrupt_cells: { anim: 'lev_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_leviathan
    // >>> rig boss_lodestone
    boss_lodestone: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 0, y: 113, px: 256, py: 380, par: null },
            { n: 'head', x: 238, y: 131, px: 282, py: 232, par: 'body' },
            { n: 'magL', x: 88, y: 246, px: 180, py: 270, par: 'body' },
            { n: 'magR', x: 341, y: 246, px: 355, py: 270, par: 'body' },
        ],
        mechanics: {
            polarity_field: { anim: 'lod_polarity', ms: () => 2200 },
            probability_shift: { anim: 'lod_shift', ms: () => 1600 },
        },
    },
    // <<< rig boss_lodestone
    // >>> rig boss_maelstrom
    boss_maelstrom: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 0, y: 98, px: 256, py: 400, par: null },
            { n: 'funnel', x: 132, y: 101, px: 290, py: 245, par: 'body' },
            { n: 'board', x: 76, y: 251, px: 140, py: 350, par: 'body' },
            { n: 'books', x: 396, y: 221, px: 450, py: 345, par: 'body' },
        ],
        mechanics: {
            vortex_nova: { anim: 'mae_nova', ms: () => 2200 },
            corrupt_cells: { anim: 'mae_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_maelstrom
    // >>> rig boss_marksman
    boss_marksman: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 54, px: 220, py: 400, par: null },
            { n: 'head', x: 77, y: 54, px: 180, py: 215, par: 'body' },
            { n: 'rifle', x: 86, y: 201, px: 110, py: 250, par: 'body' },
        ],
        mechanics: {
            marked_strikes: { anim: 'mrk_strikes', ms: () => 2200 },
            probability_shift: { anim: 'mrk_shift', ms: () => 1600 },
        },
    },
    // <<< rig boss_marksman
    // >>> rig boss_medusa
    boss_medusa: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 47, y: 3, px: 256, py: 450, par: null },
            { n: 'snL1', x: 93, y: 50, px: 166, py: 80, par: 'body' },
            { n: 'snL2', x: 68, y: 120, px: 143, py: 142, par: 'body' },
            { n: 'snL3', x: 58, y: 176, px: 138, py: 200, par: 'body' },
            { n: 'snL4', x: 88, y: 230, px: 163, py: 255, par: 'body' },
            { n: 'snR1', x: 366, y: 40, px: 370, py: 70, par: 'body' },
            { n: 'snR2', x: 386, y: 134, px: 390, py: 160, par: 'body' },
            { n: 'snR3', x: 386, y: 210, px: 390, py: 235, par: 'body' },
            { n: 'snR4', x: 376, y: 266, px: 380, py: 285, par: 'body' },
        ],
        mechanics: {
            stone_gaze: { anim: 'med_gaze', ms: () => 2200 },
            snake_strikes: { anim: 'med_strikes', ms: () => 2000 },
            petrify_waves: { anim: 'med_petrify', ms: () => 2000 },
            coil_cage: { anim: 'med_cage', ms: () => 2200 },
        },
    },
    // <<< rig boss_medusa
    // >>> rig boss_minotaur
    boss_minotaur: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 60, px: 256, py: 420, par: null },
            { n: 'shield', x: 314, y: 101, px: 380, py: 250, par: 'body' },
            { n: 'fistL', x: 4, y: 232, px: 95, py: 260, par: 'body' },
            { n: 'fistR', x: 404, y: 251, px: 420, py: 270, par: 'body' },
        ],
        mechanics: {
            labyrinth_walls: { anim: 'min_walls', ms: () => 2000 },
            prior_bomb: { anim: 'min_bomb', ms: () => 1800 },
            hooftread_terrain: { anim: 'min_hoof', ms: () => 2000 },
            thread_of_ariadne: { anim: 'min_thread', ms: () => 2200 },
        },
    },
    // <<< rig boss_minotaur
    // >>> rig boss_maven
    boss_maven: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 54, px: 256, py: 420, par: null },
            { n: 'head', x: 162, y: 56, px: 270, py: 225, par: 'body' },
            { n: 'handL', x: 81, y: 199, px: 205, py: 290, par: 'body' },
            { n: 'staff', x: 396, y: 81, px: 430, py: 300, par: 'body' },
        ],
        mechanics: {
            memory_rite: { anim: 'mav_rite', ms: () => 2200 },
            clue_swap: { anim: 'mav_swap', ms: () => 1600 },
        },
    },
    // <<< rig boss_maven
    // >>> rig boss_needle
    boss_needle: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 56, px: 256, py: 420, par: null },
            { n: 'quills', x: 341, y: 68, px: 380, py: 200, par: 'body' },
            { n: 'staff', x: 12, y: 71, px: 140, py: 280, par: 'body' },
            { n: 'clip', x: 356, y: 266, px: 420, py: 300, par: 'body' },
        ],
        mechanics: {
            needle_gates: { anim: 'ndl_gates', ms: () => 2000 },
            pin_drops: { anim: 'ndl_pins', ms: () => 2000 },
            stitch_wave: { anim: 'ndl_stitch', ms: () => 2000 },
            pincushion_burst: { anim: 'ndl_burst', ms: () => 1800 },
        },
    },
    // <<< rig boss_needle
    // >>> rig boss_maze
    boss_maze: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 41, px: 256, py: 400, par: null },
            { n: 'maze', x: 136, y: 142, px: 256, py: 262, par: 'body' },
            { n: 'bull', x: 213, y: 208, px: 255, py: 262, par: 'maze' },
            { n: 'diceA', x: 19, y: 300, px: 45, py: 326, par: 'body' },
            { n: 'diceB', x: 89, y: 381, px: 118, py: 410, par: 'body' },
            { n: 'diceC', x: 440, y: 302, px: 465, py: 326, par: 'body' },
            { n: 'diceD', x: 408, y: 367, px: 437, py: 396, par: 'body' },
        ],
        mechanics: {
            ghost_gang: { anim: 'maz_ghosts', ms: () => 2000 },
            dot_walls: { anim: 'maz_dots', ms: () => 2000 },
            maze_walls: { anim: 'maz_walls', ms: () => 2200 },
            lights_out: { anim: 'maz_dark', ms: () => 2200 },
        },
    },
    // <<< rig boss_maze
    // >>> rig boss_monsoon
    boss_monsoon: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 52, px: 256, py: 420, par: null },
            { n: 'cloudL', x: 52, y: 97, px: 110, py: 150, par: 'body' },
            { n: 'cloudR', x: 336, y: 105, px: 395, py: 150, par: 'body' },
            { n: 'armL', x: 4, y: 237, px: 160, py: 285, par: 'body' },
            { n: 'armR', x: 351, y: 240, px: 365, py: 285, par: 'body' },
        ],
        mechanics: {
            rain_bands: { anim: 'mon_rain', ms: () => 2200 },
            thunderbolts: { anim: 'mon_bolts', ms: () => 1800 },
            storm_surge: { anim: 'mon_surge', ms: () => 2000 },
            hail_barrage: { anim: 'mon_hail', ms: () => 2000 },
        },
    },
    // <<< rig boss_monsoon
    // >>> rig boss_nemesis
    boss_nemesis: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 52, px: 256, py: 420, par: null },
            { n: 'head', x: 196, y: 56, px: 275, py: 212, par: 'body' },
            { n: 'staff', x: 2, y: 53, px: 120, py: 270, par: 'body' },
            { n: 'shield', x: 346, y: 190, px: 365, py: 260, par: 'body' },
        ],
        mechanics: {
            spiral_storm: { anim: 'nem_spiral', ms: () => 2200 },
            reaper_fans: { anim: 'nem_fans', ms: () => 2000 },
            soul_tithe: { anim: 'nem_tithe', ms: () => 2200 },
        },
    },
    // <<< rig boss_nemesis
    // >>> rig boss_null
    boss_null: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 18, px: 256, py: 420, par: null },
            { n: 'hat', x: 116, y: 18, px: 256, py: 170, par: 'body' },
            { n: 'eyeball', x: 207, y: 220, px: 255, py: 268, par: 'body' },
            { n: 'diceL', x: 20, y: 140, px: 55, py: 173, par: 'body' },
            { n: 'diceR', x: 422, y: 138, px: 457, py: 173, par: 'body' },
        ],
        mechanics: {
            void_lattice: { anim: 'nul_lattice', ms: () => 2000 },
            prior_bomb: { anim: 'nul_bomb', ms: () => 1800 },
            hypothesis_erasure: { anim: 'nul_erase', ms: () => 2000 },
            null_rays: { anim: 'nul_rays', ms: () => 1800 },
        },
    },
    // <<< rig boss_null
    // >>> rig boss_phantom
    boss_phantom: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 113, px: 256, py: 400, par: null },
            { n: 'wingL', x: 2, y: 190, px: 185, py: 260, par: 'body' },
            { n: 'wingR', x: 318, y: 196, px: 325, py: 260, par: 'body' },
            { n: 'head', x: 196, y: 113, px: 265, py: 255, par: 'body' },
        ],
        mechanics: {
            vent_ambush: { anim: 'phm_ambush', ms: () => 2000 },
            fog_bank: { anim: 'phm_fog', ms: () => 2200 },
        },
    },
    // <<< rig boss_phantom
    // >>> rig boss_puddle
    boss_puddle: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 90, px: 256, py: 400, par: null },
            { n: 'splash', x: 299, y: 90, px: 360, py: 180, par: 'body' },
            { n: 'eyeL', x: 146, y: 209, px: 192, py: 255, par: 'body' },
            { n: 'eyeR', x: 256, y: 218, px: 300, py: 262, par: 'body' },
        ],
        mechanics: {
            fated_cell: { anim: 'pud_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_puddle
    // >>> rig boss_nightmare
    boss_nightmare: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 0, y: 76, px: 330, py: 420, par: null },
            { n: 'tail', x: 120, y: 203, px: 245, py: 235, par: 'body' },
            { n: 'head', x: 298, y: 76, px: 380, py: 240, par: 'body' },
        ],
        mechanics: {
            dark_hunt: { anim: 'ngt_hunt', ms: () => 2000 },
            soul_tithe: { anim: 'ngt_tithe', ms: () => 2200 },
        },
    },
    // <<< rig boss_nightmare
    // >>> rig boss_oblivion
    boss_oblivion: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 91, px: 290, py: 400, par: null },
            { n: 'head', x: 219, y: 95, px: 290, py: 250, par: 'body' },
            { n: 'scythe', x: 8, y: 92, px: 190, py: 290, par: 'body' },
            { n: 'orbHand', x: 411, y: 157, px: 430, py: 280, par: 'body' },
        ],
        mechanics: {
            singularity: { anim: 'obl_singularity', ms: () => 2200 },
            event_beams: { anim: 'obl_beams', ms: () => 2000 },
            fog_bank: { anim: 'obl_fog', ms: () => 2200 },
        },
    },
    // <<< rig boss_oblivion
    // >>> rig boss_overfitter
    boss_overfitter: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 103, px: 256, py: 420, par: null },
            { n: 'head', x: 254, y: 131, px: 320, py: 262, par: 'body' },
            { n: 'handL', x: 156, y: 256, px: 175, py: 270, par: 'body' },
            { n: 'handR', x: 318, y: 296, px: 360, py: 300, par: 'body' },
        ],
        mechanics: {
            gradient_descent: { anim: 'ovf_descent', ms: () => 2200 },
            pattern_break: { anim: 'ovf_break', ms: () => 1800 },
            pattern_lock: { anim: 'ovf_lock', ms: () => 2000 },
            validation_set: { anim: 'ovf_validate', ms: () => 2000 },
        },
    },
    // <<< rig boss_overfitter
    // >>> rig boss_razor
    boss_razor: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 64, px: 256, py: 420, par: null },
            { n: 'bladeL', x: 4, y: 69, px: 140, py: 290, par: 'body' },
            { n: 'bladeR', x: 376, y: 100, px: 395, py: 280, par: 'body' },
        ],
        mechanics: {
            blade_cyclone: { anim: 'rzr_cyclone', ms: () => 2000 },
            probability_shift: { anim: 'rzr_shift', ms: () => 1600 },
            razor_wires: { anim: 'rzr_wires', ms: () => 2000 },
            hone_and_cast: { anim: 'rzr_hone', ms: () => 2200 },
        },
    },
    // <<< rig boss_razor
    // >>> rig boss_seraph
    boss_seraph: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 160, px: 256, py: 260, par: null },
            { n: 'head', x: 186, y: 166, px: 256, py: 320, par: 'body' },
        ],
        mechanics: {
            judgment_pillars: { anim: 'srp_pillars', ms: () => 2200 },
            radiant_fans: { anim: 'srp_fans', ms: () => 2000 },
            fated_cell: { anim: 'srp_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_seraph
    // >>> rig boss_shaper
    boss_shaper: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 42, px: 290, py: 430, par: null },
            { n: 'head', x: 206, y: 74, px: 290, py: 260, par: 'body' },
            { n: 'club', x: 96, y: 236, px: 195, py: 330, par: 'body' },
            { n: 'frostHand', x: 381, y: 146, px: 400, py: 265, par: 'body' },
        ],
        mechanics: {
            glacier_rift: { anim: 'shp_rift', ms: () => 2000 },
            soul_tithe: { anim: 'shp_tithe', ms: () => 2200 },
            frost_monoliths: { anim: 'shp_monoliths', ms: () => 2000 },
            ice_walker: { anim: 'shp_walker', ms: () => 2200 },
        },
    },
    // <<< rig boss_shaper
    // >>> rig boss_siren
    boss_siren: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 39, px: 256, py: 420, par: null },
            { n: 'conch', x: 131, y: 163, px: 255, py: 205, par: 'body' },
            { n: 'handR', x: 376, y: 224, px: 390, py: 280, par: 'body' },
        ],
        mechanics: {
            wail_beam: { anim: 'srn_wail', ms: () => 2200 },
            frozen_cells: { anim: 'srn_frost', ms: () => 1800 },
            undertow: { anim: 'srn_undertow', ms: () => 2200 },
            sirens_reply: { anim: 'srn_reply', ms: () => 2200 },
        },
    },
    // <<< rig boss_siren
    // >>> rig boss_snail
    boss_snail: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 3, y: 102, px: 200, py: 380, par: null },
            { n: 'shell', x: 126, y: 107, px: 300, py: 350, par: 'body' },
            { n: 'eyeL', x: 3, y: 160, px: 45, py: 225, par: 'body' },
            { n: 'eyeR', x: 77, y: 156, px: 110, py: 225, par: 'body' },
        ],
        mechanics: {
            doom_snail: { anim: 'snl_doom', ms: () => 2200 },
            corrupt_cells: { anim: 'snl_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_snail
    // >>> rig boss_sprout
    boss_sprout: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 75, y: 3, px: 256, py: 400, par: null },
            { n: 'leaves', x: 106, y: 8, px: 256, py: 150, par: 'body' },
        ],
        mechanics: {
            sproutlings: { anim: 'spr_sprouts', ms: () => 2000 },
            prior_bomb: { anim: 'spr_bomb', ms: () => 1800 },
        },
    },
    // <<< rig boss_sprout
    // >>> rig boss_shrine
    boss_shrine: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 41, px: 256, py: 430, par: null },
            { n: 'head', x: 154, y: 45, px: 256, py: 245, par: 'body' },
            { n: 'staff', x: 341, y: 156, px: 370, py: 275, par: 'body' },
        ],
        mechanics: {
            knot_barriers: { anim: 'shr_knots', ms: () => 2000 },
            fated_cell: { anim: 'shr_fate', ms: () => 1900 },
            mirror_spirits: { anim: 'shr_mirror', ms: () => 2200 },
            ofuda_ward: { anim: 'shr_ward', ms: () => 2200 },
        },
    },
    // <<< rig boss_shrine
    // >>> rig boss_stack
    boss_stack: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 12, y: 4, px: 256, py: 480, par: null },
            { n: 'head', x: 186, y: 8, px: 300, py: 215, par: 'body' },
            { n: 'blockTL', x: 46, y: 24, px: 140, py: 140, par: 'body' },
        ],
        mechanics: {
            block_fall: { anim: 'stk_fall', ms: () => 2000 },
            fog_bank: { anim: 'stk_fog', ms: () => 2200 },
            probability_shift: { anim: 'stk_shift', ms: () => 1800 },
        },
    },
    // <<< rig boss_stack
    // >>> rig boss_sirus
    boss_sirus: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 67, px: 256, py: 420, par: null },
            { n: 'staff', x: 7, y: 53, px: 128, py: 280, par: 'body' },
            { n: 'storm', x: 348, y: 49, px: 410, py: 210, par: 'body' },
            { n: 'handR', x: 370, y: 188, px: 380, py: 250, par: 'body' },
        ],
        mechanics: {
            ion_current: { anim: 'sir_ion', ms: () => 2200 },
            probability_shift: { anim: 'sir_shift', ms: () => 1600 },
            chain_lightning: { anim: 'sir_chain', ms: () => 1800 },
            storm_eye: { anim: 'sir_eye', ms: () => 2200 },
        },
    },
    // <<< rig boss_sirus
    // >>> rig boss_stormqueen
    boss_stormqueen: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 95, px: 256, py: 420, par: null },
            { n: 'crown', x: 131, y: 51, px: 256, py: 125, par: 'body' },
            { n: 'bolt', x: 33, y: 72, px: 115, py: 250, par: 'body' },
            { n: 'handR', x: 348, y: 138, px: 365, py: 200, par: 'body' },
        ],
        mechanics: {
            queen_storms: { anim: 'sq_storms', ms: () => 2200 },
            shrapnel_downpour: { anim: 'sq_shrapnel', ms: () => 1900 },
            fated_cell: { anim: 'sq_fate', ms: () => 1900 },
        },
    },
    // <<< rig boss_stormqueen
    // >>> rig boss_swarm
    boss_swarm: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 117, px: 256, py: 350, par: null },
            { n: 'top', x: 176, y: 88, px: 256, py: 125, par: 'body' },
            { n: 'ufoA', x: 74, y: 130, px: 100, py: 140, par: 'body' },
            { n: 'ufoB', x: 4, y: 199, px: 30, py: 225, par: 'body' },
            { n: 'ufoC', x: 417, y: 130, px: 445, py: 155, par: 'body' },
            { n: 'ufoD', x: 442, y: 167, px: 470, py: 195, par: 'body' },
        ],
        mechanics: {
            swarm_arc: { anim: 'swm_arc', ms: () => 2000 },
            prior_bomb: { anim: 'swm_bomb', ms: () => 1800 },
            mimic_queen: { anim: 'swm_mimic', ms: () => 2200 },
            hive_eye: { anim: 'swm_eye', ms: () => 2200 },
        },
    },
    // <<< rig boss_swarm
    // >>> rig boss_tactician
    boss_tactician: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 57, px: 256, py: 420, par: null },
            { n: 'staff', x: 358, y: 57, px: 390, py: 245, par: 'body' },
            { n: 'board', x: 15, y: 249, px: 120, py: 300, par: 'body' },
        ],
        mechanics: {
            battle_intent: { anim: 'tac_intent', ms: () => 2000 },
            fog_bank: { anim: 'tac_fog', ms: () => 2200 },
        },
    },
    // <<< rig boss_tactician
    // >>> rig boss_thwomp
    boss_thwomp: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 73, px: 256, py: 400, par: null },
        ],
        mechanics: {
            soul_tithe: { anim: 'thw_tithe', ms: () => 2200 },
            corrupt_cells: { anim: 'thw_corrupt', ms: () => 1800 },
        },
    },
    // <<< rig boss_thwomp
    // >>> rig boss_striker
    boss_striker: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 43, y: 1, px: 260, py: 400, par: null },
            { n: 'ball', x: 52, y: 348, px: 138, py: 428, par: 'body' },
            { n: 'legR', x: 298, y: 285, px: 320, py: 330, par: 'body' },
        ],
        mechanics: {
            prior_bomb: { anim: 'str_kick', ms: () => 1800 },
        },
    },
    // <<< rig boss_striker
    // >>> rig boss_tron
    boss_tron: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 100, px: 200, py: 380, par: null },
            { n: 'head', x: 93, y: 100, px: 160, py: 225, par: 'body' },
            { n: 'wave', x: 254, y: 126, px: 300, py: 300, par: 'body' },
            { n: 'wheelF', x: 248, y: 272, px: 298, py: 322, par: 'body' },
        ],
        mechanics: {
            light_cycle: { anim: 'trn_cycle', ms: () => 1900 },
            corrupt_cells: { anim: 'trn_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_tron
    // >>> rig boss_velocity
    boss_velocity: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 0, y: 111, px: 256, py: 400, par: null },
            { n: 'head', x: 148, y: 113, px: 250, py: 240, par: 'body' },
            { n: 'fistR', x: 323, y: 223, px: 335, py: 240, par: 'body' },
            { n: 'fistL', x: 88, y: 238, px: 180, py: 270, par: 'body' },
        ],
        mechanics: {
            speed_lanes: { anim: 'vel_lanes', ms: () => 2000 },
            corrupt_cells: { anim: 'vel_corrupt', ms: () => 2000 },
        },
    },
    // <<< rig boss_velocity
    // >>> rig boss_vise
    boss_vise: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 88, px: 256, py: 420, par: null },
            { n: 'jaw', x: 176, y: 173, px: 256, py: 180, par: 'body' },
            { n: 'armL', x: 4, y: 219, px: 85, py: 240, par: 'body' },
            { n: 'armR', x: 358, y: 245, px: 375, py: 270, par: 'body' },
        ],
        mechanics: {
            crushing_walls: { anim: 'vis_walls', ms: () => 2200 },
            probability_shift: { anim: 'vis_shift', ms: () => 1600 },
            bench_vise: { anim: 'vis_bench', ms: () => 1800 },
            quench_or_shatter: { anim: 'vis_quench', ms: () => 2200 },
        },
    },
    // <<< rig boss_vise
    // >>> rig boss_voidborn
    boss_voidborn: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 62, y: 3, px: 256, py: 420, par: null },
            { n: 'horn', x: 278, y: 16, px: 300, py: 190, par: 'body' },
            { n: 'tendrilL', x: 109, y: 158, px: 160, py: 270, par: 'body' },
        ],
        mechanics: {
            void_choice: { anim: 'vdb_choice', ms: () => 2200 },
            void_tendrils: { anim: 'vdb_tendrils', ms: () => 2000 },
            prior_bomb: { anim: 'vdb_bomb', ms: () => 1800 },
        },
    },
    // <<< rig boss_voidborn
    // >>> rig boss_warden
    boss_warden: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 36, px: 256, py: 400, par: null },
            { n: 'lantern', x: 9, y: 53, px: 80, py: 270, par: 'body' },
            { n: 'handR', x: 353, y: 243, px: 370, py: 295, par: 'body' },
        ],
        mechanics: {
            pulse_totems: { anim: 'wrd_totems', ms: () => 2200 },
            frozen_cells: { anim: 'wrd_frost', ms: () => 1800 },
            arc_link: { anim: 'wrd_arc', ms: () => 2000 },
        },
    },
    // <<< rig boss_warden
    // >>> rig boss_warlord
    boss_warlord: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 45, px: 256, py: 420, par: null },
            { n: 'sword', x: 9, y: 47, px: 130, py: 200, par: 'body' },
            { n: 'head', x: 268, y: 103, px: 312, py: 220, par: 'body' },
        ],
        mechanics: {
            guard_call: { anim: 'wrl_guard', ms: () => 2200 },
            triple_rings: { anim: 'wrl_rings', ms: () => 2200 },
            soul_tithe: { anim: 'wrl_tithe', ms: () => 2200 },
        },
    },
    // <<< rig boss_warlord
    // >>> rig boss_weaver
    boss_weaver: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 107, px: 256, py: 400, par: null },
            { n: 'web', x: 6, y: 148, px: 140, py: 250, par: 'body' },
            { n: 'head', x: 190, y: 82, px: 255, py: 150, par: 'body' },
            { n: 'abdomen', x: 306, y: 139, px: 330, py: 250, par: 'body' },
        ],
        mechanics: {
            thread_grid: { anim: 'wvr_grid', ms: () => 2200 },
            prior_bomb: { anim: 'wvr_bomb', ms: () => 1800 },
        },
    },
    // <<< rig boss_weaver
    // >>> rig boss_wormhole
    boss_wormhole: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 80, px: 256, py: 300, par: null },
            { n: 'face', x: 158, y: 123, px: 256, py: 220, par: 'body' },
        ],
        mechanics: {
            portal_wisp: { anim: 'wrm_wisp', ms: () => 2000 },
            clue_scramble: { anim: 'wrm_scramble', ms: () => 1800 },
        },
    },
    // <<< rig boss_wormhole
    // >>> rig boss_zenith
    boss_zenith: {
        S: 1, ox: 0, oy: 0,
        parts: [
            { n: 'body', x: 2, y: 71, px: 256, py: 420, par: null },
            { n: 'crown', x: 168, y: 33, px: 256, py: 148, par: 'body' },
            { n: 'staff', x: 20, y: 90, px: 145, py: 290, par: 'body' },
            { n: 'vortex', x: 364, y: 99, px: 410, py: 230, par: 'body' },
        ],
        mechanics: {
            royal_decree: { anim: 'zen_decree', ms: () => 2000 },
            crown_rings: { anim: 'zen_rings', ms: () => 2200 },
            soul_tithe: { anim: 'zen_tithe', ms: () => 2200 },
        },
    },
    // <<< rig boss_zenith
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
// Fades in over the first `a` of the animation and out over the last `b`.
const envOf = (u, a, b) => ease(Math.min(u / a, 1, (1 - u) / b));

// ---- shared cues (abilities many bosses share; drawn in 512px art space) --
// A soft round glow in colour rgb ('r,g,b').
function _cueGlow(ctx, x, y, r, rgb, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

// Prior Bomb: glow builds at `from`, then three fused bombs arc out to the
// ground and tick there with a pulsing ring.
function _cueBombs(ctx, u, from, rgb) {
    const [fx, fy] = from;
    if (u < 0.4) { _cueGlow(ctx, fx, fy, 20 + 45 * ease(u / 0.35), rgb, 0.9 * ease(u / 0.35)); return; }
    const fade = 1 - ease((u - 0.85) / 0.15);
    [[90, 480], [256, 505], [425, 475]].forEach(([tx, ty], i) => {
        const k = ease(Math.min(1, Math.max(0, (u - 0.4 - i * 0.05) / 0.33)));
        if (k <= 0) return;
        const x = fx + (tx - fx) * k, y = fy + (ty - fy) * k - 200 * Math.sin(k * Math.PI);
        ctx.fillStyle = 'rgba(35,30,40,' + fade + ')'; ctx.strokeStyle = 'rgba(' + rgb + ',' + fade + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,150,' + fade * (0.6 + 0.4 * Math.sin(u * 60 + i)) + ')';
        ctx.beginPath(); ctx.arc(x + 10, y - 16, 6, 0, 7); ctx.fill();
        if (k >= 1) {
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.8 * fade) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, 25 + 9 * Math.sin(u * 40), 0, 7); ctx.stroke();
        }
    });
}

// Corrupt Cells: a dark pulse at `from`, then four cracked, tainted cells
// drift down and settle along the bottom.
function _cueCorrupt(ctx, u, from, rgb) {
    const env = envOf(u, 0.2, 0.2);
    _cueGlow(ctx, from[0], from[1], 70, rgb, 0.6 * env);
    for (let i = 0; i < 4; i++) {
        const k = ease(Math.min(1, Math.max(0, (u - 0.25 - i * 0.07) / 0.35)));
        if (k <= 0) continue;
        const tx = 70 + i * 125, ty = 470 - (i % 2) * 25;
        const x = from[0] + (tx - from[0]) * k, y = from[1] + (ty - from[1]) * k - 60 * Math.sin(k * Math.PI);
        const a = env * Math.min(1, k * 3);
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.45 * a) + ')'; ctx.strokeStyle = 'rgba(' + rgb + ',' + a + ')'; ctx.lineWidth = 3;
        ctx.fillRect(x - 22, y - 22, 44, 44); ctx.strokeRect(x - 22, y - 22, 44, 44);
        ctx.strokeStyle = 'rgba(20,10,25,' + a + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x, y + 2); ctx.lineTo(x - 4, y + 14); ctx.moveTo(x, y + 2); ctx.lineTo(x + 14, y - 6); ctx.stroke();
    }
}

// Probability Shift: three empty cells along the bottom; an X and a ? hop
// between them on arcs.
function _cueShift(ctx, u, rgb) {
    const env = envOf(u, 0.25, 0.25);
    const cells = [[130, 480], [380, 480], [255, 505]];
    ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.6 * env) + ')'; ctx.lineWidth = 3;
    cells.forEach(([x, y]) => ctx.strokeRect(x - 24, y - 24, 48, 48));
    const k = ease((u - 0.25) / 0.55);
    if (u <= 0.25 || u >= 0.85) return;
    [[0, 1], [1, 2]].forEach(([a, b], i) => {
        const kk = Math.min(1, Math.max(0, k * 1.1 - i * 0.1));
        const [x1, y1] = cells[a], [x2, y2] = cells[b];
        const x = x1 + (x2 - x1) * kk, y = y1 + (y2 - y1) * kk - 150 * Math.sin(kk * Math.PI);
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.95 * env) + ')';
        ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i ? '?' : 'X', x, y);
    });
}

// Fog Bank: grey banks roll in from both sides and thin out again.
function _cueFog(ctx, u, rgb) {
    const env = envOf(u, 0.3, 0.25);
    for (let i = 0; i < 9; i++) {
        const side = i % 2 ? 1 : -1;
        const x = 256 + side * (420 - 300 * env) + side * ((i * 31) % 60) + 20 * Math.sin(u * 4 + i);
        _cueGlow(ctx, x, 120 + (i * 47) % 360, 90 + (i * 23) % 50, rgb, 0.7 * env);
    }
}

// Fated Cell: a cell at (x, y) is locked by a shrinking reticle and a rune.
function _cueFate(ctx, u, x, y, rgb) {
    const env = envOf(u, 0.2, 0.2), k = ease(u / 0.6);
    const r = 120 - 80 * k;
    ctx.strokeStyle = 'rgba(' + rgb + ',' + env + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + u * 3;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14)); ctx.lineTo(x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14)); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(' + rgb + ',' + (0.3 * env * k) + ')'; ctx.fillRect(x - 26, y - 26, 52, 52);
    ctx.strokeRect(x - 26, y - 26, 52, 52);
    if (u > 0.6) _cueGlow(ctx, x, y, 60, rgb, 0.8 * env * Math.sin((u - 0.6) / 0.4 * Math.PI));
}

// Soul Tithe: wisps stream up from the ground into the point (x, y).
function _cueTithe(ctx, u, x, y, rgb) {
    const env = envOf(u, 0.2, 0.25);
    _cueGlow(ctx, x, y, 75, rgb, 0.6 * env);
    for (let i = 0; i < 7; i++) {
        const k = (u * 1.6 + i / 7) % 1;
        const sx = 60 + i * 65, sy = 490;
        const px = sx + (x - sx) * ease(k) + Math.sin(k * 9 + i) * 14, py = sy + (y - sy) * ease(k);
        const a = Math.sin(k * Math.PI) * env;
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.85 * a) + ')';
        ctx.beginPath(); ctx.ellipse(px, py, 7, 11, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.35 * a) + ')';
        ctx.beginPath(); ctx.ellipse(px, py + 14, 4, 12, 0, 0, 7); ctx.fill();
    }
}

// Frozen Cells: ice shards fly from `from` and freeze three cells.
function _cueFrost(ctx, u, from) {
    const env = envOf(u, 0.2, 0.2);
    _cueGlow(ctx, from[0], from[1], 60, '170,225,255', 0.7 * env);
    [[110, 470], [256, 500], [400, 470]].forEach(([tx, ty], i) => {
        const k = ease(Math.min(1, Math.max(0, (u - 0.25 - i * 0.06) / 0.3)));
        if (k <= 0) return;
        const x = from[0] + (tx - from[0]) * k, y = from[1] + (ty - from[1]) * k;
        if (k < 1) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty - from[1], tx - from[0]));
            ctx.fillStyle = 'rgba(220,245,255,' + env + ')';
            ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -6); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = 'rgba(170,225,255,' + (0.5 * env) + ')'; ctx.strokeStyle = 'rgba(235,250,255,' + env + ')'; ctx.lineWidth = 3;
            ctx.fillRect(tx - 24, ty - 24, 48, 48); ctx.strokeRect(tx - 24, ty - 24, 48, 48);
            ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx + 14, ty); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke();
        }
    });
}

// Clue Swap / Clue Scramble: two (or, scrambled, three) number tags above
// the head trade places on arcs.
function _cueClues(ctx, u, rgb, scramble) {
    const env = envOf(u, 0.2, 0.25), k = ease((u - 0.2) / 0.55);
    const slots = scramble ? [[120, 0], [256, -30], [392, 0]] : [[150, -10], [362, -10]];
    const labels = scramble ? ['2', '5', '1'] : ['3', '7'];
    slots.forEach(([x1, y1], i) => {
        const [x2, y2] = slots[(i + 1) % slots.length];
        const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k - 60 * Math.sin(k * Math.PI) * (i % 2 ? -1 : 1);
        ctx.fillStyle = 'rgba(250,245,230,' + env + ')'; ctx.strokeStyle = 'rgba(' + rgb + ',' + env + ')'; ctx.lineWidth = 4;
        ctx.fillRect(x - 24, y - 30, 48, 60); ctx.strokeRect(x - 24, y - 30, 48, 60);
        ctx.fillStyle = 'rgba(40,30,60,' + env + ')'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], x, y + 2);
    });
}

// ---- poses (pose objects: rot deg, dx/dy source-art px, sc scale, sx/sy squash)
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

// >>> poses boss_gridlock
// ---- The Gridlock ----------------------------------------------------------
// Laser Lattice: both dishes swivel out and fire, red beams sweep across in
//   rows, then in columns. Probability Shift: the staff lifts the stone die,
//   which glows while marks hop between cells. Signal Scramble: the open hand
//   crackles and broken signal waves leave the dishes. Surge Chaser: the hand
//   thrusts and a spark runs out, dragging a live cable behind it.
Object.assign(POSES, {
    grd_lattice(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        const w = Math.sin(u * Math.PI * 8);
        P.dishL.rot = (-16 + 4 * w) * env;
        P.dishR.rot = (16 - 4 * w) * env;
        P.head.dy = -6 * env;
        P.handR.rot = -10 * env;
        P.staffArm.rot = 6 * env;
        P.body.dy = 2 * env * Math.abs(w);
    },
    grd_shift(P, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.25));
        P.staffArm.rot = 18 * env;
        P.staffArm.dy = -14 * env;
        P.head.rot = -4 * env;
        P.handR.rot = 8 * env * Math.sin(u * Math.PI * 4);
        P.body.rot = -1.5 * env;
    },
    grd_scramble(P, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        const j = Math.sin(u * 90);
        P.handR.rot = (-14 + 5 * j) * env;
        P.handR.dx = 3 * j * env;
        P.dishL.rot = 6 * Math.sin(u * 40) * env;
        P.dishR.rot = -6 * Math.sin(u * 40 + 1) * env;
        P.head.dx = 1.5 * j * env;
        P.body.dx = 1 * j * env;
    },
    grd_surge(P, u) {
        const crouch = ease(u / 0.3), thrust = ease((u - 0.3) / 0.12), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.handR.rot = (10 * crouch * (1 - thrust) - 18 * thrust) * k;
        P.handR.dx = (-8 * crouch * (1 - thrust) + 16 * thrust) * k;
        P.body.dy = 6 * crouch * (1 - thrust) * k;
        P.body.rot = (-2 * crouch + 4 * thrust) * k;
        P.head.rot = 4 * thrust * k;
        P.staffArm.rot = -6 * thrust * k;
    },
});
Object.assign(FX, {
    grd_lattice(ctx, u) {
        // charge glow in both dishes
        const charge = ease(u / 0.25) * (1 - ease((u - 0.85) / 0.15));
        [[150, 165], [365, 165]].forEach(([x, y]) => {
            const g = ctx.createRadialGradient(x, y, 2, x, y, 55);
            g.addColorStop(0, 'rgba(255,90,80,' + (0.8 * charge) + ')'); g.addColorStop(1, 'rgba(255,40,40,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 55, 0, 7); ctx.fill();
        });
        // first wave: rows; second wave: columns
        const wave = (k, vertical) => {
            if (k <= 0 || k >= 1) return;
            const a = Math.sin(k * Math.PI);
            for (let i = 0; i < 5; i++) {
                const p = -120 + i * 190 + (vertical ? 0 : 40);
                const w = 10 * a + 2;
                ctx.fillStyle = 'rgba(255,60,60,' + (0.55 * a) + ')';
                ctx.strokeStyle = 'rgba(255,230,230,' + (0.9 * a) + ')'; ctx.lineWidth = 2;
                if (vertical) { ctx.fillRect(p - w / 2, -200, w, 900); ctx.beginPath(); ctx.moveTo(p, -200); ctx.lineTo(p, 700); ctx.stroke(); }
                else { ctx.fillRect(-200, p - w / 2, 900, w); ctx.beginPath(); ctx.moveTo(-200, p); ctx.lineTo(700, p); ctx.stroke(); }
            }
        };
        wave((u - 0.22) / 0.33, false);
        wave((u - 0.55) / 0.33, true);
        return 0;
    },
    grd_shift(ctx, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.25));
        // glowing stone die at the top of the staff
        const x = 55, y = 160;
        const g = ctx.createRadialGradient(x, y, 4, x, y, 80);
        g.addColorStop(0, 'rgba(120,230,255,' + (0.7 * env) + ')'); g.addColorStop(1, 'rgba(60,160,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 80, 0, 7); ctx.fill();
        // two marks hop between cells in arcs, fading as they land
        const k = ease((u - 0.25) / 0.55);
        if (u > 0.25 && u < 0.85) {
            [[[130, 470], [380, 470]], [[380, 470], [250, 500]]].forEach(([a, b], i) => {
                const kk = Math.min(1, k * 1.1 - i * 0.1);
                if (kk <= 0) return;
                const px = a[0] + (b[0] - a[0]) * kk, py = a[1] + (b[1] - a[1]) * kk - 140 * Math.sin(kk * Math.PI);
                ctx.fillStyle = 'rgba(140,230,255,' + (0.9 * env) + ')';
                ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(i ? '?' : 'X', px, py);
            });
        }
        // empty cells the marks leave from
        ctx.strokeStyle = 'rgba(140,230,255,' + (0.6 * env) + ')'; ctx.lineWidth = 3;
        [[130, 470], [380, 470], [250, 500]].forEach(([cx, cy]) => ctx.strokeRect(cx - 22, cy - 22, 44, 44));
        return 0;
    },
    grd_scramble(ctx, u) {
        const env = ease(Math.min(u / 0.15, 1, (1 - u) / 0.2));
        // static flecks around the open hand
        for (let i = 0; i < 26; i++) {
            const a = i * 2.399 + Math.floor(u * 30) * 0.7, r = 40 + ((i * 37 + Math.floor(u * 30) * 13) % 70);
            const x = 450 + Math.cos(a) * r, y = 270 + Math.sin(a) * r;
            ctx.fillStyle = (i % 3 ? 'rgba(180,240,255,' : 'rgba(255,90,90,') + (0.85 * env) + ')';
            ctx.fillRect(x, y, 4 + (i % 4) * 4, 3);
        }
        // broken signal arcs leaving each dish
        [[150, 165, -1], [365, 165, 1]].forEach(([x, y, s]) => {
            for (let i = 0; i < 3; i++) {
                const k = (u * 2 + i / 3) % 1;
                const r = 30 + k * 160, a = (1 - k) * env;
                ctx.strokeStyle = 'rgba(255,120,120,' + a + ')'; ctx.lineWidth = 5;
                ctx.setLineDash([14, 10]);
                ctx.beginPath(); ctx.arc(x, y, r, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke();
                ctx.setLineDash([]);
            }
        });
        return 0;
    },
    grd_surge(ctx, u) {
        // spark charges in the hand, then runs out and down, trailing a cable
        const crouch = ease(u / 0.3);
        if (u < 0.42) {
            const g = ctx.createRadialGradient(455, 270, 3, 455, 270, 20 + 50 * crouch);
            g.addColorStop(0, 'rgba(255,250,180,' + (0.9 * crouch) + ')'); g.addColorStop(1, 'rgba(255,220,60,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(455, 270, 20 + 50 * crouch, 0, 7); ctx.fill();
            return 0;
        }
        const k = ease((u - 0.42) / 0.5);
        const fade = 1 - ease((u - 0.85) / 0.15);
        const pt = (t) => [455 + 240 * t, 270 + 260 * t * t + 30 * Math.sin(t * 9)];
        ctx.strokeStyle = 'rgba(60,60,70,' + fade + ')'; ctx.lineWidth = 9;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const [x, y] = pt(k * i / 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,90,' + (0.8 * fade) + ')'; ctx.lineWidth = 3; ctx.stroke();
        const [hx, hy] = pt(k);
        const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 40);
        g.addColorStop(0, 'rgba(255,255,220,' + fade + ')'); g.addColorStop(1, 'rgba(255,210,50,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 40, 0, 7); ctx.fill();
        return u > 0.42 && u < 0.47 ? 0.15 : 0;
    },
});
// <<< poses boss_gridlock

// >>> poses boss_gust
// ---- The Gust --------------------------------------------------------------
// Corrupt Cells: the leaf pile heaves, the face puffs up and blows a spiral
//   of leaves, and blighted green cells drift down out of the swirl.
Object.assign(POSES, {
    gst_corrupt(P, u) {
        const inhale = ease(u / 0.3), blow = ease((u - 0.3) / 0.15), rest = ease((u - 0.75) / 0.25);
        const k = 1 - rest;
        const flap = Math.sin(u * Math.PI * 10);
        P.head.sc = 1 + (0.08 * inhale * (1 - blow) - 0.03 * blow) * k;
        P.head.dy = (-6 * inhale * (1 - blow) + 4 * blow) * k;
        P.head.rot = -5 * blow * k;
        P.leafL.rot = (-10 * inhale + 14 * flap * blow) * k;
        P.leafR.rot = (10 * inhale - 14 * flap * blow) * k;
        P.body.sc = 1 + 0.03 * inhale * (1 - blow) * k;
        P.body.dy = -3 * inhale * k;
    },
});
Object.assign(FX, {
    gst_corrupt(ctx, u) {
        const blow = ease((u - 0.3) / 0.15), fade = 1 - ease((u - 0.8) / 0.2);
        if (u < 0.3) return 0;
        // spiral of leaves leaving the mouth
        for (let i = 0; i < 14; i++) {
            const k = ((u - 0.3) * 1.6 + i / 14) % 1;
            const a = k * Math.PI * 3 + i, r = 30 + k * 260;
            const x = 285 + Math.cos(a) * r, y = 215 + Math.sin(a) * r * 0.6;
            const al = Math.sin(k * Math.PI) * blow * fade;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2);
            ctx.fillStyle = (i % 3 === 0 ? 'rgba(220,110,40,' : i % 3 === 1 ? 'rgba(240,180,60,' : 'rgba(170,70,30,') + al + ')';
            ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, 7); ctx.fill();
            ctx.restore();
        }
        // wind streaks
        ctx.strokeStyle = 'rgba(200,245,230,' + (0.5 * blow * fade) + ')'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            const k = ((u - 0.3) * 2 + i / 4) % 1;
            ctx.beginPath(); ctx.arc(285, 215, 60 + k * 200, -0.4 + i, 0.6 + i); ctx.stroke();
        }
        // blighted cells drift down out of the swirl
        for (let i = 0; i < 4; i++) {
            const k = ease(Math.min(1, Math.max(0, (u - 0.45 - i * 0.07) / 0.35)));
            if (k <= 0) continue;
            const x = 60 + i * 130, y = 160 + 300 * k;
            const a = fade * Math.min(1, k * 3);
            ctx.fillStyle = 'rgba(70,140,60,' + (0.55 * a) + ')'; ctx.strokeStyle = 'rgba(150,255,140,' + a + ')'; ctx.lineWidth = 3;
            ctx.fillRect(x - 22, y - 22, 44, 44); ctx.strokeRect(x - 22, y - 22, 44, 44);
            ctx.strokeStyle = 'rgba(30,60,25,' + a + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x, y + 2); ctx.lineTo(x - 4, y + 14); ctx.moveTo(x, y + 2); ctx.lineTo(x + 14, y - 6); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_gust

// >>> poses boss_hunter
// ---- The Hunter ------------------------------------------------------------
// Dormant Seekers: the draw hand pulls the string back, the bow kicks on
//   release, an arrow streaks off and three sleeping stones below wake with
//   violet flame. Fog Bank: the hunter lowers the bow and fog rolls in from
//   both sides until only the eyes glint through.
Object.assign(POSES, {
    hnt_seekers(P, u) {
        const draw = ease(u / 0.45), loose = ease((u - 0.45) / 0.06), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.drawHand.dx = (-22 * draw * (1 - loose) + 6 * loose) * k;
        P.drawHand.rot = (-3 * draw * (1 - loose) + 6 * loose) * k;
        P.bow.rot = (-2 * draw * (1 - loose) + 6 * loose * Math.cos((u - 0.45) * 40)) * k;
        P.bow.dx = 4 * loose * k * Math.max(0, 1 - (u - 0.45) * 6);
        P.body.dy = 3 * draw * (1 - loose) * k;
        P.body.rot = -1.5 * draw * (1 - loose) * k;
    },
    hnt_fog(P, u) {
        const env = ease(Math.min(u / 0.25, 1, (1 - u) / 0.25));
        P.bow.rot = 14 * env;
        P.bow.dy = 10 * env;
        P.drawHand.rot = 20 * env;
        P.drawHand.dy = 12 * env;
        P.drawHand.dx = 10 * env;
        P.body.dy = 6 * env;
        P.body.sc = 1 - 0.02 * env;
    },
});
Object.assign(FX, {
    hnt_seekers(ctx, u) {
        // the arrow streaks away on release
        const f = (u - 0.45) / 0.2;
        if (f > 0 && f < 1) {
            const x = 300 + f * 520, a = 1 - f;
            const g = ctx.createLinearGradient(x - 260, 0, x, 0);
            g.addColorStop(0, 'rgba(200,170,255,0)'); g.addColorStop(1, 'rgba(240,230,255,' + a + ')');
            ctx.strokeStyle = g; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(x - 260, 248); ctx.lineTo(x, 248); ctx.stroke();
        }
        // three dormant stones wake one after another
        [[90, 470], [256, 495], [420, 470]].forEach(([x, y], i) => {
            const w = ease((u - 0.55 - i * 0.08) / 0.15);
            const fade = 1 - ease((u - 0.85) / 0.15);
            ctx.fillStyle = 'rgba(60,60,72,0.95)'; ctx.strokeStyle = 'rgba(20,20,30,1)'; ctx.lineWidth = 3;
            ctx.globalAlpha = Math.min(1, u * 6) * fade;
            ctx.beginPath(); ctx.ellipse(x, y, 26, 18, 0, 0, 7); ctx.fill(); ctx.stroke();
            if (w > 0) {
                const g = ctx.createRadialGradient(x, y - 10, 3, x, y - 10, 60);
                g.addColorStop(0, 'rgba(210,140,255,' + (0.9 * w) + ')'); g.addColorStop(1, 'rgba(140,60,220,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 10, 60, 0, 7); ctx.fill();
                for (let j = 0; j < 3; j++) {
                    const h = 30 + 18 * Math.sin(u * 30 + j * 2 + i);
                    ctx.fillStyle = 'rgba(190,120,255,' + (0.8 * w) + ')';
                    ctx.beginPath(); ctx.moveTo(x - 14 + j * 14 - 7, y - 6); ctx.quadraticCurveTo(x - 14 + j * 14, y - 6 - h * 1.3, x - 14 + j * 14 + 7, y - 6); ctx.fill();
                }
                ctx.fillStyle = 'rgba(255,240,255,' + w + ')';
                ctx.beginPath(); ctx.arc(x - 7, y - 2, 3, 0, 7); ctx.arc(x + 7, y - 2, 3, 0, 7); ctx.fill();
            }
            ctx.globalAlpha = 1;
        });
        return 0;
    },
    hnt_fog(ctx, u) {
        const env = ease(Math.min(u / 0.3, 1, (1 - u) / 0.25));
        // fog banks roll in from both sides
        for (let i = 0; i < 9; i++) {
            const side = i % 2 ? 1 : -1;
            const x = 256 + side * (420 - 300 * env) + side * ((i * 31) % 60) + 20 * Math.sin(u * 4 + i);
            const y = 120 + (i * 47) % 360;
            const r = 90 + (i * 23) % 50;
            const g = ctx.createRadialGradient(x, y, 10, x, y, r);
            g.addColorStop(0, 'rgba(200,215,220,' + (0.75 * env) + ')'); g.addColorStop(1, 'rgba(200,215,220,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
        // the eyes glint through the fog
        const gl = env * (0.6 + 0.4 * Math.sin(u * 20));
        [[220, 222], [272, 220]].forEach(([x, y]) => {
            const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
            g.addColorStop(0, 'rgba(170,255,220,' + gl + ')'); g.addColorStop(1, 'rgba(100,220,180,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
        });
        return 0;
    },
});
// <<< poses boss_hunter


// >>> poses boss_jelly
// ---- The Jelly -------------------------------------------------------------
// Jelly Hops: the cube squashes, springs up (its shadow shrinks below),
//   lands with a splat and wobbles, the crown lagging behind. Probability
//   Shift: the cube jiggles, the eyes roll and the dice inside glow and trade
//   places along curved arrows.
Object.assign(POSES, {
    jly_hop(P, u) {
        // squash -> air -> land -> wobble
        let sx = 1, sy = 1, dy = 0;
        if (u < 0.22) { const k = ease(u / 0.22); sx = 1 + 0.12 * k; sy = 1 - 0.14 * k; }
        else if (u < 0.62) {
            const k = (u - 0.22) / 0.4, arc = Math.sin(k * Math.PI);
            dy = -95 * arc; sx = 1 - 0.06 * arc; sy = 1 + 0.08 * arc;
        } else {
            const k = (u - 0.62) / 0.38, w = Math.cos(k * Math.PI * 4) * (1 - k);
            sx = 1 + 0.14 * w; sy = 1 - 0.16 * w;
        }
        P.body.dy = dy; P.body.sx = sx; P.body.sy = sy;
        P.crown.dy = (u > 0.22 && u < 0.62 ? 14 * Math.sin((u - 0.22) / 0.4 * Math.PI) : 0);
        P.crown.rot = 8 * Math.sin(u * Math.PI * 3) * (1 - u);
        P.eyeL.sc = P.eyeR.sc = u > 0.62 && u < 0.72 ? 0.85 : 1;
    },
    jly_shift(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        const w = Math.sin(u * Math.PI * 8);
        P.body.rot = 2.5 * w * env;
        P.body.sx = 1 + 0.04 * w * env;
        P.body.sy = 1 - 0.04 * w * env;
        const roll = ease(u) * Math.PI * 4;
        P.eyeL.dx = P.eyeR.dx = 6 * Math.cos(roll) * env;
        P.eyeL.dy = P.eyeR.dy = 6 * Math.sin(roll) * env;
        P.crown.rot = -6 * w * env;
    },
});
Object.assign(FX, {
    jly_hop(ctx, u, rootDy) {
        // shadow stays on the ground and shrinks while the cube is up
        const air = Math.min(1, -rootDy / 95);
        ctx.fillStyle = 'rgba(20,40,30,' + (0.35 - 0.15 * air) + ')';
        ctx.beginPath(); ctx.ellipse(256, 500, 220 - 90 * air, 22 - 8 * air, 0, 0, 7); ctx.fill();
        // landing splat droplets
        if (u > 0.6) {
            const k = (u - 0.6) / 0.4;
            for (let i = 0; i < 8; i++) {
                const side = i % 2 ? 1 : -1, s = 1 + (i >> 1) * 0.5;
                const x = 256 + side * (200 + 120 * k * s), y = 480 - 90 * Math.sin(k * Math.PI) * (1.2 - (i >> 1) * 0.2);
                ctx.fillStyle = 'rgba(140,230,130,' + (0.9 * (1 - k)) + ')';
                ctx.beginPath(); ctx.arc(x, y, 9 - (i >> 1), 0, 7); ctx.fill();
            }
        }
        return 0;
    },
    jly_shift(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        const dice = [[200, 170], [400, 210], [128, 352], [268, 375]];
        dice.forEach(([x, y]) => {
            const g = ctx.createRadialGradient(x, y, 4, x, y, 60);
            g.addColorStop(0, 'rgba(255,230,120,' + (0.7 * env) + ')'); g.addColorStop(1, 'rgba(255,200,60,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill();
        });
        // swap arrows: 0 <-> 3 and 1 <-> 2
        const k = ease((u - 0.2) / 0.6);
        [[0, 3], [1, 2]].forEach(([a, b]) => {
            const [x1, y1] = dice[a], [x2, y2] = dice[b];
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.3, my = (y1 + y2) / 2 - (x2 - x1) * 0.3;
            ctx.strokeStyle = 'rgba(255,245,190,' + (0.9 * env) + ')'; ctx.lineWidth = 5;
            ctx.setLineDash([16, 10]); ctx.lineDashOffset = -u * 120;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
            ctx.setLineDash([]);
            // a spark rides each arrow
            const t = k, ix = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, iy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
            ctx.fillStyle = 'rgba(255,255,230,' + env + ')';
            ctx.beginPath(); ctx.arc(ix, iy, 9, 0, 7); ctx.fill();
        });
        return 0;
    },
});
// <<< poses boss_jelly


// >>> poses boss_jester
// ---- The Jester ------------------------------------------------------------
// Bouncing Mayhem: the hands toss and the five juggling balls hop one slot
//   round the circle, bouncing off with impact stars. Clue Swap: the hands
//   cross and two number cards trade places overhead. Card Toss: the right
//   hand flicks a fan of cards that spin out and stick. Juggler's Jinx: the
//   balls orbit the head, glowing gold and purple in turn.
const JST_BALLS = ['ballA', 'ballB', 'ballC', 'ballD', 'ballE'];
const JST_HOME = [[73, 183], [104, 77], [425, 92], [458, 161], [455, 284]];
Object.assign(POSES, {
    jst_mayhem(P, u) {
        const toss = Math.sin(u * Math.PI * 6);
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        P.armUL.rot = -14 * toss * env;
        P.armUR.rot = 14 * toss * env;
        P.body.dy = 3 * Math.abs(toss) * env;
        // each ball hops to the next slot and back again
        JST_BALLS.forEach((n, i) => {
            const k = Math.sin(Math.min(1, Math.max(0, (u - 0.05 - i * 0.06) / 0.6)) * Math.PI);
            const [x1, y1] = JST_HOME[i], [x2, y2] = JST_HOME[(i + 1) % 5];
            P[n].dx = (x2 - x1) * k;
            P[n].dy = (y2 - y1) * k - 70 * Math.sin(k * Math.PI);
            P[n].rot = 360 * k;
        });
    },
    jst_swap(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        P.armUL.rot = 22 * env;
        P.armUL.dx = 18 * env;
        P.armUR.rot = -22 * env;
        P.armUR.dx = -18 * env;
        P.body.rot = 2 * Math.sin(u * Math.PI * 4) * env;
        JST_BALLS.forEach((n, i) => { P[n].dy = -6 * Math.sin(u * 20 + i) * env; });
    },
    jst_cards(P, u) {
        const wind = ease(u / 0.3), flick = ease((u - 0.3) / 0.08), rest = ease((u - 0.65) / 0.35);
        const k = 1 - rest;
        P.armUR.rot = (20 * wind * (1 - flick) - 30 * flick) * k;
        P.armUR.dy = (8 * wind * (1 - flick) - 10 * flick) * k;
        P.armUL.rot = -8 * wind * k;
        P.body.rot = (2 * wind - 4 * flick) * k;
        JST_BALLS.forEach((n, i) => { P[n].dy = -10 * Math.abs(Math.sin(u * 12 + i)) * k; });
    },
    jst_jinx(P, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        P.armUL.rot = -10 * env;
        P.armUR.rot = 10 * env;
        P.body.dy = -4 * env;
        // balls leave their slots and orbit the head on an ellipse
        JST_BALLS.forEach((n, i) => {
            const a = i * Math.PI * 2 / 5 + u * Math.PI * 4;
            const [hx, hy] = JST_HOME[i];
            const ox = 256 + Math.cos(a) * 215, oy = 170 + Math.sin(a) * 110;
            P[n].dx = (ox - hx) * env;
            P[n].dy = (oy - hy) * env;
        });
    },
});
Object.assign(FX, {
    jst_mayhem(ctx, u) {
        // impact stars where the balls land
        JST_HOME.forEach(([x, y], i) => {
            const t = (u - 0.05 - ((i + 4) % 5) * 0.06) / 0.6;
            const k = 1 - Math.abs(t - 0.5) * 12;
            if (k <= 0) return;
            ctx.strokeStyle = 'rgba(255,230,120,' + k + ')'; ctx.lineWidth = 4;
            for (let s = 0; s < 6; s++) {
                const a = s * Math.PI / 3, r1 = 34, r2 = 34 + 22 * k;
                ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke();
            }
        });
        // motion arcs
        const env = ease(Math.min(u / 0.1, 1, (1 - u) / 0.15));
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * env) + ')'; ctx.lineWidth = 6;
        ctx.setLineDash([20, 18]); ctx.lineDashOffset = -u * 400;
        ctx.beginPath(); ctx.ellipse(256, 170, 230, 150, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        return 0;
    },
    jst_swap(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.25));
        const k = ease((u - 0.2) / 0.55);
        const card = (x, y, label, tilt) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
            ctx.fillStyle = 'rgba(250,245,230,' + env + ')'; ctx.strokeStyle = 'rgba(120,40,140,' + env + ')'; ctx.lineWidth = 4;
            ctx.fillRect(-26, -36, 52, 72); ctx.strokeRect(-26, -36, 52, 72);
            ctx.fillStyle = 'rgba(160,30,60,' + env + ')'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, 2); ctx.restore();
        };
        const a = [150, -10], b = [362, -10];
        const lift = 70 * Math.sin(k * Math.PI);
        card(a[0] + (b[0] - a[0]) * k, a[1] - lift, '3', -0.3 + 0.6 * k);
        card(b[0] + (a[0] - b[0]) * k, b[1] + lift, '7', 0.3 - 0.6 * k);
        return 0;
    },
    jst_cards(ctx, u) {
        if (u < 0.32) return 0;
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 5; i++) {
            const k = ease(Math.min(1, Math.max(0, (u - 0.32 - i * 0.04) / 0.38)));
            if (k <= 0) continue;
            const tx = -60 + i * 150, ty = 520 - (i % 2) * 30;
            const x = 440 + (tx - 440) * k, y = 210 + (ty - 210) * k - 160 * Math.sin(k * Math.PI);
            ctx.save(); ctx.translate(x, y); ctx.rotate(k < 1 ? k * 12 + i : 0.2 * (i - 2));
            ctx.fillStyle = 'rgba(250,245,230,' + fade + ')'; ctx.strokeStyle = 'rgba(40,30,60,' + fade + ')'; ctx.lineWidth = 3;
            ctx.fillRect(-18, -26, 36, 52); ctx.strokeRect(-18, -26, 36, 52);
            ctx.fillStyle = (i % 2 ? 'rgba(200,30,50,' : 'rgba(90,40,150,') + fade + ')';
            ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(['♠', '♥', '♣', '♦', '♠'][i], 0, 1);
            ctx.restore();
            if (k >= 1) {
                ctx.strokeStyle = 'rgba(255,220,120,' + (0.6 * fade) + ')'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(tx, ty + 30, 30, 8, 0, 0, 7); ctx.stroke();
            }
        }
        return 0;
    },
    jst_jinx(ctx, u) {
        const env = ease(Math.min(u / 0.2, 1, (1 - u) / 0.2));
        // each orbiting ball glows gold or purple in turn
        JST_HOME.forEach((h, i) => {
            const a = i * Math.PI * 2 / 5 + u * Math.PI * 4;
            const x = h[0] + (256 + Math.cos(a) * 215 - h[0]) * env, y = h[1] + (170 + Math.sin(a) * 110 - h[1]) * env;
            const gold = (i + Math.floor(u * 6)) % 2 === 0;
            const g = ctx.createRadialGradient(x, y, 10, x, y, 60);
            g.addColorStop(0, (gold ? 'rgba(255,215,80,' : 'rgba(180,80,255,') + (0.7 * env) + ')');
            g.addColorStop(1, gold ? 'rgba(255,190,40,0)' : 'rgba(120,40,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill();
        });
        return 0;
    },
});
// <<< poses boss_jester

// >>> poses boss_inferno
// ---- The Inferno -----------------------------------------------------------
// Magma Tides: both arms heave up and smash down, the crater spurts and a
//   lava flood rises from below. Prior Bomb: the right fist glows and lobs
//   fused lava bombs. Pyroclastic Surge: the golem leans in, shoves, and a
//   wall of fire with gaps sweeps across. Eruption Vents: the crater blows,
//   three vents glow on the ground and jet lava upward.
Object.assign(POSES, {
    inf_tides(P, u) {
        const lift = ease(u / 0.35), slam = ease((u - 0.35) / 0.1), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.armL.rot = (24 * lift * (1 - slam) - 6 * slam) * k;
        P.armL.dy = (-16 * lift * (1 - slam) + 6 * slam) * k;
        P.fistR.rot = (-26 * lift * (1 - slam) + 8 * slam) * k;
        P.fistR.dy = (-18 * lift * (1 - slam) + 8 * slam) * k;
        P.body.dy = (-6 * lift * (1 - slam) + 6 * slam) * k;
        P.crown.dy = -8 * slam * k;
        P.crown.sc = 1 + 0.06 * slam * k;
    },
    inf_bomb(P, u) {
        const wind = ease(u / 0.35), toss = ease((u - 0.35) / 0.1), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.fistR.rot = (16 * wind * (1 - toss) - 30 * toss) * k;
        P.fistR.dy = (8 * wind * (1 - toss) - 16 * toss) * k;
        P.armL.rot = 6 * wind * k;
        P.body.rot = (2 * wind - 3 * toss) * k;
        P.crown.dy = -3 * Math.abs(Math.sin(u * 20)) * wind * k;
    },
    inf_surge(P, u) {
        const lean = ease(u / 0.3), shove = ease((u - 0.3) / 0.12), rest = ease((u - 0.75) / 0.25);
        const k = 1 - rest;
        P.body.rot = (-3 * lean + 6 * shove) * k;
        P.body.dx = (-8 * lean + 16 * shove) * k;
        P.fistR.dx = 20 * shove * k;
        P.fistR.rot = -10 * shove * k;
        P.armL.rot = (-14 * lean + 10 * shove) * k;
        P.crown.rot = 4 * shove * k;
    },
    inf_vents(P, u) {
        const build = ease(u / 0.35), blow = ease((u - 0.35) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        const j = Math.sin(u * 70) * build * (1 - blow);
        P.crown.dy = (-4 * build - 18 * blow) * k;
        P.crown.sc = 1 + 0.08 * blow * k;
        P.crown.dx = 2 * j;
        P.body.dx = 1.5 * j;
        P.body.dy = 4 * build * (1 - blow) * k;
        P.armL.rot = 8 * blow * k;
        P.fistR.rot = -8 * blow * k;
    },
});
// a soft lava blob (shared by the Inferno effects)
function _infBlob(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(255,240,150,' + a + ')'); g.addColorStop(0.5, 'rgba(255,140,30,' + a + ')'); g.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
Object.assign(FX, {
    inf_tides(ctx, u) {
        const slam = ease((u - 0.35) / 0.1), fade = 1 - ease((u - 0.82) / 0.18);
        // crater spurts on the slam
        if (u > 0.35) for (let i = 0; i < 6; i++) {
            const k = Math.min(1, (u - 0.35) / 0.45);
            const x = 250 + (i - 2.5) * 30 * k, y = 80 - 120 * Math.sin(k * Math.PI) * (0.6 + (i % 3) * 0.2);
            _infBlob(ctx, x, y, 16, fade);
        }
        // a glowing lava wave rises around the feet and fades out below
        if (u > 0.4) {
            const h = 90 * ease((u - 0.4) / 0.35);
            const top = 500 - h, wave = (x) => top + 10 * Math.sin(x / 40 + u * 18);
            const g = ctx.createLinearGradient(0, top - 10, 0, top + 80);
            g.addColorStop(0, 'rgba(255,150,30,' + (0.55 * fade) + ')'); g.addColorStop(1, 'rgba(255,80,10,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(-40, top + 80);
            for (let x = -40; x <= 552; x += 16) ctx.lineTo(x, wave(x));
            ctx.lineTo(552, top + 80); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,230,120,' + fade + ')'; ctx.lineWidth = 5;
            ctx.beginPath();
            for (let x = -40; x <= 552; x += 16) x === -40 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x));
            ctx.stroke();
            for (let i = 0; i < 5; i++) _infBlob(ctx, 20 + i * 115, top + 25 + 8 * Math.sin(u * 25 + i), 12, 0.8 * fade);
        }
        return u > 0.35 && u < 0.41 ? 0.18 * slam : 0;
    },
    inf_bomb(ctx, u) {
        const wind = ease(u / 0.35);
        if (u < 0.4) { _infBlob(ctx, 440, 270, 20 + 40 * wind, 0.9 * wind); return 0; }
        const fade = 1 - ease((u - 0.85) / 0.15);
        [[100, 470], [260, 500], [420, 460]].forEach(([tx, ty], i) => {
            const k = ease(Math.min(1, Math.max(0, (u - 0.4 - i * 0.05) / 0.35)));
            if (k <= 0) return;
            const x = 440 + (tx - 440) * k, y = 270 + (ty - 270) * k - 220 * Math.sin(k * Math.PI);
            ctx.fillStyle = 'rgba(40,28,24,' + fade + ')'; ctx.strokeStyle = 'rgba(255,140,40,' + fade + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.stroke();
            // fuse spark
            ctx.fillStyle = 'rgba(255,240,140,' + fade * (0.6 + 0.4 * Math.sin(u * 60 + i)) + ')';
            ctx.beginPath(); ctx.arc(x + 10, y - 16, 6, 0, 7); ctx.fill();
            // ticking ring once landed
            if (k >= 1) {
                const r = 24 + 10 * Math.sin(u * 40);
                ctx.strokeStyle = 'rgba(255,90,40,' + (0.8 * fade) + ')'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
            }
        });
        return 0;
    },
    inf_surge(ctx, u) {
        if (u < 0.3) return 0;
        const k = ease((u - 0.3) / 0.55), fade = 1 - ease((u - 0.85) / 0.15);
        const x = -160 + k * 880;
        // flame columns along a vertical front, with two gaps
        for (let i = 0; i < 12; i++) {
            if (i === 3 || i === 8) continue;
            const y = -40 + i * 50;
            const h = 70 + 25 * Math.sin(u * 30 + i * 1.7);
            const g = ctx.createLinearGradient(x - h, 0, x + 20, 0);
            g.addColorStop(0, 'rgba(200,40,0,0)'); g.addColorStop(0.6, 'rgba(255,120,20,' + (0.75 * fade) + ')'); g.addColorStop(1, 'rgba(255,240,160,' + (0.9 * fade) + ')');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(x - h / 2, y, h / 2 + 10, 26, 0, 0, 7); ctx.fill();
        }
        return 0;
    },
    inf_vents(ctx, u) {
        const build = ease(u / 0.35), fade = 1 - ease((u - 0.8) / 0.2);
        // smoke column from the crater
        for (let i = 0; i < 5; i++) {
            const k = (u * 1.5 + i / 5) % 1;
            ctx.fillStyle = 'rgba(80,70,70,' + (0.45 * (1 - k) * fade) + ')';
            ctx.beginPath(); ctx.arc(255 + 20 * Math.sin(i + u * 3), 70 - k * 200, 25 + k * 40, 0, 7); ctx.fill();
        }
        [[80, 480], [256, 505], [430, 480]].forEach(([x, y], i) => {
            // vent glows on the ground while it builds
            ctx.fillStyle = 'rgba(255,120,30,' + (0.7 * build * fade) + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 36, 12, 0, 0, 7); ctx.fill();
            // then jets lava upward
            const j = ease((u - 0.38 - i * 0.06) / 0.12) * fade;
            if (j > 0) {
                const h = 260 * j;
                const g = ctx.createLinearGradient(0, y - h, 0, y);
                g.addColorStop(0, 'rgba(255,240,160,0)'); g.addColorStop(0.3, 'rgba(255,160,40,' + (0.85 * j) + ')'); g.addColorStop(1, 'rgba(255,90,10,' + j + ')');
                ctx.fillStyle = g; ctx.fillRect(x - 18, y - h, 36, h);
                _infBlob(ctx, x, y - h, 26, j);
            }
        });
        return u > 0.35 && u < 0.4 ? 0.15 : 0;
    },
});
// <<< poses boss_inferno

// >>> poses boss_juggernaut
// ---- The Juggernaut --------------------------------------------------------
// Bull Barrage: the engine rears back, then lunges forward on its rails with
//   steam blasting from the stack and speed lines. Thwomp Trio: both fists
//   rise and pound down as three stone blocks drop from above. Prior Bomb:
//   the right fist winds up and lobs fused bombs.
Object.assign(POSES, {
    jug_charge(P, u) {
        const rear = ease(u / 0.35), lunge = ease((u - 0.35) / 0.12), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.body.dx = (-14 * rear * (1 - lunge) + 30 * lunge) * k;
        P.body.rot = (-3 * rear * (1 - lunge) + 4 * lunge) * k;
        P.head.rot = 5 * lunge * k;
        P.fistL.rot = (12 * rear - 20 * lunge) * k;
        P.fistR.rot = (-12 * rear + 20 * lunge) * k;
    },
    jug_thwomp(P, u) {
        const lift = ease(u / 0.35), slam = ease((u - 0.35) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.fistL.rot = (30 * lift * (1 - slam) - 8 * slam) * k;
        P.fistL.dy = (-26 * lift * (1 - slam) + 10 * slam) * k;
        P.fistR.rot = (-30 * lift * (1 - slam) + 8 * slam) * k;
        P.fistR.dy = (-26 * lift * (1 - slam) + 10 * slam) * k;
        P.body.dy = (-6 * lift * (1 - slam) + 8 * slam) * k;
        P.head.dy = 4 * slam * k;
    },
    jug_bomb(P, u) {
        const wind = ease(u / 0.35), toss = ease((u - 0.35) / 0.1), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.fistR.rot = (18 * wind * (1 - toss) - 34 * toss) * k;
        P.fistR.dy = (10 * wind * (1 - toss) - 18 * toss) * k;
        P.body.rot = (2 * wind - 3 * toss) * k;
        P.head.rot = -3 * toss * k;
    },
});
Object.assign(FX, {
    jug_charge(ctx, u) {
        const lunge = ease((u - 0.35) / 0.12), fade = 1 - ease((u - 0.75) / 0.25);
        // steam puffs from the stack
        for (let i = 0; i < 6; i++) {
            const k = (u * 2 + i / 6) % 1;
            _cueGlow(ctx, 230 - k * 120, 70 - k * 90, 30 + k * 50, '150,240,240', 0.6 * (1 - k) * fade);
        }
        // speed lines behind the lunge
        if (u > 0.35) {
            ctx.strokeStyle = 'rgba(230,250,255,' + (0.8 * lunge * fade) + ')'; ctx.lineWidth = 5;
            for (let i = 0; i < 6; i++) {
                const y = 170 + i * 50, x = -40 - ((u * 900 + i * 70) % 160);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y); ctx.stroke();
            }
        }
        return u > 0.35 && u < 0.4 ? 0.12 : 0;
    },
    jug_thwomp(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        // three blocks fall and land on the slam
        [[90, 470], [256, 500], [420, 470]].forEach(([x, y], i) => {
            const k = ease(Math.min(1, Math.max(0, (u - 0.15 - i * 0.05) / 0.25)));
            if (k <= 0) return;
            const by = -150 + (y + 150) * k;
            ctx.fillStyle = 'rgba(110,110,120,' + fade + ')'; ctx.strokeStyle = 'rgba(30,30,40,' + fade + ')'; ctx.lineWidth = 4;
            ctx.fillRect(x - 32, by - 32, 64, 64); ctx.strokeRect(x - 32, by - 32, 64, 64);
            ctx.fillStyle = 'rgba(120,240,240,' + fade + ')';
            ctx.fillRect(x - 16, by - 12, 8, 8); ctx.fillRect(x + 8, by - 12, 8, 8);
            if (k >= 1) {
                const d = Math.min(1, (u - 0.4 - i * 0.05) / 0.3);
                ctx.strokeStyle = 'rgba(230,220,200,' + (0.7 * (1 - d) * fade) + ')'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.ellipse(x, y + 32, 40 + 50 * d, 10 + 8 * d, 0, 0, 7); ctx.stroke();
            }
        });
        return u > 0.35 && u < 0.4 ? 0.14 : 0;
    },
    jug_bomb(ctx, u) { _cueBombs(ctx, u, [440, 290], '120,240,240'); return 0; },
});
// <<< poses boss_juggernaut

// >>> poses boss_kraken
// ---- The Kraken ------------------------------------------------------------
// Tentacle Sweep: the tentacles coil back and lash across, leaving a curved
//   water slash over the board. Fog Bank: the kraken puffs up and squirts
//   ink clouds that spread out to both sides.
Object.assign(POSES, {
    krk_sweep(P, u) {
        const coil = ease(u / 0.35), lash = ease((u - 0.35) / 0.15), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        const s = 18 * coil * (1 - lash) - 26 * lash;
        P.tentL.rot = s * k; P.tentUL.rot = 0.7 * s * k;
        P.tentR.rot = -s * k; P.tentUR.rot = -0.7 * s * k;
        P.head.rot = (-3 * coil + 5 * lash) * k;
        P.body.dy = (4 * coil - 6 * lash) * k;
    },
    krk_ink(P, u) {
        const env = envOf(u, 0.25, 0.25), w = Math.sin(u * Math.PI * 6);
        P.head.sc = 1 + 0.06 * env;
        P.head.dy = -6 * env;
        P.tentL.rot = 8 * w * env; P.tentR.rot = -8 * w * env;
        P.tentUL.rot = -6 * w * env; P.tentUR.rot = 6 * w * env;
    },
});
Object.assign(FX, {
    krk_sweep(ctx, u) {
        if (u < 0.35) return 0;
        const k = ease((u - 0.35) / 0.4), fade = 1 - ease((u - 0.75) / 0.25);
        ctx.strokeStyle = 'rgba(150,230,220,' + (0.85 * fade) + ')'; ctx.lineWidth = 16 * fade + 2;
        ctx.beginPath(); ctx.arc(256, 120, 360, Math.PI * (0.95 - 0.8 * k), Math.PI * 0.95); ctx.stroke();
        ctx.strokeStyle = 'rgba(240,255,255,' + fade + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(256, 120, 360, Math.PI * (0.95 - 0.8 * k), Math.PI * 0.95); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = Math.PI * (0.95 - 0.8 * k * (i / 8));
            _cueGlow(ctx, 256 + Math.cos(a) * 360, 120 + Math.sin(a) * 360, 16, '200,250,255', 0.8 * fade);
        }
        return 0;
    },
    krk_ink(ctx, u) {
        _cueGlow(ctx, 256, 330, 50, '40,30,70', 0.8 * envOf(u, 0.2, 0.6));
        _cueFog(ctx, u, '45,40,80');
        return 0;
    },
});
// <<< poses boss_kraken

// >>> poses boss_leviathan
// ---- The Leviathan ---------------------------------------------------------
// Rising Tide: the whale lifts its tail and slaps down, the blowhole sprays
//   and a band of water rises around it. Corrupt Cells: it bucks and spouts
//   tainted cells from the blowhole.
Object.assign(POSES, {
    lev_tide(P, u) {
        const lift = ease(u / 0.35), slap = ease((u - 0.35) / 0.1), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.tail.rot = (-22 * lift * (1 - slap) + 12 * slap) * k;
        P.finF.rot = (-14 * lift + 10 * slap) * k;
        P.body.rot = (2 * lift - 3 * slap) * k;
        P.body.dy = (-8 * lift * (1 - slap) + 6 * slap) * k;
    },
    lev_corrupt(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 6);
        P.body.rot = -3 * env * Math.abs(w);
        P.body.dy = -5 * env * Math.abs(w);
        P.tail.rot = 10 * w * env;
        P.finF.rot = -8 * w * env;
    },
});
Object.assign(FX, {
    lev_tide(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        // spout spray from the blowhole
        if (u > 0.35) for (let i = 0; i < 8; i++) {
            const k = Math.min(1, (u - 0.35) / 0.4);
            const x = 172 + (i - 3.5) * 14 * k, y = 145 - 140 * Math.sin(k * Math.PI) * (0.6 + (i % 3) * 0.2);
            _cueGlow(ctx, x, y, 14, '180,230,255', 0.9 * fade);
        }
        // the tide band rises around the body
        if (u > 0.4) {
            const top = 460 - 70 * ease((u - 0.4) / 0.35), wave = (x) => top + 9 * Math.sin(x / 35 + u * 16);
            const g = ctx.createLinearGradient(0, top - 10, 0, top + 80);
            g.addColorStop(0, 'rgba(80,170,230,' + (0.55 * fade) + ')'); g.addColorStop(1, 'rgba(40,110,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-30, top + 80);
            for (let x = -30; x <= 542; x += 16) ctx.lineTo(x, wave(x));
            ctx.lineTo(542, top + 80); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(220,245,255,' + fade + ')'; ctx.lineWidth = 4; ctx.beginPath();
            for (let x = -30; x <= 542; x += 16) x === -30 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x));
            ctx.stroke();
        }
        return u > 0.35 && u < 0.4 ? 0.12 : 0;
    },
    lev_corrupt(ctx, u) { _cueCorrupt(ctx, u, [172, 140], '240,160,90'); return 0; },
});
// <<< poses boss_leviathan

// >>> poses boss_lodestone
// ---- The Lodestone ---------------------------------------------------------
// Polarity Field: the magnets raise, one glows red and one blue, field arcs
//   pulse between them and then the colours flip. Probability Shift: the
//   golem drags its magnets and marks hop between cells.
Object.assign(POSES, {
    lod_polarity(P, u) {
        const env = envOf(u, 0.2, 0.2), w = Math.sin(u * Math.PI * 8);
        P.magL.rot = (-20 + 4 * w) * env; P.magL.dy = -12 * env;
        P.magR.rot = (20 - 4 * w) * env; P.magR.dy = -12 * env;
        P.head.dy = -4 * env;
        P.body.dy = 2 * Math.abs(w) * env;
    },
    lod_shift(P, u) {
        const env = envOf(u, 0.25, 0.25), s = Math.sin(u * Math.PI * 2);
        P.magL.dx = -10 * s * env; P.magR.dx = -10 * s * env;
        P.magL.rot = 10 * s * env; P.magR.rot = 10 * s * env;
        P.body.rot = -2 * s * env;
        P.head.rot = -4 * s * env;
    },
});
Object.assign(FX, {
    lod_polarity(ctx, u) {
        const env = envOf(u, 0.2, 0.2), flip = u > 0.55;
        const red = '255,90,80', blue = '90,170,255';
        _cueGlow(ctx, 120, 290, 70, flip ? blue : red, 0.75 * env);
        _cueGlow(ctx, 410, 290, 70, flip ? red : blue, 0.75 * env);
        // field arcs between the two poles, flowing
        for (let i = 0; i < 4; i++) {
            const h = 70 + i * 55;
            ctx.strokeStyle = 'rgba(200,255,250,' + (0.6 * env) + ')'; ctx.lineWidth = 3;
            ctx.setLineDash([12, 12]); ctx.lineDashOffset = (flip ? 1 : -1) * u * 300;
            ctx.beginPath(); ctx.moveTo(120, 290); ctx.bezierCurveTo(150, 290 + (i % 2 ? h : -h), 380, 290 + (i % 2 ? h : -h), 410, 290); ctx.stroke();
        }
        ctx.setLineDash([]);
        if (u > 0.53 && u < 0.6) _cueGlow(ctx, 265, 290, 200, '255,255,255', 0.5);
        return 0;
    },
    lod_shift(ctx, u) { _cueShift(ctx, u, '120,235,220'); return 0; },
});
// <<< poses boss_lodestone

// >>> poses boss_maelstrom
// ---- The Maelstrom ---------------------------------------------------------
// Vortex Nova: the funnel sways faster and faster, the chalkboard and books
//   whirl, then a ring of wind bursts outward. Corrupt Cells: the funnel
//   tilts and spits tainted cells out of its swirl.
Object.assign(POSES, {
    mae_nova(P, u) {
        const spin = ease(u / 0.6), burst = ease((u - 0.6) / 0.1), rest = ease((u - 0.75) / 0.25);
        const k = 1 - rest, w = Math.sin(u * u * 70);
        P.funnel.rot = 6 * w * spin * (1 - burst) * k;
        P.funnel.sc = 1 + 0.08 * burst * k;
        P.body.rot = 3 * w * spin * (1 - burst) * k;
        P.board.rot = 20 * w * spin * k; P.board.dy = -20 * spin * k;
        P.books.rot = -20 * w * spin * k; P.books.dy = -20 * spin * k;
    },
    mae_corrupt(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 8);
        P.funnel.rot = (-6 + 3 * w) * env;
        P.body.rot = 2 * w * env;
        P.board.rot = 8 * w * env;
        P.books.rot = -8 * w * env;
    },
});
Object.assign(FX, {
    mae_nova(ctx, u) {
        const spin = ease(u / 0.6), fade = 1 - ease((u - 0.8) / 0.2);
        // wind streaks circling the funnel
        ctx.strokeStyle = 'rgba(200,245,240,' + (0.6 * spin * fade) + ')'; ctx.lineWidth = 5;
        for (let i = 0; i < 5; i++) {
            const a = u * u * 40 + i * 1.3;
            ctx.beginPath(); ctx.ellipse(290, 260, 190 + i * 12, 70 + i * 10, 0, a, a + 1); ctx.stroke();
        }
        // the nova ring
        if (u > 0.6) {
            const r = (u - 0.6) / 0.4;
            ctx.strokeStyle = 'rgba(160,240,230,' + (1 - r) + ')'; ctx.lineWidth = 18 * (1 - r) + 3;
            ctx.beginPath(); ctx.arc(290, 260, 60 + r * 420, 0, 7); ctx.stroke();
        }
        return u > 0.6 && u < 0.65 ? 0.15 : 0;
    },
    mae_corrupt(ctx, u) { _cueCorrupt(ctx, u, [290, 210], '90,210,190'); return 0; },
});
// <<< poses boss_maelstrom


// >>> poses boss_marksman
// ---- The Marksman ----------------------------------------------------------
// Marked Strikes: he squints down the barrel, three crosshairs lock onto
//   cells, then the rifle fires three times with recoil and muzzle flashes.
// Probability Shift: he tips the rifle up and spins it, marks hop cells.
Object.assign(POSES, {
    mrk_strikes(P, u) {
        const aim = ease(u / 0.3), rest = ease((u - 0.85) / 0.15);
        let kick = 0;
        for (let i = 0; i < 3; i++) { const t = (u - 0.4 - i * 0.14) / 0.1; if (t > 0 && t < 1) kick = Math.max(kick, 1 - t); }
        P.rifle.rot = (-2 * aim - 8 * kick) * (1 - rest);
        P.rifle.dx = -10 * kick;
        P.head.rot = 3 * aim * (1 - rest) - 2 * kick;
        P.body.dx = -4 * kick;
    },
    mrk_shift(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.rifle.rot = -28 * env;
        P.rifle.dy = -6 * env;
        P.head.rot = -4 * env;
        P.body.dy = 2 * env;
    },
});
Object.assign(FX, {
    mrk_strikes(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        [[120, 470], [300, 500], [440, 455]].forEach(([x, y], i) => {
            const lock = ease((u - 0.1 - i * 0.08) / 0.2);
            const r = 70 - 40 * lock, a = lock * fade;
            ctx.strokeStyle = 'rgba(255,90,70,' + a + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - r - 10, y); ctx.lineTo(x + r + 10, y); ctx.moveTo(x, y - r - 10); ctx.lineTo(x, y + r + 10); ctx.stroke();
            // the shot lands
            const t = (u - 0.4 - i * 0.14) / 0.12;
            if (t > 0 && t < 1) _cueGlow(ctx, x, y, 50, '255,220,140', 1 - t);
        });
        // muzzle flashes
        for (let i = 0; i < 3; i++) {
            const t = (u - 0.4 - i * 0.14) / 0.08;
            if (t > 0 && t < 1) { _cueGlow(ctx, 505, 222, 55, '255,230,150', 1 - t); _cueGlow(ctx, 505, 222, 20, '255,255,255', 1 - t); }
        }
        return 0;
    },
    mrk_shift(ctx, u) { _cueShift(ctx, u, '255,200,120'); return 0; },
});
// <<< poses boss_marksman


// >>> poses boss_medusa
// ---- The Medusa ------------------------------------------------------------
// Stone Gaze: the snakes rear back, the eyes flare green and twin beams
//   sweep forward turning the ground to stone. Snake Strikes: the snake
//   heads lunge out one after another with hiss marks. Petrify Waves: grey
//   rings ripple out from her gaze. Coil Cage: the snakes writhe and a ring
//   of coils closes around the board.
const MED_L = ['snL1', 'snL2', 'snL3', 'snL4'], MED_R = ['snR1', 'snR2', 'snR3', 'snR4'];
// Pose helper: every snake head gets an angle from f(index, side).
function _medSnakes(P, f) {
    MED_L.forEach((n, i) => { P[n].rot = f(i, -1); });
    MED_R.forEach((n, i) => { P[n].rot = f(i, 1); });
}
Object.assign(POSES, {
    med_gaze(P, u) {
        const env = envOf(u, 0.25, 0.25);
        _medSnakes(P, (i, s) => -s * 12 * env + 4 * Math.sin(u * 20 + i) * env);
        P.body.dy = -3 * env;
    },
    med_strikes(P, u) {
        _medSnakes(P, (i, s) => {
            const t = (u - 0.1 - (i * 2 + (s > 0 ? 1 : 0)) * 0.08) / 0.18;
            if (t <= 0 || t >= 1) return 0;
            return s * (t < 0.4 ? -14 * ease(t / 0.4) : 24 * Math.sin((t - 0.4) / 0.6 * Math.PI));
        });
        MED_L.concat(MED_R).forEach((n, j) => {
            const s = j < 4 ? -1 : 1, i = j % 4;
            const t = (u - 0.1 - (i * 2 + (s > 0 ? 1 : 0)) * 0.08) / 0.18;
            P[n].dx = t > 0.4 && t < 1 ? s * 18 * Math.sin((t - 0.4) / 0.6 * Math.PI) : 0;
        });
    },
    med_petrify(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 4);
        _medSnakes(P, (i, s) => s * 8 * w * env);
        P.body.sc = 1 + 0.02 * env;
    },
    med_cage(P, u) {
        const env = envOf(u, 0.2, 0.25);
        _medSnakes(P, (i, s) => 14 * Math.sin(u * Math.PI * 6 + i + (s > 0 ? 1.5 : 0)) * env);
        P.body.dy = -4 * env;
    },
});
Object.assign(FX, {
    med_gaze(ctx, u) {
        const flare = ease((u - 0.2) / 0.2), fade = 1 - ease((u - 0.8) / 0.2);
        _cueGlow(ctx, 258, 215, 40, '200,255,120', flare * fade);
        _cueGlow(ctx, 325, 215, 40, '200,255,120', flare * fade);
        if (u > 0.4) {
            const k = ease((u - 0.4) / 0.4);
            [258, 325].forEach((x) => {
                const g = ctx.createLinearGradient(x, 215, x + (x - 290) * 2, 520);
                g.addColorStop(0, 'rgba(210,255,140,' + (0.9 * fade) + ')'); g.addColorStop(1, 'rgba(160,220,100,0)');
                ctx.strokeStyle = g; ctx.lineWidth = 14;
                ctx.beginPath(); ctx.moveTo(x, 215); ctx.lineTo(x + (x - 290) * 2 * k, 215 + 300 * k); ctx.stroke();
            });
            // stone creeping over the ground
            ctx.fillStyle = 'rgba(150,150,150,' + (0.5 * k * fade) + ')';
            ctx.beginPath(); ctx.ellipse(290, 515, 220 * k, 22 * k, 0, 0, 7); ctx.fill();
        }
        return 0;
    },
    med_strikes(ctx, u) {
        // a hiss streak in front of each snake as it lunges
        const heads = [[95, 75, -1], [72, 140, -1], [62, 200, -1], [92, 258, -1], [448, 66, 1], [453, 160, 1], [448, 236, 1], [428, 288, 1]];
        heads.forEach(([x, y, s], j) => {
            const i = j % 4;
            const t = (u - 0.1 - (i * 2 + (s > 0 ? 1 : 0)) * 0.08) / 0.18;
            if (t < 0.4 || t > 1) return;
            const a = Math.sin((t - 0.4) / 0.6 * Math.PI);
            ctx.strokeStyle = 'rgba(200,255,150,' + a + ')'; ctx.lineWidth = 4;
            for (let k = 0; k < 3; k++) {
                ctx.beginPath(); ctx.moveTo(x + s * 10, y - 10 + k * 10); ctx.lineTo(x + s * (40 + 20 * a), y - 14 + k * 14); ctx.stroke();
            }
        });
        return 0;
    },
    med_petrify(ctx, u) {
        _cueGlow(ctx, 290, 215, 60, '210,255,140', 0.8 * envOf(u, 0.15, 0.3));
        for (let i = 0; i < 3; i++) {
            const r = (u * 1.4 - i * 0.22);
            if (r <= 0 || r > 1) continue;
            ctx.strokeStyle = 'rgba(170,170,165,' + (0.85 * (1 - r)) + ')'; ctx.lineWidth = 16 * (1 - r) + 3;
            ctx.beginPath(); ctx.arc(290, 215, 40 + r * 420, 0, 7); ctx.stroke();
        }
        return 0;
    },
    med_cage(ctx, u) {
        const env = envOf(u, 0.2, 0.25), k = ease(u / 0.6);
        const r = 330 - 90 * k;
        // a ring of scaly coils tightening around the centre
        ctx.strokeStyle = 'rgba(60,120,70,' + (0.9 * env) + ')'; ctx.lineWidth = 26;
        ctx.beginPath(); ctx.ellipse(256, 300, r, r * 0.75, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(220,230,140,' + (0.9 * env) + ')'; ctx.lineWidth = 4;
        ctx.setLineDash([22, 18]); ctx.lineDashOffset = u * 300;
        ctx.beginPath(); ctx.ellipse(256, 300, r, r * 0.75, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        return 0;
    },
});
// <<< poses boss_medusa

// >>> poses boss_minotaur
// ---- The Minotaur ----------------------------------------------------------
// Labyrinth Walls: the bull rears and pounds both fists, stone walls burst
//   up from the floor. Prior Bomb: a fist lobs fused bombs. Hooftread
//   Terrain: it stamps, cracks race out across the ground with dust.
// Thread of Ariadne: a glowing golden thread unspools along a winding path.
Object.assign(POSES, {
    min_walls(P, u) {
        const lift = ease(u / 0.35), slam = ease((u - 0.35) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.fistL.rot = (26 * lift * (1 - slam) - 8 * slam) * k; P.fistL.dy = (-24 * lift * (1 - slam) + 8 * slam) * k;
        P.fistR.rot = (-26 * lift * (1 - slam) + 8 * slam) * k; P.fistR.dy = (-24 * lift * (1 - slam) + 8 * slam) * k;
        P.body.dy = (-8 * lift * (1 - slam) + 8 * slam) * k;
        P.body.rot = (-2 * lift + 2 * slam) * k;
        P.shield.rot = 4 * slam * k;
    },
    min_bomb(P, u) {
        const wind = ease(u / 0.35), toss = ease((u - 0.35) / 0.1), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.fistL.rot = (20 * wind * (1 - toss) - 30 * toss) * k;
        P.fistL.dy = (8 * wind * (1 - toss) - 16 * toss) * k;
        P.body.rot = (-2 * wind + 3 * toss) * k;
    },
    min_hoof(P, u) {
        let stamp = 0;
        for (let i = 0; i < 2; i++) { const t = (u - 0.2 - i * 0.25) / 0.15; if (t > 0 && t < 1) stamp = Math.max(stamp, Math.sin(t * Math.PI)); }
        P.body.dy = -10 * stamp;
        P.body.rot = 2 * stamp;
        P.fistL.rot = 8 * stamp; P.fistR.rot = -8 * stamp;
    },
    min_thread(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.fistR.rot = -16 * env; P.fistR.dy = -10 * env;
        P.body.rot = 1.5 * env;
        P.shield.rot = -3 * env;
    },
});
Object.assign(FX, {
    min_walls(ctx, u) {
        if (u < 0.38) { _cueGlow(ctx, 100, 360, 30, '255,200,170', 0.4 * ease(u / 0.38)); return 0; }
        const fade = 1 - ease((u - 0.82) / 0.18);
        [[60, 120], [200, 80], [330, 120], [460, 90]].forEach(([x, h], i) => {
            const k = ease((u - 0.38 - i * 0.04) / 0.15);
            const top = 500 - h * k;
            ctx.fillStyle = 'rgba(140,120,100,' + fade + ')'; ctx.strokeStyle = 'rgba(50,35,25,' + fade + ')'; ctx.lineWidth = 4;
            ctx.fillRect(x - 40, top, 80, 500 - top); ctx.strokeRect(x - 40, top, 80, 500 - top);
            ctx.beginPath(); ctx.moveTo(x - 40, top + 30); ctx.lineTo(x + 40, top + 30); ctx.moveTo(x, top); ctx.lineTo(x, top + 30); ctx.stroke();
            for (let j = 0; j < 3; j++) _cueGlow(ctx, x - 30 + j * 30, 500 - 20 * k, 14, '200,180,150', 0.5 * (1 - k) * fade);
        });
        return u > 0.35 && u < 0.4 ? 0.14 : 0;
    },
    min_bomb(ctx, u) { _cueBombs(ctx, u, [55, 300], '255,120,90'); return 0; },
    min_hoof(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        for (let i = 0; i < 2; i++) {
            const t = (u - 0.27 - i * 0.25) / 0.4;
            if (t <= 0) continue;
            const k = ease(Math.min(1, t)), x0 = i ? 360 : 150;
            ctx.strokeStyle = 'rgba(60,30,20,' + fade + ')'; ctx.lineWidth = 5;
            [-1, 1].forEach((s) => {
                ctx.beginPath(); ctx.moveTo(x0, 495);
                for (let j = 1; j <= 5; j++) ctx.lineTo(x0 + s * j * 40 * k, 495 + ((j % 2) ? 10 : -6));
                ctx.stroke();
            });
            for (let j = 0; j < 4; j++) _cueGlow(ctx, x0 + (j - 1.5) * 40 * k, 480 - 30 * k, 26, '220,200,170', 0.5 * (1 - k) * fade);
        }
        return 0;
    },
    min_thread(ctx, u) {
        const env = envOf(u, 0.2, 0.25), k = ease((u - 0.15) / 0.6);
        const pt = (t) => [460 - 440 * t, 300 + 160 * Math.sin(t * Math.PI * 2.5)];
        ctx.strokeStyle = 'rgba(255,220,110,' + env + ')'; ctx.lineWidth = 5;
        ctx.shadowColor = 'rgba(255,210,90,0.9)'; ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const [x, y] = pt(k * i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.shadowBlur = 0;
        const [hx, hy] = pt(k);
        _cueGlow(ctx, hx, hy, 24, '255,240,170', env);
        return 0;
    },
});
// <<< poses boss_minotaur

// >>> poses boss_maven
// ---- The Mnemonic ----------------------------------------------------------
// Memory Rite: the open hand sweeps, the staff dice glow, and remembered
//   cell patterns flash up as glowing tiles and fade one by one. Clue Swap:
//   the staff taps and two clue numbers trade places overhead.
Object.assign(POSES, {
    mav_rite(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 3);
        P.handL.rot = 16 * w * env; P.handL.dy = -8 * env;
        P.staff.rot = -6 * env; P.staff.dy = -8 * env;
        P.head.rot = -3 * w * env;
        P.body.dy = -2 * env;
    },
    mav_swap(P, u) {
        const tap = Math.sin(Math.min(1, u / 0.3) * Math.PI), env = envOf(u, 0.2, 0.25);
        P.staff.dy = 10 * tap; P.staff.rot = 4 * tap;
        P.handL.rot = -10 * env;
        P.head.rot = 4 * env;
    },
});
Object.assign(FX, {
    mav_rite(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        _cueGlow(ctx, 470, 130, 70, '255,210,120', 0.6 * env);
        // a 3x3 pattern lights up, then fades tile by tile
        const lit = [0, 2, 4, 5, 7];
        for (let i = 0; i < 9; i++) {
            const x = 160 + (i % 3) * 60, y = -40 + Math.floor(i / 3) * 60;
            const on = lit.includes(i);
            const a = env * (on ? 1 - ease((u - 0.55 - lit.indexOf(i) * 0.06) / 0.1) : 0.35);
            ctx.fillStyle = on ? 'rgba(255,220,130,' + (0.7 * a) + ')' : 'rgba(150,190,200,' + (0.3 * a) + ')';
            ctx.strokeStyle = 'rgba(255,240,200,' + (0.8 * env) + ')'; ctx.lineWidth = 2;
            ctx.fillRect(x - 25, y - 25, 50, 50); ctx.strokeRect(x - 25, y - 25, 50, 50);
        }
        return 0;
    },
    mav_swap(ctx, u) { _cueClues(ctx, u, '200,150,80', false); return 0; },
});
// <<< poses boss_maven


// >>> poses boss_needle
// ---- The Needle ------------------------------------------------------------
// Needle Gates: the staff slams and rows of needles spring up as gates.
// Pin Drops: the quills on its back shiver and pins rain down point-first.
// Stitch Wave: a stitched seam zig-zags across the board. Pincushion Burst:
//   it hunches, then needles burst out in every direction.
Object.assign(POSES, {
    ndl_gates(P, u) {
        const lift = ease(u / 0.3), slam = ease((u - 0.3) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.staff.rot = (14 * lift * (1 - slam) - 4 * slam) * k;
        P.staff.dy = (-18 * lift * (1 - slam) + 6 * slam) * k;
        P.body.dy = 4 * slam * k;
        P.clip.rot = -6 * lift * k;
    },
    ndl_pins(P, u) {
        const env = envOf(u, 0.15, 0.25), j = Math.sin(u * 70) * env;
        P.quills.rot = 4 * j; P.quills.dy = -4 * env;
        P.body.dx = 1.5 * j;
        P.staff.rot = -6 * env;
    },
    ndl_stitch(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 8);
        P.clip.rot = 10 * w * env; P.clip.dy = -6 * env;
        P.staff.rot = -5 * w * env;
        P.body.rot = 1.5 * w * env;
    },
    ndl_burst(P, u) {
        const hunch = ease(u / 0.4), burst = ease((u - 0.4) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.body.sc = 1 - 0.05 * hunch * (1 - burst) + 0.05 * burst * k;
        P.body.dy = 8 * hunch * (1 - burst) * k;
        P.quills.sc = 1 + 0.12 * burst * k;
        P.quills.rot = 6 * burst * k;
        P.staff.rot = 10 * burst * k; P.clip.rot = -10 * burst * k;
    },
});
// One sewing needle with its point at (x, y), pointing in angle a (radians).
function _ndlDraw(ctx, x, y, a, len, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = 'rgba(220,225,230,' + alpha + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-len, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(200,60,60,' + alpha + ')'; ctx.beginPath(); ctx.arc(-len, 0, 7, 0, 7); ctx.fill();
    ctx.restore();
}
Object.assign(FX, {
    ndl_gates(ctx, u) {
        if (u < 0.32) return 0;
        const fade = 1 - ease((u - 0.82) / 0.18);
        for (let g = 0; g < 2; g++) {
            for (let i = 0; i < 7; i++) {
                const k = ease((u - 0.32 - g * 0.1 - i * 0.02) / 0.12);
                if (k <= 0) continue;
                _ndlDraw(ctx, 40 + i * 72, 470 - g * 70 - 60 * k, Math.PI / 2, 60 * k, fade);
            }
        }
        return u > 0.3 && u < 0.34 ? 0.1 : 0;
    },
    ndl_pins(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 10; i++) {
            const t = ease((u - 0.15 - i * 0.05) / 0.25);
            if (t <= 0) continue;
            const x = 30 + (i * 83) % 460, y = -60 + 540 * t;
            _ndlDraw(ctx, x, y, Math.PI / 2, 45, fade);
            if (t >= 1) _cueGlow(ctx, x, 480, 20, '255,220,200', 0.6 * fade);
        }
        return 0;
    },
    ndl_stitch(ctx, u) {
        const env = envOf(u, 0.2, 0.25), k = ease((u - 0.15) / 0.6);
        ctx.strokeStyle = 'rgba(220,70,70,' + env + ')'; ctx.lineWidth = 5;
        ctx.beginPath();
        const n = Math.floor(14 * k);
        for (let i = 0; i <= n; i++) { const x = 10 + i * 36, y = 440 + (i % 2 ? -26 : 26); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,200,' + (0.6 * env) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(10, 440); ctx.lineTo(10 + 36 * 14 * k, 440); ctx.stroke();
        _ndlDraw(ctx, 10 + n * 36 + 10, 440 + (n % 2 ? -26 : 26), 0, 50, env);
        return 0;
    },
    ndl_burst(ctx, u) {
        if (u < 0.4) return 0;
        const k = ease((u - 0.4) / 0.4), fade = 1 - ease((u - 0.8) / 0.2);
        for (let i = 0; i < 14; i++) {
            const a = i * Math.PI * 2 / 14 + 0.2, r = 60 + 300 * k;
            _ndlDraw(ctx, 256 + Math.cos(a) * r, 260 + Math.sin(a) * r, a, 45, fade);
        }
        return u > 0.4 && u < 0.45 ? 0.14 : 0;
    },
});
// <<< poses boss_needle

// >>> poses boss_maze
// ---- The Maze --------------------------------------------------------------
// Ghost Gang: the bull in the centre bellows and four little ghosts drift
//   out of the maze. Dot Walls: rows of dots light up and fuse into walls.
// Maze Walls: the whole maze turns like a combination lock and slabs slam
//   down. Lights Out: darkness closes in until only the eyes and the bull glow.
Object.assign(POSES, {
    maz_ghosts(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 6);
        P.bull.sc = 1 + 0.12 * env * Math.abs(w);
        P.maze.rot = 6 * Math.sin(u * Math.PI * 2) * env;
        P.body.dy = -4 * env;
        ['diceA', 'diceB', 'diceC', 'diceD'].forEach((n, i) => { P[n].dy = -8 * Math.sin(u * 10 + i) * env; });
    },
    maz_dots(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.maze.rot = -8 * env;
        P.bull.sc = 1 + 0.06 * env;
        P.body.sc = 1 + 0.02 * env;
    },
    maz_walls(P, u) {
        // the maze turns in three clicks like a combination lock
        let r = 0;
        for (let i = 0; i < 3; i++) r += 40 * ease((u - 0.1 - i * 0.22) / 0.12) * (i % 2 ? -1 : 1);
        P.maze.rot = r * (1 - ease((u - 0.8) / 0.2));
        P.bull.rot = -r * 0.5 * (1 - ease((u - 0.8) / 0.2));
        P.body.dy = 3 * Math.abs(Math.sin(u * Math.PI * 6));
    },
    maz_dark(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.body.sc = 1 + 0.03 * env;
        P.bull.sc = 1 + 0.1 * env;
        ['diceA', 'diceB', 'diceC', 'diceD'].forEach((n, i) => { P[n].sc = 1 - 0.3 * env; P[n].dy = 10 * env * (i % 2 ? 1 : -1); });
    },
});
Object.assign(FX, {
    maz_ghosts(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
            const k = ease((u - 0.15 - i * 0.06) / 0.5);
            if (k <= 0) return;
            const x = 256 + sx * 200 * k + 10 * Math.sin(u * 12 + i), y = 262 + sy * 150 * k;
            const col = ['255,120,120', '120,200,255', '255,180,240', '255,200,100'][i];
            ctx.globalAlpha = fade * Math.min(1, k * 3);
            ctx.fillStyle = 'rgba(' + col + ',0.9)';
            ctx.beginPath(); ctx.arc(x, y - 6, 22, Math.PI, 0); ctx.lineTo(x + 22, y + 20);
            for (let j = 0; j < 4; j++) ctx.lineTo(x + 22 - (j + 0.5) * 11, y + (j % 2 ? 20 : 10));
            ctx.lineTo(x - 22, y + 20); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 8, y - 6, 6, 0, 7); ctx.arc(x + 8, y - 6, 6, 0, 7); ctx.fill();
            ctx.fillStyle = '#226'; ctx.beginPath(); ctx.arc(x - 7 + 3 * sx, y - 6, 3, 0, 7); ctx.arc(x + 9 + 3 * sx, y - 6, 3, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
        });
        _cueGlow(ctx, 255, 250, 60, '210,255,140', 0.5 * envOf(u, 0.2, 0.25));
        return 0;
    },
    maz_dots(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [430, 500].forEach((y, row) => {
            for (let i = 0; i < 9; i++) {
                const on = ease((u - 0.1 - row * 0.1 - i * 0.03) / 0.1);
                if (on <= 0) continue;
                const x = 20 + i * 59;
                _cueGlow(ctx, x, y, 16, '230,255,150', 0.9 * on * fade);
            }
            const fuse = ease((u - 0.5 - row * 0.08) / 0.15);
            if (fuse > 0) {
                ctx.fillStyle = 'rgba(120,200,160,' + (0.8 * fuse * fade) + ')'; ctx.strokeStyle = 'rgba(230,255,150,' + fuse * fade + ')'; ctx.lineWidth = 3;
                ctx.fillRect(20, y - 8, 472 * fuse, 16); ctx.strokeRect(20, y - 8, 472 * fuse, 16);
            }
        });
        return 0;
    },
    maz_walls(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        for (let i = 0; i < 3; i++) {
            const t = (u - 0.22 - i * 0.22) / 0.08;
            if (t <= 0) continue;
            const k = ease(Math.min(1, t));
            const x = 90 + i * 165, y = -100 + 560 * k;
            ctx.fillStyle = 'rgba(80,130,115,' + fade + ')'; ctx.strokeStyle = 'rgba(20,40,35,' + fade + ')'; ctx.lineWidth = 4;
            ctx.fillRect(x - 60, y - 14, 120, 28); ctx.strokeRect(x - 60, y - 14, 120, 28);
            if (t > 1) {
                const d = Math.min(1, (t - 1) / 2);
                ctx.strokeStyle = 'rgba(220,255,200,' + (0.6 * (1 - d) * fade) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, y + 14, 70 + 40 * d, 10 + 6 * d, 0, 0, 7); ctx.stroke();
            }
        }
        return 0;
    },
    maz_dark(ctx, u) {
        const env = envOf(u, 0.25, 0.25);
        // a dark veil closes in from the edges
        const g = ctx.createRadialGradient(256, 256, 30, 256, 256, 360);
        g.addColorStop(0, 'rgba(5,10,15,' + (0.55 * env) + ')'); g.addColorStop(0.6, 'rgba(5,10,15,' + (0.85 * env) + ')'); g.addColorStop(1, 'rgba(5,10,15,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(256, 256, 360, 0, 7); ctx.fill();
        _cueGlow(ctx, 232, 137, 40, '230,255,120', env);
        _cueGlow(ctx, 298, 137, 40, '230,255,120', env);
        _cueGlow(ctx, 255, 250, 50, '200,255,150', 0.6 * env);
        return 0;
    },
});
// <<< poses boss_maze

// >>> poses boss_monsoon
// ---- The Monsoon -----------------------------------------------------------
// Rain Bands: the arms open, the clouds swell and slanted rain falls in
//   bands. Thunderbolts: the clouds crackle and bolts strike the ground.
// Storm Surge: the arms sweep and a wave rolls across. Hail Barrage: the
//   clouds shudder and hailstones pelt down and bounce.
Object.assign(POSES, {
    mon_rain(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.armL.rot = 14 * env; P.armL.dy = -8 * env;
        P.armR.rot = -14 * env; P.armR.dy = -8 * env;
        P.cloudL.sc = P.cloudR.sc = 1 + 0.08 * env;
        P.cloudL.dy = P.cloudR.dy = -6 * env;
    },
    mon_bolts(P, u) {
        const env = envOf(u, 0.15, 0.25), j = Math.sin(u * 80) * env;
        P.cloudL.dx = 2 * j; P.cloudR.dx = -2 * j;
        P.cloudL.sc = P.cloudR.sc = 1 + 0.05 * env;
        P.armR.rot = -20 * env; P.armR.dy = -12 * env;
        P.body.dy = -2 * env;
    },
    mon_surge(P, u) {
        const wind = ease(u / 0.35), sweep = ease((u - 0.35) / 0.15), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.armL.rot = (-12 * wind * (1 - sweep) + 24 * sweep) * k;
        P.armR.rot = (-10 * wind + 18 * sweep) * k;
        P.body.rot = (-2 * wind + 3 * sweep) * k;
    },
    mon_hail(P, u) {
        const env = envOf(u, 0.15, 0.25), w = Math.sin(u * 50) * env;
        P.cloudL.rot = 4 * w; P.cloudR.rot = -4 * w;
        P.cloudL.dy = P.cloudR.dy = -4 * env;
        P.armL.rot = 6 * env; P.armR.rot = -6 * env;
    },
});
Object.assign(FX, {
    mon_rain(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        ctx.strokeStyle = 'rgba(160,220,255,' + (0.7 * env) + ')'; ctx.lineWidth = 3;
        for (let b = 0; b < 3; b++) {
            const bx = 30 + b * 180;
            for (let i = 0; i < 9; i++) {
                const y = ((u * 900 + i * 61 + b * 37) % 520) - 20, x = bx + (i * 17) % 80 - y * 0.2;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 30); ctx.stroke();
            }
        }
        return 0;
    },
    mon_bolts(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        [[110, 160, 0.25], [395, 160, 0.38], [250, 90, 0.5], [160, 150, 0.6], [360, 150, 0.68]].forEach(([x0, y0, t0], i) => {
            const t = (u - t0) / 0.2;
            if (t <= 0 || t > 1) return;
            const a = (1 - t) * fade;
            let x = x0, y = y0;
            ctx.strokeStyle = 'rgba(255,250,200,' + a + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let s = 0; s < 6; s++) { x += ((i * 37 + s * 53) % 60) - 30; y += (500 - y0) / 6; ctx.lineTo(x, y); }
            ctx.stroke();
            _cueGlow(ctx, x, y, 60, '255,250,200', a);
        });
        return u > 0.3 && u < 0.33 ? 0.2 : 0;
    },
    mon_surge(ctx, u) {
        if (u < 0.35) return 0;
        const k = ease((u - 0.35) / 0.5), fade = 1 - ease((u - 0.85) / 0.15);
        const x = -150 + k * 800;
        const g = ctx.createLinearGradient(x - 160, 0, x, 0);
        g.addColorStop(0, 'rgba(60,140,210,0)'); g.addColorStop(1, 'rgba(120,200,255,' + (0.75 * fade) + ')');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 160, 520); ctx.quadraticCurveTo(x - 40, 520, x, 360); ctx.quadraticCurveTo(x + 20, 330, x + 40, 360); ctx.lineTo(x + 10, 520); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(240,250,255,' + fade + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - 60, 440); ctx.quadraticCurveTo(x - 10, 400, x, 360); ctx.quadraticCurveTo(x + 20, 330, x + 40, 360); ctx.stroke();
        return 0;
    },
    mon_hail(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 14; i++) {
            const t = ((u - 0.15) * 1.8 - i * 0.05);
            if (t <= 0 || t > 1) continue;
            const x = 20 + (i * 71) % 470;
            const y = t < 0.7 ? -40 + 540 * (t / 0.7) : 500 - 40 * Math.sin((t - 0.7) / 0.3 * Math.PI);
            ctx.fillStyle = 'rgba(235,250,255,' + fade + ')'; ctx.strokeStyle = 'rgba(120,170,200,' + fade + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 9 + (i % 3) * 3, 0, 7); ctx.fill(); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_monsoon

// >>> poses boss_nemesis
// ---- The Nemesis -----------------------------------------------------------
// Spiral Storm: the staff rises and red shards spiral out from the die.
// Reaper Fans: the shield thrusts and three fans of blades sweep outward.
// Soul Tithe: the staff tips forward and wisps stream into the red die.
Object.assign(POSES, {
    nem_spiral(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.staff.rot = 14 * env; P.staff.dy = -16 * env;
        P.head.rot = -4 * env; P.head.dy = -3 * env;
        P.shield.rot = -4 * env;
    },
    nem_fans(P, u) {
        let push = 0;
        for (let i = 0; i < 3; i++) { const t = (u - 0.15 - i * 0.2) / 0.15; if (t > 0 && t < 1) push = Math.max(push, Math.sin(t * Math.PI)); }
        P.shield.dx = 14 * push; P.shield.rot = -6 * push;
        P.body.dx = 4 * push;
        P.staff.rot = -5 * push;
    },
    nem_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.staff.rot = -12 * env;
        P.head.rot = 3 * env;
        P.body.dy = 2 * env;
    },
});
Object.assign(FX, {
    nem_spiral(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        _cueGlow(ctx, 80, 90, 70, '255,110,90', 0.7 * env);
        for (let i = 0; i < 18; i++) {
            const k = ((u - 0.15) * 1.3 + i / 18) % 1;
            if (u < 0.15) break;
            const a = i * 0.9 + k * 6, r = 20 + k * 360;
            const x = 80 + Math.cos(a) * r, y = 90 + Math.sin(a) * r * 0.8;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a);
            ctx.fillStyle = 'rgba(255,120,100,' + (env * (1 - k)) + ')';
            ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        return 0;
    },
    nem_fans(ctx, u) {
        for (let i = 0; i < 3; i++) {
            const t = (u - 0.2 - i * 0.2) / 0.4;
            if (t <= 0 || t > 1) continue;
            const r = 40 + 340 * t, a = 1 - t;
            for (let j = -2; j <= 2; j++) {
                const ang = j * 0.28 + (i - 1) * 0.15;
                const x = 430 + Math.cos(ang) * r, y = 300 + Math.sin(ang) * r;
                ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
                ctx.fillStyle = 'rgba(220,235,245,' + a + ')'; ctx.strokeStyle = 'rgba(200,70,60,' + a + ')'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(0, -14, -14, -4); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
        }
        return 0;
    },
    nem_tithe(ctx, u) { _cueTithe(ctx, u, 80, 100, '255,110,90'); return 0; },
});
// <<< poses boss_nemesis


// >>> poses boss_null
// ---- The Null --------------------------------------------------------------
// Void Lattice: the eye stares, the hat lifts and a purple grid spreads out
//   from the pupil. Prior Bomb: the eye spits fused bombs. Hypothesis Erasure:
//   the eye tracks across and an eraser beam wipes a strip clean. Null Rays:
//   the eye flares and rays shoot out on every side.
Object.assign(POSES, {
    nul_lattice(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.eyeball.sc = 1 + 0.1 * env;
        P.hat.dy = -10 * env;
        P.diceL.dy = -10 * env * Math.sin(u * 8); P.diceR.dy = 10 * env * Math.sin(u * 8);
    },
    nul_bomb(P, u) {
        const pulse = ease(u / 0.35), out = ease((u - 0.35) / 0.1), k = 1 - ease((u - 0.6) / 0.3);
        P.eyeball.sc = 1 + (0.15 * pulse - 0.2 * out) * k;
        P.body.sc = 1 + 0.03 * out * k;
        P.hat.dy = -6 * out * k;
    },
    nul_erase(P, u) {
        const env = envOf(u, 0.15, 0.2);
        P.eyeball.dx = (-22 + 44 * ease((u - 0.15) / 0.6)) * env;
        P.hat.rot = 3 * Math.sin(u * Math.PI * 2) * env;
    },
    nul_rays(P, u) {
        const charge = ease(u / 0.4), fire = ease((u - 0.4) / 0.08), k = 1 - ease((u - 0.75) / 0.25);
        P.eyeball.sc = 1 + (0.1 * charge + 0.1 * fire) * k;
        P.body.sc = 1 - 0.03 * charge * (1 - fire) * k;
        P.hat.dy = (-4 * charge - 8 * fire) * k;
        P.diceL.dx = -20 * fire * k; P.diceR.dx = 20 * fire * k;
    },
});
Object.assign(FX, {
    nul_lattice(ctx, u) {
        const env = envOf(u, 0.2, 0.25), k = ease((u - 0.15) / 0.5);
        _cueGlow(ctx, 255, 268, 90, '160,110,255', 0.6 * env);
        ctx.strokeStyle = 'rgba(180,130,255,' + (0.7 * env) + ')'; ctx.lineWidth = 3;
        const R = 40 + 300 * k;
        for (let i = -5; i <= 5; i++) {
            const o = i * 50;
            if (Math.abs(o) > R) continue;
            const h = Math.sqrt(R * R - o * o);
            ctx.beginPath(); ctx.moveTo(255 + o, 268 - h); ctx.lineTo(255 + o, 268 + h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(255 - h, 268 + o); ctx.lineTo(255 + h, 268 + o); ctx.stroke();
        }
        return 0;
    },
    nul_bomb(ctx, u) { _cueBombs(ctx, u, [255, 268], '170,120,255'); return 0; },
    nul_erase(ctx, u) {
        const env = envOf(u, 0.15, 0.2), k = ease((u - 0.15) / 0.6);
        const x = -20 + 560 * k;
        ctx.fillStyle = 'rgba(240,240,255,' + (0.25 * env) + ')'; ctx.fillRect(-20, 455, x + 20, 50);
        ctx.strokeStyle = 'rgba(200,170,255,' + (0.8 * env) + ')'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(255 + 44 * (k * 2 - 1), 268); ctx.lineTo(x, 480); ctx.stroke();
        ctx.fillStyle = 'rgba(255,190,210,' + env + ')'; ctx.fillRect(x - 22, 462, 44, 36);
        ctx.strokeStyle = 'rgba(120,60,90,' + env + ')'; ctx.lineWidth = 3; ctx.strokeRect(x - 22, 462, 44, 36);
        return 0;
    },
    nul_rays(ctx, u) {
        const charge = ease(u / 0.4);
        _cueGlow(ctx, 255, 268, 30 + 70 * charge, '190,150,255', 0.8 * charge * (1 - ease((u - 0.75) / 0.25)));
        if (u > 0.4) {
            const t = (u - 0.4) / 0.5, a = 1 - t;
            for (let i = 0; i < 10; i++) {
                const ang = i * Math.PI / 5 + 0.3, r1 = 60, r2 = 60 + 420 * Math.min(1, t * 2);
                ctx.strokeStyle = 'rgba(200,160,255,' + a + ')'; ctx.lineWidth = 12 * a + 2;
                ctx.beginPath(); ctx.moveTo(255 + Math.cos(ang) * r1, 268 + Math.sin(ang) * r1); ctx.lineTo(255 + Math.cos(ang) * r2, 268 + Math.sin(ang) * r2); ctx.stroke();
            }
        }
        return u > 0.4 && u < 0.45 ? 0.15 : 0;
    },
});
// <<< poses boss_null



// >>> poses boss_phantom
// ---- The Phantom -----------------------------------------------------------
// Vent Ambush: the score-sheet cape folds in, three floor vents glow and
//   ghostly hands burst up out of them. Fog Bank: the cape spreads wide and
//   teal mist rolls in.
Object.assign(POSES, {
    phm_ambush(P, u) {
        const fold = ease(u / 0.3), open = ease((u - 0.5) / 0.15), k = 1 - ease((u - 0.8) / 0.2);
        P.wingL.rot = (-14 * fold * (1 - open) + 10 * open) * k;
        P.wingR.rot = (14 * fold * (1 - open) - 10 * open) * k;
        P.head.dy = 6 * fold * (1 - open) * k;
        P.body.dy = 4 * fold * (1 - open) * k;
    },
    phm_fog(P, u) {
        const env = envOf(u, 0.25, 0.25), w = Math.sin(u * Math.PI * 4);
        P.wingL.rot = (12 + 4 * w) * env;
        P.wingR.rot = (-12 - 4 * w) * env;
        P.head.dy = -4 * env;
    },
});
Object.assign(FX, {
    phm_ambush(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [[90, 490], [256, 510], [420, 490]].forEach(([x, y], i) => {
            const glow = ease((u - 0.1 - i * 0.05) / 0.25);
            ctx.fillStyle = 'rgba(120,255,210,' + (0.5 * glow * fade) + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 40, 12, 0, 0, 7); ctx.fill();
            const k = ease((u - 0.45 - i * 0.05) / 0.15);
            if (k <= 0) return;
            const h = 90 * k;
            ctx.fillStyle = 'rgba(150,255,220,' + (0.75 * fade) + ')';
            ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 14, y - h); ctx.lineTo(x + 14, y - h); ctx.lineTo(x + 14, y); ctx.fill();
            for (let f = 0; f < 4; f++) {
                ctx.beginPath(); ctx.ellipse(x - 15 + f * 10, y - h - 14, 5, 14, (f - 1.5) * 0.25, 0, 7); ctx.fill();
            }
        });
        return 0;
    },
    phm_fog(ctx, u) { _cueFog(ctx, u, '140,230,200'); return 0; },
});
// <<< poses boss_phantom

// >>> poses boss_puddle
// ---- The Puddle ------------------------------------------------------------
// Fated Cell: the puddle squashes and quivers, its eyes narrow, the splash
//   flicks up and a reticle locks onto a cell.
Object.assign(POSES, {
    pud_fate(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 8);
        P.body.sx = 1 + 0.06 * env * w; P.body.sy = 1 - 0.06 * env * w;
        P.eyeL.sc = P.eyeR.sc = 1 - 0.12 * env;
        P.eyeL.dx = P.eyeR.dx = 6 * env;
        P.splash.rot = -10 * env * Math.abs(w); P.splash.dy = -8 * env;
    },
});
Object.assign(FX, {
    pud_fate(ctx, u) { _cueFate(ctx, u, 256, 470, '150,240,220'); return 0; },
});
// <<< poses boss_puddle

// >>> poses boss_nightmare
// ---- The Nightmare ---------------------------------------------------------
// Dark Hunt: the horse rears, the eyes burn violet, and shadow horses gallop
//   out to both sides. Soul Tithe: it lowers its head and wisps stream into
//   the glowing eye.
Object.assign(POSES, {
    ngt_hunt(P, u) {
        const rear = ease(u / 0.3), drop = ease((u - 0.45) / 0.15), k = 1 - drop;
        P.body.rot = -8 * rear * k;
        P.body.dy = -10 * rear * k + 4 * drop * (1 - ease((u - 0.7) / 0.3));
        P.head.rot = -10 * rear * k;
        P.tail.rot = 20 * Math.sin(u * Math.PI * 4) * (1 - ease((u - 0.8) / 0.2));
    },
    ngt_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.head.rot = 12 * env; P.head.dy = 8 * env;
        P.tail.rot = 10 * Math.sin(u * Math.PI * 4) * env;
        P.body.dy = 3 * env;
    },
});
Object.assign(FX, {
    ngt_hunt(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.2), [ex, ey] = at('head', 435, 188);
        _cueGlow(ctx, ex, ey, 40, '190,110,255', env);
        // shadow horses dash out
        [[-1, 420], [1, 470]].forEach(([s, y], i) => {
            const k = ease((u - 0.4 - i * 0.08) / 0.45);
            if (k <= 0 || k >= 1) return;
            const x = 256 + s * 420 * k, a = Math.sin(k * Math.PI);
            ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
            ctx.fillStyle = 'rgba(90,50,140,' + (0.7 * a) + ')';
            ctx.beginPath(); ctx.ellipse(0, 0, 55, 22, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(50, -28, 20, 14, -0.6, 0, 7); ctx.fill();
            const g = Math.sin(u * 40) * 10;
            ctx.fillRect(-40 + g, 10, 8, 30); ctx.fillRect(30 - g, 10, 8, 30);
            _cueGlow(ctx, 58, -32, 10, '220,160,255', a);
            ctx.restore();
            for (let j = 1; j < 4; j++) _cueGlow(ctx, x - s * j * 40, y, 30, '120,70,180', 0.3 * a / j);
        });
        return 0;
    },
    ngt_tithe(ctx, u, dy, at) { const [ex, ey] = at('head', 435, 188); _cueTithe(ctx, u, ex, ey, '190,120,255'); return 0; },
});
// <<< poses boss_nightmare

// >>> poses boss_oblivion
// ---- The Oblivion ----------------------------------------------------------
// Singularity: the galaxy in the open hand collapses into a black hole that
//   pulls in streaks of light. Event Beams: the scythe swings and dark beams
//   lash out from the orb. Fog Bank: starry dusk rolls in from both sides.
Object.assign(POSES, {
    obl_singularity(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.orbHand.rot = -10 * env; P.orbHand.dy = -10 * env;
        P.head.rot = 4 * env;
        P.scythe.rot = -6 * env;
        P.body.dy = -3 * env;
    },
    obl_beams(P, u) {
        const wind = ease(u / 0.3), swing = ease((u - 0.3) / 0.15), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.scythe.rot = (-18 * wind * (1 - swing) + 22 * swing) * k;
        P.orbHand.rot = -14 * swing * k;
        P.body.rot = (-2 * wind + 3 * swing) * k;
        P.head.rot = 4 * swing * k;
    },
    obl_fog(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.scythe.rot = 8 * env;
        P.orbHand.dy = 6 * env;
        P.head.dy = 4 * env;
    },
});
Object.assign(FX, {
    obl_singularity(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25), k = ease(u / 0.6);
        const [x, y] = at('orbHand', 460, 200);
        for (let i = 0; i < 16; i++) {
            const t = (u * 1.5 + i / 16) % 1;
            const a = i * 2.4 + t * 3, r = 300 * (1 - t);
            ctx.strokeStyle = 'rgba(200,210,255,' + (env * t) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            ctx.lineTo(x + Math.cos(a - 0.3) * (r + 30), y + Math.sin(a - 0.3) * (r + 30)); ctx.stroke();
        }
        _cueGlow(ctx, x, y, 70 + 30 * k, '150,120,255', 0.6 * env);
        ctx.fillStyle = 'rgba(0,0,8,' + (0.95 * env) + ')';
        ctx.beginPath(); ctx.arc(x, y, 10 + 30 * k, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(230,220,255,' + env + ')'; ctx.lineWidth = 3; ctx.stroke();
        return 0;
    },
    obl_beams(ctx, u) {
        if (u < 0.35) { _cueGlow(ctx, 460, 200, 60, '150,120,255', ease(u / 0.35)); return 0; }
        const t = (u - 0.35) / 0.5, a = 1 - ease((u - 0.7) / 0.3);
        [-0.5, 0.1, 0.7].forEach((ang, i) => {
            const len = 500 * ease(t * 1.5 - i * 0.15);
            if (len <= 0) return;
            ctx.save(); ctx.translate(460, 200); ctx.rotate(Math.PI * 0.55 + ang);
            ctx.fillStyle = 'rgba(40,20,80,' + (0.8 * a) + ')'; ctx.fillRect(0, -14, len, 28);
            ctx.fillStyle = 'rgba(210,190,255,' + a + ')'; ctx.fillRect(0, -4, len, 8);
            ctx.restore();
        });
        return 0;
    },
    obl_fog(ctx, u) { _cueFog(ctx, u, '60,60,120'); return 0; },
});
// <<< poses boss_oblivion

// >>> poses boss_overfitter
// ---- The Overfitter --------------------------------------------------------
// Gradient Descent: it reaches out and a glowing ball rolls down a bumpy
//   loss curve into the lowest dip. Pattern Break: it slaps the ground and a
//   row of pattern tiles shatters. Pattern Lock: it grins and chains snap
//   around three tiles. Validation Set: tiles flash ticks and crosses.
Object.assign(POSES, {
    ovf_descent(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.handL.rot = -14 * env; P.handL.dx = -6 * env;
        P.head.rot = -5 * env; P.head.dy = 3 * env;
        P.body.rot = -1.5 * env;
    },
    ovf_break(P, u) {
        const lift = ease(u / 0.3), slam = ease((u - 0.3) / 0.08), rest = ease((u - 0.65) / 0.35);
        const k = 1 - rest;
        P.handL.rot = (12 * lift * (1 - slam) - 6 * slam) * k;
        P.handL.dy = (-10 * lift * (1 - slam) + 6 * slam) * k;
        P.body.dy = 5 * slam * k;
        P.head.dy = 6 * slam * k;
    },
    ovf_lock(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 6);
        P.head.rot = 6 * w * env;
        P.handR.rot = -10 * env;
        P.body.sc = 1 + 0.02 * env;
    },
    ovf_validate(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.head.rot = 8 * Math.sin(u * Math.PI * 5) * env;
        P.handL.rot = -8 * env; P.handR.rot = 8 * env;
    },
});
Object.assign(FX, {
    ovf_descent(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        const curve = (x) => 300 + 60 * Math.sin(x / 50) + 0.0015 * (x - 300) * (x - 300) - 40;
        ctx.strokeStyle = 'rgba(180,240,140,' + (0.85 * env) + ')'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = 0; x <= 500; x += 10) x ? ctx.lineTo(x, curve(x) + 120) : ctx.moveTo(x, curve(x) + 120);
        ctx.stroke();
        const k = ease((u - 0.2) / 0.6), bx = 250 - 205 * k + 10 * Math.sin(k * 20) * (1 - k);
        _cueGlow(ctx, bx, curve(bx) + 105, 26, '255,240,150', env);
        ctx.fillStyle = 'rgba(255,250,200,' + env + ')'; ctx.beginPath(); ctx.arc(bx, curve(bx) + 105, 10, 0, 7); ctx.fill();
        return 0;
    },
    ovf_break(ctx, u) {
        if (u < 0.32) return 0;
        const fade = 1 - ease((u - 0.8) / 0.2);
        for (let i = 0; i < 6; i++) {
            const t = Math.max(0, (u - 0.32 - i * 0.03) / 0.4), x = 30 + i * 85, y = 480;
            for (let s = 0; s < 4; s++) {
                const a = -Math.PI / 2 + (s - 1.5) * 0.6;
                const px = x + Math.cos(a) * 60 * t, py = y + Math.sin(a) * 60 * t + 120 * t * t;
                ctx.save(); ctx.translate(px, py); ctx.rotate(t * (s + 1) * 2);
                ctx.fillStyle = 'rgba(' + (i % 2 ? '230,210,140' : '170,210,120') + ',' + fade * (1 - t * 0.5) + ')';
                ctx.fillRect(-12, -12, 24, 24); ctx.restore();
            }
        }
        return u > 0.3 && u < 0.34 ? 0.12 : 0;
    },
    ovf_lock(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        [[110, 470], [256, 495], [400, 470]].forEach(([x, y], i) => {
            const k = ease((u - 0.2 - i * 0.1) / 0.15);
            ctx.fillStyle = 'rgba(170,210,120,' + (0.4 * env) + ')'; ctx.fillRect(x - 26, y - 26, 52, 52);
            if (k <= 0) return;
            ctx.strokeStyle = 'rgba(200,200,215,' + (env * k) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(x - 34, y - 34); ctx.lineTo(x + 34, y + 34); ctx.moveTo(x + 34, y - 34); ctx.lineTo(x - 34, y + 34); ctx.stroke();
            ctx.fillStyle = 'rgba(220,180,60,' + (env * k) + ')'; ctx.fillRect(x - 12, y - 6, 24, 20);
            ctx.strokeStyle = 'rgba(220,180,60,' + (env * k) + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y - 6, 8, Math.PI, 0); ctx.stroke();
        });
        return 0;
    },
    ovf_validate(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        for (let i = 0; i < 5; i++) {
            const x = 50 + i * 103, y = 480, on = ease((u - 0.2 - i * 0.08) / 0.1);
            const ok = i % 2 === 0;
            ctx.strokeStyle = 'rgba(230,230,200,' + (0.6 * env) + ')'; ctx.lineWidth = 3; ctx.strokeRect(x - 24, y - 24, 48, 48);
            if (on <= 0) continue;
            ctx.strokeStyle = (ok ? 'rgba(120,240,120,' : 'rgba(255,90,80,') + (env * on) + ')'; ctx.lineWidth = 7;
            ctx.beginPath();
            if (ok) { ctx.moveTo(x - 14, y); ctx.lineTo(x - 3, y + 12); ctx.lineTo(x + 16, y - 14); }
            else { ctx.moveTo(x - 13, y - 13); ctx.lineTo(x + 13, y + 13); ctx.moveTo(x + 13, y - 13); ctx.lineTo(x - 13, y + 13); }
            ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_overfitter

// >>> poses boss_razor
// ---- The Razor -------------------------------------------------------------
// Blade Cyclone: both blades whirl and a ring of cutting wind spins around.
// Probability Shift: a blade flicks and marks hop between cells. Razor
//   Wires: the blades cross and glowing wires snap taut across the board.
// Hone and Cast: the blades scrape together in sparks, then one is flung in
//   a spinning arc.
Object.assign(POSES, {
    rzr_cyclone(P, u) {
        const env = envOf(u, 0.15, 0.2), w = Math.sin(u * Math.PI * 10);
        P.bladeL.rot = -30 * w * env; P.bladeR.rot = 30 * w * env;
        P.body.rot = 3 * w * env;
        P.body.dy = -4 * env;
    },
    rzr_shift(P, u) {
        const flick = Math.sin(Math.min(1, u / 0.35) * Math.PI);
        P.bladeR.rot = -24 * flick; P.bladeR.dy = -8 * flick;
        P.body.rot = 1.5 * flick;
    },
    rzr_wires(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.bladeL.rot = 30 * env; P.bladeL.dx = 18 * env;
        P.bladeR.rot = -30 * env; P.bladeR.dx = -18 * env;
        P.body.dy = 3 * env;
    },
    rzr_hone(P, u) {
        const scrape = u < 0.45 ? Math.sin(u / 0.45 * Math.PI * 4) : 0;
        const env = envOf(u, 0.15, 0.25);
        const toss = ease((u - 0.5) / 0.1) * (1 - ease((u - 0.75) / 0.25));
        P.bladeL.rot = (14 + 6 * scrape) * env * (u < 0.5 ? 1 : 1 - toss);
        P.bladeR.rot = (-14 + 6 * scrape) * env - 40 * toss;
        P.bladeR.dy = -12 * toss;
        P.body.rot = 2 * toss;
    },
});
Object.assign(FX, {
    rzr_cyclone(ctx, u) {
        const env = envOf(u, 0.15, 0.2);
        for (let i = 0; i < 3; i++) {
            const a0 = u * 20 + i * 2.1;
            ctx.strokeStyle = 'rgba(150,220,255,' + (0.7 * env) + ')'; ctx.lineWidth = 8 - i * 2;
            ctx.beginPath(); ctx.ellipse(256, 300, 230 + i * 25, 120 + i * 15, 0, a0, a0 + 1.6); ctx.stroke();
            ctx.strokeStyle = 'rgba(200,140,255,' + (0.6 * env) + ')';
            ctx.beginPath(); ctx.ellipse(256, 300, 230 + i * 25, 120 + i * 15, 0, a0 + Math.PI, a0 + Math.PI + 1.2); ctx.stroke();
        }
        return 0;
    },
    rzr_shift(ctx, u) { _cueShift(ctx, u, '150,220,255'); return 0; },
    rzr_wires(ctx, u) {
        const env = envOf(u, 0.25, 0.25);
        [[-40, 380, 552, 450], [-40, 470, 552, 400], [100, 520, 420, 330]].forEach(([x1, y1, x2, y2], i) => {
            const k = ease((u - 0.2 - i * 0.08) / 0.15);
            if (k <= 0) return;
            const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
            ctx.strokeStyle = 'rgba(150,230,255,' + env + ')'; ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(150,230,255,0.9)'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
            ctx.shadowBlur = 0;
        });
        return 0;
    },
    rzr_hone(ctx, u) {
        if (u < 0.45) {
            for (let i = 0; i < 10; i++) {
                const k = (u * 6 + i / 10) % 1;
                const a = -Math.PI / 2 + (i - 5) * 0.3;
                ctx.fillStyle = 'rgba(255,240,170,' + (1 - k) + ')';
                ctx.beginPath(); ctx.arc(256 + Math.cos(a) * 80 * k, 220 + Math.sin(a) * 80 * k + 60 * k * k, 3, 0, 7); ctx.fill();
            }
            return 0;
        }
        const t = (u - 0.5) / 0.4;
        if (t <= 0 || t >= 1) return 0;
        const x = 440 - 420 * t, y = 220 - 150 * Math.sin(t * Math.PI) + 200 * t;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 18);
        ctx.strokeStyle = 'rgba(170,220,255,' + (1 - t * 0.5) + ')'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, 0, 40, 0, 4); ctx.stroke();
        ctx.restore();
        return 0;
    },
});
// <<< poses boss_razor

// >>> poses boss_seraph
// ---- The Seraph ------------------------------------------------------------
// Judgment Pillars: the wings beat, the halo blazes and columns of light
//   slam down onto three cells. Radiant Fans: the head tilts and fans of
//   golden rays sweep out. Fated Cell: a calm stare and a reticle locks on.
Object.assign(POSES, {
    srp_pillars(P, u) {
        const env = envOf(u, 0.2, 0.25), beat = Math.sin(u * Math.PI * 6);
        P.body.sx = 1 + 0.06 * beat * env; P.body.sy = 1 - 0.03 * beat * env;
        P.body.dy = -8 * env;
        P.head.sc = 1 + 0.04 * env;
    },
    srp_fans(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.head.rot = 8 * Math.sin(u * Math.PI * 2) * env;
        P.body.sx = 1 + 0.05 * env;
    },
    srp_fate(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.head.dy = -6 * env;
        P.body.dy = -4 * env;
    },
});
Object.assign(FX, {
    srp_pillars(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25);
        const [hx, hy] = at('head', 256, 195);
        _cueGlow(ctx, hx, hy, 80, '255,230,140', 0.7 * env);
        [[100, 0.35], [256, 0.45], [410, 0.55]].forEach(([x, t0]) => {
            const t = (u - t0) / 0.3;
            if (t <= 0 || t > 1) return;
            const a = Math.sin(t * Math.PI);
            const g = ctx.createLinearGradient(0, -150, 0, 500);
            g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(1, 'rgba(255,240,180,' + (0.85 * a) + ')');
            ctx.fillStyle = g; ctx.fillRect(x - 26, -150, 52, 650);
            _cueGlow(ctx, x, 495, 60, '255,240,180', a);
        });
        return 0;
    },
    srp_fans(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        for (let i = 0; i < 9; i++) {
            const ang = Math.PI / 2 + (i - 4) * 0.22 + 0.4 * Math.sin(u * Math.PI * 2);
            const len = 380 * ease((u - 0.15) / 0.4);
            ctx.strokeStyle = 'rgba(255,220,120,' + (0.7 * env) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(256, 290); ctx.lineTo(256 + Math.cos(ang) * len, 290 + Math.sin(ang) * len); ctx.stroke();
        }
        return 0;
    },
    srp_fate(ctx, u) { _cueFate(ctx, u, 256, 440, '255,225,140'); return 0; },
});
// <<< poses boss_seraph

// >>> poses boss_shaper
// ---- The Frostwright -------------------------------------------------------
// Glacier Rift: the ice club rises and smashes down, a jagged rift of ice
//   races across the floor. Soul Tithe: the frost hand opens and wisps
//   stream into it. Frost Monoliths: the hand lifts and ice pillars grow up
//   from the ground. Ice Walker: it strides and frozen footprints march away.
Object.assign(POSES, {
    shp_rift(P, u) {
        const lift = ease(u / 0.35), slam = ease((u - 0.35) / 0.08), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.club.rot = (30 * lift * (1 - slam) - 10 * slam) * k;
        P.club.dy = (-16 * lift * (1 - slam) + 6 * slam) * k;
        P.body.dy = (-4 * lift * (1 - slam) + 6 * slam) * k;
        P.head.rot = 3 * slam * k;
    },
    shp_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.frostHand.rot = -12 * env; P.frostHand.dy = -8 * env;
        P.head.rot = -3 * env;
    },
    shp_monoliths(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.frostHand.rot = -22 * env; P.frostHand.dy = -16 * env;
        P.club.rot = -6 * env;
        P.body.dy = -3 * env;
    },
    shp_walker(P, u) {
        const env = envOf(u, 0.15, 0.2), step = Math.sin(u * Math.PI * 6);
        P.body.rot = 2.5 * step * env;
        P.body.dy = -5 * Math.abs(step) * env;
        P.club.rot = -6 * step * env;
        P.frostHand.rot = 6 * step * env;
    },
});
Object.assign(FX, {
    shp_rift(ctx, u) {
        if (u < 0.38) return 0;
        const k = ease((u - 0.38) / 0.35), fade = 1 - ease((u - 0.8) / 0.2);
        ctx.strokeStyle = 'rgba(200,240,255,' + fade + ')'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(140, 470);
        for (let i = 1; i <= 8; i++) { const x = 140 + i * 50 * k; ctx.lineTo(x, 470 + (i % 2 ? -14 : 14)); }
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const x = 160 + i * 60 * k;
            ctx.fillStyle = 'rgba(170,225,255,' + (0.85 * fade) + ')';
            ctx.beginPath(); ctx.moveTo(x - 12, 475); ctx.lineTo(x, 475 - 40 * k * (0.6 + (i % 3) * 0.2)); ctx.lineTo(x + 12, 475); ctx.fill();
        }
        return u > 0.36 && u < 0.4 ? 0.14 : 0;
    },
    shp_tithe(ctx, u, dy, at) { const [x, y] = at('frostHand', 450, 200); _cueTithe(ctx, u, x, y, '170,225,255'); return 0; },
    shp_monoliths(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [[80, 140], [250, 110], [430, 150]].forEach(([x, h], i) => {
            const k = ease((u - 0.25 - i * 0.08) / 0.25);
            if (k <= 0) return;
            const top = 495 - h * k;
            ctx.fillStyle = 'rgba(170,225,255,' + (0.85 * fade) + ')'; ctx.strokeStyle = 'rgba(240,252,255,' + fade + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x - 28, 495); ctx.lineTo(x - 22, top + 20); ctx.lineTo(x, top); ctx.lineTo(x + 22, top + 20); ctx.lineTo(x + 28, 495); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        return 0;
    },
    shp_walker(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 6; i++) {
            const t = ease((u - 0.1 - i * 0.1) / 0.1);
            if (t <= 0) continue;
            const x = 300 - i * 55, y = 490 + (i % 2 ? 14 : -4);
            ctx.fillStyle = 'rgba(190,235,255,' + (0.8 * t * fade) + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, 7); ctx.fill();
            _cueGlow(ctx, x, y, 26, '220,245,255', 0.4 * t * fade);
        }
        return 0;
    },
});
// <<< poses boss_shaper


// >>> poses boss_siren
// ---- The Siren -------------------------------------------------------------
// Wail Beam: she raises the conch and blows, a cone of sound rings pours out
//   to the left. Frozen Cells: the open hand flings ice shards. Undertow: the
//   whirlpool under her spins faster and drags spray inward. Siren's Reply:
//   she lowers the conch and echo rings and notes ripple back to her.
Object.assign(POSES, {
    srn_wail(P, u) {
        const env = envOf(u, 0.2, 0.2), w = Math.sin(u * 60) * env;
        P.conch.rot = (-10 + 2 * w) * env; P.conch.dy = -4 * env;
        P.body.rot = -2 * env;
        P.handR.rot = 6 * env;
    },
    srn_frost(P, u) {
        const wind = ease(u / 0.25), fling = ease((u - 0.25) / 0.1), rest = ease((u - 0.65) / 0.35);
        const k = 1 - rest;
        P.handR.rot = (14 * wind * (1 - fling) - 24 * fling) * k;
        P.handR.dy = (6 * wind - 12 * fling) * k;
        P.body.rot = 2 * fling * k;
    },
    srn_undertow(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 6);
        P.body.rot = 3 * w * env;
        P.body.dy = 4 * Math.abs(w) * env;
        P.handR.rot = -10 * w * env;
        P.conch.rot = 6 * w * env;
    },
    srn_reply(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.conch.rot = 16 * env; P.conch.dy = 10 * env;
        P.handR.rot = -14 * env; P.handR.dy = -8 * env;
        P.body.dy = -3 * env;
    },
});
Object.assign(FX, {
    srn_wail(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.2);
        const [x, y] = at('conch', 150, 215);
        for (let i = 0; i < 6; i++) {
            const k = (u * 2.2 + i / 6) % 1;
            const r = 20 + k * 340;
            ctx.strokeStyle = 'rgba(160,240,230,' + (env * (1 - k)) + ')'; ctx.lineWidth = 10 * (1 - k) + 2;
            ctx.beginPath(); ctx.arc(x, y, r, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();
        }
        return 0;
    },
    srn_frost(ctx, u) { _cueFrost(ctx, u, [450, 260]); return 0; },
    srn_undertow(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        for (let i = 0; i < 4; i++) {
            const a0 = -u * 18 + i * Math.PI / 2;
            ctx.strokeStyle = 'rgba(170,240,255,' + (0.7 * env) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.ellipse(270, 400, 230 - i * 40, 70 - i * 12, 0, a0, a0 + 1.4); ctx.stroke();
        }
        for (let i = 0; i < 10; i++) {
            const k = (u * 1.5 + i / 10) % 1, a = i * 0.63 - k * 4, r = 260 * (1 - k);
            _cueGlow(ctx, 270 + Math.cos(a) * r, 400 + Math.sin(a) * r * 0.3, 10, '220,250,255', env * k);
        }
        return 0;
    },
    srn_reply(ctx, u) {
        const env = envOf(u, 0.25, 0.25);
        for (let i = 0; i < 4; i++) {
            const k = 1 - ((u * 1.8 + i / 4) % 1);
            ctx.strokeStyle = 'rgba(160,240,230,' + (env * (1 - k)) + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(270, 230, 40 + k * 320, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(220,255,250,' + env + ')'; ctx.font = 'bold 34px serif'; ctx.textAlign = 'center';
        ['♪', '♫', '♪'].forEach((n, i) => {
            const k = (u * 1.2 + i / 3) % 1;
            ctx.fillText(n, 60 + i * 190 + 20 * Math.sin(k * 6), 120 + 200 * k);
        });
        return 0;
    },
});
// <<< poses boss_siren

// >>> poses boss_snail
// ---- The Snail -------------------------------------------------------------
// Doom Snail: the eye stalks swivel, the shell rune ring glows and spins and
//   a slime trail oozes forward. Corrupt Cells: the shell rocks and spits
//   tainted cells.
Object.assign(POSES, {
    snl_doom(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 4);
        P.eyeL.rot = 14 * w * env; P.eyeR.rot = -14 * w * env;
        P.shell.rot = 3 * w * env;
        P.body.dx = -6 * env;
    },
    snl_corrupt(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 8);
        P.shell.rot = 5 * w * env; P.shell.dy = -6 * env;
        P.eyeL.dy = P.eyeR.dy = 6 * env;
    },
});
Object.assign(FX, {
    snl_doom(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25);
        const [cx, cy] = at('shell', 296, 252);
        _cueGlow(ctx, cx, cy, 120, '90,230,240', 0.5 * env);
        ctx.strokeStyle = 'rgba(140,250,250,' + env + ')'; ctx.lineWidth = 4;
        ctx.setLineDash([18, 14]); ctx.lineDashOffset = -u * 400;
        ctx.beginPath(); ctx.arc(cx, cy, 80, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 45, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        // slime oozing forward
        const k = ease((u - 0.2) / 0.6);
        ctx.fillStyle = 'rgba(90,200,150,' + (0.5 * env) + ')';
        ctx.beginPath(); ctx.ellipse(60 - 120 * k, 400, 80 + 60 * k, 14, 0, 0, 7); ctx.fill();
        return 0;
    },
    snl_corrupt(ctx, u) { _cueCorrupt(ctx, u, [296, 200], '90,220,230'); return 0; },
});
// <<< poses boss_snail

// >>> poses boss_sprout
// ---- The Sprout ------------------------------------------------------------
// Sproutlings: it hops, its leaves flutter, and little sprouts pop out of the
//   ground around it. Prior Bomb: it shakes its leaves and seed bombs fly out.
Object.assign(POSES, {
    spr_sprouts(P, u) {
        const hop = Math.sin(Math.min(1, u / 0.4) * Math.PI);
        const env = envOf(u, 0.15, 0.25);
        P.body.dy = -30 * hop;
        P.body.sx = 1 + 0.06 * (1 - hop) * env; P.body.sy = 1 - 0.06 * (1 - hop) * env;
        P.leaves.rot = 8 * Math.sin(u * Math.PI * 8) * env;
        P.leaves.sc = 1 + 0.05 * env;
    },
    spr_bomb(P, u) {
        const env = envOf(u, 0.15, 0.3), w = Math.sin(u * 50) * (u < 0.45 ? 1 : 0);
        P.leaves.rot = 10 * w * env;
        P.body.rot = 3 * w * env;
        P.body.dy = -6 * ease((u - 0.4) / 0.1) * (1 - ease((u - 0.6) / 0.3));
    },
});
Object.assign(FX, {
    spr_sprouts(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        [[60, 470], [150, 500], [360, 500], [450, 470]].forEach(([x, y], i) => {
            const k = ease((u - 0.35 - i * 0.07) / 0.2);
            if (k <= 0) return;
            ctx.fillStyle = 'rgba(120,80,50,' + fade + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 24, 7, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(90,170,80,' + fade + ')'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30 * k); ctx.stroke();
            ctx.fillStyle = 'rgba(110,200,90,' + fade + ')';
            ctx.beginPath(); ctx.ellipse(x - 12 * k, y - 32 * k, 12 * k, 6 * k, -0.5, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 12 * k, y - 34 * k, 12 * k, 6 * k, 0.5, 0, 7); ctx.fill();
        });
        return 0;
    },
    spr_bomb(ctx, u) { _cueBombs(ctx, u, [256, 90], '140,220,100'); return 0; },
});
// <<< poses boss_sprout

// >>> poses boss_shrine
// ---- The Shrine Maiden -----------------------------------------------------
// Knot Barriers: she sweeps the gohei staff and sacred ropes with zig-zag
//   papers stretch across the board. Fated Cell: a bow of the head and a
//   reticle locks on. Mirror Spirits: two pale copies of her drift out to the
//   sides. Ofuda Ward: paper charms fly up and wheel round her in a ring.
Object.assign(POSES, {
    shr_knots(P, u) {
        const wind = ease(u / 0.3), sweep = ease((u - 0.3) / 0.2), rest = ease((u - 0.7) / 0.3);
        const k = 1 - rest;
        P.staff.rot = (16 * wind * (1 - sweep) - 26 * sweep) * k;
        P.head.rot = (-3 * wind + 3 * sweep) * k;
        P.body.rot = -1.5 * sweep * k;
    },
    shr_fate(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.head.rot = 6 * env; P.head.dy = 4 * env;
        P.staff.rot = -6 * env;
    },
    shr_mirror(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.staff.rot = -12 * env;
        P.head.rot = -4 * Math.sin(u * Math.PI * 2) * env;
    },
    shr_ward(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.staff.rot = -20 * env; P.staff.dy = -12 * env;
        P.head.dy = -3 * env;
        P.body.dy = -3 * env;
    },
});
Object.assign(FX, {
    shr_knots(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [400, 470].forEach((y, r) => {
            const k = ease((u - 0.35 - r * 0.1) / 0.25);
            if (k <= 0) return;
            const x2 = -20 + 552 * k;
            ctx.strokeStyle = 'rgba(200,160,90,' + fade + ')'; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(-20, y); ctx.quadraticCurveTo(x2 / 2, y + 24, x2, y); ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const x = 30 + i * 85;
                if (x > x2) break;
                ctx.strokeStyle = 'rgba(250,248,240,' + fade + ')'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + 10, y + 22); ctx.lineTo(x, y + 34); ctx.lineTo(x + 10, y + 46); ctx.stroke();
            }
        });
        return 0;
    },
    shr_fate(ctx, u) { _cueFate(ctx, u, 256, 470, '220,60,70'); return 0; },
    shr_mirror(ctx, u) {
        // two round spirit mirrors drift out to the sides, flashing a sheen
        const env = envOf(u, 0.2, 0.25), k = ease((u - 0.1) / 0.5);
        [-1, 1].forEach((s, i) => {
            const x = 256 + s * 190 * k, y = 300 - 40 * k + 8 * Math.sin(u * 10 + i);
            _cueGlow(ctx, x, y, 80, '200,230,255', 0.5 * env);
            ctx.fillStyle = 'rgba(190,140,70,' + env + ')'; ctx.strokeStyle = 'rgba(90,50,20,' + env + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(215,235,250,' + env + ')';
            ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill();
            const sh = (u * 2 + i * 0.5) % 1;
            ctx.strokeStyle = 'rgba(255,255,255,' + (env * Math.sin(sh * Math.PI)) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(x - 30 + 60 * sh, y - 20); ctx.lineTo(x - 50 + 60 * sh, y + 20); ctx.stroke();
            ctx.strokeStyle = 'rgba(220,60,70,' + env + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y + 44); ctx.lineTo(x - 8, y + 70); ctx.moveTo(x, y + 44); ctx.lineTo(x + 8, y + 70); ctx.stroke();
        });
        return 0;
    },
    shr_ward(ctx, u) {
        const env = envOf(u, 0.2, 0.25), r = 60 + 190 * ease(u / 0.5);
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 + u * 5;
            const x = 256 + Math.cos(a) * r, y = 250 + Math.sin(a) * r * 0.85;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
            ctx.fillStyle = 'rgba(250,240,215,' + env + ')'; ctx.strokeStyle = 'rgba(80,30,110,' + env + ')'; ctx.lineWidth = 3;
            ctx.fillRect(-14, -24, 28, 48); ctx.strokeRect(-14, -24, 28, 48);
            ctx.strokeStyle = 'rgba(200,40,50,' + env + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.stroke();
            ctx.restore();
        }
        return 0;
    },
});
// <<< poses boss_shrine

// >>> poses boss_stack
// ---- The Stack -------------------------------------------------------------
// Block Fall: the head block chomps and puzzle blocks tumble down onto the
//   board. Fog Bank: the tower sways and grey dust rolls in. Probability
//   Shift: the loose top block flips over and marks hop between cells.
Object.assign(POSES, {
    stk_fall(P, u) {
        const env = envOf(u, 0.15, 0.25), chomp = Math.abs(Math.sin(u * Math.PI * 5));
        P.head.rot = -6 * chomp * env; P.head.dy = -6 * chomp * env;
        P.blockTL.rot = -10 * env;
        P.body.dy = 3 * chomp * env;
    },
    stk_fog(P, u) {
        const env = envOf(u, 0.25, 0.25), w = Math.sin(u * Math.PI * 4);
        P.body.rot = 2 * w * env;
        P.head.rot = 4 * w * env;
        P.blockTL.rot = -6 * w * env;
    },
    stk_shift(P, u) {
        const flip = ease((u - 0.1) / 0.4);
        P.blockTL.rot = -180 * flip * (1 - ease((u - 0.6) / 0.35));
        P.blockTL.dy = -40 * Math.sin(Math.min(1, flip) * Math.PI);
        P.head.rot = 4 * envOf(u, 0.2, 0.25);
    },
});
Object.assign(FX, {
    stk_fall(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 5; i++) {
            const k = ease((u - 0.15 - i * 0.07) / 0.3);
            if (k <= 0) continue;
            const x = 40 + i * 108, y = -80 + 560 * k;
            ctx.save(); ctx.translate(x, y); ctx.rotate((1 - k) * (i % 2 ? 2 : -2));
            ctx.fillStyle = (i % 2 ? 'rgba(170,120,80,' : 'rgba(100,150,140,') + fade + ')';
            ctx.strokeStyle = 'rgba(30,30,35,' + fade + ')'; ctx.lineWidth = 4;
            ctx.fillRect(-26, -26, 52, 52); ctx.strokeRect(-26, -26, 52, 52);
            ctx.beginPath(); ctx.arc(26, 0, 10, -1.5, 1.5); ctx.stroke();
            ctx.restore();
        }
        return 0;
    },
    stk_fog(ctx, u) { _cueFog(ctx, u, '150,160,155'); return 0; },
    stk_shift(ctx, u) { _cueShift(ctx, u, '255,200,90'); return 0; },
});
// <<< poses boss_stack

// >>> poses boss_sirus
// ---- The Stormcaller -------------------------------------------------------
// Ion Current: the dice staff crackles and a current of sparks flows in a
//   wave across the board. Probability Shift: the rune storm spins and marks
//   hop. Chain Lightning: a bolt jumps from the staff through three cells.
// Storm Eye: the hand lifts the whirlwind high and it grows into a ring.
Object.assign(POSES, {
    sir_ion(P, u) {
        const env = envOf(u, 0.2, 0.25), j = Math.sin(u * 70) * env;
        P.staff.rot = (8 + 2 * j) * env; P.staff.dy = -8 * env;
        P.body.dx = j;
    },
    sir_shift(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.storm.rot = 20 * Math.sin(u * Math.PI * 4) * env;
        P.handR.rot = -8 * env;
    },
    sir_chain(P, u) {
        const wind = ease(u / 0.3), strike = ease((u - 0.3) / 0.08), k = 1 - ease((u - 0.7) / 0.3);
        P.staff.rot = (14 * wind * (1 - strike) - 14 * strike) * k;
        P.body.rot = -2 * strike * k;
    },
    sir_eye(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.handR.rot = -16 * env; P.handR.dy = -18 * env;
        P.storm.dy = -24 * env; P.storm.sc = 1 + 0.15 * env;
        P.storm.rot = 15 * Math.sin(u * 20) * env;
    },
});
Object.assign(FX, {
    sir_ion(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25), [sx, sy] = at('staff', 80, 110);
        _cueGlow(ctx, sx, sy, 90, '160,230,255', 0.7 * env);
        for (let i = 0; i < 18; i++) {
            const k = (u * 1.6 + i / 18) % 1;
            const x = -20 + 560 * k, y = 470 + 30 * Math.sin(k * 12 + i);
            _cueGlow(ctx, x, y, 12, '200,245,255', env * Math.sin(k * Math.PI));
        }
        return 0;
    },
    sir_shift(ctx, u) { _cueShift(ctx, u, '160,230,255'); return 0; },
    sir_chain(ctx, u, dy, at) {
        if (u < 0.32) return 0;
        const a = 1 - ease((u - 0.6) / 0.3), [sx, sy] = at('staff', 80, 110);
        const pts = [[sx, sy], [180, 470], [330, 440], [460, 490]];
        const n = Math.min(3, Math.floor((u - 0.32) / 0.06) + 1);
        ctx.strokeStyle = 'rgba(220,245,255,' + a + ')'; ctx.lineWidth = 5;
        for (let s = 0; s < n; s++) {
            const [x1, y1] = pts[s], [x2, y2] = pts[s + 1];
            ctx.beginPath(); ctx.moveTo(x1, y1);
            for (let j = 1; j < 6; j++) ctx.lineTo(x1 + (x2 - x1) * j / 6 + ((j * 37 + s * 11) % 30) - 15, y1 + (y2 - y1) * j / 6 + ((j * 23) % 20) - 10);
            ctx.lineTo(x2, y2); ctx.stroke();
            _cueGlow(ctx, x2, y2, 40, '180,235,255', a);
        }
        return u > 0.32 && u < 0.36 ? 0.15 : 0;
    },
    sir_eye(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25), [x, y] = at('storm', 430, 100);
        for (let i = 0; i < 3; i++) {
            const r = 60 + i * 50 + 60 * ease(u / 0.6), a0 = u * 12 * (i % 2 ? -1 : 1);
            ctx.strokeStyle = 'rgba(170,230,255,' + (0.7 * env) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, a0, a0 + 4); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_sirus

// >>> poses boss_stormqueen
// ---- The Stormqueen --------------------------------------------------------
// Queen Storms: she raises the lightning staff, the crown flares and bolts
//   rain down around her. Shrapnel Downpour: the open hand flings and dice
//   shards pelt the ground. Fated Cell: a regal nod and a reticle locks on.
Object.assign(POSES, {
    sq_storms(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.bolt.rot = 10 * env; P.bolt.dy = -16 * env;
        P.crown.dy = -4 * env;
        P.handR.rot = -10 * env;
    },
    sq_shrapnel(P, u) {
        const wind = ease(u / 0.3), fling = ease((u - 0.3) / 0.1), k = 1 - ease((u - 0.65) / 0.35);
        P.handR.rot = (14 * wind * (1 - fling) - 26 * fling) * k;
        P.handR.dy = (8 * wind - 14 * fling) * k;
        P.body.rot = 2 * fling * k;
    },
    sq_fate(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.crown.rot = 5 * env; P.crown.dy = 3 * env;
        P.bolt.rot = -6 * env;
    },
});
Object.assign(FX, {
    sq_storms(ctx, u, dy, at) {
        const fade = 1 - ease((u - 0.85) / 0.15), [cx, cy] = at('crown', 256, 70);
        _cueGlow(ctx, cx, cy, 70, '200,190,255', 0.6 * envOf(u, 0.2, 0.25));
        [[60, 0.3], [440, 0.4], [180, 0.5], [340, 0.6]].forEach(([x0, t0], i) => {
            const t = (u - t0) / 0.18;
            if (t <= 0 || t > 1) return;
            const a = (1 - t) * fade;
            let x = x0, y = -60;
            ctx.strokeStyle = 'rgba(210,220,255,' + a + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (let s = 0; s < 6; s++) { x += ((i * 41 + s * 53) % 50) - 25; y += 95; ctx.lineTo(x, y); }
            ctx.stroke();
            _cueGlow(ctx, x, y, 50, '200,200,255', a);
        });
        return 0;
    },
    sq_shrapnel(ctx, u) {
        if (u < 0.32) return 0;
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 9; i++) {
            const k = ease((u - 0.32 - i * 0.03) / 0.35);
            if (k <= 0) continue;
            const tx = 30 + i * 55, ty = 480 - (i % 3) * 15;
            const x = 390 + (tx - 390) * k, y = 170 + (ty - 170) * k - 120 * Math.sin(k * Math.PI);
            ctx.save(); ctx.translate(x, y); ctx.rotate(k * 9 + i);
            ctx.fillStyle = 'rgba(170,150,230,' + fade + ')'; ctx.strokeStyle = 'rgba(40,30,80,' + fade + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(11, 6); ctx.lineTo(-11, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        return 0;
    },
    sq_fate(ctx, u) { _cueFate(ctx, u, 256, 470, '200,180,255'); return 0; },
});
// <<< poses boss_stormqueen


// >>> poses boss_swarm
// ---- The Swarm -------------------------------------------------------------
// Swarm Arc: the little saucers loop out in a wide arc and zip back. Prior
//   Bomb: the mothership dips and saucers drop fused bombs. Mimic Queen: the
//   top dome lifts, eyes flash and a violet copy of the mothership flickers.
// Hive Eye: the top tilts and a purple tractor beam sweeps the ground.
const SWM_UFOS = ['ufoA', 'ufoB', 'ufoC', 'ufoD'];
Object.assign(POSES, {
    swm_arc(P, u) {
        const env = envOf(u, 0.15, 0.2);
        SWM_UFOS.forEach((n, i) => {
            const a = u * Math.PI * 2 + i;
            P[n].dx = Math.cos(a) * 60 * env * (i < 2 ? 1 : -1);
            P[n].dy = Math.sin(a) * 40 * env;
        });
        P.body.rot = 3 * Math.sin(u * Math.PI * 2) * env;
    },
    swm_bomb(P, u) {
        const env = envOf(u, 0.2, 0.3);
        P.body.dy = 10 * env; P.top.dy = 8 * env;
        SWM_UFOS.forEach((n, i) => { P[n].dy = 30 * env + 6 * Math.sin(u * 20 + i); });
    },
    swm_mimic(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.top.dy = -18 * env; P.top.rot = 6 * Math.sin(u * 30) * env;
        P.body.sc = 1 + 0.03 * env;
    },
    swm_eye(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.top.rot = 10 * Math.sin(u * Math.PI * 2) * env;
        P.body.rot = 4 * Math.sin(u * Math.PI * 2) * env;
    },
});
Object.assign(FX, {
    swm_arc(ctx, u) {
        const env = envOf(u, 0.15, 0.2);
        ctx.strokeStyle = 'rgba(220,235,255,' + (0.5 * env) + ')'; ctx.lineWidth = 5;
        ctx.setLineDash([20, 16]); ctx.lineDashOffset = -u * 500;
        ctx.beginPath(); ctx.ellipse(256, 200, 280, 140, 0, 0, 7); ctx.stroke();
        ctx.setLineDash([]);
        return 0;
    },
    swm_bomb(ctx, u) { _cueBombs(ctx, u, [256, 330], '200,110,255'); return 0; },
    swm_mimic(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25), fl = Math.sin(u * 40) > 0 ? 1 : 0.4;
        [[230, 100], [150, 210], [350, 210]].forEach(([x, y]) => { const [ex, ey] = at('body', x, y); _cueGlow(ctx, ex, ey, 30, '230,140,255', env * fl); });
        ctx.strokeStyle = 'rgba(200,110,255,' + (0.6 * env * fl) + ')'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(256 + 30 * Math.sin(u * 9), 220, 230, 60, 0, 0, 7); ctx.stroke();
        return 0;
    },
    swm_eye(ctx, u) {
        const env = envOf(u, 0.2, 0.25), x = 256 + 200 * Math.sin(u * Math.PI * 2);
        const g = ctx.createLinearGradient(0, 300, 0, 500);
        g.addColorStop(0, 'rgba(210,120,255,' + (0.7 * env) + ')'); g.addColorStop(1, 'rgba(210,120,255,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(240, 300); ctx.lineTo(272, 300); ctx.lineTo(x + 60, 500); ctx.lineTo(x - 60, 500); ctx.closePath(); ctx.fill();
        return 0;
    },
});
// <<< poses boss_swarm

// >>> poses boss_tactician
// ---- The Tactician ---------------------------------------------------------
// Battle Intent: the staff points, the die glows and red arrows sweep out
//   over the board like a battle plan. Fog Bank: the chessboard tilts and the
//   fog of war rolls in.
Object.assign(POSES, {
    tac_intent(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.staff.rot = -14 * env; P.staff.dx = -6 * env;
        P.board.rot = -3 * env;
        P.body.rot = -1.5 * env;
    },
    tac_fog(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.board.rot = 6 * env; P.board.dy = -6 * env;
        P.staff.rot = 4 * env;
    },
});
Object.assign(FX, {
    tac_intent(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25), [sx, sy] = at('staff', 420, 110);
        _cueGlow(ctx, sx, sy, 80, '200,230,240', 0.7 * env);
        [[60, 470, 200, 400], [250, 500, 330, 420], [450, 470, 360, 400]].forEach(([x1, y1, x2, y2], i) => {
            const k = ease((u - 0.2 - i * 0.1) / 0.3);
            if (k <= 0) return;
            const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
            ctx.strokeStyle = 'rgba(230,70,70,' + env + ')'; ctx.lineWidth = 6;
            ctx.setLineDash([12, 8]);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
            ctx.setLineDash([]);
            const a = Math.atan2(y2 - y1, x2 - x1);
            ctx.fillStyle = 'rgba(230,70,70,' + env + ')';
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
            ctx.lineTo(x + Math.cos(a + 2.4) * 14, y + Math.sin(a + 2.4) * 14); ctx.lineTo(x + Math.cos(a - 2.4) * 14, y + Math.sin(a - 2.4) * 14); ctx.fill();
        });
        return 0;
    },
    tac_fog(ctx, u) { _cueFog(ctx, u, '170,180,190'); return 0; },
});
// <<< poses boss_tactician

// >>> poses boss_thwomp
// ---- The Thwomp ------------------------------------------------------------
// Soul Tithe: the block shudders and soul wisps are sucked into its face.
// Corrupt Cells: it lifts, slams down and tainted cells crack out of the floor.
Object.assign(POSES, {
    thw_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25), j = Math.sin(u * 60) * env;
        P.body.dx = 2 * j; P.body.sc = 1 + 0.03 * env;
    },
    thw_corrupt(P, u) {
        const lift = ease(u / 0.35), slam = ease((u - 0.35) / 0.06), k = 1 - ease((u - 0.65) / 0.35);
        P.body.dy = (-40 * lift * (1 - slam)) * k;
        P.body.sx = 1 + 0.08 * slam * k; P.body.sy = 1 - 0.08 * slam * k;
    },
});
Object.assign(FX, {
    thw_tithe(ctx, u) { _cueTithe(ctx, u, 300, 300, '150,240,180'); return 0; },
    thw_corrupt(ctx, u) {
        if (u > 0.4 && u < 0.7) {
            const d = (u - 0.4) / 0.3;
            ctx.strokeStyle = 'rgba(220,220,210,' + (0.7 * (1 - d)) + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.ellipse(256, 470, 220 + 80 * d, 20 + 10 * d, 0, 0, 7); ctx.stroke();
        }
        if (u > 0.38) _cueCorrupt(ctx, (u - 0.38) / 0.62, [256, 470], '90,220,150');
        return u > 0.36 && u < 0.4 ? 0.15 : 0;
    },
});
// <<< poses boss_thwomp

// >>> poses boss_striker
// ---- The Striker -----------------------------------------------------------
// Prior Bomb: he winds the back leg up, the glowing ball spins, then he
//   kicks it and fused bombs scatter from the impact.
Object.assign(POSES, {
    str_kick(P, u) {
        const wind = ease(u / 0.35), kick = ease((u - 0.35) / 0.08), k = 1 - ease((u - 0.65) / 0.35);
        P.legR.rot = (-26 * wind * (1 - kick) + 30 * kick) * k;
        P.body.rot = (-3 * wind + 4 * kick) * k;
        P.ball.rot = 360 * ease(u);
        P.ball.dx = -30 * kick * k; P.ball.dy = -40 * Math.sin(kick * Math.PI) * k;
    },
});
Object.assign(FX, {
    str_kick(ctx, u) {
        _cueGlow(ctx, 138, 428, 90, '90,230,255', 0.5 * envOf(u, 0.15, 0.3));
        _cueBombs(ctx, u, [138, 410], '90,230,255');
        return 0;
    },
});
// <<< poses boss_striker

// >>> poses boss_tron
// ---- The Tron --------------------------------------------------------------
// Light Cycle: the rider leans in, the bike lurches forward and a glowing
//   light trail streaks out behind it. Corrupt Cells: the grid wave behind
//   glitches and spits tainted cells.
Object.assign(POSES, {
    trn_cycle(P, u) {
        const lean = ease(u / 0.3), go = ease((u - 0.3) / 0.1), k = 1 - ease((u - 0.7) / 0.3);
        P.body.dx = (-8 * lean * (1 - go) + 24 * go) * k;
        P.body.rot = (-2 * lean + 3 * go) * k;
        P.head.rot = 6 * lean * k;
        P.wheelF.rot = 720 * u;
        P.wave.sx = 1 + 0.15 * go * k;
    },
    trn_corrupt(P, u) {
        const env = envOf(u, 0.15, 0.25), j = Math.sin(u * 80) * env;
        P.wave.dx = 4 * j; P.wave.dy = -2 * j;
        P.head.rot = 3 * env;
    },
});
Object.assign(FX, {
    trn_cycle(ctx, u) {
        if (u < 0.3) return 0;
        const k = ease((u - 0.3) / 0.4), fade = 1 - ease((u - 0.75) / 0.25);
        ctx.fillStyle = 'rgba(90,240,255,' + (0.6 * fade) + ')';
        ctx.fillRect(-150, 395, 170 + 200 * k, 12);
        ctx.fillStyle = 'rgba(230,255,255,' + fade + ')';
        ctx.fillRect(-150, 399, 170 + 200 * k, 4);
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = 'rgba(150,250,255,' + (0.5 * fade) + ')'; ctx.lineWidth = 3;
            const y = 200 + i * 40, x = -60 - ((u * 900 + i * 60) % 160);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 100, y); ctx.stroke();
        }
        return 0;
    },
    trn_corrupt(ctx, u) { _cueCorrupt(ctx, u, [400, 230], '90,240,255'); return 0; },
});
// <<< poses boss_tron

// >>> poses boss_velocity
// ---- The Velocity ----------------------------------------------------------
// Speed Lanes: it pumps its arms, the gauge needles spin and three glowing
//   lanes rush across with arrows. Corrupt Cells: it skids to a stop and
//   tainted cells scatter in its wake.
Object.assign(POSES, {
    vel_lanes(P, u) {
        const env = envOf(u, 0.15, 0.2), pump = Math.sin(u * Math.PI * 10);
        P.fistR.rot = 20 * pump * env; P.fistL.rot = -20 * pump * env;
        P.body.dy = -4 * Math.abs(pump) * env;
        P.head.rot = 2 * pump * env;
    },
    vel_corrupt(P, u) {
        const skid = ease(u / 0.3), k = 1 - ease((u - 0.6) / 0.4);
        P.body.rot = -6 * skid * k; P.body.dx = 10 * skid * k;
        P.head.rot = -4 * skid * k;
    },
});
Object.assign(FX, {
    vel_lanes(ctx, u, dy, at) {
        const env = envOf(u, 0.15, 0.2);
        [[180, 210], [255, 210]].forEach(([x, y]) => {
            const [gx, gy] = at('head', x, y), a = u * 30;
            ctx.strokeStyle = 'rgba(255,90,80,' + env + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * 22, gy + Math.sin(a) * 22); ctx.stroke();
        });
        [420, 465, 510].forEach((y, i) => {
            const off = (u * 1200 + i * 90) % 140;
            ctx.fillStyle = 'rgba(120,230,255,' + (0.3 * env) + ')'; ctx.fillRect(-40, y - 14, 592, 28);
            ctx.fillStyle = 'rgba(230,255,255,' + (0.9 * env) + ')';
            for (let x = 500 - off; x > -60; x -= 140) {
                ctx.beginPath(); ctx.moveTo(x - 22, y - 10); ctx.lineTo(x - 30, y); ctx.lineTo(x - 22, y + 10); ctx.lineTo(x - 40, y); ctx.fill();
            }
        });
        return 0;
    },
    vel_corrupt(ctx, u) { _cueCorrupt(ctx, u, [200, 380], '230,200,90'); return 0; },
});
// <<< poses boss_velocity

// >>> poses boss_vise
// ---- The Vise --------------------------------------------------------------
// Crushing Walls: both arms push inward and two brick walls slide in from the
//   sides. Probability Shift: the jaw clacks and marks hop. Bench Vise: the
//   jaw clamps down hard with a shudder. Quench or Shatter: the fist glows
//   red-hot, then steam hisses up as it is quenched.
Object.assign(POSES, {
    vis_walls(P, u) {
        const env = envOf(u, 0.25, 0.25);
        P.armL.dx = 22 * env; P.armL.rot = -8 * env;
        P.armR.dx = -22 * env; P.armR.rot = 8 * env;
        P.body.sc = 1 - 0.02 * env;
    },
    vis_shift(P, u) {
        const env = envOf(u, 0.2, 0.25), clack = Math.abs(Math.sin(u * Math.PI * 6));
        P.jaw.dy = 10 * clack * env;
        P.armR.rot = -6 * env;
    },
    vis_bench(P, u) {
        const open = ease(u / 0.35), clamp = ease((u - 0.35) / 0.06), k = 1 - ease((u - 0.7) / 0.3);
        P.jaw.dy = (16 * open * (1 - clamp) - 4 * clamp) * k;
        P.body.dy = 5 * clamp * k;
        P.armL.rot = 6 * clamp * k; P.armR.rot = -6 * clamp * k;
    },
    vis_quench(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.armR.rot = -16 * env; P.armR.dy = -12 * env;
        P.body.rot = -1.5 * env;
    },
});
Object.assign(FX, {
    vis_walls(ctx, u) {
        const env = envOf(u, 0.25, 0.25), k = ease((u - 0.1) / 0.5);
        [-1, 1].forEach((s) => {
            const x = s < 0 ? -140 + 140 * k : 512 + 80 - 140 * k;
            ctx.fillStyle = 'rgba(190,90,70,' + env + ')'; ctx.strokeStyle = 'rgba(60,25,20,' + env + ')'; ctx.lineWidth = 3;
            for (let r = 0; r < 8; r++) for (let c = 0; c < 2; c++) {
                const bx = x - 30 + c * 30 + (r % 2 ? 15 : 0), by = 60 + r * 52;
                ctx.fillRect(bx - 30, by, 28, 24); ctx.strokeRect(bx - 30, by, 28, 24);
            }
        });
        return 0;
    },
    vis_shift(ctx, u) { _cueShift(ctx, u, '230,180,90'); return 0; },
    vis_bench(ctx, u) {
        if (u < 0.38) return 0;
        const d = (u - 0.38) / 0.4;
        if (d > 1) return 0;
        ctx.strokeStyle = 'rgba(255,230,180,' + (1 - d) + ')'; ctx.lineWidth = 6;
        for (let i = 0; i < 8; i++) {
            const a = Math.PI * (0.1 + i * 0.1), r1 = 100, r2 = 100 + 60 * d;
            ctx.beginPath(); ctx.moveTo(265 + Math.cos(a) * r1, 205 - Math.sin(a) * r1 * 0.4); ctx.lineTo(265 + Math.cos(a) * r2, 205 - Math.sin(a) * r2 * 0.4); ctx.stroke();
        }
        return u > 0.36 && u < 0.4 ? 0.12 : 0;
    },
    vis_quench(ctx, u, dy, at) {
        const [x, y] = at('armR', 440, 310), heat = ease(u / 0.45) * (1 - ease((u - 0.5) / 0.15));
        _cueGlow(ctx, x, y, 80, '255,110,40', 0.9 * heat);
        if (u > 0.5) for (let i = 0; i < 8; i++) {
            const k = ((u - 0.5) * 2.5 + i / 8) % 1;
            _cueGlow(ctx, x - 30 + i * 9, y - k * 200, 20 + k * 30, '230,235,240', 0.6 * (1 - k) * (1 - ease((u - 0.85) / 0.15)));
        }
        return 0;
    },
});
// <<< poses boss_vise

// >>> poses boss_voidborn
// ---- The Voidborn ----------------------------------------------------------
// Void Choice: the hood tilts left and right as two violet portals open, one
//   glowing, one dark. Void Tendrils: the tendril whips and shadowy tentacles
//   rise from the ground. Prior Bomb: the horn blade flares and lobs bombs.
Object.assign(POSES, {
    vdb_choice(P, u) {
        const env = envOf(u, 0.2, 0.25), s = Math.sin(u * Math.PI * 3);
        P.body.rot = 4 * s * env;
        P.horn.rot = 6 * s * env;
    },
    vdb_tendrils(P, u) {
        const env = envOf(u, 0.2, 0.25), w = Math.sin(u * Math.PI * 6);
        P.tendrilL.rot = -20 * w * env;
        P.body.dy = -4 * env;
        P.horn.rot = -4 * env;
    },
    vdb_bomb(P, u) {
        const wind = ease(u / 0.35), swing = ease((u - 0.35) / 0.1), k = 1 - ease((u - 0.65) / 0.35);
        P.horn.rot = (-10 * wind * (1 - swing) + 18 * swing) * k;
        P.body.rot = (-2 * wind + 3 * swing) * k;
    },
});
Object.assign(FX, {
    vdb_choice(ctx, u) {
        const env = envOf(u, 0.2, 0.25), k = ease(u / 0.4);
        [[90, 1], [430, 0]].forEach(([x, lit]) => {
            const r = 55 * k;
            ctx.fillStyle = lit ? 'rgba(200,120,255,' + (0.5 * env) + ')' : 'rgba(20,10,30,' + (0.85 * env) + ')';
            ctx.beginPath(); ctx.ellipse(x, 430, r, r * 1.3, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(220,150,255,' + env + ')'; ctx.lineWidth = 5;
            ctx.setLineDash([14, 10]); ctx.lineDashOffset = u * 200 * (lit ? 1 : -1);
            ctx.beginPath(); ctx.ellipse(x, 430, r, r * 1.3, 0, 0, 7); ctx.stroke();
            ctx.setLineDash([]);
        });
        return 0;
    },
    vdb_tendrils(ctx, u) {
        const fade = 1 - ease((u - 0.8) / 0.2);
        [70, 200, 330, 450].forEach((x, i) => {
            const k = ease((u - 0.2 - i * 0.06) / 0.25);
            if (k <= 0) return;
            const h = 150 * k;
            ctx.strokeStyle = 'rgba(70,60,95,' + fade + ')'; ctx.lineWidth = 18; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, 500);
            ctx.quadraticCurveTo(x + 40 * Math.sin(u * 8 + i), 500 - h / 2, x + 20 * Math.sin(u * 10 + i), 500 - h); ctx.stroke();
            ctx.strokeStyle = 'rgba(200,130,255,' + (0.7 * fade) + ')'; ctx.lineWidth = 4; ctx.stroke();
            ctx.lineCap = 'butt';
        });
        return 0;
    },
    vdb_bomb(ctx, u) { _cueBombs(ctx, u, [340, 80], '210,120,255'); return 0; },
});
// <<< poses boss_voidborn

// >>> poses boss_warden
// ---- The Warden ------------------------------------------------------------
// Pulse Totems: the lantern lifts and pulses, and three glowing totems rise
//   from the floor and ring out. Frozen Cells: the open hand flings ice.
// Arc Link: the lantern sparks and arcs of light link the totems together.
Object.assign(POSES, {
    wrd_totems(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.lantern.rot = 8 * env; P.lantern.dy = -14 * env;
        P.handR.rot = -6 * env;
    },
    wrd_frost(P, u) {
        const wind = ease(u / 0.25), fling = ease((u - 0.25) / 0.1), k = 1 - ease((u - 0.65) / 0.35);
        P.handR.rot = (14 * wind * (1 - fling) - 24 * fling) * k;
        P.body.rot = 1.5 * fling * k;
    },
    wrd_arc(P, u) {
        const env = envOf(u, 0.2, 0.25), j = Math.sin(u * 70) * env;
        P.lantern.rot = (10 + 2 * j) * env; P.lantern.dy = -10 * env;
        P.body.dx = 0.8 * j;
    },
});
// The three totem spots shared by the Warden's effects.
const WRD_TOTEMS = [[110, 480], [256, 505], [400, 480]];
// Draws a lit totem post at (x, y), raised by k (0..1).
function _wrdTotem(ctx, x, y, k, a) {
    const h = 70 * k;
    ctx.fillStyle = 'rgba(70,80,100,' + a + ')'; ctx.strokeStyle = 'rgba(200,170,90,' + a + ')'; ctx.lineWidth = 3;
    ctx.fillRect(x - 14, y - h, 28, h); ctx.strokeRect(x - 14, y - h, 28, h);
    _cueGlow(ctx, x, y - h, 26, '255,230,150', a * k);
}
Object.assign(FX, {
    wrd_totems(ctx, u, dy, at) {
        const fade = 1 - ease((u - 0.8) / 0.2), [lx, ly] = at('lantern', 50, 90);
        _cueGlow(ctx, lx, ly, 60 + 20 * Math.sin(u * 20), '255,230,150', 0.7 * envOf(u, 0.2, 0.25));
        WRD_TOTEMS.forEach(([x, y], i) => {
            const k = ease((u - 0.2 - i * 0.07) / 0.2);
            if (k <= 0) return;
            _wrdTotem(ctx, x, y, k, fade);
            const r = ((u - 0.4 - i * 0.07) * 2) % 1;
            if (u > 0.4 + i * 0.07) {
                ctx.strokeStyle = 'rgba(255,230,150,' + (0.7 * (1 - r) * fade) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.ellipse(x, y, 30 + 60 * r, 10 + 20 * r, 0, 0, 7); ctx.stroke();
            }
        });
        return 0;
    },
    wrd_frost(ctx, u) { _cueFrost(ctx, u, [460, 300]); return 0; },
    wrd_arc(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        WRD_TOTEMS.forEach(([x, y]) => _wrdTotem(ctx, x, y, 1, env));
        ctx.strokeStyle = 'rgba(255,245,200,' + env + ')'; ctx.lineWidth = 4;
        for (let s = 0; s < 2; s++) {
            const [x1, y1] = WRD_TOTEMS[s], [x2, y2] = WRD_TOTEMS[s + 1];
            if (((u * 12 + s) | 0) % 3 === 0) continue;
            ctx.beginPath(); ctx.moveTo(x1, y1 - 70);
            for (let j = 1; j < 6; j++) ctx.lineTo(x1 + (x2 - x1) * j / 6, y1 - 70 + (y2 - y1) * j / 6 + (((j * 31 + (u * 40 | 0)) % 26) - 13));
            ctx.lineTo(x2, y2 - 70); ctx.stroke();
        }
        return 0;
    },
});
// <<< poses boss_warden

// >>> poses boss_warlord
// ---- The Warlord -----------------------------------------------------------
// Guard Call: he raises the greatsword overhead and shouts, and two shield
//   guards stamp in. Triple Rings: three sword slams send three shockwave
//   rings out. Soul Tithe: the sword dips and wisps stream into the blade.
Object.assign(POSES, {
    wrl_guard(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.sword.rot = 12 * env; P.sword.dy = -14 * env;
        P.head.rot = -4 * env; P.head.dy = -4 * env;
    },
    wrl_rings(P, u) {
        let s = 0;
        for (let i = 0; i < 3; i++) { const t = (u - 0.1 - i * 0.25) / 0.2; if (t > 0 && t < 1) s = Math.max(s, Math.sin(t * Math.PI)); }
        P.sword.rot = -16 * s; P.sword.dy = 10 * s;
        P.body.dy = 4 * s;
        P.head.dy = 3 * s;
    },
    wrl_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.sword.rot = -8 * env;
        P.head.rot = 4 * env;
    },
});
Object.assign(FX, {
    wrl_guard(ctx, u) {
        const fade = 1 - ease((u - 0.85) / 0.15);
        for (let i = 0; i < 3; i++) {
            const r = (u * 1.4 - i * 0.2);
            if (r <= 0 || r > 1) continue;
            ctx.strokeStyle = 'rgba(255,150,110,' + (0.6 * (1 - r)) + ')'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.arc(312, 170, 40 + r * 200, -2.4, -0.7); ctx.stroke();
        }
        [-1, 1].forEach((s, i) => {
            const k = ease((u - 0.35 - i * 0.08) / 0.25);
            if (k <= 0) return;
            const x = 256 + s * (420 - 220 * k), y = 450;
            ctx.fillStyle = 'rgba(110,90,70,' + fade + ')'; ctx.strokeStyle = 'rgba(210,170,100,' + fade + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(x - 30, y - 50); ctx.lineTo(x + 30, y - 50); ctx.lineTo(x + 26, y + 20); ctx.lineTo(x, y + 45); ctx.lineTo(x - 26, y + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y + 30); ctx.moveTo(x - 18, y - 10); ctx.lineTo(x + 18, y - 10); ctx.stroke();
        });
        return 0;
    },
    wrl_rings(ctx, u) {
        for (let i = 0; i < 3; i++) {
            const t = (u - 0.2 - i * 0.25) / 0.45;
            if (t <= 0 || t > 1) continue;
            ctx.strokeStyle = 'rgba(240,220,180,' + (0.8 * (1 - t)) + ')'; ctx.lineWidth = 12 * (1 - t) + 2;
            ctx.beginPath(); ctx.ellipse(256, 480, 60 + t * 320, 16 + t * 70, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    wrl_tithe(ctx, u, dy, at) { const [x, y] = at('sword', 300, 130); _cueTithe(ctx, u, x, y, '230,120,110'); return 0; },
});
// <<< poses boss_warlord

// >>> poses boss_weaver
// ---- The Weaver ------------------------------------------------------------
// Thread Grid: the spider tugs the web, its eyes glow and glowing threads
//   lace across the board into a grid. Prior Bomb: the abdomen pulses and
//   lobs silk-wrapped bombs.
Object.assign(POSES, {
    wvr_grid(P, u) {
        const env = envOf(u, 0.2, 0.25), tug = Math.sin(u * Math.PI * 4);
        P.web.rot = 6 * tug * env; P.web.dx = -6 * env;
        P.head.rot = -3 * tug * env;
        P.abdomen.rot = 2 * tug * env;
    },
    wvr_bomb(P, u) {
        const pulse = ease(u / 0.35), out = ease((u - 0.35) / 0.1), k = 1 - ease((u - 0.65) / 0.35);
        P.abdomen.sc = 1 + (0.08 * pulse - 0.06 * out) * k;
        P.abdomen.rot = -6 * out * k;
        P.head.dy = 3 * out * k;
    },
});
Object.assign(FX, {
    wvr_grid(ctx, u, dy, at) {
        const env = envOf(u, 0.2, 0.25);
        [[205, 115], [250, 110], [295, 115]].forEach(([x, y]) => { const [ex, ey] = at('head', x, y); _cueGlow(ctx, ex, ey, 18, '120,255,230', env); });
        ctx.strokeStyle = 'rgba(200,255,240,' + (0.75 * env) + ')'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const k = ease((u - 0.2 - i * 0.05) / 0.25);
            if (k <= 0) continue;
            const y = 370 + i * 28, x = 30 + i * 90;
            ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(-20 + 552 * k, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x, 350 + 170 * k); ctx.stroke();
        }
        return 0;
    },
    wvr_bomb(ctx, u) { _cueBombs(ctx, u, [420, 230], '120,240,220'); return 0; },
});
// <<< poses boss_weaver

// >>> poses boss_wormhole
// ---- The Wormhole ----------------------------------------------------------
// Portal Wisp: the coil spins, the maw opens wide and a glowing wisp flies
//   out through a small portal. Clue Scramble: the face spins and three clue
//   numbers swap places overhead.
Object.assign(POSES, {
    wrm_wisp(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.body.rot = 20 * ease(u) * env;
        P.face.sc = 1 + 0.08 * env;
        P.face.rot = -20 * ease(u) * env;
    },
    wrm_scramble(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.face.rot = 30 * Math.sin(u * Math.PI * 2) * env;
        P.body.rot = -8 * Math.sin(u * Math.PI * 2) * env;
    },
});
Object.assign(FX, {
    wrm_wisp(ctx, u) {
        const env = envOf(u, 0.2, 0.25);
        _cueGlow(ctx, 256, 260, 70, '230,90,90', 0.6 * env);
        const k = ease((u - 0.3) / 0.5);
        if (k > 0) {
            const x = 256 + 230 * k, y = 260 - 200 * Math.sin(k * Math.PI * 0.8);
            ctx.strokeStyle = 'rgba(255,200,140,' + env + ')'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(470, 120, 30, 46, 0.3, 0, 7); ctx.stroke();
            _cueGlow(ctx, x, y, 30, '255,220,170', env);
            for (let i = 1; i < 5; i++) {
                const kk = Math.max(0, k - i * 0.05);
                _cueGlow(ctx, 256 + 230 * kk, 260 - 200 * Math.sin(kk * Math.PI * 0.8), 16, '255,190,140', 0.4 * env / i);
            }
        }
        return 0;
    },
    wrm_scramble(ctx, u) { _cueClues(ctx, u, '230,90,90', true); return 0; },
});
// <<< poses boss_wormhole


// >>> poses boss_zenith
// ---- The Zenith ------------------------------------------------------------
// Royal Decree: the staff slams, the crown flares and a golden scroll unrolls
//   with a seal. Crown Rings: the crown lifts and golden rings ripple out.
// Soul Tithe: the vortex hand opens and wisps spiral into it.
Object.assign(POSES, {
    zen_decree(P, u) {
        const lift = ease(u / 0.3), slam = ease((u - 0.3) / 0.08), k = 1 - ease((u - 0.7) / 0.3);
        P.staff.rot = (10 * lift * (1 - slam) - 4 * slam) * k;
        P.staff.dy = (-16 * lift * (1 - slam) + 6 * slam) * k;
        P.crown.dy = -6 * slam * k;
        P.body.dy = 3 * slam * k;
    },
    zen_rings(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.crown.dy = -16 * env; P.crown.sc = 1 + 0.06 * env;
        P.vortex.rot = 20 * u * env;
    },
    zen_tithe(P, u) {
        const env = envOf(u, 0.2, 0.25);
        P.vortex.rot = 60 * u * env; P.vortex.sc = 1 + 0.08 * env;
    },
});
Object.assign(FX, {
    zen_decree(ctx, u) {
        if (u < 0.32) return 0;
        const k = ease((u - 0.32) / 0.3), fade = 1 - ease((u - 0.82) / 0.18);
        const w = 260 * k;
        ctx.fillStyle = 'rgba(250,235,190,' + fade + ')'; ctx.strokeStyle = 'rgba(150,110,40,' + fade + ')'; ctx.lineWidth = 3;
        ctx.fillRect(256 - w / 2, 430, w, 70); ctx.strokeRect(256 - w / 2, 430, w, 70);
        ctx.fillStyle = 'rgba(200,160,70,' + fade + ')';
        ctx.fillRect(256 - w / 2 - 10, 424, 12, 82); ctx.fillRect(256 + w / 2 - 2, 424, 12, 82);
        if (k > 0.8) {
            ctx.fillStyle = 'rgba(190,40,40,' + fade + ')';
            ctx.beginPath(); ctx.arc(256, 465, 18, 0, 7); ctx.fill();
        }
        return u > 0.3 && u < 0.34 ? 0.12 : 0;
    },
    zen_rings(ctx, u, dy, at) {
        const [x, y] = at('crown', 256, 110);
        for (let i = 0; i < 3; i++) {
            const r = (u * 1.4 - i * 0.22);
            if (r <= 0 || r > 1) continue;
            ctx.strokeStyle = 'rgba(255,210,90,' + (0.85 * (1 - r)) + ')'; ctx.lineWidth = 10 * (1 - r) + 2;
            ctx.beginPath(); ctx.ellipse(x, y, 50 + r * 360, 20 + r * 140, 0, 0, 7); ctx.stroke();
        }
        return 0;
    },
    zen_tithe(ctx, u, dy, at) { const [x, y] = at('vortex', 430, 160); _cueTithe(ctx, u, x, y, '120,230,255'); return 0; },
});
// <<< poses boss_zenith

const SHAKE = { slam: (u) => (u >= 0.5 ? 9 * Math.max(0, 1 - (u - 0.5) * 4) : 0) };

// ---- plumbing ------------------------------------------------------------
const _imgCache = {};
// The cached image for a boss rig part (loaded on first use).
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

// The monster art element on a monster's card.
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
            ctx.translate(q.px, q.py); ctx.rotate(o.rot * Math.PI / 180); ctx.scale(o.sc * (o.sx || 1), o.sc * (o.sy || 1)); ctx.translate(-q.px, -q.py);
        }
        ctx.drawImage(imgs[i], p.x, p.y);
        ctx.restore();
    });
    ctx.save();
    ctx.translate(rig.ox, rig.oy); ctx.scale(S, S);
    // at(part, x, y): where an art point on that part sits this frame, so an
    // effect can stay pinned to a moving eye or hand (S: 1 rigs only).
    const at = (name, x, y) => {
        let m = new DOMMatrix();
        for (const q of chainOf(by[name])) {
            const o = poses[q.n];
            m = m.translate(o.dx * S, o.dy * S).translate(q.px, q.py).rotate(o.rot)
                .scale(o.sc * (o.sx || 1), o.sc * (o.sy || 1)).translate(-q.px, -q.py);
        }
        const pt = m.transformPoint({ x, y });
        return [pt.x, pt.y];
    };
    const flash = FX[animName](ctx, u, poses[rootName].dy, at);
    ctx.restore();
    ctx.restore();
    if (flash > 0) {
        const g = ctx.createRadialGradient(512, 512, 10, 512, 512, 420);
        g.addColorStop(0, 'rgba(255,255,255,' + flash + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    }
}

// Plays a rig animation on a boss's art for the given time. Skips the cue if
// the part images are not decoded yet or one is already running.
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

// Reacts to a boss mechanic event by playing the matching rig animation on
// that boss's art.
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
