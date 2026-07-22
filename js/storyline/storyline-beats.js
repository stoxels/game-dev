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
// Each region is split into 3 clips (~8s each, matching your generator's
// clip-length limit) instead of one single clip. `gapAfterMs` on clips 1
// and 2 holds on that clip's end frame for a beat before cutting to the
// next one; the last clip's gapAfterMs is ignored (see storyline-engine.js).
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

// Converts an array of [text, startMs] pairs into the { text, start }
// caption objects the engine expects. This is the ONLY place caption
// timing is decided — startMs is exactly when that line appears on screen,
// in milliseconds from the start of the whole clip sequence. Set every
// number by hand per line, per region. Caption timing is independent of
// per-clip audio — a caption line does not need to "belong" to any
// particular clip.
function _captions(entries) {
    return entries.map(([text, start]) => ({ text, start }));
}

// Builds a standard 3-clip sequence for a region, using the region's number
// to generate the placeholder file paths:
//   video/Regions/region_N_part1.mp4  +  audio/Regions/region_N_part1_narration.mp3
//   video/Regions/region_N_part2.mp4  +  audio/Regions/region_N_part2_narration.mp3
//   video/Regions/region_N_part3.mp4  +  audio/Regions/region_N_part3_narration.mp3
// Each clip's audio starts together with that clip and is swapped out the
// moment the next clip starts (see storyline-engine.js's _playClip). Swap
// in real filenames once they exist — or just replace the whole `clips`
// array per-region if the part count/naming ever differs from this pattern,
// or if a particular clip should have no audio at all (omit `audio` on
// that clip's object).
function _regionClips(n) {
    return [
        { videoFile: `video/Regions/region_${n}_part1.mp4`, audio: `audio/Regions/region_${n}_part1_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part2.mp4`, audio: `audio/Regions/region_${n}_part2_audio.mp3`, gapAfterMs: 0 },
        { videoFile: `video/Regions/region_${n}_part3.mp4`, audio: `audio/Regions/region_${n}_part3_audio.mp3` } // last clip — gapAfterMs ignored
    ];
}

// === ACT 1 — "Something Is Wrong Here" (1-5) ===
// Damage reads as environmental, accidental, passive. No one suspects intent.

STORY_BEATS.region_1 = {
    video: {
        clips: _regionClips(1),
        captions: _captions([
            ["Probability Peaks.", 0],
            ["The mountains here shift based on probability distributions. Paths that existed yesterday may not exist today.", 8000],
            ["This is where the First Cartographers proved that apparent randomness contains structure.", 16000]
        ]),
    }
};

STORY_BEATS.region_2 = {
    video: {
        clips: _regionClips(2),
        captions: _captions([
            ["Distribution Den.", 0],
            ["The cave shapes here are bell curves. The stalactite patterns follow power laws. The underground rivers run in Poisson processes. This is where the Substrate is closest to the surface — where the mathematical foundations of reality are literally visible in the rock.", 3200],
            ["The Collapse hit the Den at a structural level. The distributions themselves are malformed. Bell curves with missing tails. Power laws that reverse.", 18836],
            ["The cave system is physically unstable because the geology is built on the mathematics — and the mathematics is broken.", 27200]
        ]),
    }
};

STORY_BEATS.region_3 = {
    video: {
        clips: _regionClips(3),
        captions: _captions([
            ["Sampling Savanna.", 0],
            ["This was the First Cartographers' primary field research site — a living dataset where animal migrations, plant growth, and weather all followed statistical laws so cleanly that early Cartographers could sit here and watch probability work in real time.", 3200],
            ["The Collapse introduced sampling bias. The data is still flowing, but it is wrong in ways that are not immediately obvious.", 17382],
            ["Something is contaminating the sample — and the contamination is spreading.", 25018]
        ]),
    }
};

STORY_BEATS.region_4 = {
    video: {
        clips: _regionClips(4),
        captions: _captions([
            ["The Vortex of Possibilities.", 0],
            ["The Vortex is not a region the First Cartographers built. It is the Variance Collapse, made visible — the place where the corruption entered the Substrate, spinning ever since, pulling probability fields from surrounding regions into its spiral and churning them into noise.", 3200],
            ["Most Cartographers assume this is where it started.", 18836],
            ["They are wrong.", 22036]
        ]),
    }
};

