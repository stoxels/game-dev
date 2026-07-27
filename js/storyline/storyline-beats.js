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
            ["Probability Peaks rise at the edge of the known world, their slopes reshaping themselves with every roll of unseen dice.", 0],
            ["The mountains here shift based on probability distributions — paths that existed yesterday may simply not exist today, worn away by chance itself.", 8000],
            ["This is where the First Cartographers proved that apparent randomness conceals a hidden structure, a grammar written into the stone.", 16000],
            ["They built their earliest survey posts on these slopes, mapping which paths reappeared often enough to trust, and which vanished for good.", 24000],
            ["Three centuries later, the peaks still test every traveller who climbs them - a first lesson in reading order inside apparent chaos.", 32000]
        ]),
    }
};

STORY_BEATS.region_2 = {
    video: {
        clips: _regionClips(2),
        captions: _captions([
            ["Distribution Den carves itself out of bell curves — its cave walls rising and falling exactly the way a normal distribution rises and falls.", 0],
            ["Stalactites here follow power laws, and the underground rivers run in strict Poisson processes, arriving at intervals only mathematics could explain.", 8000],
            ["This is where the Substrate sits closest to the surface, where the mathematical foundations of reality are, quite literally, visible in the rock.", 16000],
            ["The Collapse struck the Den at a structural level — bell curves missing their tails, power laws that quietly reverse themselves mid-slope.", 24000],
            ["The cave system is now physically unstable, because its geology was built on the mathematics, and the mathematics underneath it all is broken.", 32000]
        ]),
    }
};

STORY_BEATS.region_3 = {
    video: {
        clips: _regionClips(3),
        captions: _captions([
            ["Sampling Savanna stretches out as a living dataset, where migrations, growth, and weather once followed statistical laws clean enough to watch unfold.", 0],
            ["This was the First Cartographers' primary field site — a place where they could simply sit and observe probability working in real time.", 8000],
            ["The Collapse introduced sampling bias here. The data still flows across the grasslands, but it is wrong in ways not immediately obvious.", 16000],
            ["Herds now migrate along routes that look random, until you notice every route quietly favours the same false conclusion, over and over.", 24000],
            ["Something is contaminating the sample at its source — and whatever it is, the contamination keeps spreading further with every passing season.", 32000]
        ]),
    }
};

STORY_BEATS.region_4 = {
    video: {
        clips: _regionClips(4),
        captions: _captions([
            ["The Vortex of Possibilities is not a region the First Cartographers ever built — it is the Variance Collapse itself, made visible at last.", 0],
            ["This is the place where the corruption first entered the Substrate, and it has been spinning, unbroken, for three hundred years since.", 8000],
            ["It pulls probability fields in from every surrounding region, dragging their structure into its spiral and churning it down into raw noise.", 16000],
            ["Most Cartographers who study it assume the Vortex is where the Collapse began — the wound at the very centre of everything.", 24000],
            ["They are wrong. The Vortex is only where the wound became visible, not where the first cut was actually made.", 32000]
        ]),
    }
};

STORY_BEATS.region_5 = {
    video: {
        clips: _regionClips(5),
        captions: _captions([
            ["Regression Rift twists correlation into causation — here, if two things happen together often enough, they simply begin to cause one another.", 0],
            ["The landscape folds back on itself as a result. Rivers run uphill toward their own sources, chasing a cause that was never really there.", 8000],
            ["The flora grows in feedback loops, reinforcing its own patterns again and again until the reinforcement collapses the whole structure at once.", 16000],
            ["Colonists once settled these folded valleys, believing the strange loops made the land more fertile, more predictable, more worth staying for.", 24000],
            ["This region was someone's home, once — before the folding accelerated, and staying here stopped being a choice anyone could safely make.", 32000]
        ]),
    }
};

// === ACT 2 — "Someone Did This" (6-9) ===
// Tone shifts from passive damage to active, deliberate sabotage.

STORY_BEATS.region_6 = {
    video: {
        clips: _regionClips(6),
        captions: _captions([
            ["Frequency Forest grows in Fibonacci spirals, its animals moving through Markov chains, its weather repeating the same cycle, day after day.", 0],
            ["The First Cartographers once called this repetition beautiful. The Collapse made it compulsive — patterns that cannot stop even as the data changes.", 8000],
            ["At the forest's centre something is forcing the repetition, because certainty feels safer than randomness to whatever is doing the forcing.", 16000],
            ["Every region before this one read as damage — wounds an accident left behind three centuries ago, healing badly, but healing by accident.", 24000],
            ["This does not read as an accident. Something in this forest is still deciding things, actively, and far more recently than three hundred years.", 32000]
        ]),
    }
};

STORY_BEATS.region_7 = {
    video: {
        clips: _regionClips(7),
        captions: _captions([
            ["Stochapolis was built by a civilisation convinced that precise enough machines could eliminate probability altogether, reducing every outcome down to pure certainty.", 0],
            ["They called it Total Determination, and spent centuries raising this city of gears and calculators to finally achieve it, once and for all.", 8000],
            ["The Variance Collapse destroyed the project and destroyed its builders. The machines kept running anyway — clattering through infinite loops, producing nothing.", 16000],
            ["But the machines are not entirely empty now. Something has moved into the gears, into the endless calculations, and made itself at home.", 24000],
            ["It did not arrive by accident. It recognised the city's old ambition — eliminate variance, achieve certainty — as an ambition of its own.", 32000]
        ]),
    }
};

