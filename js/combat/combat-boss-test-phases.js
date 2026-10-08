//------------------------------------------------------------------------
//-------------------BOSS SPECIAL-PHASE DESCRIPTIONS-----------------------
//------------------------------------------------------------------------
// Human-readable descriptions for boss mechanics that are implemented by
// phase hooks or persistent arena watchers rather than the schedule table.

import { t } from '../translation/translations.js';

// Translation lookup with a real fallback: t() returns the key itself when
// a translation is missing (truthy), so `t(k) || fb` never falls back.
// This helper returns the fallback English text in that case.
export function _egbtTr(key, fallback) {
    try {
        const v = (typeof t === 'function') ? t(key) : key;
        return (v && v !== key) ? v : fallback;
    } catch (e) { return fallback; }
}

// Returns special phase mechanic info for bosses with onPhaseEnter hooks,
// HP-gated set-pieces, or persistent arena twists (onInit watchers) that
// never appear in the EG_BOSS_MECHANICS schedule - without these entries
// the tooltip only shows the scheduled mechanics and hides the signature
// of the fight. Covers all Tier 1–4 bosses.
export function _egbtGetSpecialPhaseInfo(bossId) {
    switch (bossId) {
        // ── Tier 1 ──
        case 'boss_ember':
            return [];
        case 'boss_bomber':
            return [
                { name: 'Mine Collar', desc: _egbtTr('eg_boss_test_bomber_collar', 'All fight: tethered mines orbit the flying boss, detach and drift to YOUR position, planting proximity mines. Leave the red rings - they detonate when you step in!') },
                { name: 'Carpet Run', desc: _egbtTr('eg_boss_test_bomber_carpet', 'At 60% HP: a bomber plane 🛩️ banks across the arena through your position, carpeting its lane with fuse bombs. The detonation front rolls the path - leave the highlighted band entirely!') },
                { name: 'Cluster Shells', desc: _egbtTr('eg_boss_test_bomber_cluster', 'At 30% HP: 3 mortar shells ☄️ burst at your position into 7 bomblets that scatter and fuse. Never stop moving!') },
                { name: 'Total Carpet', desc: _egbtTr('eg_boss_test_bomber_final', 'At 10% HP: 3…2…1 countdown → a green SAFE dome plants at your position, then every live mine + a rolling detonation front goes off. OUTSIDE the dome = hit, twice (charge bar frozen).') },
            ];
        case 'boss_creeper':
            return [
                { name: 'Creeper Pack', desc: _egbtTr('eg_boss_test_creeper_pack', 'All fight: creepers scuttle in and STALK you - their fuse HEATS (white flash + swell) while you are close and COOLS while you keep your distance. Fuse full = detonation. Keep moving!') },
                { name: 'Fuse Pounce', desc: _egbtTr('eg_boss_test_creeper_pounce', 'All fight: a creeper drops onto your current position - shadow marker first, then hiss, then boom. Move from your spot!') },
                { name: 'TNT Chain', desc: _egbtTr('eg_boss_test_creeper_tnt', 'At 60% HP: primed TNT blocks rain down around you, flashing faster and faster, then detonate in a rolling chain reaction outward from the centre. Leave the cluster entirely!') },
                { name: 'Charged Creeper', desc: _egbtTr('eg_boss_test_creeper_charged', 'At 30% HP: packs gain a lightning-charged creeper ⚡ (blue aura) - faster fuse, bigger blast radius. Prioritize it!') },
                { name: 'SSSS…BOOM', desc: _egbtTr('eg_boss_test_creeper_final', 'At 10% HP: the boss primes - 3…2…1 fuse countdown while a huge red blast ring grows around it, then it mega-detonates. Be OUTSIDE the ring! (charge bar frozen)') },
            ];
        case 'boss_buzz':
            return [
                { name: 'Ricochet Saws', desc: _egbtTr('eg_boss_test_bz_ricochet', 'All fight: blades are flung in from the edges at you, bounce off the walls up to 3 times, then embed in the floor as spinning hazards. Watch the bounce!') },
                { name: 'Cut Line', desc: _egbtTr('eg_boss_test_bz_cutline', 'All fight: a dashed telegraph band stretches across the arena through your position, then a giant saw sweeps along it. Step OUT of the band!') },
                { name: 'Saw Traps', desc: _egbtTr('eg_boss_test_bz_traps', 'At 60% HP: floor positions flash a saw silhouette, then erupt into spinning blade hazards that linger. Mind the floor!') },
                { name: 'Pendulum Blades', desc: _egbtTr('eg_boss_test_bz_pendulum', 'At 30% HP: two giant saws on chains swing from the top, scything across the arena in crossed arcs. Time the gap!') },
                { name: 'THE FINAL CUT', desc: _egbtTr('eg_boss_test_bz_final', 'At 10% HP: the boss spins up and four toothed wall-saws close in, shrinking the safe centre pocket. 3…2…1 CROSSCUT slashes the whole screen - only the tiny centre pocket survives! (charge bar frozen)') },
            ];
        case 'boss_encore':
            return [
                { name: 'Encore Circles', desc: _egbtTr('eg_boss_test_en_circles', 'All fight: gold rings close in on marked spots - be INSIDE each circle the moment its ring lands. The only "get in" mechanic in the show!') },
                { name: 'Sound Bars', desc: _egbtTr('eg_boss_test_en_bars', 'All fight: equalizer lanes telegraph at the floor, then slam UP as solid sound bars. Step OUT of the lane!') },
                { name: 'Stage Lights', desc: _egbtTr('eg_boss_test_en_spot', 'At 60% HP: spotlights drift after you, then LOCK - a beat later they flash and burn everyone still inside. Break away before they set!') },
                { name: 'Beat Mines', desc: _egbtTr('eg_boss_test_en_mines', 'At 60% HP: mines pulse on the beat, then pop one after another in sequence. Stand between the pops!') },
                { name: 'CURTAIN CALL', desc: _egbtTr('eg_boss_test_en_final', 'At 10% HP: the house goes dark and a spotlight plays musical chairs - each metronome beat erupts from the old light, then it JUMPS. Follow the light every beat; the final OVATION hits everything outside it! (charge bar frozen)') },
            ];
        case 'boss_medusa':
            return [
                { name: 'Stone Gaze', desc: _egbtTr('eg_boss_test_md_gaze', 'All fight: the gorgon\'s eyes scan from above, dragging a petrifying gaze beam across the arena. Stay out of the beam!') },
                { name: 'Snake Strikes', desc: _egbtTr('eg_boss_test_md_snakes', 'All fight: snake heads erupt from marked spots and bite on a rhythm. Leave the bite circles!') },
                { name: 'Petrify Waves', desc: _egbtTr('eg_boss_test_md_waves', 'At 60% HP: stone-gray rings expand with one rotating safe gap. Slip the gap as the ring crosses you!') },
                { name: 'Coil Cage', desc: _egbtTr('eg_boss_test_md_coil', 'At 60% HP: a snake coil forms around you and SHRINKS while its gap slowly rotates. Escape through the gap!') },
                { name: 'THE STARE', desc: _egbtTr('eg_boss_test_md_final', 'At 10% HP: statues rise beat by beat, then a screen-wide gaze wall sweeps down - only the shadows BEHIND the statues shelter you! (charge bar frozen)') },
            ];
        case 'boss_maze':
            return [
                { name: 'Ghost Gang', desc: _egbtTr('eg_boss_test_mz_gang', 'All fight: four ghosts hunt you with different brains - one chases, one ambushes where you are heading, one flanks, one wanders. They scatter to the corners every few seconds - breathe, then move!') },
                { name: 'Dot Walls', desc: _egbtTr('eg_boss_test_mz_walls', 'All fight: walls of glowing pellets march across the arena with a single gap. Slip through the gap - touching a pellet stings!') },
                { name: 'The Labyrinth', desc: _egbtTr('eg_boss_test_mz_maze', 'At 60% HP: shadow wall segments rise out of the floor, building a temporary maze. Route around them while the gang hunts!') },
                { name: 'Lights Out', desc: _egbtTr('eg_boss_test_mz_lights', 'At 60% HP: the arena goes dark and only drifting ghost eyes glow. Do NOT touch the eyes!') },
                { name: 'GAME OVER', desc: _egbtTr('eg_boss_test_mz_final', 'At 10% HP: a shadow circle marks YOUR position and the whole gang converges - 3 slams with a growing final circle, then one giant CHOMP. Never stand still! (charge bar frozen)') },
            ];
        case 'boss_monsoon':
            return [
                { name: 'Rain Bands', desc: _egbtTr('eg_boss_test_mn_bands', 'All fight: diagonal rain curtains telegraph near you, then pour for a few seconds. Stay out of the curtains!') },
                { name: 'Thunderbolts', desc: _egbtTr('eg_boss_test_mn_bolts', 'All fight: golden marks flash and lightning strikes each one, staggered across the sky. Clear the circles!') },
                { name: 'Storm Surge', desc: _egbtTr('eg_boss_test_mn_surge', 'At 60% HP: the water rises from the bottom and holds - everything submerged takes repeated hits - then recedes. Climb!') },
                { name: 'Hail Barrage', desc: _egbtTr('eg_boss_test_mn_hail', 'At 60% HP: hailstones drop onto marked spots, most aimed near where you were. Keep moving!') },
                { name: 'THE GREAT FLOOD', desc: _egbtTr('eg_boss_test_mn_final', 'At 10% HP: the water rises in three surges while a dry island hops around the high ground - reach it every beat, then survive THE BREAK when the flood swallows everything else! (charge bar frozen)') },
            ];
        case 'boss_needle':
            return [
                { name: 'Spike Gates', desc: _egbtTr('eg_boss_test_nd_gates', 'All fight: full-height needle gates peek in at the edge, then scroll across with a single wobbling gap. Thread the gap!') },
                { name: 'Pin Drops', desc: _egbtTr('eg_boss_test_nd_pins', 'All fight: giant pins slam down point-first at marked spots and plant themselves as tilted hazards. Mind the planted pins!') },
                { name: 'Stitch Wave', desc: _egbtTr('eg_boss_test_nd_stitch', 'At 60% HP: the floor flashes a stitch grid, then needles rise lane by lane in a rolling wave. Stay ahead of the wave!') },
                { name: 'Pincushion Burst', desc: _egbtTr('eg_boss_test_nd_cushion', 'At 60% HP: a pincushion swells and BURSTS - needles fly outward along every spoke. Slip between them!') },
                { name: 'THE FINAL STITCH', desc: _egbtTr('eg_boss_test_nd_final', 'At 10% HP: a colossal needle stabs the whole screen beat after beat - only the glowing EYE of the needle is safe. Reach the eye every stab; the last one sews the screen shut! (charge bar frozen)') },
            ];
        case 'boss_aegis':
            return [
                { name: 'Aegis Protocol', desc: _egbtTr('eg_boss_test_ag_protocol', 'All fight: the boss summons a guard squad and goes IMMUNE while they live - kill the guards to break the shield (40s failsafe). Guards wear a pulsing ring and the arena glows while the shield is up!') },
                { name: 'Shield Charge', desc: _egbtTr('eg_boss_test_ag_charge', 'All fight: the boss picks your row and BARRELS across it behind its shield, two to three times per cast. Out of the lane!') },
                { name: 'Sentry Shields', desc: _egbtTr('eg_boss_test_ag_sentries', 'At 60% HP: sentry shields plant at the edges and hurl slow tracking orbs at you. Strafe the orbs!') },
                { name: 'Guard Rotor', desc: _egbtTr('eg_boss_test_ag_rotor', 'At 60% HP: two guardian orbs tether a beam that sweeps around a pivot like a radar blade. Stay off the arms!') },
                { name: 'THE LAST BASTION', desc: _egbtTr('eg_boss_test_ag_final', 'At 10% HP: a bastion plants at the centre and sweeps the field with two beams that spin faster every beat - then the VANGUARD: three rapid shield charges, the last one huge! (charge bar frozen)') },
            ];
        case 'boss_gridlock':
            return [
                { name: 'Laser Lattice', desc: _egbtTr('eg_boss_test_gl_lattice', 'All fight: alternating full-screen laser waves sweep the lit lanes - each wave STAGGER-FIRES line by line. Clear the lane whose turn is coming!') },
                { name: 'Signal Scramble', desc: _egbtTr('eg_boss_test_gl_scramble', 'At 60% HP: signal towers plant and draw dashed cables to YOUR position, then all fire together. Move after they draw - the starburst aims at where you were!') },
                { name: 'Surge Chaser', desc: _egbtTr('eg_boss_test_gl_surge', 'At 60% HP: a roaming ⚡ orb homes slowly and sheds a LIVE CABLE TRAIL behind it (two in phase 3). Kite it - the arena accumulates hot wires while you run!') },
                { name: 'SYSTEM LOCKDOWN', desc: _egbtTr('eg_boss_test_gl_final', 'At 10% HP: a circuit grid floods the arena - 3 beats of charging wire batches, then THE JAM: every wire fires except one safe H+V crossing (green pip). Reach it, survive the SURGE DIVE that targets the safe cell - step off! (charge bar frozen)') },
            ];
        case 'boss_jester':
            return [
                { name: 'Bouncing Mayhem', desc: _egbtTr('eg_boss_test_js_orbs', 'All fight: juggling orbs bounce in RHYTHM - they glide calmly between beats, then all HOP and reshuffle direction on the beat. Dodge to the rhythm!') },
                { name: 'Card Toss', desc: _egbtTr('eg_boss_test_js_cards', 'At 60% HP: fans of oversized playing cards arc across the stage and STICK face-up as hazards - the last volley aims at you. Mind the card table!') },
                { name: 'Juggler\u2019s Jinx', desc: _egbtTr('eg_boss_test_js_jinx', 'At 60% HP: purple jinx balls orbit and bite, but one gold LUCK ball drifts through the chaos - touching it heals. Greed bait in the mayhem!') },
                { name: 'THE GRAND FINALE', desc: _egbtTr('eg_boss_test_js_final', 'At 10% HP: the curtain drops and the FULL HOUSE deals - each reveal names a safe suit: stand on it when the reveal lands (reveals accelerate), then survive the BLACKOUT + CURTAIN CALL sweeps from the lit columns! (charge bar frozen)') },
            ];
        case 'boss_shaper':
            return [
                { name: 'Glacier Rift', desc: _egbtTr('eg_boss_test_shp_rift', 'All fight: a glacier front sweeps the whole screen (a band with 3 fissure gaps) and leaves LINGERING ICE POOLS that drain while you stand in them. Outrun the front, slip the gaps, respect the pools!') },
                { name: 'Frost Monoliths', desc: _egbtTr('eg_boss_test_shp_monos', 'At 60% HP: rune monoliths plant at the edges and each grows a FROST WALL that shrinks the arena toward the centre. Body-check a monolith 3\u00d7 to shatter it and stop its wall!') },
                { name: 'Ice Walker', desc: _egbtTr('eg_boss_test_shp_walker', 'At 60% HP: an ice walker (\u26c4) stalks you and SHATTERS on contact - its hit plus a burst of shard shrapnel. Two in phase 3. Let it kiss you at the right moment, or never!') },
                { name: 'THE SHAPED WINTER', desc: _egbtTr('eg_boss_test_shp_final', 'At 10% HP: a colossal monolith assembles at the centre - three frost arms sweep faster each beat while CORES light up one at a time: body-check the lit core 3\u00d7 to shatter it. Break all three, or the MONOLITH BREAK shockwave detonates (only the central eye is safe)! (charge bar frozen)') },
            ];
        case 'boss_colossus':
            return [
                { name: 'Seismic Stride', desc: _egbtTr('eg_boss_test_colo_stride', 'All fight: the Colossus WALKS - two giant footprints slam in sequence, each rolling a full-screen SHOCKWAVE RING with a jump-window. Pure physical: resists do nothing. Phase 3 strides cut diagonally!') },
                { name: 'Boulder Rain', desc: _egbtTr('eg_boss_test_colo_boulder', 'At 60% HP: the quarries hurl 🪨 boulders that arc in and SHATTER into rolling fragments that keep travelling. Dodge the impact ring AND the fragment lanes!') },
                { name: 'Granite Golems', desc: _egbtTr('eg_boss_test_colo_golem', 'At 60% HP: two granite golems climb out and slow-push you into telegraphs - moving walls. Body-check one 3× to crumble it early, or they crumble on their own.') },
                { name: "TITAN'S FALL", desc: _egbtTr('eg_boss_test_colo_final', 'At 10% HP: the titan KNEELS - three JOINT SEALS light up one at a time: body-check the lit seal 3× while rock chutes sweep the arena. Break all three and it collapses; a failed seal answers with a CAVE-IN (only the seal ring is safe)! (charge bar frozen)') },
            ];
        case 'boss_swarm':
            return [
                { name: 'Swarm Arc', desc: _egbtTr('eg_boss_test_sw_arc', 'All fight: a wedge of drones carves a huge SWARM ARC across the stage - every drone trails a LAVAL GLOW burn line and a 🐝 hatchling splits off mid-arc to cut a tighter inner arc. Ride the edge, respect the glow!') },
                { name: 'Mimic Queen', desc: _egbtTr('eg_boss_test_sw_mimic', 'At 60% HP: four drones halt and open to reveal 👑 larvae - ONE is real, three are MIMICS. Crush the real one for ROYAL JELLY (+15% maxHP heal); step on a mimic and a rancid stink cloud erupts! Larvae sink after ~4s.') },
                { name: 'Hive Eye', desc: _egbtTr('eg_boss_test_sw_eye', 'At 60% HP: a probe 🛸 flies to your position and BLOOMS - smoke covers everything except a 150px clear hole where you stood. Drone guards circle the hole. Plan your position BEFORE the bloom (two blooms in phase 3)!') },
                { name: 'THE SWARM SINGULARITY', desc: _egbtTr('eg_boss_test_sw_final', 'At 10% HP: every drone recalls into a whirling ball of wings - 3 rapid CHARGES, each telegraphed with a green safe gap opposite the charge line. Then the ball implodes into a FUNNEL of 4 drone walls: slip through each wandering gap! (charge bar frozen)') },
            ];
        case 'boss_siren':
            return [
                { name: 'Wail Beam', desc: _egbtTr('eg_boss_test_sire_wail', 'All fight: the sweeping wail beam now sings PATTERNS - wide swing, narrow flick or stutter reversals (may reverse mid-song in phase 3). Glowing ECHO ZONES heal you if you stand in one while the beam passes. Bait = learn!') },
                { name: 'Undertow', desc: _egbtTr('eg_boss_test_sire_undertow', 'At 60% HP: a whirlpool spins up at the anchor and DRAGS you toward it in slow pulls (moving breaks the pull) while flotsam spirals in and bites. Then it NOVAS - get out of the ring!') },
                { name: 'Siren\u2019s Reply', desc: _egbtTr('eg_boss_test_sire_reply', 'At 60% HP: the beam splits - a mirror beam sweeps AGAINST the first, and phase 3 adds a third slow arc. Read every song before you cross!') },
                { name: 'THE DEADLY ARIA', desc: _egbtTr('eg_boss_test_sire_final', 'At 10% HP: the hall floods with her bubble audience and the DEADLY ARIA begins - each song line lights a chain of bubbles: reach the FAR bubble before the note lands, because the rest of the song pops! The KILLER CRESCENDO detonates every bubble except one - stand on it! (charge bar frozen)') },
            ];
        case 'boss_bayes':
            return [
                { name: 'Posterior Bolts', desc: _egbtTr('eg_boss_test_bay_bolts', 'All fight: every cast strikes the side Bayes BELIEVES is safe in wide ⚡ columns - then the belief meter shifts AGAINST you. The green EVIDENCE RING spawns on the punished side: hold it through a landing bolt to flip the meter your way!') },
                { name: 'Evidence Wisps', desc: _egbtTr('eg_boss_test_bay_wisps', 'At 60% HP: 🔮 wisps drift in wide loops - the GLOWING ones (on the disbelieved side) are free evidence: touch one to flip the meter; wisps on the believed side sting.') },
                { name: 'Belief Veil', desc: _egbtTr('eg_boss_test_bay_veil', 'At 60% HP (once): the puzzle grid vanishes AS BAYES BELIEVES IT - the veil leans with the meter. Near 50/50 it reads clearest: balance is clarity.') },
                { name: "THEOMERE'S GAMBIT", desc: _egbtTr('eg_boss_test_bay_final', 'At 10% HP: a 3×3 of districts shows TRUE danger odds - stand on a chip to flip it to its complement (one flip each). Three cast waves strike the true danger districts; survive all three and Bayes CONCEDES - the boss pays its own remaining HP! (charge bar frozen)') },
            ];
        case 'boss_entropy':
            return [
                { name: 'Heat Death Drift', desc: _egbtTr('eg_boss_test_entr_drift', 'All fight: ❄ pools bloom outward and MERGE into bigger ones while lit ORDER ZONES shrink - the only places that keep you crisp. Outside them your movement turns sluggish (never locked). Zone time refills your ORDER meter - spend it by staying crisp!') },
                { name: 'Recursive Decay', desc: _egbtTr('eg_boss_test_entr_decay', 'At 60% HP: cursed cells AGE - every 4s one spreads to a neighbour (max 9). Stand ON a cell to burn it out, but the burn costs you. Triage the pack before it owns the map!') },
                { name: "Maxwell's Door", desc: _egbtTr('eg_boss_test_entr_door', 'At 60% HP: a 🔥 hot and a ❄ cold door spawn at opposite edges - enter one to take its element for 8s. HOT: pools HEAL you (but heat scatters order). COLD: pool-proof (but order drains twice as fast). Choose your poison!') },
                { name: 'THE LAST DEGREE', desc: _egbtTr('eg_boss_test_entr_final', 'At 10% HP: the arena freezes into a perfect lattice and ORDER SHARDS rain - touch each shard so its spark flies to the singularity: every delivered shard pops the boss for 20% of ITS HP! Collect 5 before the timer dies, or HEAT DEATH sweeps everything but the centre! (charge bar frozen)') },
            ];
        case 'boss_laplace':
            return [
                { name: 'Demonstrated Fate', desc: _egbtTr('eg_boss_test_lap_fate', 'All fight: every cast shows a harmless GHOST pre-run ~3s ahead, then the REAL fire lance follows the same path - and pins its ENDPOINT, exactly where the ghost ended. Never stand where the ghost dies! Phase 3 crosses two lances.') },
                { name: 'Conditional Branches', desc: _egbtTr('eg_boss_test_lap_branches', 'At 60% HP: three phantoms walk dashed paths and each plants a future cell - ONE is ✅ real and detonates; the other two are fakes. Stand on a FAKE when it resolves for 2s GHOST-FORM: untouchable, so greed the next lance!') },
                { name: 'Timeline Fray', desc: _egbtTr('eg_boss_test_lap_fray', 'At 60% HP: a 👣 clone walks a recording of YOUR last 6 seconds (path pre-drawn as dots). Touch it and you swap with where it was 2s ago - no damage, just dizzying. Watch the dots!') },
                { name: 'THE CLOSED TIMELINE', desc: _egbtTr('eg_boss_test_lap_final', 'At 10% HP: the same gauntlet loops every 20s with IDENTICAL telegraphs - learn it! Break the ⛓️ timeline node each loop (stand on it); three breaks close the loop and kill the Demon. Failed dodges extend the loop and add a hunting phantom! (charge bar frozen)') },
            ];
        case 'boss_inferno':
            return [
                { name: 'Magma Tides', desc: _egbtTr('eg_boss_test_infv_tides', 'All fight: 🌊 lava floods half the arena in alternating tides (quartered in phase 3) - a heavy DoT. The tide edge leaves COOLING OBSIDIAN TILES that crack in 3 states before sinking: stand on them to cool your HEAT meter, and keep moving - standing still heats you up!') },
                { name: 'Pyroclastic Surge', desc: _egbtTr('eg_boss_test_infv_surge', 'At 60% HP: a wall of fire sweeps the arena with TWO readable gaps - slip through. The ash cloud behind it is pressure, not punish: it just blocks your view.') },
                { name: 'Eruption Vents', desc: _egbtTr('eg_boss_test_infv_vents', 'At 60% HP: three vents telegraph, then JET upward - and the jets leave HEAT HAZE zones that heat you 2.5x faster while inside. Do not linger!') },
                { name: 'SUPERVOLCANIC WINTER', desc: _egbtTr('eg_boss_test_infv_final', 'At 10% HP: the Inferno detonates and the arena FREEZES (fire→ice!). The ice sheet makes you DRIFT (momentum!), magma bombs mark landings, and you must LURE each magma surge into the glowing fissure vents - three lured surges blow the cap and kill the core! (charge bar frozen)') },
            ];
        case 'boss_null':
            return [
                { name: 'Void Lattice', desc: _egbtTr('eg_boss_test_nul_lattice', 'All fight: a star-lattice of 🕸️ void lines covers the arena - standing ON a line is a shadow DoT. Every ~12s the lattice RE-CONTRACTS to a new centre (brief grace window). The safe cells are the triangular gaps - read the lines!') },
                { name: 'Hypothesis Erasure', desc: _egbtTr('eg_boss_test_nul_erasure', 'At 60% HP: the Null ERASES one system for 8s - your clue numbers, your charge bar readout, or your class HUD - with a 🧿 marker on what it took. The info always comes back. Prove you can win with less!') },
                { name: 'Null Rays', desc: _egbtTr('eg_boss_test_nul_rays', 'At 60% HP: 🧿 eye-beams orbit the anchor - crossing one damages you AND CHILLS your charge bar (half fill speed). Stay in the gaps between the gaze!') },
                { name: 'PROOF BY CONTRADICTION', desc: _egbtTr('eg_boss_test_nul_final', 'At 10% HP: the arena turns PURE WHITE and the Null asserts you cannot hit it. Phantoms replay YOUR recent path and strike toward their heading - stand OPPOSITE the strike, near the phantom, to shatter a shell. 3 shells = the hypothesis collapses! Three failures = NULLIFICATION: only the white ring is safe! (charge bar frozen)') },
            ];
        case 'boss_snail':
            return [
                { name: 'Snailgeddon', desc: _egbtTr('eg_boss_test_snail_snailgeddon', 'At ≤20% HP: 5s countdown → teleport to centre, closing ring of snails with a lagging wedge. Escape through the gap!') }
            ];
        case 'boss_jelly':
            return [
                { name: 'Ice Shell', desc: _egbtTr('eg_boss_test_jelly_ice_shell', 'At 50% HP: Boss gains immunity. Lure a hop blob onto ❄️ ice to slip it into the Jelly and shatter the shell.') },
                { name: 'Jelly Army', desc: _egbtTr('eg_boss_test_jelly_army', 'At 20% HP: 10 hop blobs spawn staggered, each leaping at you. Dodge the shadows!') }
            ];
        case 'boss_brutus':
            return [
                { name: 'Zombie Feast', desc: _egbtTr('eg_boss_test_brutus_feast', '🧟 zombies shamble toward each Ground Slam: every one devoured inside the band supercharges Brutus (+30% charge rate, 15s, stacks to 6). Kill them first!') }
            ];
        // ── Tier 2 ──
        case 'boss_gust':
            return [
                { name: 'Storm Front', desc: _egbtTr('eg_boss_test_gust_storm', 'Persistent ~30s storm cycle: lightning warns on the windward edge, then a 5s blow pushes you (charge paused). Hide behind the windbreak wall; spikes line both edges.') },
                { name: 'Tornadoes', desc: _egbtTr('eg_boss_test_gust_tornadoes', 'At 75% / 50% / 25% HP: living tornado volleys cross the arena (later volleys return + dive top-down). Leave the swept band entirely - suction drags you in.') }
            ];
        case 'boss_sprout':
            return [
                { name: 'Root Network', desc: _egbtTr('eg_boss_test_sprout_roots', 'All fight: vines root unsolved cells (extra click to prune), spores drift, and Vine Lunge slashes a full-screen band through you.') },
                { name: 'Bramble Wall', desc: _egbtTr('eg_boss_test_sprout_bramble', 'At 60% HP: 10s - outer ring sealed, 4 edge strips + 3 whips lash the arena.') },
                { name: 'Blooming Doom', desc: _egbtTr('eg_boss_test_sprout_bloom', 'At 30% HP: flower buds burst into homing motes + clicking 💮-dusted cells detonates. Wait out the dust or prune around it.') }
            ];
        case 'boss_clock':
            return [
                { name: 'Time Freeze', desc: _egbtTr('eg_boss_test_clock_time_freeze', 'At 15% HP: 2.5s telegraph → 30s global freeze (timer, movement, charge bar). 12 beams hover then strike for ~90% HP if boss survives.') }
            ];
        case 'boss_puddle':
            return [
                { name: 'Rising Water', desc: _egbtTr('eg_boss_test_puddle_water', 'At 75% / 50% / 25% HP the flood rises (up to half the arena): standing in water burns %HP/s. Drops in water erupt into fountains; play high.') },
                { name: 'Gate Wave', desc: _egbtTr('eg_boss_test_puddle_wave', 'After each rise: 1.3s edge telegraph → a 430px/s wave sweeps the shallows. Get out of the water entirely. Popping bubbles fires shard bursts.') }
            ];
        case 'boss_firefly':
            return [
                { name: 'Darkness', desc: _egbtTr('eg_boss_test_firefly_dark', 'Whole fight in darkness - your 5 fairies are the only light. Outside all light you bleed HP. Command them with F (send), G (cycle), H (recall) or drag.') },
                { name: 'Formation Trials', desc: _egbtTr('eg_boss_test_firefly_trials', 'At 75% LIGHTFALL (1 ring) / 50% SPLIT (2 rings) / 25% SCATTER (a ring per fairy + you): guide every fairy into its ring in time. Boss is immune until the verdict; failures cost fairies.') }
            ];
        case 'boss_marksman':
            return [
                { name: 'Arrow Gauntlet', desc: _egbtTr('eg_boss_test_marksman_gauntlet', 'At 66% (4 single walls) / 33% (12-wave pincer/sweep/finale): the grid seals, boss goes immune, arrow walls with gaps sweep through. Dodge only - gaps always overlap, keep moving.') }
            ];
        case 'boss_dynamo':
            return [
                { name: 'Conductor Network', desc: _egbtTr('eg_boss_test_dynamo_conductors', '🔌 conductors roam (tanky: 18% of boss HP) and wire a beam network + hull field: on beams 0.06%/s, inside the hull 0.10%/s. Kill them to reclaim ground. Pillars add horizontal then diagonal lanes per phase.') }
            ];
        case 'boss_demolitionist':
            return [
                { name: 'Bomb Maze', desc: _egbtTr('eg_boss_test_demolitionist_bomb_maze', 'At ≤25% HP: 5…1 countdown → teleport into a serpentine corridor walled by bombs that detonate behind you. ~1s later a SUPER BOMB slams onto your start and rolls the corridor after you - caught = instant defeat. Outrun it to the 🏁 (charge bar frozen).') }
            ];
        // ── Tier 3 ──
        case 'boss_bumper':
            return [
                { name: 'TILT! Flipper Frenzy', desc: _egbtTr('eg_boss_test_bumper_tilt', 'At 60% HP: 9s - alternating flipper arcs slap the lower arena while bumpers enrage (1.7× speed). Play top/mid.') },
                { name: 'Multiball Rush', desc: _egbtTr('eg_boss_test_bumper_multiball', 'At 30% HP: 6 balls launch from centre, 12s life. Keep moving - flings chain into other bumpers.') }
            ];
        case 'boss_striker':
            return [
                { name: 'Kick-Off Challenge', desc: _egbtTr('eg_boss_test_striker_corners', 'At 60% HP: the homing ball leaves - a resting ball drops on the pitch. Run to it, stand next to it to charge, step away to shoot. Score 1 goal into the edge goal.') },
                { name: 'Hat-Trick', desc: _egbtTr('eg_boss_test_striker_penalty', 'At 30% HP: same kick rules, 3 goals in 60s. The ball rolls out after each shot - chase it and re-kick. Full power needs 1.5s of charge.') }
            ];
        case 'boss_centipede':
            return [
                { name: 'Exoskeleton', desc: _egbtTr('eg_boss_test_centipede_shell', 'At 60% HP: 2 waves × 8 armour plates spiral out from your position. Weave the gaps.') },
                { name: 'Molt', desc: _egbtTr('eg_boss_test_centipede_molt', 'At 30% HP: the tail detaches into a faster mini-centipede. Burrow holes open - lure it over one to bury it for 15s before it resurfaces.') }
            ];
        case 'boss_thwomp':
            return [
                { name: 'Ceiling Collapse', desc: _egbtTr('eg_boss_test_thwomp_collapse', 'At 60% HP: 6–10 rubble marks fall staggered (faster in later phases), each leaving a dust cloud. Clear the rings.') },
                { name: 'Mini-Thwomp Siege', desc: _egbtTr('eg_boss_test_thwomp_siege', 'At 30% HP: 3–5 mini-Thwomps hop-chase for 12s; each telegraphs its own slam. Stay mobile - Grand Slam (charge attack) can hit 34% in the core.') }
            ];
        // ── Tier 4 ──
        case 'boss_dancer':
            return [
                { name: 'Spotlight Steps', desc: _egbtTr('eg_boss_test_dancer_steps', 'All fight: numbered footprints light in rhythm - stand on the lit step in the beat window to heal +8. Miss = zap. The only healing mechanic in the atlas.') },
                { name: 'Curtain Call', desc: _egbtTr('eg_boss_test_dancer_curtain', 'At 60% HP: 5–8 stage drops fall staggered, each leaving a dragging backstage patch.') },
                { name: 'Petal Storm', desc: _egbtTr('eg_boss_test_dancer_petals', 'At 30% HP: 4 waves of shadow petals cross L→R (dodge vertically), plus a permanent drizzle in final phase.') }
            ];
        case 'boss_gambler':
            return [
                { name: 'Wheel of Fortune', desc: _egbtTr('eg_boss_test_gambler_wheel', 'At 60% HP: 4s spin - SNAKE (unavoidable 16%), FREE SPIN (re-spin or forced SNAKE), JACKPOT (boss heals 12%), YOU WIN (you heal 10%).') },
                { name: 'Jackpot Rush', desc: _egbtTr('eg_boss_test_gambler_rush', 'At 30% HP: 8s - 4 waves of casino symbols; every 7️⃣ detonates a coin burst on hit or expiry. Russian Roulette (charge): leave the R110 cylinder before the ticking ends.') }
            ];
        case 'boss_tactician':
            return [
                { name: 'CHECK', desc: _egbtTr('eg_boss_test_tactician_check', 'At 60% HP: 4 rook lanes (2H+2V) dash full-screen staggered. Wait between lanes.') },
                { name: 'Zugzwang', desc: _egbtTr('eg_boss_test_tactician_zugzwang', 'At 30% HP (9s): bishop diagonals sweep through the queen + knights L-leap 4×. Read the board - pawn walls always leave one gap column.') },
                { name: 'Checkmate', desc: _egbtTr('eg_boss_test_tactician_mate', 'Charge attack: 4 castle walls close over 2.6s - get to the CENTER rect, not the edges.') }
            ];
        case 'boss_gourmet':
            return [
                { name: 'Dinner Service', desc: _egbtTr('eg_boss_test_gourmet_dinner', 'At 60% HP: 3 cloches 🍽️ slam your position in sequence, each leaving a grease pool. An eating boss - chomps heal it, don’t get caught.') },
                { name: 'Banquet + Devour', desc: _egbtTr('eg_boss_test_gourmet_devour', 'At 30% HP: 9.5s dessert bombardment. Devour (charge): 1.4s suction → swallow inside R150 (boss heals 2%). Fight the pull, stay out of the ring.') }
            ];
        case 'boss_stack':
            return [
                { name: 'Hard Drop', desc: _egbtTr('eg_boss_test_stack_harddrop', 'At 60% HP: 3 giant blocks fall on your column (touch + shockwave + lingering terrain). Leave the column.') },
                { name: 'Line Clear', desc: _egbtTr('eg_boss_test_stack_lineclear', 'At 30% HP: 4 full-width rows detonate staggered - dodge vertically between rows.') },
                { name: 'Garbage Rise', desc: _egbtTr('eg_boss_test_stack_garbage', 'Charge attack: gray rows flood 55% of the screen. Stay high (top 16% always clear) - standing inside ticks + flings.') }
            ];
        case 'boss_gale':
            return [
                { name: 'Crosswind + Funnels', desc: _egbtTr('eg_boss_test_gale_wind', 'All fight: wind flips L/R every 7s (lean into it) + hunting cyclone funnels burn %HP/s inside. Touching the eye flings you.') },
                { name: 'Tornado Ladder', desc: _egbtTr('eg_boss_test_gale_ladder', 'At 60% HP: 3 twister lanes climb bottom→top staggered. Exit the lanes.') },
                { name: 'Eye of the Storm', desc: _egbtTr('eg_boss_test_gale_eye', 'At 30% HP: 4 rings contract onto the planted eye - you are hit when INSIDE a shrinking ring, so time crossings, don’t just stay out.') }
            ];
        case 'boss_lodestone':
            return [
                { name: 'Magnetic Vortex', desc: _egbtTr('eg_boss_test_lodestone_vortex', 'At 60% HP (4.5s): the stone plants centre and drags you in - grinding within R140. Fight the pull, keep distance.') },
                { name: 'Railgun + Leash', desc: _egbtTr('eg_boss_test_lodestone_railgun', 'At 30% HP: 3 full-screen ⚡ slugs through the stone at your axis. Leash (charge): leave the 44px corridor early, or outrun the 1.6s reel to break free.') }
            ];
        case 'boss_coil':
            return [
                { name: 'Constrictor', desc: _egbtTr('eg_boss_test_coil_constrict', 'At 60% HP: 3–5 rings contract onto your position - stand in the gaps between rings.') },
                { name: 'Serpent Tide', desc: _egbtTr('eg_boss_test_coil_tide', 'At 30% HP: 3 tidal waves of chargers cross at your height. Exit the row vertically; kite seeker snakes away so they detonate elsewhere.') },
                { name: 'Cobra Strike', desc: _egbtTr('eg_boss_test_coil_cobra', 'Charge attack: horizontal H92 lane at your height, 380ms lash. Venom trails tick shadow DoT - don’t stand in them to dodge.') }
            ];
        case 'boss_vise':
            return [
                { name: 'Crushing Walls', desc: _egbtTr('eg_boss_test_vis_walls', 'All fight: the corridor BREATHES - two block walls sweep the arena around a gap that widens and narrows like a living thing. Outside the walls burns; touching a block is a chunk + chill. Ride the gap, never fight the iron! Phase 3: the gap breathes FASTER!') },
                { name: 'Bench Vise', desc: _egbtTr('eg_boss_test_vis_bench', 'At 60% HP: a bench vise clamps down on YOUR row - two jaws crawl from the edges and BITE. Escape the slice before the bite; lingering in the squeezed band afterward chips you with sparks. Phase 3: two slices at once!') },
                { name: 'Quench or Shatter', desc: _egbtTr('eg_boss_test_vis_quench', 'At 60% HP: the Vise plants a glowing workpiece and HAMMERS it (sparks splash off each strike) - body-check the piece 2× to SHATTER it (+12% maxHP heal), or it is QUENCHED: a giant wall-block crosses the arena at your row. Phase 3: it comes back the other way!') },
                { name: 'THE FULL CLAMP', desc: _egbtTr('eg_boss_test_vis_final', 'At 10% HP: three compression waves squeeze the arena - a corridor of SAFE SLABS lights up, reach it before each squeeze. Survive all three for THE IRON VISE: the overclench slams everything except the stress-fracture slab! (charge bar frozen)') },
            ];
        case 'boss_minotaur':
            return [
                { name: 'Labyrinth Walls', desc: _egbtTr('eg_boss_test_mnt_labyrinth', 'All fight: 5–6 wall slabs rise and hold ~8s, carving the arena into lanes - then the bull charges the open lane at YOUR row. The maze channels the charge; the bull crumbles one wall per rush. Phase 3: double charges per cast!') },
                { name: 'Hooftread Terrain', desc: _egbtTr('eg_boss_test_mnt_hoof', 'At 60% HP: hoof craters stamp down the lane in sequence and plant lingering hoofprints, while a DUST STORM trails the charge lane. The maze accumulates burn terrain the longer the duel runs!') },
                { name: 'Thread of Ariadne', desc: _egbtTr('eg_boss_test_mnt_thread', 'At 60% HP: a glowing thread marks the ONE SAFE LANE - honest, and bait. Hold it once for a heal; it frays, snaps and re-forms elsewhere. Travel through it, never live in it!') },
                { name: "THE WARDEN'S LABYRINTH", desc: _egbtTr('eg_boss_test_mnt_final', 'At 10% HP: three wall generations rise while the Warden charges each TWICE - body-check the glowing MAZEWALL STONES 3× each to shatter them. Then the TRAMPLE runs EVERY lane at once: only shattered lanes are safe! (charge bar frozen)') },
            ];
        case 'boss_barrage':
            return [
                { name: 'Shelling Curtain', desc: _egbtTr('eg_boss_test_bar_curtain', 'All fight: a creeping wall of shell splashes sweeps the arena - the telegraph stays visible while it rolls, so fight INSIDE the barrage and clear cells between shell lines. Phase 3: the curtain also comes from the top - fight the diagonal!') },
                { name: 'Supply Drop', desc: _egbtTr('eg_boss_test_bar_supply', 'At 60% HP: cargo crates crash down and flip open into artillery JAMMERS that lob slow mortar shells at your last position. Step into a crate to SMASH it (+15% maxHP heal) before it digs in!') },
                { name: 'Shot Shells', desc: _egbtTr('eg_boss_test_bar_shells', 'At 60% HP: heavy shells fall on telegraphed rings (most aim near where you are) and each burst scatters six hot shrapnel spokes that keep travelling. Read the ring AND the fragment lanes!') },
                { name: 'FINAL BOMBARDMENT', desc: _egbtTr('eg_boss_test_bar_final', 'At 10% HP: the whole arena becomes the target zone - three full-screen shelling grids with two safe gaps each, then the ALL-OUT SALVO detonates everything except ONE safe tile. Reach it! (charge bar frozen)') },
            ];
        case 'boss_bloom':
            return [
                { name: 'Scarlet Blooms', desc: _egbtTr('eg_boss_test_blm_blooms', 'All fight: flowers open where you STAND - the marker TRACKS you until it freezes, then bursts. Every bloom plants a ROT GARDEN: a sweeping stamen beam, a burn floor, and one CRITICAL MASS burst whose seed pods plant NEW gardens. Untended, the garden takes over! Phase 3: blooms chase in converging pairs!') },
                { name: 'Seed Volley', desc: _egbtTr('eg_boss_test_blm_volley', 'At 60% HP: three seed pods arc across the arena and plant three fresh rot gardens in a line toward you - the garden is coming to YOU. Interrupt the march by standing where they land? No - move!') },
                { name: 'Withering Bloom', desc: _egbtTr('eg_boss_test_blm_veil', 'At 60% HP (once): the puzzle grid hides behind a blooming veil - every cell you FILL wilts it (visible thinning), every mistake REGROWS it. The puzzle is the pruning!') },
                { name: 'FULMINATION', desc: _egbtTr('eg_boss_test_blm_final', 'At 10% HP: the boss blooms from EVERY direction - petal-chains crawl along radial lanes while a judgment-bloom stamps your position. Each dodge carves a SCAR; three scars open the ONE TRUE GAP, and THE LAST BLOOM detonates everything outside it! (charge bar frozen)') },
            ];
        case 'boss_overfitter':
            return [
                { name: 'Gradient Descent', desc: _egbtTr('eg_boss_test_ovr_gradient', 'All fight: training steps march across the arena as hot gradient bands - a shadow DoT inside. The sweep ends with a LOCAL MINIMUM that locks where you stood and detonates; Phase 3: a second minimum chases your CURRENT position!') },
                { name: 'Pattern Lock', desc: _egbtTr('eg_boss_test_ovr_lock', 'At 60% HP: the model RECORDS your movement (the dashed trail is live) then REPLAYS it - a spike walks your exact path, detonating echoes at every step and an OVERFIT STRIKE where you stopped. Take no hit and you are UNLEARNED (+heal)!') },
                { name: 'Validation Set', desc: _egbtTr('eg_boss_test_ovr_valid', 'At 60% HP: two rings, one test - the model detonates the ring you are CLOSEST to. Break equidistance or get near neither and it UNDERFITS: nothing detonates at all!') },
                { name: 'THE FINAL EPOCH', desc: _egbtTr('eg_boss_test_ovr_final', 'At 10% HP: the whole fight was training data - your ACTUAL position history renders as a heat-map, then re-trains in three waves. Hot cells detonate, cool cells are safe, and it RE-RECORDS between waves. New ground is safe ground! (charge bar frozen)') },
            ];
        case 'boss_razor':
            return [
                { name: 'Blade Cyclone', desc: _egbtTr('eg_boss_test_rzr_cyclone', 'All fight: a fan of boomerangs flies out, wheels around, and returns along CURVED arcs that cross each other - dodge the throw, then read the crossfire home. Phase 3: a second fan launches while the first is still returning!') },
                { name: 'Razor Wire Lattice', desc: _egbtTr('eg_boss_test_rzr_wires', 'At 60% HP: taut wires snap across the arena - lightning DoT on contact, then they SNAP and the cut ends whip outward. Path between the wires and LEAVE the line before it dies! Phase 3: five wires, one already taut.') },
                { name: 'Hone and Cast', desc: _egbtTr('eg_boss_test_rzr_hone', 'At 60% HP: the whetstone grinds a GIANT SCYTHE (grind aura chips you) - body-check the stone 2× to shatter it (+12% maxHP heal) and CANCEL the cast, or the scythe crosses the whole arena at your row. Phase 3: it comes back the other way!') },
                { name: 'A THOUSAND EDGES', desc: _egbtTr('eg_boss_test_rzr_final', 'At 10% HP: nine razor spokes rotate around the centre and REVERSE every few seconds - rim fans shave across the middle each reversal. Survive three cycles for THE LAST EDGE: one full-screen scythe with a single safe pocket (the grind aura) that CHIPS you to stand in! (charge bar frozen)') },
            ];
        case 'boss_shrine':
            return [
                { name: 'Knot Barriers', desc: _egbtTr('eg_boss_test_shr_bars', 'All fight: paper barrier bars hum then LIGHT - crossing lightning-paper that ticks on touch. When a barrier dies, the KNOT holds: a wall grows from the rope on YOUR side, then burns away (clip it and it hurts). Phase 3: a vertical barrier crosses the horizontals!') },
                { name: 'Mirror Spirits', desc: _egbtTr('eg_boss_test_shr_mirrors', 'At 60% HP: a five-way spirit fan flies from the anchored ⛩️ while a SIGNATURE records your steps - after 2.5s it SHATTERS and a mirror spirit replays your last 1.5s in REVERSE, detonating your route and striking where you stopped. Stop repeating yourself! Phase 3: it plays your route FORWARD!') },
                { name: 'Ofuda Ward', desc: _egbtTr('eg_boss_test_shr_ward', 'At 60% HP: the Maiden plants a golden ofuda and chants - the chant DRAINS you while it stands. Body-check the talisman 3× to tear it down (+12% maxHP heal) and cancel, or the SHINTO SEAL sweeps the arena at your row. Phase 3: it comes back the other way!') },
                { name: 'THOUSAND ARMS', desc: _egbtTr('eg_boss_test_shr_final', 'At 10% HP: eight torii beams sweep like a lighthouse while KNOCKS land - 20 talismans with ONE safe cell each, 3.5s to reach it. Survive three knocks for THE THOUSANDTH ARM: one final sweep and everything outside the descending circle is annulled! (charge bar frozen)') },
            ];
        case 'boss_sirus':
            return [
                { name: 'Ion Current', desc: _egbtTr('eg_boss_test_sir_ion', 'All fight: glowing ion fronts slide across the arena on telegraphed lanes - hot inside, EXCEPT the tangent sliver on the lane centre. Standing in the current builds CHARGE (5 stacks): while charged you tick to everything nearby, and charge draws the chains! Phase 3: pincer currents close from both sides!') },
                { name: 'Chain Lightning', desc: _egbtTr('eg_boss_test_sir_chain', 'At 60% HP: a ⚡ bolt HUNTS you - you cannot outwalk it, only outposition it. Rivers sweep the arena and leave standing water: lure the bolt across water and it GROUNDS at the shore. Cold pools always ground it - ice does not conduct! Phase 3: two bolts.') },
                { name: 'Storm Eye', desc: _egbtTr('eg_boss_test_sir_eye', 'At 60% HP (once): the Stormcaller descends to the centre - 7 hot cells and a web of SAFE tiles CONNECTED to the eye. The safe web protects from everything. He spends his mobility here: the eye NEVER moves again!') },
                { name: 'PERFECT STORM', desc: _egbtTr('eg_boss_test_sir_final', 'At 10% HP: four ion currents enclose the arena in a shrinking box - stay OUTSIDE as it closes. Then the storm grows TEETH: your own stored CHARGE fires hunting bullets at you. Empty your charge before the wall hits! (charge bar frozen)') },
            ];
        default:
            return [];
    }
}
