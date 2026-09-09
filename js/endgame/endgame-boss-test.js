'use strict';

//========================================================================
//=  ENDGAME BOSS TESTING — SINGLE-BOSS ARENA SANDBOX                    =
//========================================================================
//=  Testing screen reachable from the Nexus of Worlds. Lists every      =
//=  registered boss (EG_BOSS_DEFS), grouped under the map-tier headers =
//=  of their atlas region (EG_ATLAS_REGION_BOSSES in boss-rosters.js), =
//=  so each fight can be tried without running full maps. Each boss is =
//=  fought at its tier's monster level, matching real map difficulty.  =
//=  Picking a boss:                                                     =
//=                                                                      =
//=    1. generates a small boss-arena puzzle as the seed level          =
//=    2. stamps single-boss run parameters onto it                      =
//=       (no regular monsters, no kill/puzzle/quiz objectives,          =
//=       unlimited mistakes, generous time)                             =
//=    3. starts it via startLevel() and spawns the chosen boss          =
//=       straight onto that arena — no extra arena transition.          =
//=                                                                      =
//=  Win path: slay the boss → loot explosion (normal boss loot) →       =
//=  collect at leisure → Complete Map → back to this screen.            =
//=  Defeat path: _egEndMapDefeated shows the map-lost summary whose    =
//=  return button is re-routed here (see _egShowLeaveMapTransition).    =
//=                                                                      =
//=  The seed level is flagged isBossTestSeed and restored by            =
//=  _egCleanupBossTestSeedLevel() (called from _egChainCleanup).        =
//========================================================================


//------------------------------------------------------------------------
//-------------------CONFIGURATION----------------------------------------
//------------------------------------------------------------------------

// Generous time budget for a single test fight (1 hour, in seconds).
const EG_BOSS_TEST_TIME_LIMIT = 3600;

// Fallback monster level per map tier (T1–T16), used when
// _egMapTierMonsterLevel() (endgame-maps.js) is unavailable. Mirrors
// EG_MAP_TIER_MONSTER_LEVELS.
const EG_BOSS_TEST_TIER_LEVELS = [3, 6, 10, 14, 19, 24, 30, 36, 43, 50, 57, 64, 71, 78, 84, 90];

// Fallback test level for bosses with no atlas region assigned.
const EG_BOSS_TEST_DEFAULT_LEVEL = 50;

// Arena board caps — mirrors EG_BOSS_ARENA_MAX_ROWS/COLS in
// endgame-encounter-chain.js so fights feel like real boss arenas.
const EG_BOSS_TEST_ARENA_MAX_ROWS = 15;
const EG_BOSS_TEST_ARENA_MAX_COLS = 25;
const EG_BOSS_TEST_ARENA_MIN_CELLS = 36;


//------------------------------------------------------------------------
//-------------------SEED RESTORE-----------------------------------------
//------------------------------------------------------------------------

// Strips all stamped run fields off the boss-test seed level. Called from
// _egChainCleanup() so a story level returns to its pristine state —
// including when the seed is still `cur` (forfeiting mid-first-arena is
// the common case when testing, and there is no same-level retry flow
// that would need the fields preserved).
function _egCleanupBossTestSeedLevel() {
    // Launch guard: _egChainCleanup also fires from _egStopEncounter
    // during the launch's own startLevel() call — wiping the stamp there
    // would kill the run before the first encounter begins (same pattern
    // as _egMapDeviceLaunching in endgame-map-launch.js).
    if (window._egBossTestLaunching) return;

    const seedGi = window._egBossTestSeedGi;
    window._egBossTestSeedGi = null;
    if (seedGi == null) return;

    const level = (typeof ALL !== 'undefined') ? ALL[seedGi] : null;
    if (!level) return;

    delete level.isBossTestSeed;
    delete level.isMonsterLevel;
    delete level.isBossArena;
    ['monsterLevel', 'maxMonsters', 'totalMonsters', 'hasBoss', 'maxBosses',
     'bosses', 'requiredPuzzles', 'requiredQuestions', 'puzzlePool',
     'egTimeLimit', 'egMaxMistakes'].forEach(key => delete level[key]);
}


//------------------------------------------------------------------------
//-------------------TIER MAPPING-----------------------------------------
//------------------------------------------------------------------------

// Returns the atlas map tier (1–16) a boss belongs to, via
// EG_ATLAS_REGION_BOSSES (boss-rosters.js: region `atlas_t{tier}_{slot}`
// → boss id). Returns 0 when the boss has no assigned region.
function _egbtBossTier(bossId) {
    if (typeof EG_ATLAS_REGION_BOSSES === 'undefined') return 0;
    for (const regionId of Object.keys(EG_ATLAS_REGION_BOSSES)) {
        if (EG_ATLAS_REGION_BOSSES[regionId] !== bossId) continue;
        const m = /^atlas_t(\d+)_/.exec(regionId);
        if (m) return Math.max(1, Math.min(16, parseInt(m[1], 10)));
    }
    return 0;
}

// Monster level a boss of the given tier fights at on real maps.
function _egbtTierMonsterLevel(tier) {
    if (typeof _egMapTierMonsterLevel === 'function') {
        try { return Math.max(1, Math.round(_egMapTierMonsterLevel(tier))); } catch (e) {}
    }
    return EG_BOSS_TEST_TIER_LEVELS[Math.max(1, Math.min(16, tier)) - 1];
}