STORY_BEATS.region_8 = {
    video: {
        clips: _regionClips(8),
        captions: _captions([
            ["In the Hypothesis Hinterlands, the Substrate's conceptual layer has collapsed straight into the physical one — abstract theories now walk around as living things.", 0],
            ["True hypotheses turn out stable here, almost tame. False hypotheses have become predators — aggressive, territorial, dangerous precisely because they don't know they're wrong.", 8000],
            ["The number of possible wrong answers vastly outnumbers the right ones, so the Hinterlands teem with more predators than any other region.", 16000],
            ["One false hypothesis moves differently than the rest — calmer, more organised, refusing to attack at random the way a wrong answer should.", 24000],
            ["It attacks like something that already knows exactly what it wants to be right about, and has decided you are in its way.", 32000]
        ]),
    }
};

STORY_BEATS.region_9 = {
    video: {
        clips: _regionClips(9),
        captions: _captions([
            ["Every event that happens anywhere in the world eventually leaves a trace, and every one of those traces flows down through Data Delta.", 0],
            ["The First Cartographers built processing stations along its banks to read the world's information in something close to real time.", 8000],
            ["The Collapse corrupted these streams. Signal and noise now flow mixed together, in proportions that make meaningful extraction almost impossible to manage.", 16000],
            ["Almost impossible. One fragment survives the noise anyway — coordinates, and a name, half-formed and flickering inside the corrupted signal: V _ R U N.", 24000],
            ["It is not enough to read completely. But it is enough, finally, to know exactly where to go looking next.", 32000]
        ]),
    }
};

// === ACT 3 — The Reveal and Climax (10-13 + Nexus) ===

STORY_BEATS.region_10 = {
    video: {
        clips: _regionClips(10),
        captions: _captions([
            ["Parameter Plains carries this world's fundamental constants — θ, μ, σ — physically inscribed across its soil. They are not decoration. They are load-bearing.", 0],
            ["These are the values the Substrate uses to generate probability fields everywhere, and someone is rewriting them, one parameter at a time.", 8000],
            ["The trajectory, if completed, ends at a single point: zero variance everywhere, every distribution in the world collapsed down to one certain outcome.", 16000],
            ["His name was Verun — a First Cartographer who proved suffering is guaranteed in any universe ruled by probability, and decided probability was the cause.", 24000],
            ["He called it The Final Null and seeded corrupted parameters into the Apex. He never lived to see it finish, but it very nearly has.", 32000]
        ]),
    }
};

STORY_BEATS.region_11 = {
    video: {
        clips: _regionClips(11),
        captions: _captions([
            ["Entire statistical concepts have been erased from existence in the Null Hypothesis Void — things that should exist here simply do not.", 0],
            ["It is dark not because light is absent, but because the very concept of light's presence has been removed from local probability space.", 8000],
            ["This is also where its influence runs strongest — and here, for the first time, it sends no creature, only a voice.", 16000],
            ["\"You have been solving the Collapse as though it were an accident. It was not. Every Stoxel you've cleared undoes centuries of careful work.\"", 24000],
            ["\"In a universe ruled by probability, suffering isn't possible — it's guaranteed. I am not this story's villain. I only finished reading it.\"", 32000]
        ]),
    }
};

STORY_BEATS.region_12 = {
    video: {
        clips: _regionClips(12),
        captions: _captions([
            ["Bayesian Bay's tides once ran on Bayesian updating — the sea changing based on what it observed, not on what physics dictated.", 0],
            ["It was, once, a body of water that learned. The Collapse did not make it more chaotic. It made it too certain instead.", 8000],
            ["The Bay locked onto a single prior and simply stopped updating, no longer responding to any new information the world tries to hand it.", 16000],
            ["It is frozen now in a belief three centuries out of date — and you know things now you didn't know five regions back.", 24000],
            ["About Verun. About the Null. About a Guild that refused to update its beliefs too. The Bay isn't another wound — it's a preview.", 32000]
        ]),
    }
};

STORY_BEATS.region_13 = {
    video: {
        clips: _regionClips(13),
        captions: _captions([
            ["The First Cartographers made their greatest breakthrough on Expectation Plateau — the formalisation of expected value, carved into bedrock in letters thirty metres high.", 0],
            ["It proves that even in a universe ruled by probability, outcomes balance — that the average of enough chances bends toward something survivable.", 8000],
            ["It is, quite literally, the mathematical argument against everything the Null said in the Void — and someone has been defacing it.", 16000],
            ["Not randomly. Systematically. Certain symbols altered so the proof turns incorrect, so the plateau agrees with the Null instead of refuting it.", 24000],
            ["This was not the Collapse. Someone is finishing what Verun started — one last edit on the one proof that says he might be wrong.", 32000]
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