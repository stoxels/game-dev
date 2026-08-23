// =============================================================================
// storyline-intro-syla.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// Character intro data for Syla ("The Field Statistician").
// Depends on: storyline-engine.js (_wordsFromLine, MAX_SONG_SECTION_LINES,
// DEFAULT_SLIDE_DURATION_MS etc.) — must load AFTER that file.
// =============================================================================



// Folder where Syla's intro images live (relative to your index.html)
const SYLA_INTRO_IMAGE_PATH = "images/Intro/Syla_Intro/";


// ---------------------------------------------------------------------------
// SONG BEAT — karaoke-style Syla intro
// ---------------------------------------------------------------------------
//
// SYLA_INTRO_SONG — timed from Syla_Intro_Song.srt. Each line's start time
// is rounded DOWN to the nearest 0.5s (e.g. 12495ms -> 12000ms) so
// line-changes land on a clean half-second beat; end times are kept as the
// real SRT values, same approach as STOX_INTRO_SONG / TRIX_INTRO_SONG.
//
// NOTE on cue 55 ("The Guild man looks at her boots"): the source .srt has
// a broken end timestamp for this cue (00:02:57,617 --> 00:02:57,858, a
// ~240ms span for a full line — almost certainly an export glitch, since
// the next cue doesn't start until 00:03:02,545). The end time below
// is corrected to fill the natural gap before the next line instead of
// using the bad SRT value. Re-check this line if the SRT is ever
// re-exported/fixed upstream.
//
// TIMING ADJUSTMENT (applied to all `lines` entries below): every start/end
// timestamp has been shifted 1000ms earlier, then rounded to the nearest
// 500ms. This was a deliberate manual adjustment layered on top of the
// original SRT-derived values described above — re-derive from the SRT
// first, then re-apply this same -1000ms + round-to-nearest-0.5s step, if
// the source SRT ever changes.
//
// The `images` timeline below uses placeholder filenames (1.jpeg ... 27.jpeg)
// spaced roughly every 9 seconds across the song's ~239s runtime. Replace
// filenames and adjust times once the actual image set exists — the array
// just needs to stay sorted by ascending `time`. (Not touched by the -1s
// line-timing adjustment above — only the `lines` array was shifted.)
const SYLA_INTRO_SONG = {
    audio: "audio/Intro/Syla_Intro_Song.mp3",
    imagePath: SYLA_INTRO_IMAGE_PATH,

    // Image timeline — placeholders, adjust filenames and times once images exist.
    // Each entry fires when playback crosses its `time` (ms from song start).
    images: [
        { image: "1.jpeg", time: 0 },          // establishing shot before vocals
        { image: "2.jpeg", time: 12000 },      // "Born beneath the Normal Grove"
        { image: "3.jpeg", time: 21000 },      // "And the forest was her home"
        { image: "4.jpeg", time: 30000 },      // "Knew the mushrooms' glowing nights"
        { image: "5.jpeg", time: 36000 },      // "But the fox takes the same path now"
        { image: "6.jpeg", time: 45500 },      // "Same branch, same time, same song"
        { image: "7.jpeg", time: 54500 },      // "Something's pulling at the wild"
        { image: "8.jpeg", time: 60500 },      // "She checks her parents' instruments"
        { image: "9.jpeg", time: 70000 },      // "But nobody answers here"
        { image: "10.jpeg", time: 78000 },     // "And near the end it bends too far" (Chorus 1)
        { image: "11.jpeg", time: 90500 },     // "Something deliberate / planned"
        { image: "12.jpeg", time: 96500 },     // "Every wound connects to one point"
        { image: "13.jpeg", time: 112000 },    // "Then she watches her own mother"
        { image: "14.jpeg", time: 124000 },    // "And her father at the window"
        { image: "15.jpeg", time: 133000 },    // "Cold and quiet, like thin ice"
        { image: "16.jpeg", time: 136000 },    // "She's the only one still moving"
        { image: "17.jpeg", time: 145500 },    // "She won't be who she needs to be"
        { image: "18.jpeg", time: 154000 },    // "And near the end it bends too far" (Chorus 2)
        { image: "19.jpeg", time: 169500 },    // "Every wound connects to one point"
        { image: "20.jpeg", time: 177500 },    // "The Guild man looks at her boots"
        { image: "21.jpeg", time: 181500 },    // Not her notebooks, not her proof
        { image: "22.jpeg", time: 190000 },    // There's a program, someone says
        { image: "23.jpeg", time: 196500 },    // She signs her name without a pause
        { image: "24.jpeg", time: 204500 },    // She steps away from everything
        { image: "25.jpeg", time: 207500 },    // The Grove, the logs, the glowing nights
        { image: "26.jpeg", time: 211000 },    // Notebook open, not yet closed
        { image: "27.jpeg", time: 217000 },    // The animals are waiting still
        { image: "28.jpeg", time: 226000 },
        { image: "29.jpeg", time: 232000 },
    ],

    // Lyric timeline — all 70 lines from the SRT, in order, as bilingual
    // entries { section, en, de, s, e }. Timestamps here have been shifted
    // 1000ms earlier and rounded to the nearest 500ms (see TIMING ADJUSTMENT
    // note above); cue 55's end is the manually corrected gap-fill value.
    // The engine resolves the active language's text into timed words via
    // _wordsFromLine() at playback time (see startSong in storyline-engine.js).
    lines: [
        { section: 'Verse 1', en: 'Born beneath the Normal Grove', de: 'Geboren unter dem Normalenhain', s: 11000, e: 14000 },
        { section: 'Verse 1', en: 'Where the bell curve shapes the stone', de: 'wo die Glockenkurve den Stein formt', s: 14000, e: 16500 },
        { section: 'Verse 1', en: "Mama's charts, and Papa's logs", de: 'Mamas Tabellen und Papas Protokolle', s: 17000, e: 19500 },
        { section: 'Verse 1', en: 'And the forest was her home', de: 'und der Wald war ihre Heimat', s: 20000, e: 23000 },
        { section: 'Verse 1', en: 'Knew the fox that lived due east', de: 'kannte den Fuchs, der östlich lebte', s: 23000, e: 25500 },
        { section: 'Verse 1', en: 'Knew the beetles, knew the birds', de: 'kannte die Käfer, kannte die Vögel', s: 25500, e: 29000 },
        { section: 'Verse 1', en: "Knew the mushrooms' glowing nights", de: 'kannte der Pilze glühende Nächte', s: 29000, e: 32000 },
        { section: 'Verse 1', en: 'Better than she knew her words', de: 'besser als ihre eigenen Worte', s: 32000, e: 35000 },

        { section: 'Verse 2', en: 'But the fox takes the same path now', de: 'Doch der Fuchs nimmt heute denselben Pfad', s: 35000, e: 38500 },
        { section: 'Verse 2', en: 'Every morning, never wrong', de: 'jeden Morgen, nie im Irrtum', s: 38500, e: 41500 },
        { section: 'Verse 2', en: 'And the birds sing the same notes', de: 'und die Vögel singen dieselben Töne', s: 41500, e: 44500 },
        { section: 'Verse 2', en: 'Same branch, same time, same song', de: 'gleicher Ast, gleiche Zeit, gleiches Lied', s: 44500, e: 47500 },
        { section: 'Verse 2', en: 'Squirrels cache in the same spot', de: 'Eichhörnchen horten an derselben Stelle', s: 47500, e: 50500 },
        { section: 'Verse 2', en: 'Deer drink from the stagnant stream', de: 'Hirsche trinken aus dem stehenden Bach', s: 50500, e: 53500 },
        { section: 'Verse 2', en: "Something's pulling at the wild", de: 'etwas zieht am Wilden', s: 53500, e: 56000 },
        { section: 'Verse 2', en: 'Draining out the living dream', de: 'saugt den lebendigen Traum aus', s: 56000, e: 59000 },

        { section: 'Pre-Chorus 1', en: "She checks her parents' instruments", de: 'Sie prüft die Instrumente ihrer Eltern', s: 59500, e: 62500 },
        { section: 'Pre-Chorus 1', en: 'The numbers back her fear', de: 'die Zahlen geben ihr recht', s: 62500, e: 65500 },
        { section: 'Pre-Chorus 1', en: "They've been sending Guild reports", de: 'sie sandten Gildenberichte', s: 65500, e: 69000 },
        { section: 'Pre-Chorus 1', en: 'But nobody answers here', de: 'doch niemand antwortet hier', s: 69000, e: 74000 },

        { section: 'Chorus 1', en: 'She draws the line', de: 'Sie zieht die Linie', s: 74000, e: 75500 },
        { section: 'Chorus 1', en: 'She marks the slope', de: 'sie markiert die Steigung', s: 75500, e: 77000 },
        { section: 'Chorus 1', en: 'And near the end it bends too far', de: 'und gegen Ende biegt sie zu weit', s: 77000, e: 80500 },
        { section: 'Chorus 1', en: 'This was never background noise', de: 'das war nie Hintergrundrauschen', s: 80500, e: 83500 },
        { section: 'Chorus 1', en: "Something's pushing from the dark", de: 'etwas drängt aus der Dunkelheit', s: 83500, e: 86500 },
        { section: 'Chorus 1', en: 'Not decay', de: 'kein Verfall', s: 86500, e: 87500 },
        { section: 'Chorus 1', en: 'Not just the years', de: 'nicht nur die Jahre', s: 87500, e: 89500 },
        { section: 'Chorus 1', en: 'Something deliberate', de: 'etwas mit Absicht', s: 89500, e: 91000 },
        { section: 'Chorus 1', en: 'Something planned', de: 'etwas Geplantes', s: 91000, e: 92500 },
        { section: 'Chorus 1', en: 'Every wound connects to one point', de: 'jede Wunde führt zu einem Punkt', s: 92500, e: 95500 },
        { section: 'Chorus 1', en: 'That someone needs to reach by hand', de: 'den jemand mit eigener Hand erreichen muss', s: 95500, e: 101000 },

        { section: 'Verse 3', en: 'Then she watches her own mother', de: 'Dann sieht sie ihre eigene Mutter', s: 111000, e: 114000 },
        { section: 'Verse 3', en: 'Write the same report again', de: 'denselben Bericht erneut schreiben', s: 114000, e: 116500 },
        { section: 'Verse 3', en: 'Same words, same hand, same hour', de: 'gleiche Worte, gleiche Hand, gleiche Stunde', s: 117000, e: 120000 },
        { section: 'Verse 3', en: "Like she's always just begin", de: 'als hätte sie gerade erst begonnen', s: 120000, e: 123000 },
        { section: 'Verse 3', en: 'And her father at the window', de: 'und ihr Vater am Fenster', s: 123000, e: 126000 },
        { section: 'Verse 3', en: 'Counts the pines the same way twice', de: 'zählt die Kiefern zweimal auf dieselbe Art', s: 126000, e: 129000 },
        { section: 'Verse 3', en: 'She can feel it at the edges', de: 'sie spürt es an den Rändern', s: 129000, e: 132000 },
        { section: 'Verse 3', en: 'Cold and quiet, like thin ice', de: 'kalt und still wie dünnes Eis', s: 132000, e: 135000 },

        { section: 'Pre-Chorus 2', en: "She's the only one still moving", de: 'Sie ist die Einzige, die sich noch bewegt', s: 136500, e: 139000 },
        { section: 'Pre-Chorus 2', en: "She's the only one still free", de: 'sie ist die Einzige, die noch frei ist', s: 139000, e: 141500 },
        { section: 'Pre-Chorus 2', en: 'If she waits another morning', de: 'wartet sie noch einen Morgen', s: 141500, e: 144500 },
        { section: 'Pre-Chorus 2', en: "She won't be who she needs to be", de: 'wird sie nicht, wer sie sein muss', s: 144500, e: 150500 },

        { section: 'Chorus 2', en: 'She draws the line', de: 'Sie zieht die Linie', s: 150500, e: 151500 },
        { section: 'Chorus 2', en: 'She marks the slope', de: 'sie markiert die Steigung', s: 151500, e: 153000 },
        { section: 'Chorus 2', en: 'And near the end it bends too far', de: 'und gegen Ende biegt sie zu weit', s: 153000, e: 156500 },
        { section: 'Chorus 2', en: 'This was never background noise', de: 'das war nie Hintergrundrauschen', s: 156500, e: 159000 },
        { section: 'Chorus 2', en: "Something's pushing from the dark", de: 'etwas drängt aus der Dunkelheit', s: 159000, e: 162500 },
        { section: 'Chorus 2', en: 'Not decay', de: 'kein Verfall', s: 162500, e: 164000 },
        { section: 'Chorus 2', en: 'Not just the years', de: 'nicht nur die Jahre', s: 163500, e: 165500 },
        { section: 'Chorus 2', en: 'Something deliberate', de: 'etwas mit Absicht', s: 165500, e: 166500 },
        { section: 'Chorus 2', en: 'Something planned', de: 'etwas Geplantes', s: 166500, e: 168500 },
        { section: 'Chorus 2', en: 'Every wound connects to one point', de: 'jede Wunde führt zu einem Punkt', s: 168500, e: 171500 },
        { section: 'Chorus 2', en: 'That someone needs to reach by hand', de: 'den jemand mit eigener Hand erreichen muss', s: 171500, e: 176500 },

        { section: 'Bridge', en: 'The Guild man looks at her boots', de: 'Der Gildenmann betrachtet ihre Stiefel', s: 178500, e: 181500 },
        { section: 'Bridge', en: 'Not her notebooks, not her proof', de: 'nicht ihre Notizbücher, nicht ihre Beweise', s: 181500, e: 184500 },
        { section: 'Bridge', en: "But she doesn't need believed", de: 'doch geglaubt werden muss sie nicht', s: 184500, e: 187500 },
        { section: 'Bridge', en: 'She needs someone to move', de: 'sie braucht jemanden, der handelt', s: 187500, e: 190000 },
        { section: 'Bridge', en: "There's a program, someone says", de: 'es gibt ein Programm, sagt jemand', s: 190000, e: 193500 },
        { section: 'Bridge', en: 'People who go out there still', de: 'Menschen, die noch hinausgehen', s: 193500, e: 196500 },
        { section: 'Bridge', en: 'She signs her name without a pause', de: 'sie unterschreibt ihren Namen ohne Zögern', s: 196500, e: 199000 },
        { section: 'Bridge', en: 'She has a fox to heal', de: 'sie hat einen Fuchs zu heilen', s: 199000, e: 205000 },

        { section: 'Outro', en: 'She steps away from everything', de: 'Sie tritt zurück von allem', s: 204500, e: 207500 },
        { section: 'Outro', en: 'The Grove, the logs, the glowing nights', de: 'vom Hain, den Protokollen, den glühenden Nächten', s: 207500, e: 211000 },
        { section: 'Outro', en: 'Notebook open, not yet closed', de: 'das Notizbuch offen, noch nicht geschlossen', s: 211000, e: 214000 },
        { section: 'Outro', en: "She's following the light", de: 'sie folgt dem Licht', s: 214000, e: 217000 },
        { section: 'Outro', en: 'The animals are waiting still', de: 'die Tiere warten noch immer', s: 217000, e: 220000 },
        { section: 'Outro', en: 'Caught inside the same refrain', de: 'gefangen in derselben Strophe', s: 220000, e: 223000 },
        { section: 'Outro', en: 'She will walk back in someday', de: 'eines Tages wird sie zurückkehren', s: 223000, e: 226000 },
        { section: 'Outro', en: 'And set them free again', de: 'und sie erneut befreien', s: 226000, e: 238500 },
    ],
};