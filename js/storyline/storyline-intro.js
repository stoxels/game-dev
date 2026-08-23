// =============================================================================
// storyline-intro.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// Data for the main opening cinematic / intro song (Part 1).
// Depends on: storyline-engine.js (_wordsFromLine, MAX_SONG_SECTION_LINES,
// DEFAULT_SLIDE_DURATION_MS, SLIDE_FADE_MS) — must load AFTER that file.
// =============================================================================

// ---------------------------------------------------------------------------
// INTRO CINEMATIC — IMAGE SLIDESHOW (Part 1: Opening Cinematic)
// ---------------------------------------------------------------------------
//
// Each slide shows one image from images/Intro/Stoxels_Intro/ (1.jpeg ... 24.jpeg)
// for `duration` milliseconds, with translated text (textKey -> t(textKey))
// overlaid on top.
// After the duration elapses, it auto-advances to the next slide.
// Clicking / pressing space also advances early.
// After the last slide, the cinematic closes and onComplete fires.
//
// Adjust `duration` per-slide as needed, or change DEFAULT_SLIDE_DURATION_MS
// below for a global default.
// ---------------------------------------------------------------------------

const INTRO_CINEMATIC_SLIDES = [
    { image: "1.jpeg", textKey: 'st_ic_1', duration: 8000 },
    { image: "2.jpeg", textKey: 'st_ic_2', duration: 8000 },
    { image: "3.jpeg", textKey: 'st_ic_3', duration: 12000 },
    { image: "4.jpeg", textKey: 'st_ic_4', duration: 12000 },
    { image: "5.jpeg", textKey: 'st_ic_5', duration: 11000 },
    { image: "6.jpeg", textKey: 'st_ic_6', duration: 9000 },
    { image: "7.jpeg", textKey: 'st_ic_7', duration: 9000 },
    { image: "8.jpeg", textKey: 'st_ic_8', duration: 11000 },
    { image: "9.jpeg", textKey: 'st_ic_9', duration: 8000 },
    { image: "10.jpeg", textKey: 'st_ic_10', duration: 8000 },
    { image: "11.jpeg", textKey: 'st_ic_11', duration: 8000 },
    { image: "12.jpeg", textKey: 'st_ic_12', duration: 11000 },
    { image: "13.jpeg", textKey: 'st_ic_13', duration: 10000 },
    { image: "14.jpeg", textKey: 'st_ic_14', duration: 10000 },
    { image: "15.jpeg", textKey: 'st_ic_15', duration: 11000 },
    { image: "16.jpeg", textKey: 'st_ic_16', duration: 10000 },
    { image: "17.jpeg", textKey: 'st_ic_17', duration: 9000 },
    { image: "18.jpeg", textKey: 'st_ic_18', duration: 9000 },
    { image: "19.jpeg", textKey: 'st_ic_19', duration: 10000 },
    { image: "24.jpeg", textKey: 'st_ic_20', duration: 11000 },
    { image: "20.jpeg", textKey: 'st_ic_21', duration: 13000 },
    { image: "21.jpeg", textKey: 'st_ic_22' },
    { image: "22.jpeg", textKey: 'st_ic_23' },
    { image: "23.jpeg", textKey: 'st_ic_24' },
];



// Folder where the intro images live (relative to your index.html)
const INTRO_CINEMATIC_IMAGE_PATH = "images/Intro/Stoxels_Intro/";



// ---------------------------------------------------------------------------
// SONG BEATS — karaoke-style intro (Part 1.5: vocal intro song)
// ---------------------------------------------------------------------------
//
// A "song" beat decouples images from text completely:
//   - `images` is its own timeline: [{ image, time }], time = ms from song start.
//     A new image is shown as soon as playback crosses that time.
//   - `lines` is the lyric timeline: each line is { section, words: [{ word, time }] }.
//     `time` on a word = the ms (from song start) at which that word should be
//     FULLY revealed (i.e. finished being "sung"). Letters within the word are
//     revealed by interpolating between the previous word's time and this one.
//     `section` groups lines (Verse 1, Chorus, etc.) — lines in the same
//     section accumulate on screen together; a new section clears the block.
//   - `audio` is the path to the vocal track. Playback of this file IS the
//     master clock — both images and lyrics sync to audioEl.currentTime.
//

