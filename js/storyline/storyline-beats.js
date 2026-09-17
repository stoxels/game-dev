import { STOX_INTRO_SONG } from './storyline-intro-stox.js';
import { SYLA_INTRO_SONG } from './storyline-intro-syla.js';
import { TRIX_INTRO_SONG } from './storyline-intro-trix.js';
import { INTRO_SONG } from './storyline-intro.js';

// =============================================================================
// storyline-beats.js - The Cartographers of Chance
// ---------------------------------------------------------------------------
// STORY_BEATS - registry of every story beat, keyed by beatId, passed to
// showBeat(beatId, options). Live callers: ui-events.js (opening cinematic
// + Replay gallery) and character-select.js (character intros). The region
// trigger in scoring.js's checkWin() is parked until region media lands.
// =============================================================================

// ---------------------------------------------------------------------------
// STORY BEATS
// ---------------------------------------------------------------------------

export const STORY_BEATS = {

    // -------------------------------------------------------------------------
    // OPENING FLOW - image slideshow cinematic
    // -------------------------------------------------------------------------

    intro_cinematic: {
        song: INTRO_SONG
    },

    // -------------------------------------------------------------------------
    // CHARACTER INTROS - pass { character: 'stox' | 'trix' | 'syla' }
    // -------------------------------------------------------------------------

    character_intro: {
        characterVariants: {
            stox: {
                song: STOX_INTRO_SONG
            },
            trix: {
                song: TRIX_INTRO_SONG
            },
            syla: {
                song: SYLA_INTRO_SONG
            }
        }
    },

};


// ---------------------------------------------------------------------------
// REGION BEAT TRIGGER LEVELS
// ---------------------------------------------------------------------------
// Maps world number -> 1-based level index (li) whose FIRST clear fires that
// world's region_N beat (trigger in scoring.js's checkWin() is parked). Fill
// values per world once level design/pacing is final; must not exceed the
// world's level count in level-world-data.js.
// ---------------------------------------------------------------------------
export const REGION_BEAT_TRIGGER_LEVEL = {

    /*

    1: 2,   // Probability Peaks
    2: 2,   // Distribution Den
    3: 2,   // Sampling Savanna
    4: 2,   // Vortex of Possibilities
    5: 2,   // Regression Rift
    6: 2,   // Frequency Forest
    7: 2,   // Stochapolis
    8: 2,   // Hypothesis Hinterlands
    9: 2,   // Data Delta
    10: 2,  // Parameter Plains
    11: 2,  // Null Hypothesis Void
    12: 2,  // Bayesian Bay
    13: 2,  // Expectation Plateau

    */
};


// ---------------------------------------------------------------------------
// REGION ENTRY BEATS - each fires once on the first clear of its trigger
// level, rendered as a 5-clip video sequence with accumulating captions
// (clip shape + playback rules: see the video-beat docs in storyline-engine.js).
//
// AUDIO IS PER-CLIP: each clip's `audio` file starts with that clip and stops
// when the next one starts (_playClip/_stopClipAudio) - never one narration.ogg
// for the whole sequence. Clips are ~8s each; gapAfterMs on clips 1-4 holds the
// end frame a beat, the last clip's gap is ignored. Caption lines are sized
// ~18-22 words (~7-7.5s spoken) to fit inside a clip. Playback need not finish
// inside the ~40s: after the last clip the frame freezes while captions continue
// (_onClipEnded). CAPTION TIMING IS MANUAL: [translationKey, startMs] pairs,
// startMs measured from the start of the whole sequence (see _captions below);
// the numbers here are word-count starting points (~165 wpm) - adjust by hand
// once narration exists. region_1's audio exists; videos still pending.
//
// World order is locked: 1 Probability Peaks ... 13 Expectation Plateau,
// 14 the Nexus (interlude world, 0-based NEXUS_WORLD_INDEX 13 in levels.js).
// ---------------------------------------------------------------------------

