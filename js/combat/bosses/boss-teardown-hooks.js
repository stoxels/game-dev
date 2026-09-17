//------------------------------------------------------------------------
//-------------------BOSS TEARDOWN HOOKS----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Per-boss teardown registry for _egBossCleanup (see boss-framework.js).
// Pure data: [monsterIdPrefix, globalTeardownFn, exactMatch?]. A hook fires
// on prefix match (live ids carry a spawn counter suffix) while the named
// teardown stays a global function. A new boss only adds one array entry.

// Per-boss teardown hooks: [monsterIdPrefix, globalTeardownFn, exactMatch?].
// A hook fires when the monster id matches (prefix match unless
// exactMatch) and the named teardown is a global function.
export const EG_BOSS_TEARDOWN_HOOKS = [
    // Brutus: sacrificial zombies roam in their own layer until he dies or
    // the encounter stops - tear them down exactly when that happens (this
    // hook never fires for individual zombie kills: their ids differ).
    // PREFIX match is required: live boss ids carry a spawn counter suffix
    // (boss_brutus_7), so an exact match would never fire and the roaming
    // zombie cards would survive into the hub / boss overview.
    ['boss_brutus', '_egBrutusZombieTeardown'],
    // The Dynamo: lightning conductors and beam network.
    ['boss_dynamo', '_egDynamoTeardown'],
    // The Gust: persistent storm-siege arena (lanes, water, clouds) plus
    // the wind-lane charge-pause latch.
    ['boss_gust', '_egGustTeardown'],
    // The Marksman: HP-gate watcher + any running Arrow Gauntlet (bow
    // walls, flying arrows, countdown overlay, charge-bar pause).
    ['boss_marksman', '_egMarksmanTeardown'],
    // The Puddle: persistent weather arena (rain, rising water, fountains,
    // air bubbles + burst shrapnel).
    ['boss_puddle', '_egPuddleTeardown'],
    // The Sprout: persistent garden arena (root vines, spore drift,
    // bramble wall whips, doom bud blooms + pollen dust).
    ['boss_sprout', '_egSproutTeardown'],
    // The Bumper: persistent carnival arena (roaming bumpers, pinball
    // shower, flipper frenzy bands, multiball rush + slam rings).
    ['boss_bumper', '_egBumperTeardown'],
    // The Centipede: persistent colony arena (winding body, molt mini,
    // tunnel mounds, exoskeleton plates, venom blobs + pools).
    ['boss_centipede', '_egCentipedeTeardown'],
    // The Striker: persistent pitch arena (homing match ball, corner-kick
    // barrage, penalty shootout, free-kick charge attack).
    ['boss_striker', '_egStrikerTeardown'],
    // The Thwomp: persistent fortress arena (hovering block, quake stomps,
    // ceiling collapse, mini-thwomp siege, grand slam charge attack).
    ['boss_thwomp', '_egThwompTeardown'],
    // The Coil: persistent serpent nest (coiled maw, seeker serpents,
    // venom trails, constrictor rings, serpent tide, cobra strike).
    ['boss_coil', '_egCoilTeardown'],
    // The Dancer: persistent ballroom (mirror ball, spotlight steps,
    // rhythm ribbons, curtain call patches, petal storm, pirouette rings).
    ['boss_dancer', '_egDancerTeardown'],
    // The Gale: persistent storm (wandering eye, crosswind, cyclone
    // funnels, tornado ladder, contracting rings, cyclone lance).
    ['boss_gale', '_egGaleTeardown'],
    // The Gambler: persistent casino (house chips, card volleys, wheel of
    // fortune, jackpot rush, russian roulette mark).
    ['boss_gambler', '_egGamblerTeardown'],
    // The Gourmet: persistent tasting menu (drifting maw, aroma inhale,
    // sizzling plate + grease pools, dinner service, banquet, devour).
    ['boss_gourmet', '_egGourmetTeardown'],
    // The Lodestone: persistent magnetic field (drifting stone, polarity
    // drag + flip pulses, filings, vortex, railgun, leash).
    ['boss_lodestone', '_egLodestoneTeardown'],
    // The Stack: persistent construction site (tetromino core, soft/hard
    // drops, floor terrain, line clears, garbage rise).
    ['boss_stack', '_egStackTeardown'],
    // The Tactician: persistent chess siege (gliding queen, battle
    // intents, pawn marches, check lanes, zugzwang, checkmate walls).
    ['boss_tactician', '_egTacticianTeardown'],
    // The Bomber (rework): mine field, keeper run, TOTAL CARPET set-piece
    // and the flying presentation (target pip).
    ['boss_bomber', '_egBmbTeardown'],
    // The Creeper (rework): creeper packs, TNT chains, SSSS…BOOM set-piece
    // and the primed-boss presentation.
    ['boss_creeper', '_egCrpTeardown'],
    // The Buzzsaw (rework): ricochet saws, cut lines, saw traps, pendulum
    // blades and the FINAL CUT set-piece.
    ['boss_buzz', '_egBzTeardown'],
    // The Encore (rework): encore circles, EQ slams, stage lights, beat
    // mines and the CURTAIN CALL set-piece.
    ['boss_encore', '_egEnTeardown'],
    // The Medusa (rework): stone gaze, snake strikes, petrify waves, coil
    // cage and THE STARE set-piece.
    ['boss_medusa', '_egMdTeardown'],
    // The Maze (rework): ghost gang, dot walls, the labyrinth, lights-out
    // eyes and the GAME OVER set-piece.
    ['boss_maze', '_egMzTeardown'],
    // The Monsoon (rework): rain bands, thunderbolts, storm surge, hail
    // barrage and the GREAT FLOOD set-piece.
    ['boss_monsoon', '_egMnTeardown'],
    // The Needle (rework): spike gates, pin drops, stitch wave, pincushion
    // burst and the FINAL STITCH set-piece.
    ['boss_needle', '_egNdTeardown'],
    // The Aegis (rework): aegis protocol, shield charge, sentry shields,
    // guard rotor and the LAST BASTION set-piece.
    ['boss_aegis', '_egAgTeardown'],
    // The Gridlock (rework): laser lattice, signal scramble, surge chaser
    // and the SYSTEM LOCKDOWN set-piece.
    ['boss_gridlock', '_egGlTeardown'],
    // The Jester (rework): bouncing mayhem, card toss, juggler's jinx and
    // the GRAND FINALE set-piece.
    ['boss_jester', '_egJsTeardown'],
    // The Shaper (rework): glacier rift, frost monoliths, ice walkers and
    // the SHAPED WINTER set-piece.
    ['boss_shaper', '_egShpTeardown'],
    // The Siren (rework): wail beam patterns, undertow, siren's reply and
    // the DEADLY ARIA set-piece.
    ['boss_siren', '_egSireTeardown'],
    // The Swarm (rework): swarm arcs, mimic queen, hive eye blooms and the
    // SWARM SINGULARITY set-piece.
    ['boss_swarm', '_egSwTeardown'],
    // The Colossus (rework): stride footfalls, boulders, golems and the
    // TITAN'S FALL set-piece.
    ['boss_colossus', '_egColoTeardown'],
    // Bayes (rework): belief meter, gambit board, veil chip and the veil
    // itself (the shared _egRemoveVeil lives in shared-boss-abilities.js).
    ['boss_bayes', '_egBayTeardown'],
    // Entropy (rework): order meter, pools/zones/cells, door auras and the
    // LAST DEGREE set-piece.
    ['boss_entropy', '_egEntrTeardown'],
    // Laplace (rework): ghost corridors, branches, the movement clone and
    // the CLOSED TIMELINE set-piece.
    ['boss_laplace', '_egLapTeardown'],
    // The Inferno (rework): heat meter, tides/tiles/hazes and the
    // SUPERVOLCANIC WINTER set-piece.
    ['boss_inferno', '_egInfVTeardown'],
    // The Null (rework): lattice lines, erasure markers, rays and the
    // PROOF BY CONTRADICTION set-piece. Also owns the legacy blackout and
    // void-surge teardowns the framework typeof-guards.
    ['boss_null', '_egNulTeardown'],
    // The Barrage (rework): shelling curtain, supply jammers, shot shells
    // and the FINAL BOMBARDMENT set-piece.
    ['boss_barrage', '_egBarTeardown'],
    // The Bloom (rework): rot gardens, stamen rotors, seed pods and the
    // FULMINATION set-piece.
    ['boss_bloom', '_egBlmTeardown'],
    // The Minotaur (rework): labyrinth walls, hoof craters, dust storms,
    // Ariadne threads and the WARDEN'S LABYRINTH set-piece.
    ['boss_minotaur', '_egMntTeardown'],
    // The Overfitter (rework): gradient sweeps, pattern replays,
    // validation rings and the FINAL EPOCH heat-map set-piece.
    ['boss_overfitter', '_egOvrTeardown'],
    // The Razor (rework): cyclone blades, razor wires, whetstones and the
    // A THOUSAND EDGES spoke-clock set-piece.
    ['boss_razor', '_egRzrTeardown'],
    // The Shrine Maiden (rework): knot barriers, mirror spirits, ofuda
    // wards and the THOUSAND ARMS talisman-grid set-piece.
    ['boss_shrine', '_egShrTeardown'],
    // The Stormcaller (rework): ion currents, chain lightning, the storm
    // eye grid and the PERFECT STORM charge-bullet set-piece.
    ['boss_sirus', '_egSirTeardown'],
    // The Vise (rework): breathing crushing walls, the bench vise jaws,
    // quench casts and the FULL CLAMP safe-slab set-piece (replaces the
    // legacy _egCrushTeardown corridor hook).
    ['boss_vise', '_egVisTeardown'],
];
