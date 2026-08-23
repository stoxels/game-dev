// =============================================================================
// storyline-beats.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// STORY_BEATS — the registry of every story beat in the game, keyed by
// beatId, passed to showBeat(beatId, options) from game.js.
// =============================================================================

// ---------------------------------------------------------------------------
// STORY BEATS
// ---------------------------------------------------------------------------

const STORY_BEATS = {

    // -------------------------------------------------------------------------
    // OPENING FLOW — image slideshow cinematic
    // -------------------------------------------------------------------------

    intro_cinematic: {
        song: INTRO_SONG
    },

    // -------------------------------------------------------------------------
    // CHARACTER INTROS — pass { character: 'stox' | 'trix' | 'syla' }
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
// Maps world number -> the level index (li, 1-based) within that world whose
// FIRST clear fires that world's region_N story beat (see checkWin() in
// scoring.js). Placeholder values below are all `2` — adjust per world once
// each world's level design/pacing is finalized. Must not exceed the number
// of levels actually defined for that world in level-world-data.js.
// ---------------------------------------------------------------------------
const REGION_BEAT_TRIGGER_LEVEL = {

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
// REGION ENTRY BEATS — each fires once, on first clear of its designated
// trigger level (see REGION_BEAT_TRIGGER_LEVEL above). Rendered as a
// 3-CLIP video sequence (see storyline-engine.js's video-beat `clips` path)
// with captions that accumulate on screen — each line fades in and stays,
// so by the end of the sequence the player has seen the full story text
// written out together.
//
// AUDIO IS PER-CLIP, NOT A SINGLE SHARED TRACK. Each of the 3 clips has its
// own dedicated audio file (`audio` field on the clip), which starts the
// instant that clip starts playing and is stopped the instant the sequence
// moves on to the next clip (see storyline-engine.js's _playClip /
// _stopClipAudio). So instead of one long narration.mp3 spanning all ~24s,
// split your narration to match your 3 video parts: part1's narration goes
// with part1's video, etc. Video and audio for a given clip always start
// together — there's no separate timing to configure for "when" a clip's
// audio plays; it's implicitly "whenever that clip is on screen."
//
// Each region is split into 5 clips (~8s each, matching your generator's
// clip-length limit) instead of one single clip. `gapAfterMs` on clips 1
// through 4 holds on that clip's end frame for a beat before cutting to the
// next one; the last clip's gapAfterMs is ignored (see storyline-engine.js).
// Each clip's caption/narration is sized to ~18-22 words (~7-7.5s spoken)
// so it fits comfortably inside that clip's ~8s runtime without leaving an
// awkward silent gap before the next clip starts.
// Playback does NOT need to finish inside the ~24s the 3 clips cover — once
// the last clip ends it freezes on that frame (with its own audio, if any,
// left playing) while captions keep going for as long as they need (see
// storyline-engine.js's _onClipEnded). So a text-heavy region is fine having
// more caption lines than the video "covers."
//
// CAPTION TIMING IS MANUAL — each line is a [text, startMs] pair (see
// _captions() below), where startMs is exactly when that line should
// appear on screen, measured from the start of the whole clip sequence
// (wall-clock time, independent of which clip/audio happens to be
// playing). You control this per line, per region. Example:
//     _captions([
//         ["Probability Peaks.", 0],           // shown instantly
//         ["The mountains here shift...", 8000], // shown at 8s
//         ["The First Cartographers...", 16000], // shown at 16s
//     ])
// The numbers below are auto-generated STARTING POINTS (word-count based,
// ~165 words/min) — listen to your actual narration once you have it and
// adjust every number by hand to match. `videoFile` / `audio` paths are
// placeholders — replace "video/Regions/region_N_partX.mp4" and
// "audio/Regions/region_N_partX_narration.mp3" with your real files.
//
// World order is locked: 1 Probability Peaks, 2 Distribution Den,
// 3 Sampling Savanna, 4 Vortex of Possibilities, 5 Regression Rift,
// 6 Frequency Forest, 7 Stochapolis, 8 Hypothesis Hinterlands,
// 9 Data Delta, 10 Parameter Plains, 11 Null Hypothesis Void,
// 12 Bayesian Bay, 13 Expectation Plateau.
// ---------------------------------------------------------------------------

// Converts an array of [translationKey, startMs] pairs into the
// { textKey, start } caption objects the engine expects. The key is resolved
// to the active language's text via t() at DISPLAY time (see renderVideo in
// storyline-engine.js) — so a mid-session language switch is picked up on the
// next playback. This is the ONLY place caption timing is decided — startMs is
// exactly when that line appears on screen, in milliseconds from the start of
// the whole clip sequence. Set every number by hand per line, per region.
// Caption timing is independent of per-clip audio — a caption line does not
// need to "belong" to any particular clip.
function _captions(entries) {
    return entries.map(([key, start]) => ({ textKey: key, start }));
}

// Builds a standard 5-clip sequence for a region, using the region's number
// to generate the placeholder file paths:
//   video/Regions/region_N_part1.mp4  +  audio/Regions/region_N_part1_narration.mp3
//   video/Regions/region_N_part2.mp4  +  audio/Regions/region_N_part2_narration.mp3
//   video/Regions/region_N_part3.mp4  +  audio/Regions/region_N_part3_narration.mp3
//   video/Regions/region_N_part4.mp4  +  audio/Regions/region_N_part4_narration.mp3
//   video/Regions/region_N_part5.mp4  +  audio/Regions/region_N_part5_narration.mp3
// Each clip's audio starts together with that clip and is swapped out the
// moment the next clip starts (see storyline-engine.js's _playClip). Swap
// in real filenames once they exist — or just replace the whole `clips`
// array per-region if the part count/naming ever differs from this pattern,
// or if a particular clip should have no audio at all (omit `audio` on
// that clip's object).
//
// Each clip is ~8s of video. Its matching caption line (see each region's
// `_captions([...])` call below) is written to take roughly 7-7.5s to
// narrate at a natural reading pace (~18-22 words) — short enough that the
// voiceover for that clip finishes with a little headroom before the next
// clip's own audio starts, instead of running out of words early and
// leaving several seconds of silence over still-playing video.
function _regionClips(n) {
    return [
        { videoFile: `video/Regions/region_${n}_part1.mp4`, audio: `audio/Regions/region_${n}_part1_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part2.mp4`, audio: `audio/Regions/region_${n}_part2_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part3.mp4`, audio: `audio/Regions/region_${n}_part3_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part4.mp4`, audio: `audio/Regions/region_${n}_part4_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part5.mp4`, audio: `audio/Regions/region_${n}_part5_audio.mp3` } // last clip — gapAfterMs ignored
    ];
}

// === ACT 1 — "Something Is Wrong Here" (1-5) ===
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

// === ACT 2 — "Someone Did This" (6-9) ===
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

// === ACT 3 — The Reveal and Climax (10-13 + Nexus) ===

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


// ---------------------------------------------------------------------------
// REPLAY GALLERY — flat registry of beats replayable from the title screen's
// Replay panel, once unlocked (i.e. already seen). Add a new entry here any
// time a new story beat should show up in that panel. `options` must match
// whatever showBeat(beatId, options) expects for that beat.
// ---------------------------------------------------------------------------
const REPLAY_GALLERY_ENTRIES = [
    { beatId: 'intro_cinematic', label: 'Opening Cinematic' },
    { beatId: 'character_intro', label: 'Stox — Character Intro', options: { character: 'stox' } },
    { beatId: 'character_intro', label: 'Trix — Character Intro', options: { character: 'trix' } },
    { beatId: 'character_intro', label: 'Syla — Character Intro', options: { character: 'syla' } },

    { beatId: 'region_1', label: 'Probability Peaks' },
    { beatId: 'region_2', label: 'Distribution Den' },
    { beatId: 'region_3', label: 'Sampling Savanna' },
    { beatId: 'region_4', label: 'The Vortex of Possibilities' },
    { beatId: 'region_5', label: 'Regression Rift' },
    { beatId: 'region_6', label: 'Frequency Forest' },
    { beatId: 'region_7', label: 'Stochapolis' },
    { beatId: 'region_8', label: 'Hypothesis Hinterlands' },
    { beatId: 'region_9', label: 'Data Delta' },
    { beatId: 'region_10', label: 'Parameter Plains' },
    { beatId: 'region_11', label: 'Null Hypothesis Void' },
    { beatId: 'region_12', label: 'Bayesian Bay' },
    { beatId: 'region_13', label: 'Expectation Plateau' },
];