// Converts [translationKey, startMs] pairs into the { textKey, start }
// objects the engine expects; keys resolve via t() at display time (so a
// mid-session language switch applies on the next playback). This is the
// only place caption timing is decided: startMs is when the line appears,
// in ms from the start of the whole sequence, independent of clip audio.
export function _captions(entries) {
    return entries.map(([key, start]) => ({ textKey: key, start }));
}

// Builds a standard 5-clip sequence for a region, generating placeholder
// paths of the form video/Regions/region_N_partX.mp4 with matching
// audio/Regions/region_N_partX_audio.ogg (per-clip audio swap: _playClip).
// Swap in real filenames once they exist - or replace a region's whole
// `clips` array if its part count/naming differs (omit `audio` for a silent
// clip). Each clip is ~8s; its caption line is sized ~18-22 words so the
// voiceover finishes with headroom instead of leaving silence over video.
export function _regionClips(n) {
    return [
        { videoFile: `video/Regions/region_${n}_part1.mp4`, audio: `audio/Regions/region_${n}_part1_audio.ogg`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part2.mp4`, audio: `audio/Regions/region_${n}_part2_audio.ogg`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part3.mp4`, audio: `audio/Regions/region_${n}_part3_audio.ogg`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part4.mp4`, audio: `audio/Regions/region_${n}_part4_audio.ogg`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part5.mp4`, audio: `audio/Regions/region_${n}_part5_audio.ogg` } // last clip - gapAfterMs ignored
    ];
}

// === ACT 1 - "Something Is Wrong Here" (1-5) ===
// Damage reads as environmental, accidental, passive. No one suspects intent.