STORY_BEATS.region_5 = {
    video: {
        clips: _regionClips(5),
        captions: _captions([
            ["Regression Rift.", 0],
            ["Here, if two things happen at the same time often enough, they begin to cause each other. The landscape folds back on itself. Rivers run toward their own sources. The flora grows in patterns that reinforce themselves until they collapse.", 3200],
            ["This region was someone's home, once.", 17745]
        ]),
    }
};

// === ACT 2 — "Someone Did This" (6-9) ===
// Tone shifts from passive damage to active, deliberate sabotage.

STORY_BEATS.region_6 = {
    video: {
        clips: _regionClips(6),
        captions: _captions([
            ["Frequency Forest.", 0],
            ["The trees grow in Fibonacci spirals. The animals move in Markov chains. The weather repeats on exactly the same cycle, day after day. The First Cartographers noted it as beautiful.", 3200],
            ["The Collapse made it compulsive. The patterns cannot stop repeating even when the underlying data has changed.", 14109],
            ["At the forest's centre, something is forcing the repetition — because repetition feels like certainty to something that fears randomness.", 20291],
            ["This is different from the last five regions.", 27564],
            ["Probability Peaks, Distribution Den, Sampling Savanna, the Vortex, Regression Rift — all of it read as damage. Wounds left by an accident three centuries old.", 30764],
            ["This does not read as an accident.", 39855],
            ["Something in this forest is still deciding things. Actively. Recently.", 43055]
        ]),
    }
};

STORY_BEATS.region_7 = {
    video: {
        clips: _regionClips(7),
        captions: _captions([
            ["Stochapolis.", 0],
            ["A civilisation once believed that sufficiently precise machines could eliminate probability entirely — reduce all outcomes to certainty through sufficiently advanced computation. They called this Total Determination and spent centuries building Stochapolis to achieve it.", 3200],
            ["The Variance Collapse destroyed their project and destroyed them. Their machines are still running. Gears turning, calculators clattering through infinite loops — all of it generating precisely nothing.", 15927],
            ["But the machines are not entirely empty.", 26109],
            ["Something has moved in.", 29309],
            ["It did not stumble into Stochapolis by accident. It recognised the machines' ambition — eliminate variance, achieve certainty — as its own.", 32509]
        ]),
    }
};

STORY_BEATS.region_8 = {
    video: {
        clips: _regionClips(8),
        captions: _captions([
            ["Hypothesis Hinterlands.", 0],
            ["The conceptual layer of the Substrate — where mathematical ideas exist as abstract structures — has collapsed into the physical layer here. Theories have taken physical form.", 3200],
            ["True hypotheses are stable, almost tame. False hypotheses have become predators: aggressive, territorial, and dangerous precisely because they are wrong and do not know it.", 13018],
            ["The number of possible wrong answers is vastly larger than the number of right ones.", 22109],
            ["One false hypothesis moves differently than the rest.", 27564],
            ["Calmer. More organised. It does not attack at random, the way a wrong answer should.", 30764],
            ["It attacks like something that already knows exactly what it wants to be right about.", 36219]
        ]),
    }
};

STORY_BEATS.region_9 = {
    video: {
        clips: _regionClips(9),
        captions: _captions([
            ["Data Delta.", 0],
            ["Everything that happens anywhere in the world eventually leaves a data trace. Those traces flow through the Delta. The First Cartographers built processing stations here to read the world's information in near-real time.", 3200],
            ["The Collapse corrupted the data streams. The Delta now carries noise mixed with signal in proportions that make meaningful extraction almost impossible.", 15200],
            ["Almost.", 23200],
            ["A fragment survives the noise. Coordinates. A name, half-formed in corrupted signal:", 26400],
            ["V _ R U N.", 30764],
            ["Not enough to read completely.", 33964],
            ["But enough to know where to go next.", 37164]
        ]),
    }
};

// === ACT 3 — The Reveal and Climax (10-13 + Nexus) ===

