import { Audio_Manager } from '../audio/audio.js';
// universal-spell-fx.js
//------------------------------------------------------------------------
//-------------------UNIVERSAL SPELL VISUAL EFFECTS-----------------------
//------------------------------------------------------------------------
// Code-drawn combat visuals for the universal spell arsenal (no emoji):
// every projectile is built from nested divs pointing RIGHT (+x) inside a
// 44x28 px box - the shared _egFireProjectile() flight code rotates the
// whole box onto the flight vector, exactly like the class projectiles
// (see js/combat/combat-class-projectiles.js).
//
// SURFACE NOTE (R3 2026-09-23, +1 in spell pass 1): 10 exports, each with a verified consumer -
// universal-spells.js imports 7 of them; USP_THEME_PROJ feeds the tutorial
// Fireball (tutorial-quest.js); _uspProjDefFor + the anchor-marker pair are
// also imported by the dev audit tool (js/dev/spell-rank-audit.js);
// _uspMoveSpriteOffset is read by the cursor-aimed movement spells. The
// other internals (impact/dot/card visuals, start resolution, support
// anchor, sprite offsets) are file-private.
//
// Entry points used by universal-spells.js:
//   _uspFireThemedProjectile(spell, monsterId, hit, opts)
//   _uspTelegraph(spell, monsterId, delayMs)
// Impact / nova / DoT overlays are appended to the monster card
// (position:relative, both card variants) and auto-removed.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//---------------------------PROJECTILE SHAPES----------------------------
//------------------------------------------------------------------------

export const USP_THEME_PROJ = {
    fire: {
        cssClass: 'usp-proj-fire', duration: 750, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-fire">' +
                    '<div class="usp-p-fire-tail"></div>' +
                    '<div class="usp-p-fire-core"></div>' +
                    '<div class="usp-p-fire-spark usp-p-fire-spark-1"></div>' +
                    '<div class="usp-p-fire-spark usp-p-fire-spark-2"></div>' +
                '</div>';
        },
    },
    frost: {
        cssClass: 'usp-proj-frost', duration: 700, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-frost">' +
                    '<div class="usp-p-frost-trail"></div>' +
                    '<div class="usp-p-frost-shard"></div>' +
                    '<div class="usp-p-frost-glint"></div>' +
                '</div>';
        },
    },
    arcane: {
        cssClass: 'usp-proj-arcane', duration: 650, easing: 'linear', rotOffset: 0, spin: 900,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-arc">' +
                    '<div class="usp-p-arc-trail"></div>' +
                    '<div class="usp-p-arc-ring egp-spin"></div>' +
                    '<div class="usp-p-arc-orb"></div>' +
                '</div>';
        },
    },
    shadow: {
        cssClass: 'usp-proj-shadow', duration: 800, easing: 'ease-in', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-sh">' +
                    '<div class="usp-p-sh-trail"></div>' +
                    '<div class="usp-p-sh-tendril usp-p-sh-tendril-1"></div>' +
                    '<div class="usp-p-sh-tendril usp-p-sh-tendril-2"></div>' +
                    '<div class="usp-p-sh-orb"></div>' +
                '</div>';
        },
    },
    holy: {
        cssClass: 'usp-proj-holy', duration: 650, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-holy">' +
                    '<div class="usp-p-holy-trail"></div>' +
                    '<div class="usp-p-holy-halo"></div>' +
                    '<div class="usp-p-holy-bolt"></div>' +
                '</div>';
        },
    },
    nature: {
        cssClass: 'usp-proj-nature', duration: 750, easing: 'linear', rotOffset: 0, spin: 1200,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-nat">' +
                    '<div class="usp-p-nat-trail"></div>' +
                    '<div class="usp-p-nat-wisp"></div>' +
                    '<div class="usp-p-nat-leaf usp-p-nat-leaf-1 egp-spin"></div>' +
                    '<div class="usp-p-nat-leaf usp-p-nat-leaf-2 egp-spin"></div>' +
                '</div>';
        },
    },
    lightning: {
        cssClass: 'usp-proj-lightning', duration: 450, easing: 'linear', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lt">' +
                    '<div class="usp-p-lt-glow"></div>' +
                    '<div class="usp-p-lt-bolt"></div>' +
                '</div>';
        },
    },
    // 🪓 Blade - hurled reaver: tumbling crimson-edged throwing blade.
    // Inner spin only; the outer body stays aimed at the target.
    blade: {
        cssClass: 'usp-proj-blade', duration: 700, easing: 'ease-out', rotOffset: 0, spin: 800,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-blade">' +
                    '<div class="usp-p-blade-trail"></div>' +
                    '<div class="usp-p-blade-tumble egp-spin">' +
                        '<div class="usp-p-blade-edge"></div>' +
                        '<div class="usp-p-blade-spine"></div>' +
                    '</div>' +
                '</div>';
        },
    },
    // 🏹 Arrow - ranger shaft: wooden shaft, steel head, green fletching.
    // Leaner and earthier than the probabilist golden dart.
    arrow: {
        cssClass: 'usp-proj-arrow', duration: 600, easing: 'ease-out', rotOffset: 0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-arr">' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-top"></div>' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-bot"></div>' +
                    '<div class="usp-p-arr-shaft"></div>' +
                    '<div class="usp-p-arr-wrap"></div>' +
                    '<div class="usp-p-arr-head"></div>' +
                '</div>';
        },
    },
};