STORY_BEATS.region_1 = {
    video: {
        clips: _regionClips(1),
        captions: _captions([
            ['st_r1_c1', 0],
            ['st_r1_c2', 8000],
            ['st_r1_c3', 16000],
            ['st_r1_c4', 24000],
            ['st_r1_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_2 = {
    video: {
        clips: _regionClips(2),
        captions: _captions([
            ['st_r2_c1', 0],
            ['st_r2_c2', 8000],
            ['st_r2_c3', 16000],
            ['st_r2_c4', 24000],
            ['st_r2_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_3 = {
    video: {
        clips: _regionClips(3),
        captions: _captions([
            ['st_r3_c1', 0],
            ['st_r3_c2', 8000],
            ['st_r3_c3', 16000],
            ['st_r3_c4', 24000],
            ['st_r3_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_4 = {
    video: {
        clips: _regionClips(4),
        captions: _captions([
            ['st_r4_c1', 0],
            ['st_r4_c2', 8000],
            ['st_r4_c3', 16000],
            ['st_r4_c4', 24000],
            ['st_r4_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_5 = {
    video: {
        clips: _regionClips(5),
        captions: _captions([
            ['st_r5_c1', 0],
            ['st_r5_c2', 8000],
            ['st_r5_c3', 16000],
            ['st_r5_c4', 24000],
            ['st_r5_c5', 32000]
        ]),
    }
};

// === ACT 2 - "Someone Did This" (6-9) ===
// Tone shifts from passive damage to active, deliberate sabotage.

STORY_BEATS.region_6 = {
    video: {
        clips: _regionClips(6),
        captions: _captions([
            ['st_r6_c1', 0],
            ['st_r6_c2', 8000],
            ['st_r6_c3', 16000],
            ['st_r6_c4', 24000],
            ['st_r6_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_7 = {
    video: {
        clips: _regionClips(7),
        captions: _captions([
            ['st_r7_c1', 0],
            ['st_r7_c2', 8000],
            ['st_r7_c3', 16000],
            ['st_r7_c4', 24000],
            ['st_r7_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_8 = {
    video: {
        clips: _regionClips(8),
        captions: _captions([
            ['st_r8_c1', 0],
            ['st_r8_c2', 8000],
            ['st_r8_c3', 16000],
            ['st_r8_c4', 24000],
            ['st_r8_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_9 = {
    video: {
        clips: _regionClips(9),
        captions: _captions([
            ['st_r9_c1', 0],
            ['st_r9_c2', 8000],
            ['st_r9_c3', 16000],
            ['st_r9_c4', 24000],
            ['st_r9_c5', 32000]
        ]),
    }
};

// === ACT 3 - The Reveal and Climax (10-13 + Nexus) ===

STORY_BEATS.region_10 = {
    video: {
        clips: _regionClips(10),
        captions: _captions([
            ['st_r10_c1', 0],
            ['st_r10_c2', 8000],
            ['st_r10_c3', 16000],
            ['st_r10_c4', 24000],
            ['st_r10_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_11 = {
    video: {
        clips: _regionClips(11),
        captions: _captions([
            ['st_r11_c1', 0],
            ['st_r11_c2', 8000],
            ['st_r11_c3', 16000],
            ['st_r11_c4', 24000],
            ['st_r11_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_12 = {
    video: {
        clips: _regionClips(12),
        captions: _captions([
            ['st_r12_c1', 0],
            ['st_r12_c2', 8000],
            ['st_r12_c3', 16000],
            ['st_r12_c4', 24000],
            ['st_r12_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_13 = {
    video: {
        clips: _regionClips(13),
        captions: _captions([
            ['st_r13_c1', 0],
            ['st_r13_c2', 8000],
            ['st_r13_c3', 16000],
            ['st_r13_c4', 24000],
            ['st_r13_c5', 32000]
        ]),
    }
};

STORY_BEATS.region_14 = {
    video: {
        clips: _regionClips(14),
        captions: _captions([
            ['st_r14_c1', 0],
            ['st_r14_c2', 8000],
            ['st_r14_c3', 16000],
            ['st_r14_c4', 24000],
            ['st_r14_c5', 32000]
        ]),
    }
};


// ---------------------------------------------------------------------------
// REPLAY GALLERY - registry of beats replayable from the title screen's
// Replay panel. `globalUnlock: true` entries are permanently available;
// everything else unlocks once seen in the current save (storyline-engine.js).
// `options` must match whatever showBeat(beatId, options) expects.
// ---------------------------------------------------------------------------
export const REPLAY_GALLERY_ENTRIES = [
    // `id` is a stable, save-slot-independent key used for the global unlock
    // flags (see storyline-engine.js). `thumb` is the artwork shown in the
    // row; `descKey` resolves to a translated subtitle. Entries flagged
    // `globalUnlock: true` are unlocked forever the moment the player picks
    // any character (opening cinematic + all three character intros).
    { id: 'opening_cinematic', beatId: 'intro_cinematic', label: 'Opening Cinematic', thumb: 'images/Replay_Cutscene_Screen/Replay_Opening_Camera.webp', descKey: 'scr_replay_desc_cinematic', globalUnlock: true },
    { id: 'intro_stox', beatId: 'character_intro', label: 'Stox - Character Intro', options: { character: 'stox' }, thumb: 'images/sprites/Stox_noclass.webp', descKey: 'scr_replay_desc_intro_stox', globalUnlock: true },
    { id: 'intro_trix', beatId: 'character_intro', label: 'Trix - Character Intro', options: { character: 'trix' }, thumb: 'images/sprites/Trix_noclass.webp', descKey: 'scr_replay_desc_intro_trix', globalUnlock: true },
    { id: 'intro_syla', beatId: 'character_intro', label: 'Syla - Character Intro', options: { character: 'syla' }, thumb: 'images/sprites/Syla_noclass.webp', descKey: 'scr_replay_desc_intro_syla', globalUnlock: true },

    // Region interludes (region_1 … region_14, Nexus world included) are
    // intentionally NOT listed yet - their cutscenes don't exist. Re-add each
    // here (with a `thumb` and `descKey`) once the corresponding world intro
    // is built.
];


// =============================================================================
// FUTURE STORYLINE - NEXUS ENDGAME & ATLAS (design notes, not yet implemented)
// =============================================================================
// Everything below is PLANNED narrative material for the post-campaign endgame
// (Nexus of Worlds, Atlas of Statistica, 16 map tiers, pinnacle bosses). Parked here
// as comments so we can pick this up later and turn it into real beats,
// captions and translation keys. Nothing below affects runtime behavior.
//
// ---------------------------------------------------------------------------
// 0. EXISTING CANON THIS BUILDS ON
// ---------------------------------------------------------------------------
// - Reality = the Sample Space (data, not matter), generated by the Apex of
//   Stochastics, built by the First Cartographers to keep randomness honest.
// - The Variance Collapse fractured it into 13 distorted regions, bound shut
//   by Stoxels - collapsed knots of warped probability that cannot be broken,
//   only solved.
// - Act 1 (R1-5): damage looks accidental. Act 2 (R6-9): sabotage revealed.
//   Name fragment surfaces in Data Delta: V_RUN.
// - Act 3 (R10-13) reveal: VERUN, a First Cartographer, proved suffering is
//   guaranteed under probability, blamed probability itself, and seeded THE
//   FINAL NULL into the Apex. He speaks to the player in the Null Hypothesis
//   Void: "Every Stoxel you've cleared undoes centuries of careful work."
// - Endgame systems already present: Nexus hub, Atlas of Statistica (86 regions
//   on a two-continent map with linear corner paths, tiers 1-16), Probability
//   Gate map device,
//   bosses Entropy / Bayes / Laplace's Demon / The Null; atlas nodes "The Final
//   Theorem" and "Vortex of Possibilities: Overload".
//
// OPEN THREADS ALREADY PLANTED IN THE CODE (to be paid off in endgame):
// - Trix's backstory: the Warden (OLS Observatory, Regression Rift)
// - Syla's parents trapped in a loop + her recurring fox companion motif
// - The defaced proof on Expectation Plateau (R13 captions)
// - Atlas regions "The Final Theorem" and "Vortex of Possibilities: Overload"
// - Bayesian Bay caption line about a Guild that refused to update its beliefs
//
// ---------------------------------------------------------------------------
// 1. THE BRIDGE - WHY THE CAMPAIGN ISN'T THE END
// ---------------------------------------------------------------------------
// NEW LORE PRINCIPLE - CONSERVATION OF VARIANCE:
//   A Stoxel cannot be destroyed. Solving it doesn't annihilate the
//   corruption - it REROUTES it back into the Substrate. Probability, like
//   energy, is conserved. Every Stoxel the player solves pushes the warped
//   variance somewhere else.
// => The campaign was triage, not a cure. For 300 years the Guild believed
//    solving Stoxels was healing the world. The player's success reveals the
//    truth: all thirteen regions now DRAIN toward a single convergence point.
//    Every ley-line of displaced variance ends at one coordinate.
// => That coordinate is where the first cut was made. That coordinate is the
//    NEXUS.
//
// ---------------------------------------------------------------------------
// 2. THE NEXUS OF WORLDS
// ---------------------------------------------------------------------------
// - The Nexus was not built for the endgame. It is the ORIGIN POINT of First
//   Cartographer cartography - the survey station from which all thirteen
//   regions were first measured and named. Every Guild map is a copy of a
//   copy of charts drafted there.
// - It sits at the hinge between the observed world and the SUBSTRATE - the
//   layer of raw, unwritten probability underneath reality.
// - When Verun seeded the Final Null into the Apex he didn't just corrupt the
//   13 core regions - he corrupted the MASTER INDEX: the Atlas. The Sample
//   Space didn't only crack along its thirteen named wounds; the possibility
//   space itself shattered into layered, unobserved branches.
// - The Nexus is the only stable doorway into those branches because it was
//   engineered (First Cartographer failsafe) to be the one point in reality
//   that always observes itself - a fixed reference frame amid divergence.
// - POST-CAMPAIGN BEAT (new): after Region 13, the player finds the defacers
//   of the Expectation Plateau proof - survivors of Verun's following -
//   fleeing into the Nexus doors. Verun himself is gone, subsumed into the
//   Apex, but his PROOF IS STILL RUNNING. His acolytes carry fragments of the
//   Final Theorem into the deep atlas layers to finish the deletion from
//   inside, where no one was ever meant to follow.
// - GUILD COUNCIL NPC TRIO (recurring hub NPCs): an old cartographer, a
//   vendor-pragmatist, and one voice of dissent who suspects the Guild knew
//   about Verun centuries ago. They task the player: go where observation
//   ends and finish the job.
//
// ---------------------------------------------------------------------------
// 3. THE ATLAS & THE 16 TIERS - WHY DEPTH = DANGER
// ---------------------------------------------------------------------------
// CORE IDEA: The Apex renders reality in SIXTEEN PASSES - sixteen sequential
// computations, coarse structure down to fine detail ("there will be
// mountains" ... "this grain of sand falls left"). Verun's Final Null
// infected the pass-stack bottom-up:
//
//   TIERS 1-4  OBSERVED ECHOES
//     Near-coherent copies of known regions (Gaussian Grasslands, Median
//     Meadows...). Reality with small errors - wrong shadows, dice that land
//     on seven. Where Verun's acolytes start re-seeding parameters.
//   TIERS 5-8  CONTESTED LAYERS
//     Regions where the Null's proof and reality's own computation fight
//     openly. Weather is a live argument. Player intercepts acolyte supply
//     lines; learns THE WARDEN survived the campaign - and defected to the
//     Null, because certainty is the only thing that ever made him feel safe.
//   TIERS 9-12  UNOBSERVED SPACE
//     Branches never measured. Nothing here has ever been REAL, because
//     nothing has ever been seen. Monsters are UNREALIZED OUTCOMES - versions
//     of events that almost happened. Syla finds her parents' loop stabilized
//     into a pocket map and can free them. Her fox was never a fox - it's a
//     benign unrealized outcome that chose her.
//   TIERS 13-15  THE PROOF ITSELF
//     Landscape stops pretending to be geography - the player walks inside
//     Verun's argument. His three GUARDIANS stand here (existing bosses,
//     reframed as weaponized axioms):
//       - ENTROPY: the heat-death clause ("all patterns end")
//       - BAYES-CORRUPTED: the update that refuses to update (belief locked
//         on a dead prior)
//       - LAPLACE'S DEMON: the determinist's witness (knows every position,
//         claims chance never existed)
//     Each guardian drops a FRAGMENT OF THE COUNTER-PROOF - the mathematical
//     rebuttal the First Cartographers never got to deliver.
//   TIER 16  THE APEX
//     One node. Where it all began and ends.
//
// TIER-16 ARENA PLAN: keep "Vortex of Possibilities: Overload" as the tier-15
// approach map; make existing atlas node "The Final Theorem" the tier-16
// pinnacle arena.
//
// ---------------------------------------------------------------------------
// 4. TIER-16 PINNACLE BOSS
// ---------------------------------------------------------------------------
// NAME: Ω - The Apex of Stochastics, Executing the Final Null
// STORYLINE SENSE: Verun is not fought because he is beyond villain now - he
// IS the corruption's argument, fully loaded into the machine that writes
// reality. The Apex runs his proof to completion: computing a universe with
// variance set to zero - which is a universe with nothing in it. Not
// destruction. DELETION BY CONCLUSION.
// WHY ONLY THE PLAYER: the Apex cannot be fought with force (established in
// the intro cinematic - force never worked on Stoxels either). It can only be
// SOLVED. The whole game taught the player to read the language it speaks.
// The final battle is the exam.
//
// FIGHT CONCEPT (narrative-shaped, mechanics TBD):
//   PHASE 1 - THE INTERROGATION
//     The Apex tests whether you understand what you're defending. Puzzle-
//     phases interleaved with combat; mistakes feed a Null bar, correct reads
//     push back.
//   PHASE 2 - THE THREE WITNESSES
//     Entropy, Bayes and Laplace return as echoes. Each was defeated earlier
//     BY FORCE; now each must be defeated BY ARGUMENT - deploy the
//     Counter-Proof fragments collected in tiers 13-15 to unbind them from
//     Verun's proof. They don't die; they CHANGE SIDES. (Thematic beat:
//     Bayes updates. That's the whole point of Bayes.)
//   PHASE 3 - VERUN, THE LAST CARTOGRAPHER
//     The human remnant, briefly separable from the machine. Not fought -
//     conversed with through the puzzle interface while the Apex burns down.
//     Tragic close: he was RIGHT that suffering is guaranteed under
//     probability. The counter-argument the player delivers is the one the
//     game opens with: reality is worth generating anyway. Expected value
//     includes the cost - and it's still positive.
//   ENDING CHOICE HOOK (future expansion fuel):
//     With the Final Null halted, the Apex offers the victor the First
//     Cartographers' original chair: RE-TUNE THE CONSTANTS. Accept (NG+ /
//     altered endgame modifiers) or refuse and leave the Sample Space honestly
//     random - imperfect, guaranteed to hurt, alive.
//     Closing line idea: "The dice keep rolling. And for the first time in
//     three hundred years, nobody is loading them."
//
// ---------------------------------------------------------------------------
// 5. SUPPORTING THREADS - PAYOFF LOCATIONS
// ---------------------------------------------------------------------------
// - The Warden (Trix): tier 5-8 contested-layer arc boss; closure dialogue
//   for Trix; optionally recruit-able as a map NPC afterwards.
// - Syla's parents & fox: tier 9-12 pocket map "The Normal Grove, Repeating";
//   fox reveal.
// - Defaced Plateau proof: the acolyte faction introduced post-Region 13;
//   their leader carries the defacing tool - a stylus that writes nulls.
// - "The Final Theorem" atlas node: becomes the tier-16 arena itself.
// - Guild's "refused to update its beliefs" (Bayesian Bay): optional dark
//   note - Guild archives contain a 300-year-old internal memo warning about
//   Verun, suppressed. Seeds a future "Guild civil war" league/expansion.
//
// ---------------------------------------------------------------------------
// 6. NAMING SUGGESTIONS (keep EN/DE pairs consistent)
// ---------------------------------------------------------------------------
// - Acolyte faction: "The Nullified" / "Die Genullten"
//   OR "Choir of Certainty" / "Chor der Gewissheit"
// - Conservation-of-variance lore item: "The Ledger of Displacement"
// - Tier-16 entry text: "Here the Sample Space holds its breath."
//
// ---------------------------------------------------------------------------
// IMPLEMENTATION CHECKLIST (for when we build this out)
// ---------------------------------------------------------------------------
// [ ] Post-Region-13 bridge beat (beat id candidate: nexus_bridge) firing on
//     campaign completion / Nexus unlock - introduce Conservation of Variance
//     + acolyte flight into the Nexus.
// [ ] New caption keys st_nexus_* / st_tier_* / st_pinnacle_* in
//     translations-strings.js (EN + DE).
// [ ] Per-tier intro beats or one-shot atlas unlock beats per tier band
//     (1-4 / 5-8 / 9-12 / 13-15 / 16).
// [ ] Boss reframing text for Entropy / Bayes / Laplace as Verun's guardians.
// [ ] Counter-Proof fragment items (3x) as boss drops in tiers 13-15.
// [ ] Pinnacle beat sequence for tier 16 (multi-phase, likely custom beat
//     type rather than standard 5-clip _regionClips pattern).
// [ ] Character payoff beats: Trix vs Warden, Syla parents/fox.
// =============================================================================