// INTRO_SONG — full intro song, timed from Stoxels_Intro_Song.srt.
// Each line's start/end comes directly from the SRT (real vocal timing).
// Word-level reveal within each line is still interpolated evenly across
// that line's SRT window via _wordsFromLine — true word-by-word timestamps
// would need finer-grained data than SRT provides (SRT is line-level only),
// but this means every line change is locked exactly to the vocals, and the
// typewriter effect within a line plays out at a steady pace across the
// real duration that line is actually sung for.
//
// Regenerate this block any time the SRT changes by re-running the same
// parse script used to build it (parses the .srt, emits one
// _wordsFromLine(...) call per cue with that cue's real start/end ms).
const INTRO_SONG = {
    audio: "audio/Intro/Stoxels_Intro_Song.mp3",
    imagePath: INTRO_CINEMATIC_IMAGE_PATH,

    // Image timeline — one change roughly every 2 lyric lines, snapped to
    // that line's real start time, cycling through images 1-24. Adjust
    // freely — this list is independent of the lyric timing below.
    images: [
        { image: "0.jpeg", time: 0},
        { image: "1.jpeg", time: 5000 },
        { image: "2.jpeg", time: 22000 },
        { image: "3.jpeg", time: 32000 },
        { image: "4.jpeg", time: 38000 },
        { image: "5.jpeg", time: 54500 },
        { image: "6.jpeg", time: 60000 },
        { image: "7.jpeg", time: 67000 },
        { image: "8.jpeg", time: 77000 },
        { image: "9.jpeg", time: 86500 },
        { image: "10.jpeg", time: 93000 },
        { image: "11.jpeg", time: 98500 },
        { image: "12.jpeg", time: 105500 },
        { image: "13.jpeg", time: 110500 },
        { image: "14.jpeg", time: 115500 },
        { image: "15.jpeg", time: 120500 },
        { image: "16.jpeg", time: 132500 },
        { image: "17.jpeg", time: 138000 },
        { image: "18.jpeg", time: 148000 },
        { image: "19.jpeg", time: 154000 },
        { image: "20.jpeg", time: 161000 },
        { image: "21.jpeg", time: 164000 },
        { image: "22.jpeg", time: 168500 },
        { image: "23.jpeg", time: 174000 },
        { image: "24.jpeg", time: 177000 },
        { image: "25.jpeg", time: 182500 },
        { image: "26.jpeg", time: 187500 },
        { image: "27.jpeg", time: 194000 },
        { image: "28.jpeg", time: 198000 },
        { image: "29.jpeg", time: 208500 },
        { image: "30.jpeg", time: 213500 },
        { image: "31.jpeg", time: 220500 },
        { image: "32.jpeg", time: 229000 },
        { image: "33.jpeg", time: 238000 },
        { image: "34.jpeg", time: 247000 },
        { image: "35.jpeg", time: 256000 },
        { image: "36.jpeg", time: 265001 },
        { image: "37.jpeg", time: 276501 },


    ],

    // Lyric timeline — all 66 lines from the SRT, in order, as bilingual
    // entries { section, en, de, s, e }: s/e are the line's real SRT start/end
    // ms; the engine resolves the active language's text into timed words via
    // _wordsFromLine() at playback time (see startSong in storyline-engine.js).
    // Each line also carries a `section` label (Verse 1, Chorus, etc.) — lines
    // in the same section accumulate in the display block; a new section
    // clears the block and starts fresh.
    lines: [
        { section: 'Verse 1', en: 'They say the world is matter', de: 'Man sagt, die Welt sei Materie', s: 15500, e: 18999 },
        { section: 'Verse 1', en: 'Stone and sea and skin', de: 'Stein und Meer und Haut', s: 19000, e: 22000 },
        { section: 'Verse 1', en: 'But underneath the surface', de: 'doch unterhalb der Oberfläche', s: 22001, e: 24500 },
        { section: 'Verse 1', en: "It's numbers running thin", de: 'sind Zahlen, fast vergangen', s: 24501, e: 28500 },
        { section: 'Verse 1', en: 'Just probabilities dancing', de: 'nur Wahrscheinlichkeiten tanzen', s: 28501, e: 31999 },
        { section: 'Verse 1', en: 'In a fabric none can see', de: 'in einem Stoff, den keiner sieht', s: 32000, e: 34999 },
        { section: 'Verse 1', en: "This is the Sample Space we're born from", de: 'aus diesem Stichprobenraum entspringen wir', s: 35001, e: 37999 },
        { section: 'Verse 1', en: 'This is how we came to be', de: 'so wurden wir, was wir sind', s: 38000, e: 42000 },

        { section: 'Verse 2', en: 'Every mountain, every ocean', de: 'Jeder Berg, jeder Ozean', s: 54500, e: 58000 },
        { section: 'Verse 2', en: 'Every creature, every hour', de: 'jedes Wesen, jede Stunde', s: 58001, e: 60000 },
        { section: 'Verse 2', en: 'Was written by an ancient engine', de: 'wurde von uralter Maschine geschrieben', s: 60001, e: 64000 },
        { section: 'Verse 2', en: 'Built with old and patient power', de: 'erbaut mit alter, geduldiger Kraft', s: 64001, e: 67000 },
        { section: 'Verse 2', en: 'Scholars called the First Cartographers', de: 'Gelehrte, Erste Kartografen genannt', s: 67001, e: 71000 },
        { section: 'Verse 2', en: 'Raised it from the stone', de: 'hoben es aus dem Stein', s: 71001, e: 73500 },
        { section: 'Verse 2', en: 'The Apex of all Stochastics', de: 'der Apex aller Stochastik', s: 73501, e: 77000 },
        { section: 'Verse 2', en: 'Standing there alone', de: 'stand dort ganz allein', s: 77001, e: 80000 },


        { section: 'Pre-Chorus', en: 'Built to keep the chaos honest', de: 'Gebaut, damit das Chaos ehrlich bleibt', s: 80001, e: 83499 },
        { section: 'Pre-Chorus', en: 'Built to hold the pattern true', de: 'gebaut, das Muster wahr zu halten', s: 83500, e: 86500 },
        { section: 'Pre-Chorus', en: 'Forever, they believed it', de: 'Für immer, so glaubten sie', s: 86501, e: 89500 },
        { section: 'Pre-Chorus', en: 'Forever, they thought they knew', de: 'für immer, sie dachten, sie wüssten', s: 89001, e: 93000 },

        { section: 'Chorus', en: 'But nothing built can last forever', de: 'Doch nichts Gebautes währt für immer', s: 93001, e: 96000 },
        { section: 'Chorus', en: 'Nothing measured stays the same', de: 'nichts Gemessenes bleibt gleich', s: 96001, e: 98499 },
        { section: 'Chorus', en: 'Something broke the Variance open', de: 'etwas brach die Varianz auf', s: 98500, e: 101999 },
        { section: 'Chorus', en: "Something tore the world's frame", de: 'etwas riss das Weltgefüge', s: 102000, e: 105500 },
        { section: 'Chorus', en: 'Thirteen pieces, scattered, warping', de: 'dreizehn Teile, verstreut, verdreht', s: 105501, e: 109000 },
        { section: 'Chorus', en: 'Thirteen wounds that never close', de: 'dreizehn Wunden, nie vernäht', s: 109001, e: 111500 },
        { section: 'Chorus', en: "This is the Collapse we're living after", de: 'dies ist der Kollaps, nach dem wir leben', s: 111501, e: 114000 },
        { section: 'Chorus', en: 'This is the world the Cartographers chose', de: 'die Welt, die die Kartografen wählten', s: 114001, e: 125000 },


        { section: 'Verse 3', en: 'Most of them were lost that day', de: 'Die meisten verlor jener Tag', s: 132500, e: 134500 },
        { section: 'Verse 3', en: 'Swallowed by the breaking tide', de: 'verschlungen von der brechenden Flut', s: 134501, e: 138500 },
        { section: 'Verse 3', en: 'A handful crawled to the edges of the world', de: 'eine Handvoll kroch bis an die Ränder der Welt', s: 138001, e: 142000 },
        { section: 'Verse 3', en: 'And built a Guild to hide', de: 'und bauten eine Gilde, um sich zu verbergen', s: 142001, e: 145000 },
        { section: 'Verse 3', en: 'Three hundred years have passed us', de: 'dreihundert Jahre sind vergangen', s: 145001, e: 148000 },
        { section: 'Verse 3', en: "And no one's touched the Apex since", de: 'und keiner berührte je den Apex', s: 148001, e: 151000 },
        { section: 'Verse 3', en: 'Thirteen regions caught in flux', de: 'dreizehn Regionen im Wandel gefangen', s: 151001, e: 154000 },
        { section: 'Verse 3', en: 'Held by something we call Stoxels', de: 'gehalten von dem, was wir Stoxel nennen', s: 154001, e: 158000 },


        { section: 'Pre-Chorus', en: 'Pure void, locked in pattern', de: 'Reines Nichts, ins Muster gebannt', s: 158001, e: 161000 },
        { section: 'Pre-Chorus', en: 'Nothing breaks them, nothing can', de: 'nichts zerbricht sie, nichts vermag es', s: 161001, e: 164000 },
        { section: 'Pre-Chorus', en: 'No blade, no spell, no fire', de: 'keine Klinge, kein Zauber, kein Feuer', s: 164001, e: 166500 },
        { section: 'Pre-Chorus', en: 'Only the mind of one who understands', de: 'nur der Verstand dessen, der versteht', s: 166501, e: 170999 },

        { section: 'Chorus', en: 'But nothing built can last forever', de: 'Doch nichts Gebautes währt für immer', s: 171000, e: 174000 },
        { section: 'Chorus', en: 'Nothing measured stays the same', de: 'nichts Gemessenes bleibt gleich', s: 174001, e: 177000 },
        { section: 'Chorus', en: "A Stoxel can't be broken open", de: 'Ein Stoxel lässt sich nicht aufbrechen', s: 177001, e: 180499 },
        { section: 'Chorus', en: 'Only solved, only named', de: 'nur gelöst, nur benannt', s: 180500, e: 184000 },
        { section: 'Chorus', en: 'Read the language hidden in it', de: 'lies die Sprache, die darin verborgen', s: 184001, e: 187500 },
        { section: 'Chorus', en: 'Find the number, find the door', de: 'finde die Zahl, finde die Tür', s: 187501, e: 190500 },
        { section: 'Chorus', en: "This is the Collapse we're living after", de: 'dies ist der Kollaps, nach dem wir leben', s: 190501, e: 194000 },
        { section: 'Chorus', en: "This is what we're fighting for", de: 'dafür kämpfen wir', s: 194001, e: 198000 },

        { section: 'Bridge', en: 'The Guild has trained its children', de: 'Die Gilde bildete ihre Kinder aus', s: 198001, e: 200500 },
        { section: 'Bridge', en: "For longer than they've known", de: 'länger, als sie wissen', s: 200501, e: 208500 },
        { section: 'Bridge', en: 'Calling themselves the Cartographers of Chance', de: 'sie nennen sich die Kartografen des Zufalls', s: 208501, e: 213000 },
        { section: 'Bridge', en: 'Walking out alone', de: 'und ziehen allein hinaus', s: 213001, e: 220500 },
        { section: 'Bridge', en: 'And maybe it was always you', de: 'und vielleicht warst immer du es', s: 220501, e: 224000 },
        { section: 'Bridge', en: 'Maybe it was always meant to be', de: 'vielleicht war es immer bestimmt', s: 224001, e: 228500 },
        { section: 'Bridge', en: 'The one who reads the pattern', de: 'der eine, der das Muster liest', s: 228501, e: 232000 },
        { section: 'Bridge', en: 'The one who sets it free', de: 'der eine, der es befreit', s: 232001, e: 235500 },

        { section: 'Final Chorus', en: 'Because nothing built can last forever', de: 'Denn nichts Gebautes währt für immer', s: 235501, e: 241500 },
        { section: 'Final Chorus', en: 'But nothing broken has to stay', de: 'doch nichts Zerbrochenes muss so bleiben', s: 241501, e: 249000 },
        { section: 'Final Chorus', en: 'Every Stoxel holds a number', de: 'jeder Stoxel birgt eine Zahl', s: 249001, e: 252500 },
        { section: 'Final Chorus', en: "Waiting for the one who'll stay", de: 'wartend auf den, der bleibt', s: 252501, e: 255500 },
        { section: 'Final Chorus', en: 'Thirteen regions, calling, calling', de: 'dreizehn Regionen rufen, rufen', s: 255501, e: 258500 },
        { section: 'Final Chorus', en: "You're the answer they've been waiting for", de: 'du bist die Antwort, auf die sie warten', s: 258501, e: 262000 },
        { section: 'Final Chorus', en: "This is the Collapse we're living after", de: 'dies ist der Kollaps, nach dem wir leben', s: 262001, e: 265000 },
        { section: 'Final Chorus', en: "And you... you're walking through that door", de: 'und du... gehst durch diese Tür', s: 265001, e: 270000 },

        { section: 'Outro', en: 'And you...', de: 'Und du...', s: 270001, e: 275500 },
        { section: 'Outro', en: 'Are one of them', de: 'bist eine von ihnen', s: 275501, e: 286000 },
    ],
};