// Per-spell projectile overrides (visual overhaul, one spell at a time).
// Checked BEFORE the theme table so a spell can own a unique silhouette +
// flight scale while its schoolmates keep the shared theme look untouched.
//   scale - launch startScale handed to _egFireProjectile (shared default is
//           1.4, 1.8 for big hits, 1.1 for volley followers; every flight
//           shrinks to 0.5 on arrival, so scale reads as launch size).
//   isBig - also plays the .is-big impact treatment on arrival.
// NOTE: keep each build() as an inline root.innerHTML concatenation - the
// spell gallery builder parses that literal to render flight demos.
const USP_SPELL_PROJ = {
    // Ethereal Knives - Path-of-Exile spirit knives: five ACTUAL knives
    // (wrapped grip + crossguard + pointed ghost-steel blade) hurled in
    // the staggered volley fan, each trailing spirit-wisp light. Snappy
    // 550ms flight so the 130ms stagger reads as one hurled handful.
    // Schoolmates keep the tumbling crimson reaver.
    usp_ethereal_knives: {
        cssClass: 'usp-proj-ethknife', duration: 550, easing: 'ease-out', rotOffset: 0,
        scale: 1.5,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-ek">' +
                    '<div class="usp-p-ek-trail"></div>' +
                    '<div class="usp-p-ek-mote usp-p-ek-mote-1"></div>' +
                    '<div class="usp-p-ek-mote usp-p-ek-mote-2"></div>' +
                    '<div class="usp-p-ek-grip"></div>' +
                    '<div class="usp-p-ek-pommel"></div>' +
                    '<div class="usp-p-ek-guard"></div>' +
                    '<div class="usp-p-ek-blade"></div>' +
                    '<div class="usp-p-ek-edge"></div>' +
                    '<div class="usp-p-ek-fuller"></div>' +
                '</div>';
        },
    },
    // Explosive Shot - a bomb strapped to an arrow: ranger shaft with a
    // round black bomb lashed mid-shaft and a burning fuse spark trailing
    // smoke. Heavy 700ms flight, big detonation arrival for the 20-27 hit.
    // Schoolmates keep the clean shared shaft.
    usp_explosive_shot: {
        cssClass: 'usp-proj-bomb', duration: 700, easing: 'ease-in', rotOffset: 0,
        scale: 2.2, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-bomb">' +
                    '<div class="usp-p-bomb-smoke"></div>' +
                    '<div class="usp-p-bomb-fletch usp-p-bomb-fletch-top"></div>' +
                    '<div class="usp-p-bomb-fletch usp-p-bomb-fletch-bot"></div>' +
                    '<div class="usp-p-bomb-shaft"></div>' +
                    '<div class="usp-p-bomb-lash"></div>' +
                    '<div class="usp-p-bomb-body"></div>' +
                    '<div class="usp-p-bomb-cap"></div>' +
                    '<div class="usp-p-bomb-fuse"></div>' +
                    '<div class="usp-p-bomb-spark"></div>' +
                    '<div class="usp-p-bomb-head"></div>' +
                '</div>';
        },
    },
    // Poison Arrow (ex Serpent Sting) - dripping in poison: a ranger shaft
    // with a venom-green head, toxic droplets falling off it mid-flight and
    // a sickly trail. Schoolmates keep the clean shared shaft.
    usp_serpent_sting: {
        cssClass: 'usp-proj-poison', duration: 600, easing: 'ease-out', rotOffset: 0,
        scale: 1.5,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-poison">' +
                    '<div class="usp-p-poison-trail"></div>' +
                    '<div class="usp-p-poison-drip usp-p-poison-drip-1"></div>' +
                    '<div class="usp-p-poison-drip usp-p-poison-drip-2"></div>' +
                    '<div class="usp-p-poison-fletch usp-p-poison-fletch-top"></div>' +
                    '<div class="usp-p-poison-fletch usp-p-poison-fletch-bot"></div>' +
                    '<div class="usp-p-poison-shaft"></div>' +
                    '<div class="usp-p-poison-wrap"></div>' +
                    '<div class="usp-p-poison-head"></div>' +
                '</div>';
        },
    },
    // Barrage - rapid fire, not one arrow five times: snappy 380ms flights
    // so the 130ms stagger reads as a visible stream, fanning slightly so
    // the five shafts don't perfectly overlap (see volleyTotal spread
    // below). Schoolmates keep the shared 600ms ranger shaft.
    usp_barrage: {
        cssClass: 'usp-proj-barrage', duration: 380, easing: 'linear', rotOffset: 0,
        scale: 1.3,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-arr">' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-top"></div>' +
                    '<div class="usp-p-arr-fletch usp-p-arr-fletch-bot"></div>' +
                    '<div class="usp-p-arr-shaft"></div>' +
                    '<div class="usp-p-arr-wrap"></div>' +
                    '<div class="usp-p-arr-head"></div>' +
                '</div>';
        },
    },
    // Aimed Shot - the perfect arrow: longer bodkin head, crimson
    // fletching, bowstring recoil snapping off the nock, and a charge
    // glint that swells with the 2s hold (the gallery only shows rest
    // state - see the charge-glint note). isBig arrival for the massive
    // 19-24 hit. Schoolmates keep the shared ranger shaft.
    usp_aimed_shot: {
        cssClass: 'usp-proj-aimed', duration: 500, easing: 'ease-out', rotOffset: 0,
        scale: 1.9, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-aimed">' +
                    '<div class="usp-p-aimed-string"></div>' +
                    '<div class="usp-p-aimed-fletch usp-p-aimed-fletch-top"></div>' +
                    '<div class="usp-p-aimed-fletch usp-p-aimed-fletch-bot"></div>' +
                    '<div class="usp-p-aimed-shaft"></div>' +
                    '<div class="usp-p-aimed-wrap"></div>' +
                    '<div class="usp-p-aimed-glare"></div>' +
                    '<div class="usp-p-aimed-head"></div>' +
                '</div>';
        },
    },
    // Pyroblast - WoW-Classic "immense fiery boulder": a lumpy molten mass
    // at 2.4x launch scale (~1.7x a Fireball), slow churning swirl, ragged
    // ember trail. Fireball keeps the shared fire theme exactly as-is.
    // Meteor - Diablo-2 skyfall: a huge burning rock that drops almost
    // straight down onto the reticle (the engine fires fromSky strikes from
    // 340px above the card at a fixed 550ms fall - the def mirrors that so
    // the gallery shows the true timing). 3x launch scale (~2.1x a Fireball).
    usp_meteor: {
        cssClass: 'usp-proj-meteor', duration: 550, easing: 'ease-in', rotOffset: 0,
        scale: 3.0, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-meteor">' +
                    '<div class="usp-p-meteor-tail"></div>' +
                    '<div class="usp-p-meteor-ember usp-p-meteor-ember-1"></div>' +
                    '<div class="usp-p-meteor-ember usp-p-meteor-ember-2"></div>' +
                    '<div class="usp-p-meteor-rock">' +
                        '<div class="usp-p-meteor-cracks"></div>' +
                        '<div class="usp-p-meteor-rim"></div>' +
                    '</div>' +
                '</div>';
        },
    },
    // Lightning Bolt - WoW-Shaman crackle: a jagged blue-white bolt with
    // forking arcs jittering off it, flying flat and fierce. The shared
    // yellow emoji-style thunderbolt stays for the rest of the school.
    usp_lightning_bolt: {
        cssClass: 'usp-proj-lightning-bolt', duration: 400, easing: 'linear', rotOffset: 0,
        scale: 1.4,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lb">' +
                    '<div class="usp-p-lb-glow"></div>' +
                    '<div class="usp-p-lb-main"></div>' +
                    '<div class="usp-p-lb-arc usp-p-lb-arc-1"></div>' +
                    '<div class="usp-p-lb-arc usp-p-lb-arc-2"></div>' +
                    '<div class="usp-p-lb-mote usp-p-lb-mote-1"></div>' +
                    '<div class="usp-p-lb-mote usp-p-lb-mote-2"></div>' +
                '</div>';
        },
    },
    // Storm Smite - WoW-priest smite in storm colors: a thick sky-bolt with
    // a white-gold core and storm-blue edges, falling from above (the
    // engine fires fromSky strikes from 340px above at a fixed 550ms fall
    // - the def mirrors that so the gallery shows the true timing).
    // 2.0x launch scale: dramatic judgment, lighter than Meteor's 3.0.
    usp_smite: {
        cssClass: 'usp-proj-stormsmite', duration: 550, easing: 'ease-in', rotOffset: 0,
        scale: 2.0,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-smite">' +
                    '<div class="usp-p-smite-halo"></div>' +
                    '<div class="usp-p-smite-bolt"></div>' +
                    '<div class="usp-p-smite-arc usp-p-smite-arc-1"></div>' +
                    '<div class="usp-p-smite-arc usp-p-smite-arc-2"></div>' +
                '</div>';
        },
    },
    // Starfall - arcane stars dropping from the sky: a white-hot 4-point
    // star with a sparkle tail, crashing down onto random enemies one by
    // one. The engine fires fromSky strikes from 340px above at a fixed
    // 550ms fall - the def mirrors that so the gallery shows true timing.
    // 1.6x launch scale: clearly a star, not a pebble, but lighter than
    // Meteor's cataclysm (normal impact, no isBig).
    usp_starfall: {
        cssClass: 'usp-proj-starfall', duration: 550, easing: 'ease-in', rotOffset: 0,
        scale: 1.6,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-star">' +
                    '<div class="usp-p-star-tail"></div>' +
                    '<div class="usp-p-star-mote usp-p-star-mote-1"></div>' +
                    '<div class="usp-p-star-mote usp-p-star-mote-2"></div>' +
                    '<div class="usp-p-star-glow"></div>' +
                    '<div class="usp-p-star-core"></div>' +
                '</div>';
        },
    },
    // Wrath - WoW-Classic Druid: a swirling ball of golden-green nature
    // energy with wind bands and drifting leaves, not electricity. Theme
    // stays lightning (damage/impact/sound untouched) - only the hurled
    // visual becomes nature. The yellow thunderbolt stays for the school.
    usp_wrath: {
        cssClass: 'usp-proj-wrath', duration: 600, easing: 'ease-out', rotOffset: 0,
        scale: 1.5,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-wrath">' +
                    '<div class="usp-p-wrath-trail"></div>' +
                    '<div class="usp-p-wrath-ball">' +
                        '<div class="usp-p-wrath-glow"></div>' +
                        '<div class="usp-p-wrath-band usp-p-wrath-band-1 egp-spin"></div>' +
                        '<div class="usp-p-wrath-band usp-p-wrath-band-2 egp-spin"></div>' +
                    '</div>' +
                    '<div class="usp-p-wrath-leaf usp-p-wrath-leaf-1"></div>' +
                    '<div class="usp-p-wrath-leaf usp-p-wrath-leaf-2"></div>' +
                '</div>';
        },
    },
    // Chain Lightning - the same Shaman crackle, but snappy: jumps already
    // fly card-to-card (fromMonsterId anchor), and at 220ms each leap reads
    // as an instant zap onto the next nearby victim, with the lightning
    // impact flash as the arrival crack.
    usp_chain_lightning: {
        cssClass: 'usp-proj-chain-lightning', duration: 220, easing: 'linear', rotOffset: 0,
        scale: 1.2,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lb">' +
                    '<div class="usp-p-lb-glow"></div>' +
                    '<div class="usp-p-lb-main"></div>' +
                    '<div class="usp-p-lb-arc usp-p-lb-arc-1"></div>' +
                    '<div class="usp-p-lb-arc usp-p-lb-arc-2"></div>' +
                    '<div class="usp-p-lb-mote usp-p-lb-mote-1"></div>' +
                    '<div class="usp-p-lb-mote usp-p-lb-mote-2"></div>' +
                '</div>';
        },
    },
    // Ball Lightning - one plain ball of lightning drifting onto the target.
    // Flies at a calm 1100ms base; speedScales makes the Projectile Speed
    // stat shorten that flight like it does for ordinary projectiles.
    usp_ball_lightning: {
        cssClass: 'usp-proj-balllightning', duration: 1100, easing: 'linear', rotOffset: 0,
        scale: 1.4, speedScales: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-bl">' +
                    '<div class="usp-p-bl-shell"></div>' +
                    '<div class="usp-p-bl-zap usp-p-bl-zap-1"></div>' +
                    '<div class="usp-p-bl-zap usp-p-bl-zap-2"></div>' +
                    '<div class="usp-p-bl-zap usp-p-bl-zap-3"></div>' +
                    '<div class="usp-p-bl-core"></div>' +
                '</div>';
        },
    },
    // Spark - Path-of-Exile crackling orb: a white-hot core wrapped in
    // flickering zigzag arcs, dragging a tail of live sparks and jittering
    // erratically off its flight line. The 6 wild shots already fly at
    // random enemies - the wobble sells the bouncing-spark chaos. The
    // yellow thunderbolt stays for the rest of the school.
    usp_spark: {
        cssClass: 'usp-proj-spark', duration: 450, easing: 'linear', rotOffset: 0,
        scale: 1.4,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-spark">' +
                    '<div class="usp-p-spark-trail"></div>' +
                    '<div class="usp-p-spark-arc usp-p-spark-arc-1"></div>' +
                    '<div class="usp-p-spark-arc usp-p-spark-arc-2"></div>' +
                    '<div class="usp-p-spark-core"></div>' +
                    '<div class="usp-p-spark-mote usp-p-spark-mote-1"></div>' +
                    '<div class="usp-p-spark-mote usp-p-spark-mote-2"></div>' +
                '</div>';
        },
    },
    // Storm Call - Path-of-Exile marker strike: the same white-blue fork
    // as Arc, crashing down from the sky onto the marked enemies. Mirrors
    // the engine's fixed 550ms skyfall so the gallery shows true timing.
    // Heavy 2x launch with a big arrival for the all-enemy 7-9 hit.
    usp_storm_call: {
        cssClass: 'usp-proj-stormcall', duration: 550, easing: 'ease-in', rotOffset: 0,
        scale: 2.0, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-zap">' +
                    '<div class="usp-p-zap-glow"></div>' +
                    '<div class="usp-p-zap-trunk"></div>' +
                    '<div class="usp-p-zap-fork usp-p-zap-fork-1"></div>' +
                    '<div class="usp-p-zap-fork usp-p-zap-fork-2"></div>' +
                    '<div class="usp-p-zap-mote usp-p-zap-mote-1"></div>' +
                    '<div class="usp-p-zap-mote usp-p-zap-mote-2"></div>' +
                '</div>';
        },
    },
    // Arc - Path-of-Exile chaining bolt: a fat white-blue fork that snaps
    // card-to-card almost instantly (200ms leaps). Brighter and thicker
    // than the school's yellow thunderbolt, with side forks licking off
    // the main trunk. Damage, falloff and sound stay lightning.
    usp_arc: {
        cssClass: 'usp-proj-arc', duration: 200, easing: 'linear', rotOffset: 0,
        scale: 1.5,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-zap">' +
                    '<div class="usp-p-zap-glow"></div>' +
                    '<div class="usp-p-zap-trunk"></div>' +
                    '<div class="usp-p-zap-fork usp-p-zap-fork-1"></div>' +
                    '<div class="usp-p-zap-fork usp-p-zap-fork-2"></div>' +
                    '<div class="usp-p-zap-mote usp-p-zap-mote-1"></div>' +
                    '<div class="usp-p-zap-mote usp-p-zap-mote-2"></div>' +
                '</div>';
        },
    },
    // Bane - a wave of dread, not a bolt: a rolling violet-black crescent
    // with trailing tendrils that flies flat to every enemy (the nova
    // branch strikes each victim, so each gets its own incoming wave).
    // Heavy 650ms flight with a big arrival for the 7-9 crush. The
    // shared shadow orb stays for the rest of the school.
    usp_bane: {
        cssClass: 'usp-proj-bane', duration: 650, easing: 'ease-out', rotOffset: 0,
        scale: 1.8, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-dread">' +
                    '<div class="usp-p-dread-trail"></div>' +
                    '<div class="usp-p-dread-tendril usp-p-dread-tendril-1"></div>' +
                    '<div class="usp-p-dread-tendril usp-p-dread-tendril-2"></div>' +
                    '<div class="usp-p-dread-crest"></div>' +
                    '<div class="usp-p-dread-mote usp-p-dread-mote-1"></div>' +
                    '<div class="usp-p-dread-mote usp-p-dread-mote-2"></div>' +
                '</div>';
        },
    },
    // Chaos Bolt - WoW-TBC cataclysm: a very big fat bolt of churning
    // chaos, shadow violet shot through with fel green, dragging ragged
    // tendrils. Slow and heavy (900ms), arriving with the big impact
    // treatment befitting the hardest single hit in the arsenal. The
    // shared shadow orb stays untouched for the rest of the school.
    usp_chaos_bolt: {
        cssClass: 'usp-proj-chaos', duration: 900, easing: 'ease-in', rotOffset: 0,
        scale: 2.6, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-chaos">' +
                    '<div class="usp-p-chaos-trail"></div>' +
                    '<div class="usp-p-chaos-tendril usp-p-chaos-tendril-1"></div>' +
                    '<div class="usp-p-chaos-tendril usp-p-chaos-tendril-2"></div>' +
                    '<div class="usp-p-chaos-ember usp-p-chaos-ember-1"></div>' +
                    '<div class="usp-p-chaos-ember usp-p-chaos-ember-2"></div>' +
                    '<div class="usp-p-chaos-body">' +
                        '<div class="usp-p-chaos-fel"></div>' +
                        '<div class="usp-p-chaos-swirl"></div>' +
                        '<div class="usp-p-chaos-core"></div>' +
                    '</div>' +
                '</div>';
        },
    },
    // Arcane Missiles - actual missiles: dart-like bolts with a pointed
    // nose, tail fins and a flickering exhaust plume, flying straight
    // (no spin) in a snappy 5-round volley. The shared spinning arcane
    // orb stays untouched for the rest of the school.
    usp_arcane_missiles: {
        cssClass: 'usp-proj-arcane-missiles', duration: 550, easing: 'linear', rotOffset: 0,
        scale: 1.3,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-msl">' +
                    '<div class="usp-p-msl-exhaust"></div>' +
                    '<div class="usp-p-msl-mote usp-p-msl-mote-1"></div>' +
                    '<div class="usp-p-msl-mote usp-p-msl-mote-2"></div>' +
                    '<div class="usp-p-msl-body">' +
                        '<div class="usp-p-msl-core"></div>' +
                        '<div class="usp-p-msl-fin usp-p-msl-fin-top"></div>' +
                        '<div class="usp-p-msl-fin usp-p-msl-fin-bot"></div>' +
                    '</div>' +
                    '<div class="usp-p-msl-nose"></div>' +
                '</div>';
        },
    },
    // Ice Spear - the heavy charged throw: the same lance silhouette the
    // hold condenses over the avatar, loosed large and slow (600ms) with
    // a big arrival for the 16-20 hit. Ice Lance keeps its own faster,
    // smaller 450ms streak - same family, different weight.
    usp_ice_spear: {
        cssClass: 'usp-proj-icespear', duration: 600, easing: 'ease-out', rotOffset: 0,
        scale: 2.2, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lance">' +
                    '<div class="usp-p-lance-vapor"></div>' +
                    '<div class="usp-p-lance-shaft">' +
                        '<div class="usp-p-lance-facet"></div>' +
                    '</div>' +
                    '<div class="usp-p-lance-tip"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-1"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-2"></div>' +
                '</div>';
        },
    },
    // Ice Lance - an actual lance of ice: a long faceted spike with a
    // needle tip, streaking faster than any other spell (450ms flight).
    // Frostbolt keeps the shared stubby frost shard exactly as-is.
    usp_ice_lance: {
        cssClass: 'usp-proj-icelance', duration: 450, easing: 'linear', rotOffset: 0,
        scale: 1.5,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-lance">' +
                    '<div class="usp-p-lance-vapor"></div>' +
                    '<div class="usp-p-lance-shaft">' +
                        '<div class="usp-p-lance-facet"></div>' +
                    '</div>' +
                    '<div class="usp-p-lance-tip"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-1"></div>' +
                    '<div class="usp-p-lance-mote usp-p-lance-mote-2"></div>' +
                '</div>';
        },
    },
    usp_pyroblast: {
        cssClass: 'usp-proj-pyroblast', duration: 850, easing: 'ease-in', rotOffset: 0,
        scale: 2.4, isBig: true,
        build(root) {
            root.innerHTML =
                '<div class="egp usp-p-pyro">' +
                    '<div class="usp-p-pyro-trail"></div>' +
                    '<div class="usp-p-pyro-ember usp-p-pyro-ember-1"></div>' +
                    '<div class="usp-p-pyro-ember usp-p-pyro-ember-2"></div>' +
                    '<div class="usp-p-pyro-ember usp-p-pyro-ember-3"></div>' +
                    '<div class="usp-p-pyro-body">' +
                        '<div class="usp-p-pyro-crust"></div>' +
                        '<div class="usp-p-pyro-core"></div>' +
                    '</div>' +
                '</div>';
        },
    },
};