// Test level for one boss: its tier's monster level, or the default for
// bosses with no assigned region.
function _egbtLevelForBoss(bossId) {
    const tier = _egbtBossTier(bossId);
    return tier > 0 ? _egbtTierMonsterLevel(tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
}


//------------------------------------------------------------------------
//-------------------BOSS TOOLTIP & TEST HP HELPERS-----------------------
//------------------------------------------------------------------------

// Builds a tooltip HTML string for a boss, listing its phases, mechanics,
// and estimated damage at the given level. Uses showGameTooltip from tooltips-hud.js.
function _egbtBuildBossTooltipHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const mechDef = (typeof EG_BOSS_MECHANICS !== 'undefined') ? EG_BOSS_MECHANICS[def.id] : null;
    if (!mechDef) return null;

    const bossIcon = (typeof EG_ART !== 'undefined' && EG_ART.html)
        ? EG_ART.html('monster', def.id, def.emoji || '💀')
        : (def.emoji || '💀');
    let html = `<div style="min-width:280px;">
        <div style="font-size:13px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">
            ${bossIcon} ${def.name || def.id}
        </div>
        <div style="font-size:11px;opacity:0.8;margin-bottom:4px;">
            Lv ${level} · ❤️ ${preview.hp.toLocaleString()} · 🗡️ ${preview.dmg} base
        </div>`;

    // Tier line — the boss's atlas tier drives every tier-scaled mechanic
    // (Corrupt Cells caps/rates, Prior Bomb counts/fuse, Probability Shift
    // target counts). Shown for every boss so playtesting numbers are
    // transparent. Unassigned bosses fall back to the tier of their level.
    let tier = (typeof _egbtBossTier === 'function') ? _egbtBossTier(def.id) : 0;
    if (tier <= 0 && typeof _egRollMapTier === 'function') {
        try { tier = _egRollMapTier(level); } catch (e) { tier = 0; }
    }
    if (tier > 0) {
        html += `<div style="font-size:11px;margin-bottom:8px;">
            <span style="color:#f5d98a;font-weight:700;">${t('eg_boss_test_tier').replace('{n}', tier)}</span>
            <span style="opacity:0.6;"> · tier-scaled mechanics use these values</span>
        </div>`;
    }

    // Corruption caps at this tier (only for bosses using corrupt_cells).
    // Mirrors the live fight values: cap = P2 spread ceiling / P3 relentless ceiling.
    if (mechDef.mechanics && mechDef.mechanics.some(m => (m.handler || '').includes('CorruptCells'))) {
        const norm = (typeof _egBossTierNorm === 'function')
            ? (() => { try { return _egBossTierNorm({ level }); } catch (e) { return 0.5; } })()
            : 0.5;
        const cap2 = (typeof _egCorruptSpreadCap === 'function')
            ? _egCorruptSpreadCap({ p: 2, norm }) : null;
        const cap3 = (typeof _egCorruptSpreadCap === 'function')
            ? _egCorruptSpreadCap({ p: 3, norm }) : null;
        if (cap2 != null && cap3 != null) {
            html += `<div style="font-size:11px;margin-bottom:8px;">
                <span style="color:#7fb8ff;">🧫 Corruption cap:</span>
                <span style="color:#f87171;"> P2 ${cap2}</span>
                <span style="opacity:0.6;"> /</span>
                <span style="color:#f87171;">P3 ${cap3}</span>
                <span style="opacity:0.6;"> cells</span>
            </div>`;
        }
    }

    // Phases
    if (mechDef.phases && mechDef.phases.length > 0) {
        html += `<div style="margin-bottom:8px;">`;
        mechDef.phases.forEach((ph, i) => {
            const pct = Math.round(ph.threshold * 100);
            const dmgMult = ph.damageMultiplier || 1.0;
            const phaseDmg = Math.round(preview.dmg * dmgMult);
            const label = i === 0 ? t('eg_boss_test_phase_base') : t('eg_boss_test_phase').replace('{n}', i + 1);
            html += `<div style="font-size:11px;margin:3px 0;">
                <span style="color:var(--accent2,#ccc);">${label}:</span>
                <span style="color:#f87171;"> ≤${pct}% HP</span>
                <span style="color:#7fd67f;"> (×${dmgMult.toFixed(2)} dmg → ~${phaseDmg})</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Special phase mechanics (from onPhaseEnter hooks, etc.)
    const specialPhases = _egbtGetSpecialPhaseInfo(def.id);
    if (specialPhases && specialPhases.length > 0) {
        html += `<div style="margin-bottom:8px;">`;
        specialPhases.forEach(sp => {
            html += `<div style="font-size:11px;margin:3px 0;">
                <span style="color:var(--accent2,#ccc);">${_egbtTr('eg_boss_test_special_phase', 'Special')}:</span>
                <span style="color:#f5d98a;"> ${sp.name}</span>
                <span style="opacity:0.6;"> — ${sp.desc}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Mechanics
    if (mechDef.mechanics && mechDef.mechanics.length > 0) {
        html += `<div style="border-top:1px solid rgba(200,168,75,0.3);padding-top:8px;">`;
        html += `<div style="font-size:11px;font-weight:700;color:var(--accent,#c8a84b);margin-bottom:6px;">${t('eg_boss_test_mechanics')}</div>`;
        mechDef.mechanics.forEach(m => {
            const interval = m.intervalBase ? `${(m.intervalBase / 1000).toFixed(1)}s` : '—';
            const variance = m.intervalVariance ? `±${(m.intervalVariance / 1000).toFixed(1)}s` : '';
            const phase2 = m.phase2Only ? ` <span style="color:#f5d98a;font-size:10px;">[P2+]</span>` : '';
            const handler = m.handler || '—';
            html += `<div style="font-size:10px;margin:2px 0;font-family:inherit;">
                <span style="color:#7fb8ff;">${m.name || '?'}${phase2}</span>
                <span style="opacity:0.6;"> — every ${interval} ${variance}</span>
                <span style="opacity:0.4;"> → ${handler}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Soft enrage note
    if (typeof EG_BOSS_SOFT_ENRAGE_DELAY_MS !== 'undefined') {
        const delayMin = EG_BOSS_SOFT_ENRAGE_DELAY_MS / 60000;
        const stepPct = Math.round(EG_BOSS_SOFT_ENRAGE_DMG_STEP * 100);
        html += `<div style="margin-top:8px;font-size:10px;opacity:0.6;">
            ${t('eg_boss_test_soft_enrage').replace('{delay}', delayMin).replace('{step}', stepPct)}
        </div>`;
    }

    html += `</div>`;
    return html;
}

// Translation lookup with a real fallback: t() returns the key itself when
// a translation is missing (truthy), so `t(k) || fb` never falls back.
// This helper returns the fallback English text in that case.
function _egbtTr(key, fallback) {
    try {
        const v = (typeof t === 'function') ? t(key) : key;
        return (v && v !== key) ? v : fallback;
    } catch (e) { return fallback; }
}

// Returns special phase mechanic info for bosses with onPhaseEnter hooks,
// HP-gated set-pieces, or persistent arena twists (onInit watchers) that
// never appear in the EG_BOSS_MECHANICS schedule — without these entries
// the tooltip only shows the scheduled mechanics and hides the signature
// of the fight. Covers all Tier 1–4 bosses.
function _egbtGetSpecialPhaseInfo(bossId) {
    switch (bossId) {
        // ── Tier 1 ──
        case 'boss_ember':
            return [];
        case 'boss_bomber':
            return [
                { name: 'Mine Collar', desc: _egbtTr('eg_boss_test_bomber_collar', 'All fight: tethered mines orbit the flying boss, detach and drift to YOUR position, planting proximity mines. Leave the red rings — they detonate when you step in!') },
                { name: 'Carpet Run', desc: _egbtTr('eg_boss_test_bomber_carpet', 'At 60% HP: a bomber plane 🛩️ banks across the arena through your position, carpeting its lane with fuse bombs. The detonation front rolls the path — leave the highlighted band entirely!') },
                { name: 'Cluster Shells', desc: _egbtTr('eg_boss_test_bomber_cluster', 'At 30% HP: 3 mortar shells ☄️ burst at your position into 7 bomblets that scatter and fuse. Never stop moving!') },
                { name: 'Total Carpet', desc: _egbtTr('eg_boss_test_bomber_final', 'At 10% HP: 3…2…1 countdown → a green SAFE dome plants at your position, then every live mine + a rolling detonation front goes off. OUTSIDE the dome = hit, twice (charge bar frozen).') },
            ];
        case 'boss_creeper':
            return [
                { name: 'Creeper Pack', desc: _egbtTr('eg_boss_test_creeper_pack', 'All fight: creepers scuttle in and STALK you — their fuse HEATS (white flash + swell) while you are close and COOLS while you keep your distance. Fuse full = detonation. Keep moving!') },
                { name: 'Fuse Pounce', desc: _egbtTr('eg_boss_test_creeper_pounce', 'All fight: a creeper drops onto your current position — shadow marker first, then hiss, then boom. Move from your spot!') },
                { name: 'TNT Chain', desc: _egbtTr('eg_boss_test_creeper_tnt', 'At 60% HP: primed TNT blocks rain down around you, flashing faster and faster, then detonate in a rolling chain reaction outward from the centre. Leave the cluster entirely!') },
                { name: 'Charged Creeper', desc: _egbtTr('eg_boss_test_creeper_charged', 'At 30% HP: packs gain a lightning-charged creeper ⚡ (blue aura) — faster fuse, bigger blast radius. Prioritize it!') },
                { name: 'SSSS…BOOM', desc: _egbtTr('eg_boss_test_creeper_final', 'At 10% HP: the boss primes — 3…2…1 fuse countdown while a huge red blast ring grows around it, then it mega-detonates. Be OUTSIDE the ring! (charge bar frozen)') },
            ];
        case 'boss_buzz':
            return [
                { name: 'Ricochet Saws', desc: _egbtTr('eg_boss_test_bz_ricochet', 'All fight: blades are flung in from the edges at you, bounce off the walls up to 3 times, then embed in the floor as spinning hazards. Watch the bounce!') },
                { name: 'Cut Line', desc: _egbtTr('eg_boss_test_bz_cutline', 'All fight: a dashed telegraph band stretches across the arena through your position, then a giant saw sweeps along it. Step OUT of the band!') },
                { name: 'Saw Traps', desc: _egbtTr('eg_boss_test_bz_traps', 'At 60% HP: floor positions flash a saw silhouette, then erupt into spinning blade hazards that linger. Mind the floor!') },
                { name: 'Pendulum Blades', desc: _egbtTr('eg_boss_test_bz_pendulum', 'At 30% HP: two giant saws on chains swing from the top, scything across the arena in crossed arcs. Time the gap!') },
                { name: 'THE FINAL CUT', desc: _egbtTr('eg_boss_test_bz_final', 'At 10% HP: the boss spins up and four toothed wall-saws close in, shrinking the safe centre pocket. 3…2…1 CROSSCUT slashes the whole screen — only the tiny centre pocket survives! (charge bar frozen)') },
            ];
        case 'boss_encore':
            return [
                { name: 'Encore Circles', desc: _egbtTr('eg_boss_test_en_circles', 'All fight: gold rings close in on marked spots — be INSIDE each circle the moment its ring lands. The only "get in" mechanic in the show!') },
                { name: 'Sound Bars', desc: _egbtTr('eg_boss_test_en_bars', 'All fight: equalizer lanes telegraph at the floor, then slam UP as solid sound bars. Step OUT of the lane!') },
                { name: 'Stage Lights', desc: _egbtTr('eg_boss_test_en_spot', 'At 60% HP: spotlights drift after you, then LOCK — a beat later they flash and burn everyone still inside. Break away before they set!') },
                { name: 'Beat Mines', desc: _egbtTr('eg_boss_test_en_mines', 'At 60% HP: mines pulse on the beat, then pop one after another in sequence. Stand between the pops!') },
                { name: 'CURTAIN CALL', desc: _egbtTr('eg_boss_test_en_final', 'At 10% HP: the house goes dark and a spotlight plays musical chairs — each metronome beat erupts from the old light, then it JUMPS. Follow the light every beat; the final OVATION hits everything outside it! (charge bar frozen)') },
            ];
        case 'boss_medusa':
            return [
                { name: 'Stone Gaze', desc: _egbtTr('eg_boss_test_md_gaze', 'All fight: the gorgon\'s eyes scan from above, dragging a petrifying gaze beam across the arena. Stay out of the beam!') },
                { name: 'Snake Strikes', desc: _egbtTr('eg_boss_test_md_snakes', 'All fight: snake heads erupt from marked spots and bite on a rhythm. Leave the bite circles!') },
                { name: 'Petrify Waves', desc: _egbtTr('eg_boss_test_md_waves', 'At 60% HP: stone-gray rings expand with one rotating safe gap. Slip the gap as the ring crosses you!') },
                { name: 'Coil Cage', desc: _egbtTr('eg_boss_test_md_coil', 'At 60% HP: a snake coil forms around you and SHRINKS while its gap slowly rotates. Escape through the gap!') },
                { name: 'THE STARE', desc: _egbtTr('eg_boss_test_md_final', 'At 10% HP: statues rise beat by beat, then a screen-wide gaze wall sweeps down — only the shadows BEHIND the statues shelter you! (charge bar frozen)') },
            ];
        case 'boss_maze':
            return [
                { name: 'Ghost Gang', desc: _egbtTr('eg_boss_test_mz_gang', 'All fight: four ghosts hunt you with different brains — one chases, one ambushes where you are heading, one flanks, one wanders. They scatter to the corners every few seconds — breathe, then move!') },
                { name: 'Dot Walls', desc: _egbtTr('eg_boss_test_mz_walls', 'All fight: walls of glowing pellets march across the arena with a single gap. Slip through the gap — touching a pellet stings!') },
                { name: 'The Labyrinth', desc: _egbtTr('eg_boss_test_mz_maze', 'At 60% HP: shadow wall segments rise out of the floor, building a temporary maze. Route around them while the gang hunts!') },
                { name: 'Lights Out', desc: _egbtTr('eg_boss_test_mz_lights', 'At 60% HP: the arena goes dark and only drifting ghost eyes glow. Do NOT touch the eyes!') },
                { name: 'GAME OVER', desc: _egbtTr('eg_boss_test_mz_final', 'At 10% HP: a shadow circle marks YOUR position and the whole gang converges — 3 slams with a growing final circle, then one giant CHOMP. Never stand still! (charge bar frozen)') },
            ];
        case 'boss_monsoon':
            return [
                { name: 'Rain Bands', desc: _egbtTr('eg_boss_test_mn_bands', 'All fight: diagonal rain curtains telegraph near you, then pour for a few seconds. Stay out of the curtains!') },
                { name: 'Thunderbolts', desc: _egbtTr('eg_boss_test_mn_bolts', 'All fight: golden marks flash and lightning strikes each one, staggered across the sky. Clear the circles!') },
                { name: 'Storm Surge', desc: _egbtTr('eg_boss_test_mn_surge', 'At 60% HP: the water rises from the bottom and holds — everything submerged takes repeated hits — then recedes. Climb!') },
                { name: 'Hail Barrage', desc: _egbtTr('eg_boss_test_mn_hail', 'At 60% HP: hailstones drop onto marked spots, most aimed near where you were. Keep moving!') },
                { name: 'THE GREAT FLOOD', desc: _egbtTr('eg_boss_test_mn_final', 'At 10% HP: the water rises in three surges while a dry island hops around the high ground — reach it every beat, then survive THE BREAK when the flood swallows everything else! (charge bar frozen)') },
            ];
        case 'boss_needle':
            return [
                { name: 'Spike Gates', desc: _egbtTr('eg_boss_test_nd_gates', 'All fight: full-height needle gates peek in at the edge, then scroll across with a single wobbling gap. Thread the gap!') },
                { name: 'Pin Drops', desc: _egbtTr('eg_boss_test_nd_pins', 'All fight: giant pins slam down point-first at marked spots and plant themselves as tilted hazards. Mind the planted pins!') },
                { name: 'Stitch Wave', desc: _egbtTr('eg_boss_test_nd_stitch', 'At 60% HP: the floor flashes a stitch grid, then needles rise lane by lane in a rolling wave. Stay ahead of the wave!') },
                { name: 'Pincushion Burst', desc: _egbtTr('eg_boss_test_nd_cushion', 'At 60% HP: a pincushion swells and BURSTS — needles fly outward along every spoke. Slip between them!') },
                { name: 'THE FINAL STITCH', desc: _egbtTr('eg_boss_test_nd_final', 'At 10% HP: a colossal needle stabs the whole screen beat after beat — only the glowing EYE of the needle is safe. Reach the eye every stab; the last one sews the screen shut! (charge bar frozen)') },
            ];
        case 'boss_aegis':
            return [
                { name: 'Aegis Protocol', desc: _egbtTr('eg_boss_test_ag_protocol', 'All fight: the boss summons a guard squad and goes IMMUNE while they live — kill the guards to break the shield (40s failsafe). Guards wear a pulsing ring and the arena glows while the shield is up!') },
                { name: 'Shield Charge', desc: _egbtTr('eg_boss_test_ag_charge', 'All fight: the boss picks your row and BARRELS across it behind its shield, two to three times per cast. Out of the lane!') },
                { name: 'Sentry Shields', desc: _egbtTr('eg_boss_test_ag_sentries', 'At 60% HP: sentry shields plant at the edges and hurl slow tracking orbs at you. Strafe the orbs!') },
                { name: 'Guard Rotor', desc: _egbtTr('eg_boss_test_ag_rotor', 'At 60% HP: two guardian orbs tether a beam that sweeps around a pivot like a radar blade. Stay off the arms!') },
                { name: 'THE LAST BASTION', desc: _egbtTr('eg_boss_test_ag_final', 'At 10% HP: a bastion plants at the centre and sweeps the field with two beams that spin faster every beat — then the VANGUARD: three rapid shield charges, the last one huge! (charge bar frozen)') },
            ];
        case 'boss_gridlock':
            return [
                { name: 'Laser Lattice', desc: _egbtTr('eg_boss_test_gl_lattice', 'All fight: alternating full-screen laser waves sweep the lit lanes — each wave STAGGER-FIRES line by line. Clear the lane whose turn is coming!') },
                { name: 'Signal Scramble', desc: _egbtTr('eg_boss_test_gl_scramble', 'At 60% HP: signal towers plant and draw dashed cables to YOUR position, then all fire together. Move after they draw — the starburst aims at where you were!') },
                { name: 'Surge Chaser', desc: _egbtTr('eg_boss_test_gl_surge', 'At 60% HP: a roaming ⚡ orb homes slowly and sheds a LIVE CABLE TRAIL behind it (two in phase 3). Kite it — the arena accumulates hot wires while you run!') },
                { name: 'SYSTEM LOCKDOWN', desc: _egbtTr('eg_boss_test_gl_final', 'At 10% HP: a circuit grid floods the arena — 3 beats of charging wire batches, then THE JAM: every wire fires except one safe H+V crossing (green pip). Reach it, survive the SURGE DIVE that targets the safe cell — step off! (charge bar frozen)') },
            ];
        case 'boss_jester':
            return [
                { name: 'Bouncing Mayhem', desc: _egbtTr('eg_boss_test_js_orbs', 'All fight: juggling orbs bounce in RHYTHM — they glide calmly between beats, then all HOP and reshuffle direction on the beat. Dodge to the rhythm!') },
                { name: 'Card Toss', desc: _egbtTr('eg_boss_test_js_cards', 'At 60% HP: fans of oversized playing cards arc across the stage and STICK face-up as hazards — the last volley aims at you. Mind the card table!') },
                { name: 'Juggler\u2019s Jinx', desc: _egbtTr('eg_boss_test_js_jinx', 'At 60% HP: purple jinx balls orbit and bite, but one gold LUCK ball drifts through the chaos — touching it heals. Greed bait in the mayhem!') },
                { name: 'THE GRAND FINALE', desc: _egbtTr('eg_boss_test_js_final', 'At 10% HP: the curtain drops and the FULL HOUSE deals — each reveal names a safe suit: stand on it when the reveal lands (reveals accelerate), then survive the BLACKOUT + CURTAIN CALL sweeps from the lit columns! (charge bar frozen)') },
            ];
        case 'boss_shaper':
            return [
                { name: 'Glacier Rift', desc: _egbtTr('eg_boss_test_shp_rift', 'All fight: a glacier front sweeps the whole screen (a band with 3 fissure gaps) and leaves LINGERING ICE POOLS that drain while you stand in them. Outrun the front, slip the gaps, respect the pools!') },
                { name: 'Frost Monoliths', desc: _egbtTr('eg_boss_test_shp_monos', 'At 60% HP: rune monoliths plant at the edges and each grows a FROST WALL that shrinks the arena toward the centre. Body-check a monolith 3\u00d7 to shatter it and stop its wall!') },
                { name: 'Ice Walker', desc: _egbtTr('eg_boss_test_shp_walker', 'At 60% HP: an ice walker (\u26c4) stalks you and SHATTERS on contact — its hit plus a burst of shard shrapnel. Two in phase 3. Let it kiss you at the right moment, or never!') },
                { name: 'THE SHAPED WINTER', desc: _egbtTr('eg_boss_test_shp_final', 'At 10% HP: a colossal monolith assembles at the centre — three frost arms sweep faster each beat while CORES light up one at a time: body-check the lit core 3\u00d7 to shatter it. Break all three, or the MONOLITH BREAK shockwave detonates (only the central eye is safe)! (charge bar frozen)') },
            ];
        case 'boss_colossus':
            return [
                { name: 'Seismic Stride', desc: _egbtTr('eg_boss_test_colo_stride', 'All fight: the Colossus WALKS — two giant footprints slam in sequence, each rolling a full-screen SHOCKWAVE RING with a jump-window. Pure physical: resists do nothing. Phase 3 strides cut diagonally!') },
                { name: 'Boulder Rain', desc: _egbtTr('eg_boss_test_colo_boulder', 'At 60% HP: the quarries hurl 🪨 boulders that arc in and SHATTER into rolling fragments that keep travelling. Dodge the impact ring AND the fragment lanes!') },
                { name: 'Granite Golems', desc: _egbtTr('eg_boss_test_colo_golem', 'At 60% HP: two granite golems climb out and slow-push you into telegraphs — moving walls. Body-check one 3× to crumble it early, or they crumble on their own.') },
                { name: "TITAN'S FALL", desc: _egbtTr('eg_boss_test_colo_final', 'At 10% HP: the titan KNEELS — three JOINT SEALS light up one at a time: body-check the lit seal 3× while rock chutes sweep the arena. Break all three and it collapses; a failed seal answers with a CAVE-IN (only the seal ring is safe)! (charge bar frozen)') },
            ];
        case 'boss_swarm':
            return [
                { name: 'Swarm Arc', desc: _egbtTr('eg_boss_test_sw_arc', 'All fight: a wedge of drones carves a huge SWARM ARC across the stage — every drone trails a LAVAL GLOW burn line and a 🐝 hatchling splits off mid-arc to cut a tighter inner arc. Ride the edge, respect the glow!') },
                { name: 'Mimic Queen', desc: _egbtTr('eg_boss_test_sw_mimic', 'At 60% HP: four drones halt and open to reveal 👑 larvae — ONE is real, three are MIMICS. Crush the real one for ROYAL JELLY (+15% maxHP heal); step on a mimic and a rancid stink cloud erupts! Larvae sink after ~4s.') },
                { name: 'Hive Eye', desc: _egbtTr('eg_boss_test_sw_eye', 'At 60% HP: a probe 🛸 flies to your position and BLOOMS — smoke covers everything except a 150px clear hole where you stood. Drone guards circle the hole. Plan your position BEFORE the bloom (two blooms in phase 3)!') },
                { name: 'THE SWARM SINGULARITY', desc: _egbtTr('eg_boss_test_sw_final', 'At 10% HP: every drone recalls into a whirling ball of wings — 3 rapid CHARGES, each telegraphed with a green safe gap opposite the charge line. Then the ball implodes into a FUNNEL of 4 drone walls: slip through each wandering gap! (charge bar frozen)') },
            ];
        case 'boss_siren':
            return [
                { name: 'Wail Beam', desc: _egbtTr('eg_boss_test_sire_wail', 'All fight: the sweeping wail beam now sings PATTERNS — wide swing, narrow flick or stutter reversals (may reverse mid-song in phase 3). Glowing ECHO ZONES heal you if you stand in one while the beam passes. Bait = learn!') },
                { name: 'Undertow', desc: _egbtTr('eg_boss_test_sire_undertow', 'At 60% HP: a whirlpool spins up at the anchor and DRAGS you toward it in slow pulls (moving breaks the pull) while flotsam spirals in and bites. Then it NOVAS — get out of the ring!') },
                { name: 'Siren\u2019s Reply', desc: _egbtTr('eg_boss_test_sire_reply', 'At 60% HP: the beam splits — a mirror beam sweeps AGAINST the first, and phase 3 adds a third slow arc. Read every song before you cross!') },
                { name: 'THE DEADLY ARIA', desc: _egbtTr('eg_boss_test_sire_final', 'At 10% HP: the hall floods with her bubble audience and the DEADLY ARIA begins — each song line lights a chain of bubbles: reach the FAR bubble before the note lands, because the rest of the song pops! The KILLER CRESCENDO detonates every bubble except one — stand on it! (charge bar frozen)') },
            ];
        case 'boss_bayes':
            return [
                { name: 'Posterior Bolts', desc: _egbtTr('eg_boss_test_bay_bolts', 'All fight: every cast strikes the side Bayes BELIEVES is safe in wide ⚡ columns — then the belief meter shifts AGAINST you. The green EVIDENCE RING spawns on the punished side: hold it through a landing bolt to flip the meter your way!') },
                { name: 'Evidence Wisps', desc: _egbtTr('eg_boss_test_bay_wisps', 'At 60% HP: 🔮 wisps drift in wide loops — the GLOWING ones (on the disbelieved side) are free evidence: touch one to flip the meter; wisps on the believed side sting.') },
                { name: 'Belief Veil', desc: _egbtTr('eg_boss_test_bay_veil', 'At 60% HP (once): the puzzle grid vanishes AS BAYES BELIEVES IT — the veil leans with the meter. Near 50/50 it reads clearest: balance is clarity.') },
                { name: "THEOMERE'S GAMBIT", desc: _egbtTr('eg_boss_test_bay_final', 'At 10% HP: a 3×3 of districts shows TRUE danger odds — stand on a chip to flip it to its complement (one flip each). Three cast waves strike the true danger districts; survive all three and Bayes CONCEDES — the boss pays its own remaining HP! (charge bar frozen)') },
            ];
        case 'boss_entropy':
            return [
                { name: 'Heat Death Drift', desc: _egbtTr('eg_boss_test_entr_drift', 'All fight: ❄ pools bloom outward and MERGE into bigger ones while lit ORDER ZONES shrink — the only places that keep you crisp. Outside them your movement turns sluggish (never locked). Zone time refills your ORDER meter — spend it by staying crisp!') },
                { name: 'Recursive Decay', desc: _egbtTr('eg_boss_test_entr_decay', 'At 60% HP: cursed cells AGE — every 4s one spreads to a neighbour (max 9). Stand ON a cell to burn it out, but the burn costs you. Triage the pack before it owns the map!') },
                { name: "Maxwell's Door", desc: _egbtTr('eg_boss_test_entr_door', 'At 60% HP: a 🔥 hot and a ❄ cold door spawn at opposite edges — enter one to take its element for 8s. HOT: pools HEAL you (but heat scatters order). COLD: pool-proof (but order drains twice as fast). Choose your poison!') },
                { name: 'THE LAST DEGREE', desc: _egbtTr('eg_boss_test_entr_final', 'At 10% HP: the arena freezes into a perfect lattice and ORDER SHARDS rain — touch each shard so its spark flies to the singularity: every delivered shard pops the boss for 20% of ITS HP! Collect 5 before the timer dies, or HEAT DEATH sweeps everything but the centre! (charge bar frozen)') },
            ];
        case 'boss_laplace':
            return [
                { name: 'Demonstrated Fate', desc: _egbtTr('eg_boss_test_lap_fate', 'All fight: every cast shows a harmless GHOST pre-run ~3s ahead, then the REAL fire lance follows the same path — and pins its ENDPOINT, exactly where the ghost ended. Never stand where the ghost dies! Phase 3 crosses two lances.') },
                { name: 'Conditional Branches', desc: _egbtTr('eg_boss_test_lap_branches', 'At 60% HP: three phantoms walk dashed paths and each plants a future cell — ONE is ✅ real and detonates; the other two are fakes. Stand on a FAKE when it resolves for 2s GHOST-FORM: untouchable, so greed the next lance!') },
                { name: 'Timeline Fray', desc: _egbtTr('eg_boss_test_lap_fray', 'At 60% HP: a 👣 clone walks a recording of YOUR last 6 seconds (path pre-drawn as dots). Touch it and you swap with where it was 2s ago — no damage, just dizzying. Watch the dots!') },
                { name: 'THE CLOSED TIMELINE', desc: _egbtTr('eg_boss_test_lap_final', 'At 10% HP: the same gauntlet loops every 20s with IDENTICAL telegraphs — learn it! Break the ⛓️ timeline node each loop (stand on it); three breaks close the loop and kill the Demon. Failed dodges extend the loop and add a hunting phantom! (charge bar frozen)') },
            ];
        case 'boss_inferno':
            return [
                { name: 'Magma Tides', desc: _egbtTr('eg_boss_test_infv_tides', 'All fight: 🌊 lava floods half the arena in alternating tides (quartered in phase 3) — a heavy DoT. The tide edge leaves COOLING OBSIDIAN TILES that crack in 3 states before sinking: stand on them to cool your HEAT meter, and keep moving — standing still heats you up!') },
                { name: 'Pyroclastic Surge', desc: _egbtTr('eg_boss_test_infv_surge', 'At 60% HP: a wall of fire sweeps the arena with TWO readable gaps — slip through. The ash cloud behind it is pressure, not punish: it just blocks your view.') },
                { name: 'Eruption Vents', desc: _egbtTr('eg_boss_test_infv_vents', 'At 60% HP: three vents telegraph, then JET upward — and the jets leave HEAT HAZE zones that heat you 2.5x faster while inside. Do not linger!') },
                { name: 'SUPERVOLCANIC WINTER', desc: _egbtTr('eg_boss_test_infv_final', 'At 10% HP: the Inferno detonates and the arena FREEZES (fire→ice!). The ice sheet makes you DRIFT (momentum!), magma bombs mark landings, and you must LURE each magma surge into the glowing fissure vents — three lured surges blow the cap and kill the core! (charge bar frozen)') },
            ];
        case 'boss_null':
            return [
                { name: 'Void Lattice', desc: _egbtTr('eg_boss_test_nul_lattice', 'All fight: a star-lattice of 🕸️ void lines covers the arena — standing ON a line is a shadow DoT. Every ~12s the lattice RE-CONTRACTS to a new centre (brief grace window). The safe cells are the triangular gaps — read the lines!') },
                { name: 'Hypothesis Erasure', desc: _egbtTr('eg_boss_test_nul_erasure', 'At 60% HP: the Null ERASES one system for 8s — your clue numbers, your charge bar readout, or your class HUD — with a 🧿 marker on what it took. The info always comes back. Prove you can win with less!') },
                { name: 'Null Rays', desc: _egbtTr('eg_boss_test_nul_rays', 'At 60% HP: 🧿 eye-beams orbit the anchor — crossing one damages you AND CHILLS your charge bar (half fill speed). Stay in the gaps between the gaze!') },
                { name: 'PROOF BY CONTRADICTION', desc: _egbtTr('eg_boss_test_nul_final', 'At 10% HP: the arena turns PURE WHITE and the Null asserts you cannot hit it. Phantoms replay YOUR recent path and strike toward their heading — stand OPPOSITE the strike, near the phantom, to shatter a shell. 3 shells = the hypothesis collapses! Three failures = NULLIFICATION: only the white ring is safe! (charge bar frozen)') },
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
                { name: 'Tornadoes', desc: _egbtTr('eg_boss_test_gust_tornadoes', 'At 75% / 50% / 25% HP: living tornado volleys cross the arena (later volleys return + dive top-down). Leave the swept band entirely — suction drags you in.') }
            ];
        case 'boss_sprout':
            return [
                { name: 'Root Network', desc: _egbtTr('eg_boss_test_sprout_roots', 'All fight: vines root unsolved cells (extra click to prune), spores drift, and Vine Lunge slashes a full-screen band through you.') },
                { name: 'Bramble Wall', desc: _egbtTr('eg_boss_test_sprout_bramble', 'At 60% HP: 10s — outer ring sealed, 4 edge strips + 3 whips lash the arena.') },
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
                { name: 'Darkness', desc: _egbtTr('eg_boss_test_firefly_dark', 'Whole fight in darkness — your 5 fairies are the only light. Outside all light you bleed HP. Command them with F (send), G (cycle), H (recall) or drag.') },
                { name: 'Formation Trials', desc: _egbtTr('eg_boss_test_firefly_trials', 'At 75% LIGHTFALL (1 ring) / 50% SPLIT (2 rings) / 25% SCATTER (a ring per fairy + you): guide every fairy into its ring in time. Boss is immune until the verdict; failures cost fairies.') }
            ];
        case 'boss_marksman':
            return [
                { name: 'Arrow Gauntlet', desc: _egbtTr('eg_boss_test_marksman_gauntlet', 'At 66% (4 single walls) / 33% (12-wave pincer/sweep/finale): the grid seals, boss goes immune, arrow walls with gaps sweep through. Dodge only — gaps always overlap, keep moving.') }
            ];
        case 'boss_dynamo':
            return [
                { name: 'Conductor Network', desc: _egbtTr('eg_boss_test_dynamo_conductors', '🔌 conductors roam (tanky: 18% of boss HP) and wire a beam network + hull field: on beams 0.06%/s, inside the hull 0.10%/s. Kill them to reclaim ground. Pillars add horizontal then diagonal lanes per phase.') }
            ];
        case 'boss_demolitionist':
            return [
                { name: 'Bomb Maze', desc: _egbtTr('eg_boss_test_demolitionist_bomb_maze', 'At ≤25% HP: 5…1 countdown → teleport into a serpentine corridor walled by bombs that detonate behind you. ~1s later a SUPER BOMB slams onto your start and rolls the corridor after you — caught = instant defeat. Outrun it to the 🏁 (charge bar frozen).') }
            ];
        // ── Tier 3 ──
        case 'boss_bumper':
            return [
                { name: 'TILT! Flipper Frenzy', desc: _egbtTr('eg_boss_test_bumper_tilt', 'At 60% HP: 9s — alternating flipper arcs slap the lower arena while bumpers enrage (1.7× speed). Play top/mid.') },
                { name: 'Multiball Rush', desc: _egbtTr('eg_boss_test_bumper_multiball', 'At 30% HP: 6 balls launch from centre, 12s life. Keep moving — flings chain into other bumpers.') }
            ];
        case 'boss_striker':
            return [
                { name: 'Kick-Off Challenge', desc: _egbtTr('eg_boss_test_striker_corners', 'At 60% HP: the homing ball leaves — a resting ball drops on the pitch. Run to it, stand next to it to charge, step away to shoot. Score 1 goal into the edge goal.') },
                { name: 'Hat-Trick', desc: _egbtTr('eg_boss_test_striker_penalty', 'At 30% HP: same kick rules, 3 goals in 60s. The ball rolls out after each shot — chase it and re-kick. Full power needs 1.5s of charge.') }
            ];
        case 'boss_centipede':
            return [
                { name: 'Exoskeleton', desc: _egbtTr('eg_boss_test_centipede_shell', 'At 60% HP: 2 waves × 8 armour plates spiral out from your position. Weave the gaps.') },
                { name: 'Molt', desc: _egbtTr('eg_boss_test_centipede_molt', 'At 30% HP: the tail detaches into a faster mini-centipede. Burrow holes open — lure it over one to bury it for 15s before it resurfaces.') }
            ];
        case 'boss_thwomp':
            return [
                { name: 'Ceiling Collapse', desc: _egbtTr('eg_boss_test_thwomp_collapse', 'At 60% HP: 6–10 rubble marks fall staggered (faster in later phases), each leaving a dust cloud. Clear the rings.') },
                { name: 'Mini-Thwomp Siege', desc: _egbtTr('eg_boss_test_thwomp_siege', 'At 30% HP: 3–5 mini-Thwomps hop-chase for 12s; each telegraphs its own slam. Stay mobile — Grand Slam (charge attack) can hit 34% in the core.') }
            ];
        // ── Tier 4 ──
        case 'boss_dancer':
            return [
                { name: 'Spotlight Steps', desc: _egbtTr('eg_boss_test_dancer_steps', 'All fight: numbered footprints light in rhythm — stand on the lit step in the beat window to heal +8. Miss = zap. The only healing mechanic in the atlas.') },
                { name: 'Curtain Call', desc: _egbtTr('eg_boss_test_dancer_curtain', 'At 60% HP: 5–8 stage drops fall staggered, each leaving a dragging backstage patch.') },
                { name: 'Petal Storm', desc: _egbtTr('eg_boss_test_dancer_petals', 'At 30% HP: 4 waves of shadow petals cross L→R (dodge vertically), plus a permanent drizzle in final phase.') }
            ];
        case 'boss_gambler':
            return [
                { name: 'Wheel of Fortune', desc: _egbtTr('eg_boss_test_gambler_wheel', 'At 60% HP: 4s spin — SNAKE (unavoidable 16%), FREE SPIN (re-spin or forced SNAKE), JACKPOT (boss heals 12%), YOU WIN (you heal 10%).') },
                { name: 'Jackpot Rush', desc: _egbtTr('eg_boss_test_gambler_rush', 'At 30% HP: 8s — 4 waves of casino symbols; every 7️⃣ detonates a coin burst on hit or expiry. Russian Roulette (charge): leave the R110 cylinder before the ticking ends.') }
            ];
        case 'boss_tactician':
            return [
                { name: 'CHECK', desc: _egbtTr('eg_boss_test_tactician_check', 'At 60% HP: 4 rook lanes (2H+2V) dash full-screen staggered. Wait between lanes.') },
                { name: 'Zugzwang', desc: _egbtTr('eg_boss_test_tactician_zugzwang', 'At 30% HP (9s): bishop diagonals sweep through the queen + knights L-leap 4×. Read the board — pawn walls always leave one gap column.') },
                { name: 'Checkmate', desc: _egbtTr('eg_boss_test_tactician_mate', 'Charge attack: 4 castle walls close over 2.6s — get to the CENTER rect, not the edges.') }
            ];
        case 'boss_gourmet':
            return [
                { name: 'Dinner Service', desc: _egbtTr('eg_boss_test_gourmet_dinner', 'At 60% HP: 3 cloches 🍽️ slam your position in sequence, each leaving a grease pool. An eating boss — chomps heal it, don’t get caught.') },
                { name: 'Banquet + Devour', desc: _egbtTr('eg_boss_test_gourmet_devour', 'At 30% HP: 9.5s dessert bombardment. Devour (charge): 1.4s suction → swallow inside R150 (boss heals 2%). Fight the pull, stay out of the ring.') }
            ];
        case 'boss_stack':
            return [
                { name: 'Hard Drop', desc: _egbtTr('eg_boss_test_stack_harddrop', 'At 60% HP: 3 giant blocks fall on your column (touch + shockwave + lingering terrain). Leave the column.') },
                { name: 'Line Clear', desc: _egbtTr('eg_boss_test_stack_lineclear', 'At 30% HP: 4 full-width rows detonate staggered — dodge vertically between rows.') },
                { name: 'Garbage Rise', desc: _egbtTr('eg_boss_test_stack_garbage', 'Charge attack: gray rows flood 55% of the screen. Stay high (top 16% always clear) — standing inside ticks + flings.') }
            ];
        case 'boss_gale':
            return [
                { name: 'Crosswind + Funnels', desc: _egbtTr('eg_boss_test_gale_wind', 'All fight: wind flips L/R every 7s (lean into it) + hunting cyclone funnels burn %HP/s inside. Touching the eye flings you.') },
                { name: 'Tornado Ladder', desc: _egbtTr('eg_boss_test_gale_ladder', 'At 60% HP: 3 twister lanes climb bottom→top staggered. Exit the lanes.') },
                { name: 'Eye of the Storm', desc: _egbtTr('eg_boss_test_gale_eye', 'At 30% HP: 4 rings contract onto the planted eye — you are hit when INSIDE a shrinking ring, so time crossings, don’t just stay out.') }
            ];
        case 'boss_lodestone':
            return [
                { name: 'Magnetic Vortex', desc: _egbtTr('eg_boss_test_lodestone_vortex', 'At 60% HP (4.5s): the stone plants centre and drags you in — grinding within R140. Fight the pull, keep distance.') },
                { name: 'Railgun + Leash', desc: _egbtTr('eg_boss_test_lodestone_railgun', 'At 30% HP: 3 full-screen ⚡ slugs through the stone at your axis. Leash (charge): leave the 44px corridor early, or outrun the 1.6s reel to break free.') }
            ];
        case 'boss_coil':
            return [
                { name: 'Constrictor', desc: _egbtTr('eg_boss_test_coil_constrict', 'At 60% HP: 3–5 rings contract onto your position — stand in the gaps between rings.') },
                { name: 'Serpent Tide', desc: _egbtTr('eg_boss_test_coil_tide', 'At 30% HP: 3 tidal waves of chargers cross at your height. Exit the row vertically; kite seeker snakes away so they detonate elsewhere.') },
                { name: 'Cobra Strike', desc: _egbtTr('eg_boss_test_coil_cobra', 'Charge attack: horizontal H92 lane at your height, 380ms lash. Venom trails tick shadow DoT — don’t stand in them to dodge.') }
            ];
        case 'boss_minotaur':
            return [
                { name: 'Labyrinth Walls', desc: _egbtTr('eg_boss_test_mnt_labyrinth', 'All fight: 5–6 wall slabs rise and hold ~8s, carving the arena into lanes — then the bull charges the open lane at YOUR row. The maze channels the charge; the bull crumbles one wall per rush. Phase 3: double charges per cast!') },
                { name: 'Hooftread Terrain', desc: _egbtTr('eg_boss_test_mnt_hoof', 'At 60% HP: hoof craters stamp down the lane in sequence and plant lingering hoofprints, while a DUST STORM trails the charge lane. The maze accumulates burn terrain the longer the duel runs!') },
                { name: 'Thread of Ariadne', desc: _egbtTr('eg_boss_test_mnt_thread', 'At 60% HP: a glowing thread marks the ONE SAFE LANE — honest, and bait. Hold it once for a heal; it frays, snaps and re-forms elsewhere. Travel through it, never live in it!') },
                { name: "THE WARDEN'S LABYRINTH", desc: _egbtTr('eg_boss_test_mnt_final', 'At 10% HP: three wall generations rise while the Warden charges each TWICE — body-check the glowing MAZEWALL STONES 3× each to shatter them. Then the TRAMPLE runs EVERY lane at once: only shattered lanes are safe! (charge bar frozen)') },
            ];
        case 'boss_barrage':
            return [
                { name: 'Shelling Curtain', desc: _egbtTr('eg_boss_test_bar_curtain', 'All fight: a creeping wall of shell splashes sweeps the arena — the telegraph stays visible while it rolls, so fight INSIDE the barrage and clear cells between shell lines. Phase 3: the curtain also comes from the top — fight the diagonal!') },
                { name: 'Supply Drop', desc: _egbtTr('eg_boss_test_bar_supply', 'At 60% HP: cargo crates crash down and flip open into artillery JAMMERS that lob slow mortar shells at your last position. Step into a crate to SMASH it (+15% maxHP heal) before it digs in!') },
                { name: 'Shot Shells', desc: _egbtTr('eg_boss_test_bar_shells', 'At 60% HP: heavy shells fall on telegraphed rings (most aim near where you are) and each burst scatters six hot shrapnel spokes that keep travelling. Read the ring AND the fragment lanes!') },
                { name: 'FINAL BOMBARDMENT', desc: _egbtTr('eg_boss_test_bar_final', 'At 10% HP: the whole arena becomes the target zone — three full-screen shelling grids with two safe gaps each, then the ALL-OUT SALVO detonates everything except ONE safe tile. Reach it! (charge bar frozen)') },
            ];
        case 'boss_bloom':
            return [
                { name: 'Scarlet Blooms', desc: _egbtTr('eg_boss_test_blm_blooms', 'All fight: flowers open where you STAND — the marker TRACKS you until it freezes, then bursts. Every bloom plants a ROT GARDEN: a sweeping stamen beam, a burn floor, and one CRITICAL MASS burst whose seed pods plant NEW gardens. Untended, the garden takes over! Phase 3: blooms chase in converging pairs!') },
                { name: 'Seed Volley', desc: _egbtTr('eg_boss_test_blm_volley', 'At 60% HP: three seed pods arc across the arena and plant three fresh rot gardens in a line toward you — the garden is coming to YOU. Interrupt the march by standing where they land? No — move!') },
                { name: 'Withering Bloom', desc: _egbtTr('eg_boss_test_blm_veil', 'At 60% HP (once): the puzzle grid hides behind a blooming veil — every cell you FILL wilts it (visible thinning), every mistake REGROWS it. The puzzle is the pruning!') },
                { name: 'FULMINATION', desc: _egbtTr('eg_boss_test_blm_final', 'At 10% HP: the boss blooms from EVERY direction — petal-chains crawl along radial lanes while a judgment-bloom stamps your position. Each dodge carves a SCAR; three scars open the ONE TRUE GAP, and THE LAST BLOOM detonates everything outside it! (charge bar frozen)') },
            ];
        case 'boss_overfitter':
            return [
                { name: 'Gradient Descent', desc: _egbtTr('eg_boss_test_ovr_gradient', 'All fight: training steps march across the arena as hot gradient bands — a shadow DoT inside. The sweep ends with a LOCAL MINIMUM that locks where you stood and detonates; Phase 3: a second minimum chases your CURRENT position!') },
                { name: 'Pattern Lock', desc: _egbtTr('eg_boss_test_ovr_lock', 'At 60% HP: the model RECORDS your movement (the dashed trail is live) then REPLAYS it — a spike walks your exact path, detonating echoes at every step and an OVERFIT STRIKE where you stopped. Take no hit and you are UNLEARNED (+heal)!') },
                { name: 'Validation Set', desc: _egbtTr('eg_boss_test_ovr_valid', 'At 60% HP: two rings, one test — the model detonates the ring you are CLOSEST to. Break equidistance or get near neither and it UNDERFITS: nothing detonates at all!') },
                { name: 'THE FINAL EPOCH', desc: _egbtTr('eg_boss_test_ovr_final', 'At 10% HP: the whole fight was training data — your ACTUAL position history renders as a heat-map, then re-trains in three waves. Hot cells detonate, cool cells are safe, and it RE-RECORDS between waves. New ground is safe ground! (charge bar frozen)') },
            ];
        case 'boss_razor':
            return [
                { name: 'Blade Cyclone', desc: _egbtTr('eg_boss_test_rzr_cyclone', 'All fight: a fan of boomerangs flies out, wheels around, and returns along CURVED arcs that cross each other — dodge the throw, then read the crossfire home. Phase 3: a second fan launches while the first is still returning!') },
                { name: 'Razor Wire Lattice', desc: _egbtTr('eg_boss_test_rzr_wires', 'At 60% HP: taut wires snap across the arena — lightning DoT on contact, then they SNAP and the cut ends whip outward. Path between the wires and LEAVE the line before it dies! Phase 3: five wires, one already taut.') },
                { name: 'Hone and Cast', desc: _egbtTr('eg_boss_test_rzr_hone', 'At 60% HP: the whetstone grinds a GIANT SCYTHE (grind aura chips you) — body-check the stone 2× to shatter it (+12% maxHP heal) and CANCEL the cast, or the scythe crosses the whole arena at your row. Phase 3: it comes back the other way!') },
                { name: 'A THOUSAND EDGES', desc: _egbtTr('eg_boss_test_rzr_final', 'At 10% HP: nine razor spokes rotate around the centre and REVERSE every few seconds — rim fans shave across the middle each reversal. Survive three cycles for THE LAST EDGE: one full-screen scythe with a single safe pocket (the grind aura) that CHIPS you to stand in! (charge bar frozen)') },
            ];
        default:
            return [];
    }
}

// Test HP boost: scales boss to ~500k max HP while keeping phase thresholds
// and damage unchanged.
function _egbtCalcTestHPMultiplier(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const targetHP = 500000;
    return preview.hp > 0 ? targetHP / preview.hp : 1;
}

// Shows the boss tooltip on mouseenter.
function _egbtShowTooltip(cardEl, e) {
    const bossId = cardEl.dataset.bossId;
    const level = Number(cardEl.dataset.bossLevel);
    if (!bossId || !level) return;
    const def = (typeof EG_BOSS_DEFS !== 'undefined') ? EG_BOSS_DEFS[bossId] : null;
    if (!def) return;
    const html = _egbtBuildBossTooltipHTML(def, level);
    if (html) showGameTooltip(html, e);
}

// Toggles the 500k HP test mode checkbox. Rebinds the card and Fight
// button handlers so the launch carries the boost (or drops it again on
// uncheck). Handlers are real functions, not string attributes, so the
// rebind works identically in every environment.
function _egbtToggleTestHP(checkbox, bossId, level, hpMult) {
    const card = checkbox.closest('.egbt-boss-card');
    if (!card) return;
    const newHpMult = checkbox.checked ? hpMult : 1;
    card.onclick = (ev) => {
        if (ev.target.closest('button')) return;   // Fight button handles itself
        _egLaunchBossTest(bossId, level, newHpMult);
    };
    const btn = card.querySelector('.egbt-fight-btn');
    if (btn) {
        btn.onclick = (ev) => {
            ev.stopPropagation();
            _egLaunchBossTest(bossId, level, newHpMult);
        };
    }
    const statsEl = card.querySelector('.egbt-boss-stats');
    if (statsEl) {
        const def = (typeof EG_BOSS_DEFS !== 'undefined') ? EG_BOSS_DEFS[bossId] : null;
        if (def) {
            const p = _egbtScaledPreview(def, level);
            const hp = checkbox.checked ? Math.round(p.hp * hpMult) : p.hp;
            // Test boost only scales HP — damage stays at its normal value.
            statsEl.textContent = `Lv ${level} · ❤️ ${hp} · 🗡️ ${p.dmg}`;
        }
    }
}


//------------------------------------------------------------------------
//-------------------GODMODE DEBUG TOGGLE----------------------------------
//------------------------------------------------------------------------
// Proper UI switch for the damage-immune debug flag window._egGodMode
// (honoured at the top of _egPlayerTakeDamage). Lives in the boss-test
// settings bar, persists per browser so the state survives screen changes,
// and a fixed HUD chip shows "GODMODE ON" wherever you are — no console
// access needed. The chip also guards against accidentally leaving it on
// during a real map run.
let _egbtGodModeOn = false;


// Applies the flag, persists it, and re-syncs every godmode UI element.
function _egbtApplyGodMode(on) {
    _egbtGodModeOn = !!on;
    window._egGodMode = _egbtGodModeOn;
    try { localStorage.setItem('_egbtGodMode', _egbtGodModeOn ? '1' : '0'); } catch (e) {}
    _egbtSyncGodModeUI();
}


// Restores the persisted state (called when the boss-test screen opens and
// once at script load, so the chip is correct even outside the screen).
function _egbtInitGodMode() {
    let on = false;
    try { on = localStorage.getItem('_egbtGodMode') === '1'; } catch (e) {}
    _egbtApplyGodMode(on);
}


// Checkbox handler (inline onchange).
function _egbtToggleGodMode(checkbox) {
    _egbtApplyGodMode(checkbox && checkbox.checked);
}


// Keeps every godmode UI element in sync: the settings checkbox + state
// badge on the boss-test screen, and the always-visible in-game chip.
function _egbtSyncGodModeUI() {
    const on = _egbtGodModeOn;
    document.querySelectorAll('.egbt-godmode-checkbox').forEach(cb => { cb.checked = on; });
    const badge = document.getElementById('egbt-godmode-badge');
    if (badge) {
        badge.textContent = on ? t('eg_boss_test_godmode_on') : t('eg_boss_test_godmode_off');
        badge.classList.toggle('egbt-godmode-on', on);
    }
    let chip = document.getElementById('egbt-godmode-chip');
    if (on) {
        if (!chip) {
            chip = document.createElement('div');
            chip.id = 'egbt-godmode-chip';
            chip.textContent = '🛡️ ' + t('eg_boss_test_godmode_on');
            document.body.appendChild(chip);
        }
    } else if (chip) {
        chip.remove();
    }
}


//------------------------------------------------------------------------
//-------------------ARENA SEED PICK--------------------------------------
//------------------------------------------------------------------------

// Picks a small generated puzzle for the test arena. Falls back to a
// small story puzzle when generation is unavailable.
function _egbtPickArenaGi() {
    if (typeof _egCreateGeneratedLevel === 'function') {
        const gi = _egCreateGeneratedLevel({
            mode: 'mixed',
            tier: 1,
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            minCells: EG_BOSS_TEST_ARENA_MIN_CELLS,
        });
        if (gi !== null) return gi;
    }

    if (typeof _egBuildChainPool === 'function') {
        let pool = _egBuildChainPool({
            maxRows: EG_BOSS_TEST_ARENA_MAX_ROWS,
            maxCols: EG_BOSS_TEST_ARENA_MAX_COLS,
            avoidRecent: false,
        });
        if (typeof isGatedLevel === 'function') {
            pool = pool.filter(level => !isGatedLevel(level.gIdx));
        }
        if (pool.length > 0) {
            return pool[Math.floor(Math.random() * pool.length)].gIdx;
        }
    }

    return null;
}


//------------------------------------------------------------------------
//-------------------LAUNCH------------------------------------------------
//------------------------------------------------------------------------

// Starts a single-boss test fight. Called from a boss card's onclick.
// Falls back to the boss's tier level when no explicit level is passed.
// hpMult: optional multiplier applied to boss max HP only (e.g., ~500k HP
// test mode). Damage is left at its normal scaled value.
function _egLaunchBossTest(bossId, level, hpMult) {
    if (typeof EG_BOSS_DEFS === 'undefined' || !EG_BOSS_DEFS[bossId]) return;

    const lvl = Math.max(1, Math.min(95, Math.round(level != null ? level : _egbtLevelForBoss(bossId))));
    const boost = hpMult && hpMult > 1 ? hpMult : 1;

    const gi = _egbtPickArenaGi();
    if (gi === null) {
        if (typeof showToast === 'function') showToast(t('eg_no_more_puzzles'));
        return;
    }

    const seed = ALL[gi];
    seed.isMonsterLevel = true;
    seed.isBossTestSeed = true;
    seed.isBossArena = true;
    window._egBossTestSeedGi = gi;

    seed.monsterLevel = lvl;
    seed.maxMonsters = 0;
    seed.totalMonsters = 0;
    seed.hasBoss = true;
    seed.bosses = [{ id: bossId, level: lvl, hpMult: boost }];
    seed.maxBosses = 1;
    seed.requiredPuzzles = 0;
    seed.requiredQuestions = 0;
    seed.puzzlePool = {};
    seed.egTimeLimit = EG_BOSS_TEST_TIME_LIMIT;
    delete seed.egMaxMistakes;      // unlimited mistakes while testing

    // Routes forfeit-via-levels-button back to this screen
    // (see goToLevelSelect in screens.js).
    window._egIsBossTestRun = true;

    // Lose-overlay hardening so every defeat path inside the test is
    // covered (same call the map device makes on launch).
    if (typeof _egEnsureLoseOverlayEndgameUI === 'function') {
        try { _egEnsureLoseOverlayEndgameUI(); } catch (e) {}
    }

    window._egBossTestLaunching = true;
    try {
        startLevel(gi);
    } finally {
        window._egBossTestLaunching = false;
    }

    // Spawn the chosen boss straight onto this arena — no extra arena
    // transition. _egMapDef is already `cur` (set by _egResetEncounterState).
    // hpMult rides the queue entry so _egSpawnNextArenaBoss applies the
    // 500k test boost to the spawned boss (entry.hpMult || 1).
    _egBossPhaseQueue = [{ id: bossId, level: lvl, hpMult: boost, isBossSpawn: true }];
    _egBossTotalCount = 1;
    _egBossKilledCount = 0;
    _egBossPhaseActive = true;

    if (typeof _egUpdateObjectivesHUD === 'function') _egUpdateObjectivesHUD();
    if (typeof _egSpawnNextArenaBoss === 'function') _egSpawnNextArenaBoss();
}


//------------------------------------------------------------------------
//-------------------SCALED STAT PREVIEW----------------------------------
//------------------------------------------------------------------------

// Side-effect-free preview of a boss's HP at the test level. Mirrors the
// scaling formula in _egBuildBoss (boss-framework.js) without touching
// the spawn counter.
function _egbtScaledPreview(def, level) {
    const lvl = Math.max(1, Math.round(level || 1));
    const baseHpScale = 1 + EG_BOSS_LEVEL_HP_SCALE * (lvl - 1);
    const lateMult = (typeof _egGetBossLateHpMult === 'function') ? _egGetBossLateHpMult(lvl) : 1;
    const dmgScale = 1 + EG_BOSS_LEVEL_DAMAGE_SCALE * (lvl - 1);
    return {
        hp: Math.round(def.baseHP * baseHpScale * lateMult),
        dmg: Math.round(def.baseDamage * dmgScale),
    };
}


//------------------------------------------------------------------------
//-------------------HTML BUILDERS------------------------------------------
//------------------------------------------------------------------------

function _egbtBossIconHTML(def) {
    // Real boss art when it exists (see images/endgame/monsters/boss_*.jpeg),
    // otherwise the emoji fallback — same helper the arena cards use.
    if (typeof EG_ART !== 'undefined' && EG_ART.html) return EG_ART.html('monster', def.id, def.emoji || '💀');
    return def.emoji || '💀';
}

function _egbtBuildBossCardHTML(def, level) {
    const preview = _egbtScaledPreview(def, level);
    const safeName = String(def.name || def.id).replace(/"/g, '"');
    const hpMult = _egbtCalcTestHPMultiplier(def, level);
    return `
<div class="egbt-boss-card" data-boss-id="${def.id}" data-boss-level="${level}"
     onmouseenter="_egbtShowTooltip(this, event)"
     onmousemove="moveGameTooltip(event)"
     onmouseleave="hideGameTooltip()"
     onclick="_egLaunchBossTest('${def.id}', ${level})"
     title="${safeName}">
    <div class="egbt-boss-emoji">${_egbtBossIconHTML(def)}</div>
    <div class="egbt-boss-name">${def.name || def.id}</div>
    <div class="egbt-boss-stats">Lv ${level} · ❤️ ${preview.hp} · 🗡️ ${preview.dmg}</div>
    <div class="egbt-boss-id">${def.id}</div>
    <label class="egbt-test-hp-label"
           onmousedown="event.stopPropagation()"
           onclick="event.stopPropagation();">
        <input type="checkbox" class="egbt-test-hp-checkbox"
               onmousedown="event.stopPropagation()"
               onclick="event.stopPropagation();"
               onchange="_egbtToggleTestHP(this, '${def.id}', ${level}, ${hpMult})">
        <span>${t('eg_boss_test_500k_hp')}</span>
    </label>
    <button class="title-btn egbt-fight-btn"
            onclick="event.stopPropagation(); _egLaunchBossTest('${def.id}', ${level})">
        ${t('eg_boss_test_fight')}
    </button>
</div>`;
}

// Groups boss defs into tier sections (1–16, then unassigned as tier 0),
// honouring the search query. Empty tiers are omitted.
function _egbtBuildSections() {
    const all = (typeof EG_BOSS_DEFS !== 'undefined') ? Object.values(EG_BOSS_DEFS) : [];
    const query = String(window._egBossTestSearch || '').trim().toLowerCase();
    const matches = def => !query
        || String(def.name || '').toLowerCase().includes(query)
        || String(def.id || '').toLowerCase().includes(query);
    const byName = (a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id));

    // Resolve each boss's tier once — the roster scan is O(regions).
    const tierOf = {};
    all.forEach(def => { tierOf[def.id] = _egbtBossTier(def.id); });

    const sections = [];
    for (let tier = 1; tier <= 16; tier++) {
        const defs = all.filter(def => tierOf[def.id] === tier && matches(def)).sort(byName);
        if (defs.length > 0) sections.push({ tier, defs });
    }
    const unassigned = all.filter(def => tierOf[def.id] === 0 && matches(def)).sort(byName);
    if (unassigned.length > 0) sections.push({ tier: 0, defs: unassigned });
    return sections;
}

function _egbtBuildSectionHTML(section) {
    const level = section.tier > 0 ? _egbtTierMonsterLevel(section.tier) : EG_BOSS_TEST_DEFAULT_LEVEL;
    const title = section.tier > 0
        ? `${t('eg_boss_test_tier').replace('{n}', section.tier)} · ${t('eg_boss_test_tier_level').replace('{lv}', level)}`
        : t('eg_boss_test_unassigned');
    return `
<div class="egbt-tier-section">
    <div class="egbt-tier-header">${title}</div>
    <div class="egbt-boss-grid">${section.defs.map(def => _egbtBuildBossCardHTML(def, level)).join('')}</div>
</div>`;
}

function _egbtRenderGrid() {
    const container = document.getElementById('egbt-boss-grid');
    if (!container) return;
    const sections = _egbtBuildSections();
    const total = sections.reduce((sum, s) => sum + s.defs.length, 0);
    container.innerHTML = total > 0
        ? sections.map(_egbtBuildSectionHTML).join('')
        : `<div class="egbt-empty">${t('eg_boss_test_no_bosses')}</div>`;
    const count = document.getElementById('egbt-count');
    if (count) count.textContent = t('eg_boss_test_count').replace('{n}', total);
}

function _egbtBuildFullScreenHTML() {
    return `
<div class="egbt-hub-layout">
    <div class="egbt-topbar">
        <button class="title-btn back-btn" onclick="showEndgameNexus()">${t('btn_back')}</button>
        <span class="egbt-topbar-title">${t('eg_boss_test_title')}</span>
        <span class="egbt-count" id="egbt-count"></span>
    </div>
    <div class="egbt-controls">
        <input class="egbt-search" id="egbt-search" type="text"
            placeholder="${t('eg_boss_test_search_placeholder')}"
            oninput="window._egBossTestSearch=this.value;_egbtRenderGrid()">
        <label class="egbt-godmode-label" title="${t('eg_boss_test_godmode_hint')}">
            <input type="checkbox" class="egbt-godmode-checkbox"
                onchange="_egbtToggleGodMode(this)">
            <span>${t('eg_boss_test_godmode')}</span>
        </label>
        <span class="egbt-godmode-badge" id="egbt-godmode-badge"></span>
    </div>
    <div class="egbt-hint">${t('eg_boss_test_hint')}</div>
    <div class="egbt-boss-sections" id="egbt-boss-grid"></div>
</div>`;
}


//------------------------------------------------------------------------
//-------------------STYLES (INJECTED ONCE)---------------------------------
//------------------------------------------------------------------------
// Injected via JS, same pattern as _egtEnsureStyles() in
// endgame-testing-screen.js — avoids needing to touch the main CSS files.

function _egbtEnsureStyles() {
    if (document.getElementById('egbt-boss-test-style')) return;

    const style = document.createElement('style');
    style.id = 'egbt-boss-test-style';
    style.textContent = `
        .egbt-hub-layout {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            padding: 16px; box-sizing: border-box; font-family: var(--PX, monospace);
            color: var(--accent2, #e8daef); overflow-y: auto;
        }
        .egbt-topbar {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 12px; flex-wrap: wrap;
        }
        .egbt-topbar-title { font-size: 16px; letter-spacing: 2px; color: var(--accent, #c8a84b); }
        .egbt-count { font-size: 11px; opacity: 0.7; }
        .egbt-controls {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 8px; flex-wrap: wrap;
        }
        .egbt-search {
            font-family: inherit; font-size: 12px; padding: 7px 10px;
            background: rgba(0,0,0,0.4); color: var(--accent2, #e8daef);
            border: 1px solid var(--border2, #444); border-radius: 4px;
            min-width: 220px;
        }
        .egbt-search:focus { border-color: var(--accent, #c8a84b); outline: none; }
        .egbt-hint { font-size: 10px; opacity: 0.6; margin-bottom: 12px; line-height: 1.5; }
        .egbt-boss-sections { display: flex; flex-direction: column; gap: 18px; }
        .egbt-tier-header {
            font-size: 13px; letter-spacing: 2px; color: var(--accent, #c8a84b);
            border-bottom: 1px solid var(--accent, #c8a84b);
            padding-bottom: 5px; margin-bottom: 10px;
        }
        .egbt-boss-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 12px;
        }
        .egbt-boss-card {
            background: rgba(20, 15, 5, 0.6); border: 1px solid var(--accent, #c8a84b);
            border-radius: 6px; padding: 12px; cursor: pointer;
            display: flex; flex-direction: column; align-items: center; gap: 5px;
            text-align: center;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .egbt-boss-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 14px rgba(200, 168, 75, 0.35);
        }
        .egbt-boss-emoji { font-size: 30px; }
        .egbt-boss-emoji img.eg-art-img {
            width: 64px; height: 64px;
            object-fit: cover; border-radius: 8px;
        }
        .egbt-boss-name { font-size: 12px; color: var(--accent, #c8a84b); }
        .egbt-boss-stats { font-size: 10px; opacity: 0.85; }
        .egbt-boss-id { font-size: 9px; opacity: 0.45; word-break: break-all; }
        .egbt-fight-btn { margin-top: 6px; font-size: 10px; padding: 6px 12px; }
        .egbt-test-hp-label {
            display: flex; align-items: center; gap: 4px;
            margin-top: 6px; font-size: 9px; cursor: pointer;
            color: var(--accent2, #ccc); opacity: 0.8;
        }
        .egbt-test-hp-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: var(--accent, #c8a84b);
        }
        .egbt-godmode-label {
            display: flex; align-items: center; gap: 4px;
            font-size: 10px; cursor: pointer; color: var(--accent2, #ccc); opacity: 0.85;
        }
        .egbt-godmode-label input[type="checkbox"] {
            width: 12px; height: 12px; accent-color: #4ade80;
        }
        .egbt-godmode-badge {
            font-size: 9px; letter-spacing: 1px; padding: 2px 8px;
            border-radius: 8px; border: 1px solid var(--border2, #444);
            color: var(--accent2, #888); opacity: 0.6;
        }
        .egbt-godmode-badge.egbt-godmode-on {
            color: #4ade80; border-color: rgba(74, 222, 128, 0.6); opacity: 1;
            box-shadow: 0 0 8px rgba(74, 222, 128, 0.35);
        }
        #egbt-godmode-chip {
            position: fixed; top: 10px; right: 12px; z-index: 20000;
            pointer-events: none; font-size: 11px; letter-spacing: 1px;
            padding: 6px 12px; border-radius: 6px;
            background: rgba(6, 40, 22, 0.88); border: 1px solid #4ade80; color: #4ade80;
            box-shadow: 0 0 14px rgba(74, 222, 128, 0.45);
            animation: egbt-godmode-chip-pulse 1.4s ease-in-out infinite alternate;
        }
        @keyframes egbt-godmode-chip-pulse {
            from { box-shadow: 0 0 8px rgba(74, 222, 128, 0.35); }
            to { box-shadow: 0 0 18px rgba(74, 222, 128, 0.7); }
        }
        .egbt-empty { font-size: 12px; opacity: 0.6; grid-column: 1 / -1; text-align: center; padding: 24px; }
        .egbt-topbar .title-btn, .egbt-fight-btn {
            font-family: var(--PX, monospace);
            font-size: 10px;
            letter-spacing: 1px;
            background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            border: 1px solid var(--border2, #444);
            color: var(--accent2, #ccc);
            padding: 8px 16px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.12s;
        }
        .egbt-topbar .title-btn:hover, .egbt-fight-btn:hover {
            border-color: var(--accent, #c8a84b);
            color: var(--accent, #c8a84b);
            background: linear-gradient(180deg, rgba(200,168,75,0.12), rgba(0,0,0,0.25)), var(--surface, #1a1a2e);
            box-shadow: 0 0 10px rgba(200, 168, 75, 0.25);
        }
        .egbt-topbar .title-btn:active, .egbt-fight-btn:active {
            transform: translateY(1px);
            box-shadow: none;
        }
     `;
    document.head.appendChild(style);
}


//------------------------------------------------------------------------
//-------------------SCREEN BOOTSTRAP----------------------------------------
//------------------------------------------------------------------------

function _egbtCreateScreen() {
    _egbtEnsureStyles();
    const screen = document.createElement('div');
    screen.id = 'screen-endgame-boss-test';
    screen.className = 'screen';
    screen.innerHTML = _egbtBuildFullScreenHTML();
    document.body.appendChild(screen);
}

function ensureEndgameBossTestScreen() {
    if (!document.getElementById('screen-endgame-boss-test')) _egbtCreateScreen();
}

// Entry point — call this to show the boss selection screen.
function showEndgameBossTest() {
    ensureEndgameBossTestScreen();
    // Rebuild the shell so stale tier content is dropped, keeping the
    // search box for a fresh pick.
    const screen = document.getElementById('screen-endgame-boss-test');
    if (screen) {
        const keepSearch = window._egBossTestSearch || '';
        screen.innerHTML = _egbtBuildFullScreenHTML();
        const searchEl = document.getElementById('egbt-search');
        if (searchEl && keepSearch) {
            searchEl.value = keepSearch;
            window._egBossTestSearch = keepSearch;
        } else {
            window._egBossTestSearch = '';
        }
    }
    switchScreen('screen-endgame-boss-test');
    _egbtRenderGrid();
    // Restore + re-apply the persisted godmode toggle (checkbox, badge, chip).
    _egbtInitGodMode();
}


// Apply the persisted godmode flag at script load so the HUD chip is correct
// even before the boss-test screen is ever opened.
_egbtInitGodMode();