STORY_BEATS.region_10 = {
    video: {
        clips: _regionClips(10),
        captions: _captions([
            ["Parameter Plains.", 0],
            ["The fundamental parameters of this world's mathematics — θ, μ, σ — are physically inscribed across these plains. They are not decorative. They are load-bearing. The values here are the values the Substrate uses to generate reality's probability fields everywhere.", 3200],
            ["Someone is rewriting them. Carefully. Deliberately. One parameter at a time, shifting the world's fundamental constants toward values that produce lower and lower variance.", 17745],
            ["The trajectory, if completed, leads to a single point: zero variance everywhere. A world where every probability distribution has collapsed to a single certain outcome.", 26472],
            ["His name was Verun.", 35563],
            ["He was a First Cartographer. After decades of mapping the Substrate, he proved mathematically that in a universe governed by probability, suffering is guaranteed — and he concluded that probability itself was the source of all suffering. That the only humane act was to collapse all variance to zero.", 38763],
            ["He called this The Final Null. He introduced corrupted parameters into the Apex to achieve it.", 56581],
            ["He did not survive to see his plan succeed.", 62399],
            ["But the parameters have been working for three hundred years.", 65672],
            ["And they are nearly finished.", 69308]
        ]),
    }
};

STORY_BEATS.region_11 = {
    video: {
        clips: _regionClips(11),
        captions: _captions([
            ["Null Hypothesis Void.", 0],
            ["Entire statistical concepts have been erased from existence here. Things that should exist simply do not. The region is not dark because light is absent — it is dark because the concept of light's presence has been removed from local probability space.", 3200],
            ["This is also where its influence is strongest.", 18473],
            ["And here, for the first time, it does not send a creature.", 21673],
            ["It sends a voice.", 26037],
            ["\"You have been solving the Collapse as though it were an accident. It was not. Every Stoxel you have cleared, every region you have stabilised — you have been undoing three hundred years of careful work.\"", 29237],
            ["\"I would like you to understand why that work was done before you decide to finish undoing it.\"", 42328],
            ["\"In a universe governed by probability, suffering is not possible. It is guaranteed. For any sufficiently long timeline, every bad outcome has probability 1. Every loss. Every death. Every failure.\"", 48873],
            ["\"I am not the villain of this story. I am the only one who finished reading it.\"", 59782]
        ]),
    }
};

STORY_BEATS.region_12 = {
    video: {
        clips: _regionClips(12),
        captions: _captions([
            ["Bayesian Bay.", 0],
            ["The tidal patterns here run on Bayesian updating — the sea changes based on what it has observed, not on what physics should dictate. Before the Collapse, this made the Bay one of the most alive places in the world: a body of water that learned.", 3200],
            ["The Collapse did not make the Bay more chaotic. It made it too certain. The Bay locked onto a single prior and stopped updating. The sea no longer responds to new information.", 19927],
            ["It is frozen in a belief that is three hundred years out of date.", 31563],
            ["You know things now that you did not know five regions ago.", 36654],
            ["About Verun. About the Null. About a Guild that has spent three hundred years refusing to update its own belief in the face of evidence it did not want to see.", 41018],
            ["The Bay is not just another wound.", 52291],
            ["It is a preview. This is what the whole world looks like if Parameter Plains finishes its work — a single certainty, permanently fixed, no longer capable of learning anything new.", 55491]
        ]),
    }
};

STORY_BEATS.region_13 = {
    video: {
        clips: _regionClips(13),
        captions: _captions([
            ["Expectation Plateau.", 0],
            ["The First Cartographers made their greatest theoretical breakthrough here — the formalisation of expected value. The proof is carved into the plateau's bedrock in letters thirty metres high: that even in a universe governed by probability, outcomes balance — that the average of enough chances bends toward something survivable.", 3200],
            ["It is, quite literally, the mathematical argument against everything the Null said to you in the Void.", 21018],
            ["Someone has been defacing it. Not randomly. Systematically. Certain symbols altered to make the proof incorrect — to make this plateau agree with the Null instead of refuting it.", 27200],
            ["The plateau's stability depends on the proof being intact. It is failing.", 37745],
            ["This was not the Collapse.", 42109],
            ["This is someone trying to finish what Verun started — one last edit, on the one piece of mathematics that says he, and the Null, might be wrong.", 45309]
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