export function _uspProjDefFor(spell) {
    if (spell && spell.id && USP_SPELL_PROJ[spell.id]) return USP_SPELL_PROJ[spell.id];
    const theme = (spell && spell.theme) || 'arcane';
    return USP_THEME_PROJ[theme] || USP_THEME_PROJ.arcane;
}


//------------------------------------------------------------------------
//---------------------------OVERLAY HELPERS------------------------------
//------------------------------------------------------------------------

// Appends a themed overlay div to a monster card; auto-removes after ms.
function _uspCardOverlay(monsterId, className, ms) {
    try {
        const card = document.getElementById(`eg-card-${monsterId}`);
        if (!card) return null;
        const el = document.createElement('div');
        el.className = className;
        card.appendChild(el);
        setTimeout(() => el.remove(), ms || 700);
        return el;
    } catch (e) { return null; }
}

// Impact flash + expanding ring in the spell's theme. Big hits (Meteor,
// Chaos Bolt, crits) get the .is-big treatment.
// Themes with a dedicated impact sound; other themes keep the generic
// element hit sound from the damage path. [new key, generic fallback]
const USP_IMPACT_SFX = {
    fire: ['spell_fire_impact', 'hit_fire'],
    frost: ['spell_frost_impact', 'hit_cold'],
    lightning: ['spell_lightning_impact', 'hit_lightning'],
    shadow: ['spell_shadow_impact', 'hit_shadow'],
};

// Signature impacts (visual overhaul, one spell at a time): a spell listed
// here erupts its own overlay on every hit - and may skip the generic nova
// ring when the signature already reads as the AoE.
const USP_SPELL_IMPACT = {
    // Flamestrike - WoW-Classic pillar of flame: a column that rips up from
    // under the victim's feet and swallows the whole card. Replaces the ring.
    usp_flamestrike: { cssClass: 'usp-pillar-flamestrike', ms: 950, skipNova: true },
    // Immolate - no projectile at all: the opening hit lands instantly with
    // the regular impact flash, then the usual DoT ticks burn on. noFlight
    // reuses the shared impact path, so no new art was needed.
    usp_immolate: { noFlight: true },
    // Storm Smite - smitten from above: the strike falls from the sky like
    // Meteor's instead of flying flat. The bolt visual lives in the
    // projectile overrides below.
    usp_smite: { skyfall: true },
    // Sunfire - WoW-style sacred flames in fire colors: the opener lands
    // instantly under a golden-white burst, then the regular fire sizzle
    // burns on.
    usp_holy_fire: { noFlight: true, cssClass: 'usp-sunfire-burst', ms: 800 },
    // Desecration - unholy ground: the opener pools violet-black shadow at
    // the victim's feet, then the regular shadow sizzle consumes on.
    usp_consecration: { cssClass: 'usp-desecrate-ground', ms: 1000 },
    // Pain / Corruption - instant DoT applications, no
    // explosion: the opener brands a shadowy word on the victim that
    // lingers briefly before the regular sizzle carries the ticks.
    usp_shadow_word_pain: { noFlight: true, wordImpact: true, word: ['PAIN', 'SCHMERZ'] },
    usp_corruption: { noFlight: true, wordImpact: true, word: ['CORRUPTION', 'VERDERBNIS'] },
    // Disintegrate - a beam, not a projectile: each volley pulse draws a
    // flash of arcane energy from the hero to the victim, then lands the
    // hit with the regular impact treatment as the arrival flare.
    usp_disintegrate: { noFlight: true, beam: true },
    // Cone of Cold - same deal: everything inside the cone is hit at once
    // by the blast itself, not by projectiles. The wedge lives in the
    // placed burst zone below.
    usp_cone_of_cold: { noFlight: true },
    // Firestorm - the opening hit is the whirlwind touching down, not a
    // projectile. The fire tornado lives in the placed zone below.
    usp_firestorm: { noFlight: true },
    // Arrow Volley - the opening hit is the arrow-storm starting, not a
    // projectile. The raining arrows live in the placed zone below.
    usp_arrow_volley: { noFlight: true },
    // Rain of Fire - same deal: the opening hit is the downpour starting,
    // not a projectile. The visible rain lives in the placed zone below.
    usp_rain_of_fire: { noFlight: true },
    // Blizzard - same deal: the opening hit is the ice storm starting,
    // not a projectile. The slanted shards live in the placed zone below.
    usp_blizzard: { noFlight: true },
    // Flameblast - a charged detonation: the hold grew the ring, the
    // release erupts it. No flight at all - the ring of flames closing in
    // from the outer edge plus the core blast below IS the delivery.
    usp_flameblast: { noFlight: true, cssClass: 'usp-flameblast-ring', ms: 1100 },
    // Incinerate - a channeled flamethrower, not bolts: every tick draws a
    // cone of fire from the hero onto the victim, then lands the hit with
    // the regular fire impact as the scorch. flamejet builds the cone.
    usp_incinerate: { noFlight: true, flamejet: true },
    // Freezing Pulse - each of the 3 waves lands as a freezing shockwave:
    // an expanding ring of ice washing out over the victim on top of the
    // regular frost impact flash.
    usp_freezing_pulse: { cssClass: 'usp-freeze-wave', ms: 850 },
    // Cold Snap - a real icy snap: the victim flash-freezes solid. A sheet
    // of ice with radiating cracks crystallizes over the card in one snap
    // and holds briefly before thawing. Replaces the soft nova ring.
    usp_cold_snap: { cssClass: 'usp-coldsnap-freeze', ms: 950, skipNova: true },
    // Crackling Lance - a piercing rail-discharge, not a thrown bolt: the
    // beam itself is the hit, so nothing flies. Victims along the line
    // take the strike instantly with the regular lightning treatment
    // while the lance streak below erupts through them.
    usp_crackling_lance: { noFlight: true },
    // Discharge - the full overcharge let loose: every victim erupts in a
    // violet-white super-detonation with forking arcs, on top of the
    // regular lightning impact and nova rings.
    usp_discharge: { cssClass: 'usp-discharge-blast', ms: 1000 },
    // Contagion - a spreading disease cloud, not a thrown orb: the opener
    // blooms the miasma directly on every victim (no flight), and each of
    // the 5 ticks exhales a fresh puff so the plague visibly spreads for
    // the whole duration. tickPuff is rendered by _uspDotTick below.
    usp_contagion: { noFlight: true, cssClass: 'usp-plague-cloud', ms: 1600, tickPuff: 'usp-plague-puff' },
    // Soulrend - a backwards drain: every channel tick draws a beam from
    // the VICTIM back to the hero with souls riding it home, then lands
    // the hit with the regular shadow impact. soulbeam builds the return
    // beam; nothing ever flies hero-to-victim.
    usp_soulrend: { noFlight: true, soulbeam: true },
    // Blight - Path-of-Exile festering grasp: the opener coats every
    // victim in creeping rot directly (no flight - decay starts ON them),
    // and each tick seeps fresh rot into the wound. Dark grasping mass,
    // not Contagion's drifting green cloud.
    usp_blight: { noFlight: true, cssClass: 'usp-blight-rot', ms: 1500, tickPuff: 'usp-blight-seep' },
};

// Signature zone weather (visual overhaul): a placed ground zone keeps
// raining for its whole lifetime. Drops are children of the zone element,
// so they die with it - no timers to clean up. Staggered with negative
// delays so the downpour is dense from the very first frame.
const USP_ZONE_RAIN = {
    // Firestorm - a tornado of fire standing in the zone: one centered
    // whirlwind instead of scattered drops (whirl: true).
    usp_firestorm: { whirl: true, cssClass: 'usp-fire-tornado' },
    // Arrow Volley - arrow rain: full-size ranger shafts pouring straight
    // down inside the square, dense enough to read as a real arrow storm.
    usp_arrow_volley: { count: 24, cssClass: 'usp-rain-arrow' },
    // Rain of Fire - WoW-Classic downpour: loads of little flame streaks,
    // dense enough to read as actually raining fire inside the circle.
    usp_rain_of_fire: { count: 30, cssClass: 'usp-rain-drop' },
    // Blizzard - same storm, icy: wind-blown shards falling at a slant
    // instead of straight down. The angle lives in the shard keyframes.
    usp_blizzard: { count: 30, cssClass: 'usp-rain-shard' },
};

// Signature zone blast (visual overhaul): a placed burst zone (Cone of
// Cold) erupts once from the caster end. Children of the zone element, so
// they die with it - no timers to clean up. Animations loop so the gallery
// demo (which never removes its box) replays the blast; in game the zone is
// gone after ~450ms, i.e. a single eruption.
const USP_ZONE_BLAST = {
    // Cone of Cold - WoW-Classic cone: an icy wedge flashing out from the
    // caster plus splinters streaking downrange inside it.
    usp_cone_of_cold: { shards: 12 },
    // Crackling Lance - a rail-lance discharge: a white-blue trunk as
    // wide as the beam erupting from the caster end in one snap, bleeding
    // fork arcs sideways onto everything the line touches.
    usp_crackling_lance: { arcs: 8 },
};

export function _uspZoneBlast(spell, zoneEl) {
    const cfg = spell && spell.id && USP_ZONE_BLAST[spell.id];
    if (!cfg || !zoneEl || typeof document === 'undefined') return;
    try {
        // Rail-lance discharge (Crackling Lance): trunk first, then arcs
        // bleeding off it up and down the beam. Children of the zone, so
        // they die with it - no timers to clean up.
        if (cfg.arcs) {
            const trunk = document.createElement('div');
            trunk.className = 'usp-lance-trunk';
            zoneEl.appendChild(trunk);
            for (let i = 0; i < cfg.arcs; i++) {
                const a = document.createElement('div');
                a.className = `usp-lance-arc ${(i % 2) ? 'is-down' : 'is-up'}`;
                a.style.left = `${6 + (i / cfg.arcs) * 88}%`;
                a.style.animationDelay = `${(i * 0.03).toFixed(2)}s`;
                zoneEl.appendChild(a);
            }
            return;
        }
        const blast = document.createElement('div');
        blast.className = 'usp-cone-blast';
        zoneEl.appendChild(blast);
        for (let i = 0; i < (cfg.shards || 10); i++) {
            const s = document.createElement('div');
            s.className = 'usp-cone-shard';
            s.style.top = `${8 + Math.random() * 84}%`;
            s.style.animationDuration = `${0.32 + Math.random() * 0.12}s`;
            s.style.animationDelay = `${Math.random() * 0.08}s`;
            zoneEl.appendChild(s);
        }
    } catch (e) { /* blast is cosmetic */ }
}

export function _uspZoneRain(spell, zoneEl) {
    const cfg = spell && spell.id && USP_ZONE_RAIN[spell.id];
    if (!cfg || !zoneEl || typeof document === 'undefined') return;
    try {
        // Whirlwind zones (Firestorm): a single centered tornado that dies
        // with the zone - no timers to clean up.
        if (cfg.whirl) {
            const tw = document.createElement('div');
            tw.className = cfg.cssClass;
            zoneEl.appendChild(tw);
            return;
        }
        for (let i = 0; i < (cfg.count || 20); i++) {
            const drop = document.createElement('div');
            drop.className = cfg.cssClass;
            drop.style.left = `${4 + Math.random() * 92}%`;
            drop.style.animationDuration = `${0.45 + Math.random() * 0.5}s`;
            drop.style.animationDelay = `${-Math.random() * 1.2}s`;
            zoneEl.appendChild(drop);
        }
    } catch (e) { /* weather is cosmetic */ }
}

function _uspImpact(spell, monsterId, opts) {
    const theme = (spell && spell.theme) || 'arcane';
    const impactSfx = USP_IMPACT_SFX[theme];
    if (impactSfx) Audio_Manager.playSFX(impactSfx[0], impactSfx[1]);
    const big = (opts && (opts.isBig || opts.isCrit)) ? ' is-big' : '';
    _uspCardOverlay(monsterId, `usp-impact usp-impact-${theme}${big}`, opts && opts.isBig ? 900 : 650);
    const sig = spell && spell.id && USP_SPELL_IMPACT[spell.id];
    if (sig && sig.cssClass) {
        const el = _uspCardOverlay(monsterId, sig.cssClass, sig.ms || 900);
        // Charged detonations (Flameblast): the held power sizes the ring -
        // a full charge erupts visibly wider than a quick release.
        const bp = opts && opts.blastPower;
        if (el && Number.isFinite(bp)) el.style.setProperty('--blast', Math.max(0.6, Math.min(1.5, bp)).toFixed(2));
    }
    if (opts && opts.isAoE && !(sig && sig.skipNova)) {
        _uspCardOverlay(monsterId, `usp-nova usp-nova-${theme}`, 800);
    }
}

// Word brands (Pain, Corruption) - a shadowy word that
// manifests on the victim: dark lettering with a smoky violet aura,
// rising and fading while the sizzle carries the ticks. Best-effort like
// every overlay. Long words (CORRUPTION) get the compact treatment.
function _uspWordBrand(spell, monsterId, words) {
    const de = (typeof globalThis.LANG !== 'undefined' && globalThis.LANG === 'de');
    const el = _uspCardOverlay(monsterId, 'usp-word-pain', 1400);
    if (!el) return;
    try {
        const pair = (words && words.length === 2) ? words : ['PAIN', 'SCHMERZ'];
        const text = de ? pair[1] : pair[0];
        el.textContent = text;
        if (text.length > 6) el.className += ' usp-word-long';
    } catch (e) { /* cosmetic */ }
}

// Lingering burn / corruption / consecration sizzle on DoT ticks.
// Spells with a tickPuff signature (Contagion) exhale a fresh puff of
// their cloud on every tick instead of only the generic sizzle.
function _uspDotTick(spell, monsterId) {
    const theme = (spell && spell.theme) || 'arcane';
    Audio_Manager.playSFX('spell_dot_tick');
    _uspCardOverlay(monsterId, `usp-dot usp-dot-${theme}`, 850);
    try {
        const sig = spell && spell.id && USP_SPELL_IMPACT[spell.id];
        if (sig && sig.tickPuff) _uspCardOverlay(monsterId, sig.tickPuff, 750);
    } catch (e) { /* puff is cosmetic */ }
}

// Weapon swing beside the hero for melee-kind spells: the weapon sweeps
// toward the aim point with a slash crescent. The weapon varies per spell
// (USP_MELEE_WEAPON): Heroic Strike swings a sword sideways, Mortal Strike
// brings an axe DOWN overhead - bigger, slower, heavier. One-shot in game
// (removed after the sweep); the looping animation lets the gallery replay
// it forever. Best-effort, never throws.
const USP_MELEE_WEAPON = {
    // Mortal Strike - an overhead axe: raised high, slammed down hard.
    usp_mortal_strike: { kind: 'axe' },
    // Rend - a spear thrust: levelled and driven straight forward twice
    // (the game replays nothing - the double-lunge loop just reads as a
    // vicious rip in the forever-looping gallery).
    usp_rend: { kind: 'spear' },
    // Whirlwind - no aimed weapon at all: twin blades orbiting the hero in
    // a full 360 spin, slashing everything within reach.
    usp_whirlwind: { kind: 'whirl' },
    // Execute - the hardest physical hit in the arsenal deserves the
    // biggest weapon: an oversized executioner greatsword slammed down
    // with a heavy red-tinged crescent.
    usp_execute: { kind: 'greatsword' },
    // Cleave - one strike hitting many: a broad axe sweeping a full wide
    // arc across the front, trailing three slash crescents (the game plays
    // it once - the looping gallery reads it as the whole arc).
    usp_cleave: { kind: 'cleave' },
    // Reap - a reaper attack: a spectral scythe reaped in a full wide
    // arc across the front, trailing soul-wisps (the game plays it once -
    // the looping gallery reads it as the whole harvest).
    usp_reap: { kind: 'scythe' },
};

export function _uspMeleeSwing(spell, origin, aim) {
    if (!origin || typeof document === 'undefined') return;
    try {
        const weapon = (spell && spell.id && USP_MELEE_WEAPON[spell.id] && USP_MELEE_WEAPON[spell.id].kind) || 'sword';
        const a = aim || origin;
        const ang = Math.atan2(a.y - origin.y, a.x - origin.x);
        const el = document.createElement('div');
        el.className = `usp-melee-swing usp-melee-${weapon}`;
        el.style.left = `${origin.x}px`;
        el.style.top = `${origin.y}px`;
        el.style.transform = `rotate(${ang}rad)`;
        el.innerHTML = (weapon === 'axe')
            ? '<div class="usp-axe-arc"></div>' +
                '<div class="usp-axe">' +
                    '<div class="usp-axe-haft"></div>' +
                    '<div class="usp-axe-head"></div>' +
                    '<div class="usp-axe-edge"></div>' +
                '</div>'
            : (weapon === 'whirl')
            ? '<div class="usp-whirl-ring"></div>' +
                '<div class="usp-whirl-orbit">' +
                    '<div class="usp-whirl-blade usp-whirl-blade-1"></div>' +
                    '<div class="usp-whirl-blade usp-whirl-blade-2"></div>' +
                '</div>'
            : (weapon === 'greatsword')
            ? '<div class="usp-great-arc"></div>' +
                '<div class="usp-greatsword">' +
                    '<div class="usp-great-blade"></div>' +
                    '<div class="usp-great-fuller"></div>' +
                    '<div class="usp-great-guard"></div>' +
                    '<div class="usp-great-grip"></div>' +
                    '<div class="usp-great-pommel"></div>' +
                '</div>'
            : (weapon === 'cleave')
            ? '<div class="usp-cleave-arc usp-cleave-arc-1"></div>' +
                '<div class="usp-cleave-arc usp-cleave-arc-2"></div>' +
                '<div class="usp-cleave-arc usp-cleave-arc-3"></div>' +
                '<div class="usp-cleave-axe">' +
                    '<div class="usp-cleave-haft"></div>' +
                    '<div class="usp-cleave-head"></div>' +
                    '<div class="usp-cleave-edge"></div>' +
                '</div>'
            : (weapon === 'scythe')
            ? '<div class="usp-scythe-arc usp-scythe-arc-1"></div>' +
                '<div class="usp-scythe-arc usp-scythe-arc-2"></div>' +
                '<div class="usp-scythe">' +
                    '<div class="usp-scythe-haft"></div>' +
                    '<div class="usp-scythe-collar"></div>' +
                    '<div class="usp-scythe-blade"></div>' +
                    '<div class="usp-scythe-edge"></div>' +
                    '<div class="usp-scythe-wisp usp-scythe-wisp-1"></div>' +
                    '<div class="usp-scythe-wisp usp-scythe-wisp-2"></div>' +
                '</div>'
            : (weapon === 'spear')
            ? '<div class="usp-spear-line"></div>' +
                '<div class="usp-spear">' +
                    '<div class="usp-spear-shaft"></div>' +
                    '<div class="usp-spear-wrap"></div>' +
                    '<div class="usp-spear-head"></div>' +
                    '<div class="usp-spear-tip"></div>' +
                '</div>'
            : '<div class="usp-sword-arc"></div>' +
                '<div class="usp-sword">' +
                    '<div class="usp-sword-blade"></div>' +
                    '<div class="usp-sword-fuller"></div>' +
                    '<div class="usp-sword-guard"></div>' +
                    '<div class="usp-sword-grip"></div>' +
                    '<div class="usp-sword-pommel"></div>' +
                '</div>';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (x) { /* already gone */ } }, weapon === 'sword' ? 480 : (weapon === 'greatsword' ? 750 : (weapon === 'cleave' ? 680 : (weapon === 'whirl' ? 700 : (weapon === 'scythe' ? 700 : 620)))));
    } catch (e) { /* swing is cosmetic */ }
}

// Arrow fan for Multi-Shot: a spread of theme arrows loosed from the hero
// into the placed cone, fanning out toward the ground marker. Purely
// cosmetic (arrival is a no-op) - damage still lands via _uspStrike.
// Best-effort, never throws.
export function _uspArrowFan(spell, origin, point) {
    if (!origin || !point || typeof document === 'undefined') return;
    try {
        const fire = globalThis._egFireProjectile;
        if (typeof fire !== 'function') return;
        const def = USP_THEME_PROJ.arrow || USP_THEME_PROJ.arcane;
        const dx = point.x - origin.x, dy = point.y - origin.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const n = 5;
        for (let i = 0; i < n; i++) {
            const t = (i / (n - 1) - 0.5);
            const end = {
                x: origin.x + dx * 0.9 + nx * t * 150,
                y: origin.y + dy * 0.9 + ny * t * 150,
            };
            setTimeout(() => {
                try { fire(def, def.cssClass, origin, end, 450, 'ease-out', () => {}, null, 1.2); } catch (e) { /* cosmetic */ }
            }, i * 60);
        }
    } catch (e) { /* fan is cosmetic */ }
}

// Blade Blast delivery: hurls a bomb-lashed greatblade from the hero onto
// the placed square, where it sticks in the ground with its bomb ticking
// until the engine's delayed detonation lands. Purely cosmetic (arrival
// plants the marker; damage still lands via _uspStrike). The marker is
// position:fixed and self-removing, so nothing depends on it. Best-effort,
// never throws.
const USP_BLADEBLAST_THROW = {
    cssClass: 'usp-proj-bladeblast', duration: 400, easing: 'ease-out', rotOffset: 0,
    scale: 2.0,
    build(root) {
        root.innerHTML =
            '<div class="egp usp-p-bb">' +
                '<div class="usp-p-bb-trail"></div>' +
                '<div class="usp-p-bb-smoke"></div>' +
                '<div class="usp-p-bb-haft"></div>' +
                '<div class="usp-p-bb-blade"></div>' +
                '<div class="usp-p-bb-edge"></div>' +
                '<div class="usp-p-bb-lash"></div>' +
                '<div class="usp-p-bb-body"></div>' +
                '<div class="usp-p-bb-cap"></div>' +
                '<div class="usp-p-bb-fuse"></div>' +
                '<div class="usp-p-bb-spark"></div>' +
            '</div>';
    },
};

export function _uspBladeBlastPlant(spell, origin, point, delayMs) {
    if (!point || typeof document === 'undefined') return;
    try {
        const plant = () => {
            try {
                const el = document.createElement('div');
                el.className = 'usp-plant-bb';
                el.style.left = `${point.x}px`;
                el.style.top = `${point.y}px`;
                el.innerHTML =
                    '<div class="usp-plant-dust"></div>' +
                    '<div class="usp-plant-blade"></div>' +
                    '<div class="usp-plant-edge"></div>' +
                    '<div class="usp-plant-lash"></div>' +
                    '<div class="usp-plant-bomb"></div>' +
                    '<div class="usp-plant-cap"></div>' +
                    '<div class="usp-plant-fuse"></div>' +
                    '<div class="usp-plant-spark"></div>';
                document.body.appendChild(el);
                setTimeout(() => { try { el.remove(); } catch (x) { /* already gone */ } }, Math.max(300, (delayMs || 800) + 150));
            } catch (e) { /* marker is cosmetic */ }
        };
        const fire = globalThis._egFireProjectile;
        if (origin && typeof fire === 'function') {
            try {
                fire(USP_BLADEBLAST_THROW, USP_BLADEBLAST_THROW.cssClass, origin, point,
                    USP_BLADEBLAST_THROW.duration, USP_BLADEBLAST_THROW.easing, plant, null, USP_BLADEBLAST_THROW.scale);
                return;
            } catch (e) { /* fall through to plant */ }
        }
        plant();
    } catch (e) { /* throw is cosmetic */ }
}

// Signature ground markers (visual overhaul): a spell listed here marks
// its victims with its own rune instead of the generic dashed danger.
// The gallery builder parses cssClass the same way it does impacts.
const USP_SPELL_MARK = {
    // Storm Call - Path-of-Exile marker: a crackling rune circle etched
    // onto the victim, counting down to the skyfall.
    usp_storm_call: { cssClass: 'usp-mark-storm' },
};

// Meteor / delayed-spell warning marker on the target card.
export function _uspTelegraph(spell, monsterId, delayMs) {
    const theme = (spell && spell.theme) || 'fire';
    const mark = spell && spell.id && USP_SPELL_MARK[spell.id];
    _uspCardOverlay(monsterId,
        mark ? mark.cssClass : `usp-telegraph usp-telegraph-${theme}`,
        Math.max(300, (delayMs || 900) + 250));
}


//------------------------------------------------------------------------
//---------------------------PROJECTILE FLIGHT----------------------------
//------------------------------------------------------------------------

// Source anchor: chain jumps fly card→card; sky strikes fall from above the
// card; everything else launches from the player avatar (the caster).
function _uspResolveStart(spell, targetCard, opts) {
    const centre = (typeof globalThis._egGetElementCentre === 'function') ? globalThis._egGetElementCentre : null;
    if (opts && opts.fromMonsterId && centre) {
        const from = document.getElementById(`eg-card-${opts.fromMonsterId}`);
        if (from) return centre(from);
    }
    if (opts && opts.fromSky && targetCard && centre) {
        const c = centre(targetCard);
        return { x: c.x + (Math.random() * 60 - 30), y: c.y - 340 };
    }
    if (centre) {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('class-hud-drag-handle');
        if (avatar) return centre(avatar);
    }
    return null;
}

//------------------------------------------------------------------------
//-------------------------SELF-CAST SUPPORT FX---------------------------
//------------------------------------------------------------------------
// Support spells (heal / shield / buffs) have no target card, so their
// feedback is anchored on the PLAYER instead: a themed ring pulse around the
// avatar plus an optional floating value (`+38`, `-18%`, `×2`). Every element
// is position:fixed and self-removing, so nothing depends on the avatar
// wrapper being positioned.
//------------------------------------------------------------------------

// Resolves the avatar centre in viewport coordinates, or null when the avatar
// is not on screen (then the callers just skip the cosmetic layer).
function _uspSupportAnchor() {
    if (typeof globalThis._egGetElementCentre !== 'function') return null;
    const avatar = document.getElementById('player-avatar-wrapper')
        || document.getElementById('class-hud-drag-handle')
        || document.getElementById('ptable');
    if (!avatar) return null;
    try { return globalThis._egGetElementCentre(avatar); } catch (e) { return null; }
}

// Ring pulse + floating label over the player. `flavor` is one of
// 'heal' | 'shield' | 'buff' | 'wasted' and only tints the label.
// Mend Wounds hearts: little hearts bloom out of the hero in a circle -
// left and right first, then all around - and curve back in to land as
// the heal. Purely cosmetic; the +Life label still carries the number.
// Best-effort, never throws.
export function _uspMendHearts(spell) {
    const anchor = _uspSupportAnchor();
    if (!anchor || typeof document === 'undefined') return;
    try {
        // Emission order: left, right, then around the circle.
        const angles = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, Math.PI / 4, Math.PI * 0.75, -Math.PI * 0.75, -Math.PI / 4];
        const R = 58;
        angles.forEach((a, i) => {
            const h = document.createElement('div');
            h.className = 'usp-mend-heart';
            h.style.left = `${anchor.x}px`;
            h.style.top = `${anchor.y}px`;
            document.body.appendChild(h);
            const dx = Math.cos(a) * R, dy = Math.sin(a) * R * 0.8;
            try {
                h.animate([
                    { transform: 'translate(-50%,-50%) rotate(45deg) scale(.3)', opacity: 0, offset: 0 },
                    { transform: `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) rotate(45deg) scale(1.15)`, opacity: 1, offset: 0.35 },
                    { transform: `translate(calc(-50% + ${(dx * 1.08).toFixed(1)}px), calc(-50% + ${(dy * 1.08 + 6).toFixed(1)}px)) rotate(45deg) scale(1)`, opacity: 1, offset: 0.55 },
                    { transform: 'translate(-50%,-50%) rotate(45deg) scale(.5)', opacity: 0, offset: 1 },
                ], { duration: 1250, delay: i * 90, easing: 'ease-in-out', fill: 'forwards' });
            } catch (e) { /* WAAPI is cosmetic */ }
            setTimeout(() => { try { h.remove(); } catch (x) { /* already gone */ } }, 1250 + angles.length * 90 + 150);
        });
    } catch (e) { /* hearts are cosmetic */ }
}

// Renewal bloom: a living blossom pinned on the hero for the whole heal-
// over-time. One fixed div re-centred every frame (same pattern as the
// aura tracker, own loop so toggles never touch it); every HoT tick flares
// the petals via .is-tick. Children die with the element - no cleanup to
// track beyond the registry. Best-effort, never throws.
// Barrier shell: a blue-ish bubble around the hero for the shield Barrier
// raised — NOT for the gear pool. The pool starts full every encounter, so
// showing the pool would put a bubble up before a single cast. Instead the
// shell latches on the cast (_uspBarrierRaise) and falls the moment the
// pool breaks (0 charge); regen refills silently until the next cast.
// Strength tiers read live each frame, so hits move the shell with no
// call-site hooks.
// Strength tiers: full glow at 65%+, steady .is-mid between 30-65%,
// flickering .is-low under 30%. Best-effort, never throws.
let _uspBarrierEl = null;
let _uspBarrierRaf = null;
let _uspBarrierRaised = false;

function _uspBarrierFrame() {
    _uspBarrierRaf = null;
    try {
        const cur = Number(globalThis._egPlayerAbsorptionCurrent) || 0;
        const max = (typeof globalThis._egComputePlayerStats === 'function')
            ? (globalThis._egComputePlayerStats().absorption || 0) : 0;
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        if (!(max > 0 && cur > 0)) _uspBarrierRaised = false;
        if (_uspBarrierRaised && max > 0 && cur > 0 && avatar) {
            if (!_uspBarrierEl) {
                const el = document.createElement('div');
                el.className = 'usp-barrier-shell';
                el.innerHTML =
                    '<div class="usp-barrier-glass"></div>' +
                    '<div class="usp-barrier-rim"></div>' +
                    '<div class="usp-barrier-sheen"></div>';
                document.body.appendChild(el);
                _uspBarrierEl = el;
            }
            const c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
            _uspBarrierEl.style.left = `${c.x}px`;
            _uspBarrierEl.style.top = `${c.y}px`;
            _uspBarrierEl.style.display = '';
            _uspBarrierEl.classList.toggle('is-low', cur < max * 0.3);
            _uspBarrierEl.classList.toggle('is-mid', cur >= max * 0.3 && cur < max * 0.65);
        } else if (_uspBarrierEl) {
            _uspBarrierEl.style.display = 'none';
        }
    } catch (e) { /* shell is cosmetic */ }
    _uspBarrierRaf = requestAnimationFrame(_uspBarrierFrame);
}

// Raises the shell: latches it on and starts the tracker. Called on
// Barrier casts only — a cast with no gain raises nothing.
export function _uspBarrierRaise() {
    _uspBarrierRaised = true;
    _uspBarrierStart();
}

// Starts the shell tracker (idempotent). Called on encounter starts so the
// loop is warm; the latch (set only by a cast) decides visibility.
export function _uspBarrierStart() {
    if (typeof document === 'undefined') return;
    if (!_uspBarrierRaf) {
        try { _uspBarrierRaf = requestAnimationFrame(_uspBarrierFrame); } catch (e) { /* cosmetic */ }
    }
}

// Stops the tracker and removes the shell. Called on encounter teardown.
export function _uspBarrierStop() {
    try {
        _uspBarrierRaised = false;
        if (_uspBarrierRaf) { cancelAnimationFrame(_uspBarrierRaf); _uspBarrierRaf = null; }
        if (_uspBarrierEl) { try { _uspBarrierEl.remove(); } catch (x) { /* already gone */ } _uspBarrierEl = null; }
    } catch (e) { /* best-effort */ }
}

const _uspBloomEls = {};   // spellId -> element
let _uspBloomRaf = null;

function _uspBloomTrack() {
    _uspBloomRaf = null;
    const ids = Object.keys(_uspBloomEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspBloomEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspBloomRaf = requestAnimationFrame(_uspBloomTrack);
}

// Plants the bloom for ms. Replaces any stale one for the same spell.
export function _uspRenewalBloom(spell, ms) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspRenewalClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-renew-bloom';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let petals = '';
        for (let p = 1; p <= 6; p++) petals += `<div class="usp-renew-petal usp-renew-petal-${p}"></div>`;
        el.innerHTML =
            '<div class="usp-renew-glow"></div>' + petals +
            '<div class="usp-renew-core"></div>';
        document.body.appendChild(el);
        _uspBloomEls[spell.id] = el;
        if (!_uspBloomRaf) _uspBloomRaf = requestAnimationFrame(_uspBloomTrack);
        setTimeout(() => { try { _uspRenewalClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 6000) + 400));
    } catch (e) { /* bloom is cosmetic */ }
}

// Flares the petals for one HoT tick (called by the buff sweep).
export function _uspRenewalPulse(spellId) {
    try {
        const el = _uspBloomEls[spellId];
        if (!el) return;
        el.classList.remove('is-tick');
        void el.offsetWidth;
        el.classList.add('is-tick');
    } catch (e) { /* pulse is cosmetic */ }
}

// Removes the bloom (spellId) or every bloom. Stops the tracker when empty.
export function _uspRenewalClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspBloomEls);
        for (const id of ids) {
            const el = _uspBloomEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspBloomEls[id];
        }
        if (!Object.keys(_uspBloomEls).length && _uspBloomRaf) {
            cancelAnimationFrame(_uspBloomRaf);
            _uspBloomRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//-------------------------BULWARK STONE RING----------------------------
// A ring of consecrated stone circling the hero for the whole guard buff:
// six rock plates orbiting a golden ward-ring, tracking the sprite every
// frame. Planted on cast, cleared when no guard buff remains (buff sweep),
// on full support teardown, or by its own failsafe timer. Best-effort,
// never throws.
const _uspBulwarkEls = {};   // spellId -> element
let _uspBulwarkRaf = null;

function _uspBulwarkTrack() {
    _uspBulwarkRaf = null;
    const ids = Object.keys(_uspBulwarkEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspBulwarkEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspBulwarkRaf = requestAnimationFrame(_uspBulwarkTrack);
}

// Raises the wall for ms. Replaces any stale one for the same spell.
export function _uspBulwarkWall(spell, ms) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspBulwarkClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-bulwark-ring';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let plates = '';
        for (let p = 1; p <= 6; p++) plates += `<div class="usp-bulwark-plate usp-bulwark-plate-${p}"></div>`;
        el.innerHTML =
            '<div class="usp-bulwark-ground"></div>' +
            '<div class="usp-bulwark-orbit">' + plates + '</div>' +
            '<div class="usp-bulwark-ward"></div>';
        document.body.appendChild(el);
        _uspBulwarkEls[spell.id] = el;
        if (!_uspBulwarkRaf) _uspBulwarkRaf = requestAnimationFrame(_uspBulwarkTrack);
        setTimeout(() => { try { _uspBulwarkClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 8000) + 400));
    } catch (e) { /* wall is cosmetic */ }
}

// Drops the wall (spellId) or every wall. Stops the tracker when empty.
export function _uspBulwarkClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspBulwarkEls);
        for (const id of ids) {
            const el = _uspBulwarkEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspBulwarkEls[id];
        }
        if (!Object.keys(_uspBulwarkEls).length && _uspBulwarkRaf) {
            cancelAnimationFrame(_uspBulwarkRaf);
            _uspBulwarkRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//-------------------------WINDWARD GUSTS------------------------------
// Swift winds circling the hero for the whole evade buff: three arcing
// gust trails and drifting wind motes orbiting a faint storm-ring,
// tracking the sprite every frame. Planted on cast, cleared when no evade
// buff remains (buff sweep), on full support teardown, or by its own
// failsafe timer. Best-effort, never throws.
const _uspWindwardEls = {};   // spellId -> element
let _uspWindwardRaf = null;

function _uspWindwardTrack() {
    _uspWindwardRaf = null;
    const ids = Object.keys(_uspWindwardEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspWindwardEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspWindwardRaf = requestAnimationFrame(_uspWindwardTrack);
}

// Raises the winds for ms. Replaces any stale one for the same spell.
export function _uspWindwardGale(spell, ms) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspWindwardClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-windward-gale';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let gusts = '';
        for (let g = 1; g <= 3; g++) gusts += `<div class="usp-windward-gust usp-windward-gust-${g}"></div>`;
        let motes = '';
        for (let m = 1; m <= 6; m++) motes += `<div class="usp-windward-mote usp-windward-mote-${m}"></div>`;
        el.innerHTML =
            '<div class="usp-windward-ring"></div>' +
            '<div class="usp-windward-swirl">' + gusts + motes + '</div>';
        document.body.appendChild(el);
        _uspWindwardEls[spell.id] = el;
        if (!_uspWindwardRaf) _uspWindwardRaf = requestAnimationFrame(_uspWindwardTrack);
        setTimeout(() => { try { _uspWindwardClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 8000) + 400));
    } catch (e) { /* gale is cosmetic */ }
}

// Still the winds (spellId) or every gale. Stops the tracker when empty.
export function _uspWindwardClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspWindwardEls);
        for (const id of ids) {
            const el = _uspWindwardEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspWindwardEls[id];
        }
        if (!Object.keys(_uspWindwardEls).length && _uspWindwardRaf) {
            cancelAnimationFrame(_uspWindwardRaf);
            _uspWindwardRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//-------------------------AEGIS WARD LATTICE--------------------------
// A prismatic lattice of light guarding the hero for the whole ward buff:
// a rotating hexagonal aegis of golden glass, orbited by crystal shards,
// crowned by charge pips — one burning diamond per remaining negation.
// Planted on cast, _uspAegisWardHit(left) dims a pip and flashes the
// lattice on every absorbed hit (clearing it when no charge is left),
// cleared when no ward buff remains (buff sweep), on full support
// teardown, or by its own failsafe timer. Best-effort, never throws.
const _uspAegisEls = {};   // spellId -> element
let _uspAegisRaf = null;

function _uspAegisTrack() {
    _uspAegisRaf = null;
    const ids = Object.keys(_uspAegisEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspAegisEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspAegisRaf = requestAnimationFrame(_uspAegisTrack);
}

function _uspAegisPaintPips(el, left) {
    try {
        const pips = el.querySelectorAll('.usp-aegis-pip');
        for (let i = 0; i < pips.length; i++) {
            pips[i].classList.toggle('is-spent', i >= left);
        }
    } catch (e) { /* pips are cosmetic */ }
}

// Raises the lattice for ms with `charges` burning pips.
export function _uspAegisWardShow(spell, ms, charges) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspAegisWardClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-aegis-lattice';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let shards = '';
        for (let s = 1; s <= 5; s++) shards += `<div class="usp-aegis-shard usp-aegis-shard-${s}"></div>`;
        const total = Math.max(1, Math.min(5, Math.round(charges) || 2));
        let pips = '';
        for (let q = 1; q <= total; q++) pips += '<div class="usp-aegis-pip"></div>';
        el.innerHTML =
            '<div class="usp-aegis-halo"></div>' +
            '<div class="usp-aegis-hex"></div>' +
            '<div class="usp-aegis-orbit">' + shards + '</div>' +
            '<div class="usp-aegis-pips">' + pips + '</div>';
        document.body.appendChild(el);
        _uspAegisEls[spell.id] = el;
        if (!_uspAegisRaf) _uspAegisRaf = requestAnimationFrame(_uspAegisTrack);
        setTimeout(() => { try { _uspAegisWardClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 12000) + 400));
    } catch (e) { /* lattice is cosmetic */ }
}

// Flashes the lattice on an absorbed hit; dims pips down to `left`.
// No charge left: the lattice shatters (clears) — nothing guards anymore.
export function _uspAegisWardHit(left) {
    try {
        const ids = Object.keys(_uspAegisEls);
        for (const id of ids) {
            const el = _uspAegisEls[id];
            if (!el) continue;
            if (!(left > 0)) { try { _uspAegisWardClear(id); } catch (x) { /* already gone */ } continue; }
            _uspAegisPaintPips(el, left);
            el.classList.remove('is-hit');
            void el.offsetWidth;
            el.classList.add('is-hit');
        }
    } catch (e) { /* flash is cosmetic */ }
}

// Lowers the lattice (spellId) or every lattice. Stops the tracker when empty.
export function _uspAegisWardClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspAegisEls);
        for (const id of ids) {
            const el = _uspAegisEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspAegisEls[id];
        }
        if (!Object.keys(_uspAegisEls).length && _uspAegisRaf) {
            cancelAnimationFrame(_uspAegisRaf);
            _uspAegisRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//-------------------------RETRIBUTION INFERNO------------------------
// A wreath of punishing flame circling the hero for the whole thorns buff:
// eight licking flame tongues around a glowing ember ring, with cinders
// rising off the fire, tracking the sprite every frame. Planted on cast,
// _uspRetributionFlare() bursts the flames brighter on every reflected hit
// (called by the thorns hook), cleared when no thorns buff remains (buff
// sweep), on full support teardown, or by its own failsafe timer.
// Best-effort, never throws.
const _uspRetribEls = {};   // spellId -> element
let _uspRetribRaf = null;

function _uspRetribTrack() {
    _uspRetribRaf = null;
    const ids = Object.keys(_uspRetribEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspRetribEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspRetribRaf = requestAnimationFrame(_uspRetribTrack);
}

// Kindles the wreath for ms. Replaces any stale one for the same spell.
export function _uspRetributionShow(spell, ms) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspRetributionClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-retrib-wreath';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let flames = '';
        for (let f = 1; f <= 8; f++) flames += `<div class="usp-retrib-flame usp-retrib-flame-${f}"></div>`;
        let cinders = '';
        for (let e = 1; e <= 6; e++) cinders += `<div class="usp-retrib-cinder usp-retrib-cinder-${e}"></div>`;
        el.innerHTML =
            '<div class="usp-retrib-glow"></div>' +
            '<div class="usp-retrib-ember"></div>' +
            '<div class="usp-retrib-spin">' + flames + '</div>' + cinders;
        document.body.appendChild(el);
        _uspRetribEls[spell.id] = el;
        if (!_uspRetribRaf) _uspRetribRaf = requestAnimationFrame(_uspRetribTrack);
        setTimeout(() => { try { _uspRetributionClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 10000) + 400));
    } catch (e) { /* wreath is cosmetic */ }
}

// Bursts the flames on a reflected hit (called by the thorns hook).
export function _uspRetributionFlare() {
    try {
        const ids = Object.keys(_uspRetribEls);
        for (const id of ids) {
            const el = _uspRetribEls[id];
            if (!el) continue;
            el.classList.remove('is-flare');
            void el.offsetWidth;
            el.classList.add('is-flare');
        }
    } catch (e) { /* flare is cosmetic */ }
}

// Douses the wreath (spellId) or every wreath. Stops the tracker when empty.
export function _uspRetributionClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspRetribEls);
        for (const id of ids) {
            const el = _uspRetribEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspRetribEls[id];
        }
        if (!Object.keys(_uspRetribEls).length && _uspRetribRaf) {
            cancelAnimationFrame(_uspRetribRaf);
            _uspRetribRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//-------------------------WINDSTEP TAILWIND---------------------------
// A swift tailwind carrying the hero for the whole windstep buff: speed
// lines streaming past and light feathers swirling at the feet, tracking
// the sprite every frame. Planted on cast, cleared when no windstep buff
// remains (buff sweep), on full support teardown, or by its own failsafe
// timer. Best-effort, never throws.
const _uspWindstepEls = {};   // spellId -> element
let _uspWindstepRaf = null;

function _uspWindstepTrack() {
    _uspWindstepRaf = null;
    const ids = Object.keys(_uspWindstepEls);
    if (!ids.length) return;
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        let c = null;
        if (avatar) {
            c = (typeof globalThis._egGetElementCentre === 'function')
                ? globalThis._egGetElementCentre(avatar)
                : (() => { const r = avatar.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })();
        }
        if (c) {
            for (const id of ids) {
                const el = _uspWindstepEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspWindstepRaf = requestAnimationFrame(_uspWindstepTrack);
}

// Catches the wind for ms. Replaces any stale one for the same spell.
export function _uspWindstepTailwind(spell, ms) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspWindstepClear(spell.id);
        const c = (() => {
            try {
                const avatar = document.getElementById('player-avatar-wrapper')
                    || document.getElementById('player-avatar-simple')
                    || document.getElementById('class-hud-drag-handle');
                if (avatar && typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
            } catch (e) { /* fall through */ }
            return null;
        })() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const el = document.createElement('div');
        el.className = 'usp-windstep-tailwind';
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        let lines = '';
        for (let l = 1; l <= 4; l++) lines += `<div class="usp-windstep-line usp-windstep-line-${l}"></div>`;
        let feathers = '';
        for (let f = 1; f <= 4; f++) feathers += `<div class="usp-windstep-feather usp-windstep-feather-${f}"></div>`;
        el.innerHTML = '<div class="usp-windstep-swirl">' + lines + feathers + '</div>';
        document.body.appendChild(el);
        _uspWindstepEls[spell.id] = el;
        if (!_uspWindstepRaf) _uspWindstepRaf = requestAnimationFrame(_uspWindstepTrack);
        setTimeout(() => { try { _uspWindstepClear(spell.id); } catch (x) { /* already gone */ } }, Math.max(500, (ms || 6000) + 400));
    } catch (e) { /* tailwind is cosmetic */ }
}

// Drops the tailwind (spellId) or every tailwind. Stops the tracker when empty.
export function _uspWindstepClear(spellId) {
    try {
        const ids = spellId ? [spellId] : Object.keys(_uspWindstepEls);
        for (const id of ids) {
            const el = _uspWindstepEls[id];
            if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
            delete _uspWindstepEls[id];
        }
        if (!Object.keys(_uspWindstepEls).length && _uspWindstepRaf) {
            cancelAnimationFrame(_uspWindstepRaf);
            _uspWindstepRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

//------------------------------------------------------------------------
//-------------------------PERSISTENT AURA VISUALS-------------------------
//------------------------------------------------------------------------
// Toggle auras (Vortex, Blade Vortex, ...) burn mana every second while
// they are on. Each aura gets ONE persistent visual for its whole lifetime
// - a fixed div re-centred on the hero every frame, so it travels with the
// player with no layout impact (never a child of the avatar wrapper, whose
// rect other systems measure). The per-second detonation on top is the
// existing zone burst in _uspPulseAura plus a flash on this visual.
const _uspAuraEls = {};   // spellId -> element
let _uspAuraRaf = null;

function _uspAuraCentre() {
    try {
        const avatar = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple')
            || document.getElementById('class-hud-drag-handle');
        if (!avatar) return null;
        if (typeof globalThis._egGetElementCentre === 'function') return globalThis._egGetElementCentre(avatar);
        const r = avatar.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } catch (e) { return null; }
}

// Re-centres every live aura visual on the hero. One shared loop for all
// auras - it stops itself when the last aura goes off.
function _uspAuraTrack() {
    _uspAuraRaf = null;
    const ids = Object.keys(_uspAuraEls);
    if (!ids.length) return;
    try {
        const c = _uspAuraCentre();
        if (c) {
            for (const id of ids) {
                const el = _uspAuraEls[id];
                if (el) { el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
            }
        }
    } catch (e) { /* tracking is cosmetic */ }
    _uspAuraRaf = requestAnimationFrame(_uspAuraTrack);
}

// Ice-vortex spiral arms (SVG, 200x200 box) + orbiting shards.
function _uspVortexMarkup() {
    const arm = (k, arms, twist) => {
        let d = '';
        for (let i = 0; i <= 28; i++) {
            const t = i / 28;
            const r = 9 + 88 * t;
            const a = (k / arms) * Math.PI * 2 + t * twist;
            d += `${i ? 'L' : 'M'}${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)} `;
        }
        return d;
    };
    const layer = (cls, arms, twist, wide, narrow) => {
        let p = '';
        for (let k = 0; k < arms; k++) {
            const d = arm(k, arms, twist);
            p += `<path d="${d}" fill="none" class="usp-vtx-arm-wide" stroke-width="${wide}"/>` +
                 `<path d="${d}" fill="none" class="usp-vtx-arm" stroke-width="${narrow}"/>`;
        }
        return `<svg class="usp-vtx-spiral ${cls}" viewBox="0 0 200 200" width="100%" height="100%" fill="none">${p}</svg>`;
    };
    let shards = '';
    const specs = [[34, 2.1, 0], [46, 2.9, 0.4], [58, 3.6, 0.8], [70, 4.4, 0.2], [82, 5.2, 0.6], [40, 2.5, 1.3], [64, 3.9, 1.7], [76, 4.8, 1.1]];
    specs.forEach(([r, dur, delay], i) => {
        shards += `<div class="usp-vtx-orbit" style="--d:${dur}s;--o:-${(delay * dur).toFixed(2)}s">` +
                  `<div class="usp-vtx-shard" style="--r:${r}%;--s:${i % 3 === 0 ? 9 : 6}px"></div></div>`;
    });
    return layer('usp-vtx-a', 3, 3.4, 9, 2.6) + layer('usp-vtx-b', 4, 2.6, 5, 1.6) +
           '<div class="usp-vtx-eye"></div>' + shards;
}

// Pins the persistent aura visual for a spell (radius in px). Replaces any
// stale one for the same spell. Best-effort, never throws.
export function _uspAuraShow(spell, radius) {
    if (!spell || typeof document === 'undefined') return;
    try {
        _uspAuraClear(spell.id);
        const c = _uspAuraCentre() || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const d = Math.max(80, (radius || 200) * 2);
        const el = document.createElement('div');
        el.className = `usp-aura-vortex usp-aura-${spell.theme || 'frost'}`;
        el.style.width = `${d}px`;
        el.style.height = `${d}px`;
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
        // Blade Vortex - a ring of circling blades around the hero, not
        // just mist: six conjured blades orbit the avatar for the whole
        // toggle. Children of the aura element, so they die with it.
        const isBlades = spell.id === 'usp_blade_vortex';
        if (isBlades) el.classList.add('is-blades');
        // Vortex - a Path-of-Exile style ice whirlwind: spiral arms of
        // snow curling in to an eye, with ice shards slung round on
        // different orbits. Built only for usp_vortex; other toggle
        // auras keep the shared shell.
        const isVortex = spell.id === 'usp_vortex';
        if (isVortex) el.classList.add('is-vortex');
        let orbit = '';
        if (isVortex) orbit = _uspVortexMarkup();
        if (isBlades) {
            orbit = '<div class="usp-aura-orbit">';
            for (let b = 1; b <= 6; b++) orbit += `<div class="usp-aura-blade usp-aura-blade-${b}"></div>`;
            orbit += '</div>';
        }
        el.innerHTML =
            '<div class="usp-aura-floor"></div>' +
            '<div class="usp-aura-mist"></div>' +
            '<div class="usp-aura-ring"></div>' +
            orbit +
            '<div class="usp-aura-mote usp-aura-mote-1"></div>' +
            '<div class="usp-aura-mote usp-aura-mote-2"></div>' +
            '<div class="usp-aura-mote usp-aura-mote-3"></div>';
        document.body.appendChild(el);
        _uspAuraEls[spell.id] = el;
        if (!_uspAuraRaf) _uspAuraRaf = requestAnimationFrame(_uspAuraTrack);
    } catch (e) { /* aura visual is cosmetic */ }
}

// Removes the persistent visual. Stops the tracker when nothing is left.
export function _uspAuraClear(spellId) {
    try {
        const el = _uspAuraEls[spellId];
        if (el) { try { el.remove(); } catch (x) { /* already gone */ } }
        delete _uspAuraEls[spellId];
        if (!Object.keys(_uspAuraEls).length && _uspAuraRaf) {
            cancelAnimationFrame(_uspAuraRaf);
            _uspAuraRaf = null;
        }
    } catch (e) { /* best-effort */ }
}

// Flashes the persistent visual for one pulse detonation (called every
// second by _uspPulseAura while the aura is on).
export function _uspAuraPulse(spellId) {
    try {
        const el = _uspAuraEls[spellId];
        if (!el) return;
        el.classList.remove('is-pulse');
        void el.offsetWidth;
        el.classList.add('is-pulse');
        setTimeout(() => { try { el.classList.remove('is-pulse'); } catch (x) {} }, 480);
    } catch (e) { /* best-effort */ }
}

export function _uspSupportCastFX(spell, text, flavor) {
    const anchor = _uspSupportAnchor();
    if (!anchor) return;
    const theme = (spell && spell.theme) || 'holy';

    const ring = document.createElement('div');
    ring.className = `usp-support-ring usp-support-ring-${theme}`;
    ring.style.left = `${anchor.x}px`;
    ring.style.top = `${anchor.y}px`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);

    if (!text) return;
    const color = {
        heal: '#7fe0b0', shield: '#7fd9ff', buff: '#ffd27f', wasted: '#ff8a65',
    }[flavor] || '#ffffff';
    // The outer wrapper owns the centring transform and the inner span owns
    // the float animation, so the two never fight over `transform`.
    const label = document.createElement('div');
    label.className = 'usp-support-label';
    const labelText = document.createElement('span');
    labelText.className = 'usp-support-label-text';
    labelText.textContent = text;
    label.appendChild(labelText);
    label.style.left = `${anchor.x}px`;
    label.style.top = `${anchor.y - 26}px`;
    label.style.color = color;
    document.body.appendChild(label);
    setTimeout(() => label.remove(), 1100);
}

// Light ring-only pulse - used by heal-over-time ticks and other repeats so
// the periodic effect is visible without spamming a number every second.
export function _uspSupportPulseFX(spell) {
    _uspSupportCastFX(spell, '', 'heal');
}


//------------------------------------------------------------------------
//-------------------------MOVEMENT SPELL FX------------------------------
//------------------------------------------------------------------------
// The movement family has no target card and no fixed cast point: its
// feedback is the STREAK between where the sprite was and where it landed,
// plus - for the Rift Anchor - a marker pinned to the armed spot so the
// player can always see where "back" is.
//------------------------------------------------------------------------

// Where the visible sprite sits inside its wrapper, as an offset from the
// wrapper's top-left. The wrapper carries the HP/charge bars above the art and
// is wider than the sprite, so drawing FX at the raw position would smear the
// streak off the character. Measured live so it also holds on the simple
// (level-select style) avatar, which has neither.
export function _uspMoveSpriteOffset() {
    const wrap = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!wrap || !img) return { x: 36, y: 45 };
    try {
        const wr = wrap.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        if (!wr.width || !ir.width) return { x: wrap.offsetWidth / 2 || 36, y: wrap.offsetHeight / 2 || 45 };
        return {
            x: (ir.left - wr.left) + ir.width / 2,
            y: (ir.top - wr.top) + ir.height / 2,
        };
    } catch (e) {
        return { x: 36, y: 45 };
    }
}

// Streak from the cast origin to the landing point, in wrapper coordinates.
// `soft` is the travelling version (Dash / Disengage): thinner and dimmer, so
// a Blink still reads as the bigger event at a glance.
export function _uspBlinkFX(spell, fromX, fromY, toX, toY, soft) {
    const off = _uspMoveSpriteOffset();
    const x1 = fromX + off.x;
    const y1 = fromY + off.y;
    const x2 = toX + off.x;
    const y2 = toY + off.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 8)) return;

    const theme = (spell && spell.theme) || 'arcane';
    const streak = document.createElement('div');
    streak.className = `usp-move-streak usp-move-streak-${theme}${soft ? ' is-soft' : ''}`;
    streak.style.left = `${x1}px`;
    streak.style.top = `${y1}px`;
    streak.style.width = `${len}px`;
    streak.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    document.body.appendChild(streak);
    setTimeout(() => { try { streak.remove(); } catch (e) {} }, 700);
    // Shadow Dash glides instead of teleporting: the hero MELTS into shadow
    // and REFORMS — a dissolving pool behind, a coalescing pillar ahead —
    // rather than Blink's void-implode and shockwave.
    const isDash = !!spell && spell.behavior === 'dash';
    // Disengage is a desperate LEAP away: a dust-kick crater blasting off at
    // takeoff and a skidding dust slide where it lands — brute and dusty,
    // not void-cold like Blink or melty like Dash.
    const isLeap = !!spell && spell.behavior === 'disengage';
    // Rift Anchor recall is a homecoming, not an escape: the far spot tears
    // open like Blink, but the landing is a PLUNGE — the hero is sucked DOWN
    // into the waiting rift instead of bursting out of it.
    const isAnchor = !!spell && spell.behavior === 'anchor';
    // Step 1 — departure: the old spot implodes into a void poof.
    try {
        const depart = document.createElement('div');
        depart.className = isDash
            ? `usp-dash-dissolve usp-blink-${theme}`
            : isLeap
            ? `usp-leap-kick usp-blink-${theme}`
            : `usp-blink-depart usp-blink-${theme}`;
        depart.style.left = `${x1}px`;
        depart.style.top = `${y1}px`;
        document.body.appendChild(depart);
        setTimeout(() => { try { depart.remove(); } catch (e) {} }, 650);
    } catch (e) { /* depart is cosmetic */ }
    // Step 3 — arrival: the landing spot bursts open in a shockwave.
    try {
        const arrive = document.createElement('div');
        arrive.className = isDash
            ? `usp-dash-reform usp-blink-${theme}`
            : isLeap
            ? `usp-leap-skid usp-blink-${theme}`
            : isAnchor
            ? `usp-anchor-plunge usp-blink-${theme}`
            : `usp-blink-arrive usp-blink-${theme}`;
        arrive.style.left = `${x2}px`;
        arrive.style.top = `${y2}px`;
        arrive.style.animationDelay = isLeap ? '220ms' : soft ? '150ms' : '60ms';
        document.body.appendChild(arrive);
        setTimeout(() => { try { arrive.remove(); } catch (e) {} }, isLeap ? 1050 : soft ? 950 : 800);
    } catch (e) { /* arrival is cosmetic */ }
}

// The armed Rift Anchor's world marker. One at a time (a second anchor
// replaces the first, matching the spell), removed on recall, on expiry and
// when the encounter ends.
let _uspAnchorMarkerEl = null;

// Where the sprite's FEET are, as an offset from the wrapper's top-left. The
// anchor is a ground point, and the marker must stay visible - centred on the
// sprite it would sit behind the character art, so it is pinned at the feet,
// just below the body, where the ground contact actually is.
function _uspMoveSpriteFootOffset() {
    const wrap = document.getElementById('player-avatar-wrapper')
        || document.getElementById('player-avatar-simple');
    const img = document.getElementById('avatar-sprite-img')
        || document.getElementById('avatar-sprite-img-simple');
    if (!wrap || !img) return { x: 36, y: 80 };
    try {
        const wr = wrap.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        if (!wr.width || !ir.width) {
            return { x: wrap.offsetWidth / 2 || 36, y: wrap.offsetHeight || 80 };
        }
        return {
            x: (ir.left - wr.left) + ir.width / 2,
            y: (ir.top - wr.top) + ir.height,
        };
    } catch (e) {
        return { x: 36, y: 80 };
    }
}

export function _uspAnchorMarkerShow(spell, x, y, secs) {
    _uspAnchorMarkerClear();
    const off = _uspMoveSpriteFootOffset();
    const el = document.createElement('div');
    el.className = `usp-anchor-marker usp-anchor-marker-${(spell && spell.theme) || 'arcane'}`;
    el.textContent = (spell && spell.icon) || '📍';
    const rift = document.createElement('div');
    rift.className = 'usp-anchor-rift';
    el.appendChild(rift);
    el.style.left = `${x + off.x}px`;
    el.style.top = `${y + off.y}px`;
    document.body.appendChild(el);
    _uspAnchorMarkerEl = el;
}

export function _uspAnchorMarkerClear() {
    if (_uspAnchorMarkerEl) {
        try { _uspAnchorMarkerEl.remove(); } catch (e) { /* already gone */ }
    }
    _uspAnchorMarkerEl = null;
}


// Draws a brief beam of energy from the hero to a victim's card (file-
// private; only beam-flagged signature strikes use it). Endpoints resolve
// best-effort - if either is missing there is simply no ray, never an
// error. The beam is cosmetic: damage + impact are applied by the caller.
function _uspBeamFlash(spell, monsterId) {
    if (typeof document === 'undefined') return;
    try {
        const hero = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        const card = document.getElementById(`eg-card-${monsterId}`);
        if (!hero || !card) return;
        const centre = (el) => {
            if (typeof globalThis._egGetElementCentre === 'function') {
                try { return globalThis._egGetElementCentre(el); } catch (e) { /* fall through */ }
            }
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        };
        const s = centre(hero), e = centre(card);
        const len = Math.hypot(e.x - s.x, e.y - s.y);
        if (!(len > 8)) return;
        const ang = Math.atan2(e.y - s.y, e.x - s.x);
        const el = document.createElement('div');
        el.className = 'usp-beam-flash';
        el.style.left = `${s.x}px`;
        el.style.top = `${s.y}px`;
        el.style.width = `${len}px`;
        el.style.transform = `rotate(${ang}rad)`;
        el.innerHTML =
            '<div class="usp-beam-halo"></div>' +
            '<div class="usp-beam-mid"></div>' +
            '<div class="usp-beam-core"></div>';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (x) { /* already gone */ } }, 300);
    } catch (e) { /* beam is cosmetic */ }
}

// Channeled flamethrower cone from the hero onto a victim's card (file-
// private; only flamejet-flagged signature strikes use it - Incinerate).
// Same endpoint geometry as the beam, but the cone WIDENS onto the enemy
// like a real flamethrower spread and lives ~one channel tick, so holding
// the button reads as one continuous stream of fire. The hit itself is
// applied by the caller - this is purely the visible flame.
function _uspFlameJet(spell, monsterId) {
    if (typeof document === 'undefined') return;
    try {
        const hero = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        const card = document.getElementById(`eg-card-${monsterId}`);
        if (!hero || !card) return;
        const centre = (el) => {
            if (typeof globalThis._egGetElementCentre === 'function') {
                try { return globalThis._egGetElementCentre(el); } catch (e) { /* fall through */ }
            }
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        };
        const s = centre(hero), e = centre(card);
        const len = Math.hypot(e.x - s.x, e.y - s.y);
        if (!(len > 8)) return;
        const ang = Math.atan2(e.y - s.y, e.x - s.x);
        const el = document.createElement('div');
        el.className = 'usp-flame-jet';
        el.style.left = `${s.x}px`;
        el.style.top = `${s.y}px`;
        el.style.width = `${len}px`;
        el.style.transform = `rotate(${ang}rad)`;
        el.innerHTML =
            '<div class="usp-jet-halo"></div>' +
            '<div class="usp-jet-body"></div>' +
            '<div class="usp-jet-core"></div>' +
            '<div class="usp-jet-ember usp-jet-ember-1"></div>' +
            '<div class="usp-jet-ember usp-jet-ember-2"></div>' +
            '<div class="usp-jet-ember usp-jet-ember-3"></div>';
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (x) { /* already gone */ } }, 420);
    } catch (e) { /* jet is cosmetic */ }
}

// Reverse drain beam from a victim's card BACK to the hero (file-private;
// only soulbeam-flagged signature strikes use it - Soulrend). The mirror
// of _uspBeamFlash: the element is anchored on the victim and rotated
// toward the hero, and pale soul-wisps ride the beam home while the tick
// lands. Cosmetic only; the caller applies damage + impact.
function _uspSoulBeam(spell, monsterId) {
    if (typeof document === 'undefined') return;
    try {
        const hero = document.getElementById('player-avatar-wrapper')
            || document.getElementById('player-avatar-simple');
        const card = document.getElementById(`eg-card-${monsterId}`);
        if (!hero || !card) return;
        const centre = (el) => {
            if (typeof globalThis._egGetElementCentre === 'function') {
                try { return globalThis._egGetElementCentre(el); } catch (e) { /* fall through */ }
            }
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        };
        const v = centre(card), h = centre(hero);
        const len = Math.hypot(h.x - v.x, h.y - v.y);
        if (!(len > 8)) return;
        const ang = Math.atan2(h.y - v.y, h.x - v.x);
        const el = document.createElement('div');
        el.className = 'usp-soul-beam';
        el.style.left = `${v.x}px`;
        el.style.top = `${v.y}px`;
        el.style.width = `${len}px`;
        el.style.transform = `rotate(${ang}rad)`;
        el.innerHTML =
            '<div class="usp-soul-halo"></div>' +
            '<div class="usp-soul-thread"></div>' +
            '<div class="usp-soul usp-soul-1"></div>' +
            '<div class="usp-soul usp-soul-2"></div>' +
            '<div class="usp-soul usp-soul-3"></div>';
        document.body.appendChild(el);
        // One channel tick long: the next tick redraws the beam, so holding
        // reads as one unbroken drain with fresh souls every half second.
        setTimeout(() => { try { el.remove(); } catch (x) { /* already gone */ } }, 520);
    } catch (e) { /* beam is cosmetic */ }
}

// Fires one themed projectile; damage lands via _egDamageTargetById so
// resistances, ailments, echo and kill detection all apply. DoT ticks skip
// the flight and sizzle directly on the card.
export function _uspFireThemedProjectile(spell, monsterId, hit, opts) {
    opts = opts || {};
    // Signature look: a per-spell override (USP_SPELL_PROJ) owns its launch
    // scale and impact weight; everyone else keeps the shared theme behavior.
    const projDef = _uspProjDefFor(spell);
    if (projDef.isBig) opts.isBig = true;
    const damageFn = (typeof globalThis._egDamageTargetById === 'function') ? globalThis._egDamageTargetById : null;
    if (!damageFn) return;

    // Melee strikes (spell pass 1): the swing already played beside the
    // hero, so the hit lands at once - no projectile flight. Tagged isMelee
    // so Spellproof monsters take full damage, like a weapon strike.
    if (opts.isMelee) {
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit, isMelee: true, uspSfx: !!(opts.isTick || USP_IMPACT_SFX[spell && spell.theme]) });
        if (opts.isTick) _uspDotTick(spell, monsterId);
        else _uspImpact(spell, monsterId, opts);
        return;
    }

    // DoT ticks: no travel time, just the themed sizzle + damage.
    if (opts.isTick) {
        _uspDotTick(spell, monsterId);
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit, isPlayerSpell: true, uspSfx: true });
        return;
    }

    // Signature strikes with no flight (e.g. Immolate): the hit lands at
    // once with the regular impact treatment, exactly like a tick delivery.
    // Beam spells (Disintegrate) additionally flash the energy ray first;
    // word spells (Pain, Corruption) brand their word first
    // and go straight to the sizzle, since the opener only applies the DoT.
    const sigHit = spell && spell.id && USP_SPELL_IMPACT[spell.id];
    if (sigHit && sigHit.noFlight) {
        if (sigHit.beam) _uspBeamFlash(spell, monsterId);
        else if (sigHit.flamejet) _uspFlameJet(spell, monsterId);
        else if (sigHit.soulbeam) _uspSoulBeam(spell, monsterId);
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit, isPlayerSpell: true, uspSfx: !!USP_IMPACT_SFX[spell && spell.theme] });
        if (sigHit.wordImpact) { _uspWordBrand(spell, monsterId, sigHit.word); _uspDotTick(spell, monsterId); }
        else _uspImpact(spell, monsterId, opts);
        return;
    }

    // Signature skyfall routing (Storm Smite): launch from above the card
    // whatever the behavior's default start anchor is.
    if (sigHit && sigHit.skyfall) opts.fromSky = true;

    const targetCard = document.getElementById(`eg-card-${monsterId}`);
    const start = _uspResolveStart(spell, targetCard, opts);

    const impact = () => {
        // isPlayerSpell: Spellproof monsters resist magic sources (melee
        // strikes are exempt - see _egApplyTargetResistances).
        damageFn(monsterId, hit.amount, hit.elements, { isCrit: !!hit.isCrit, isPlayerSpell: true, uspSfx: !!USP_IMPACT_SFX[spell && spell.theme] });
        _uspImpact(spell, monsterId, opts);
    };

    // No visual path (card hidden / missing anchor) - apply instantly.
    if (!start || !targetCard || typeof globalThis._egFireProjectile !== 'function') {
        impact();
        return;
    }

    let centre = globalThis._egGetElementCentre(targetCard);
    // Volley spread (Barrage): fan the shafts across the victim so rapid
    // followers don't land on the exact same pixel - cosmetic only, the
    // hit still lands on the same monster.
    if (opts.volleyTotal > 1 && typeof opts.volleyIndex === 'number') {
        const off = (opts.volleyIndex - (opts.volleyTotal - 1) / 2) * 16;
        const dx = centre.x - start.x, dy = centre.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        centre = { x: centre.x + (-dy / len) * off, y: centre.y + (dx / len) * off };
    }
    const scale = opts.volleyIndex ? 1.1 : (projDef.scale || (opts.isBig ? 1.8 : 1.4));
    let flightMs = opts.fromSky ? 550 : projDef.duration;
    if (projDef.speedScales && !opts.fromSky) {
        try {
            const pct = Math.max(0, Number(globalThis._egComputePlayerStats().projectileSpeedPct) || 0);
            flightMs = Math.max(60, Math.round(flightMs / (1 + pct / 100)));
        } catch (e) { /* no stats - base speed */ }
    }
    try {
        globalThis._egFireProjectile(
            projDef, projDef.cssClass,
            start, centre,
            flightMs,
            opts.fromSky ? 'ease-in' : projDef.easing,
            impact, null, scale
        );
    } catch (e) {
        impact();
    }
}
