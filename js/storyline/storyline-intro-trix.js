// =============================================================================
// storyline-intro-trix.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// Character intro data for Trix ("The Trickster").
// Depends on: storyline-engine.js (_wordsFromLine, MAX_SONG_SECTION_LINES,
// DEFAULT_SLIDE_DURATION_MS etc.) — must load AFTER that file.
//
// =============================================================================



// Folder where Trix's intro images live (relative to your index.html)
const TRIX_INTRO_IMAGE_PATH = "images/Intro/Trix_Intro/";


// ---------------------------------------------------------------------------
// SONG BEAT — karaoke-style Trix intro
// ---------------------------------------------------------------------------
//
// TRIX_INTRO_SONG — timed from Trix_Intro_Song.srt. Each line's start AND
// end time is rounded DOWN to the nearest 0.5s (e.g. 12223ms -> 12000ms)
// so line-changes land on clean half-second beats. Word-level reveal within
// each line is interpolated evenly across that line's window via
// _wordsFromLine, same approach as STOX_INTRO_SONG in storyline-intro-stox.js.
//
// Regenerate this block any time the SRT changes by re-parsing it the same
// way: round each cue's start AND end down to the nearest 500ms, and emit
// one _wordsFromLine(...) call per cue.
//
// The `images` timeline below uses placeholder filenames (1.jpeg ... 30.jpeg)
// spaced roughly every 10 seconds across the song's ~300s runtime. Replace
// filenames and adjust times once the actual image set exists — the array
// just needs to stay sorted by ascending `time`.
const TRIX_INTRO_SONG = {
    audio: "audio/Intro/Trix_Intro_Song.mp3",
    imagePath: TRIX_INTRO_IMAGE_PATH,

    // Image timeline — placeholders, adjust filenames and times once images exist.
    // Each entry fires when playback crosses its `time` (ms from song start).
    images: [
        { image: "1.jpeg", time: 0 },          // establishing shot before vocals
        { image: "2.jpeg", time: 12000 },      // "Three hundred years since the world came apart"
        { image: "3.jpeg", time: 22500 },      // "A handful of Cartographers stood up and swore"
        { image: "4.jpeg", time: 33500 },      // "The Guild called it heresy"
        { image: "5.jpeg", time: 44000 },      // "A fold in the world" / Regression Rift
        { image: "6.jpeg", time: 57000 },      // "Generations learned to live on borrowed time"
        { image: "7.jpeg", time: 68500 },      // "But the Rift was a teacher"
        { image: "8.jpeg", time: 90500 },      // "Trix was born in the one room still burning light"
        { image: "9.jpeg", time: 101000 },     // "Raised on ruins, raised on questions"
        { image: "10.jpeg", time: 111500 },     // "Then the readings started sliding"
        { image: "11.jpeg", time: 122000 },     // "Zero isn't quiet — zero's a verdict"
        { image: "12.jpeg", time: 135500 },     // "She knew her family wasn't wrong"
        { image: "13.jpeg", time: 146500 },     // "So she packed a lantern"
        { image: "14.jpeg", time: 158000 },     // "The guards brought her in to a man called the Warden"
        { image: "15.jpeg", time: 163000 },     // "Are you here to join us?"
        { image: "16.jpeg", time: 174000 },     // "Of course — easier than fighting"
        { image: "17.jpeg", time: 184500 },     // "A key around his neck, gone before he closed the door"
        { image: "18.jpeg", time: 194500 },     // "Already counting down the days"
        { image: "19.jpeg", time: 202000 },     // "She hid the key beneath her pillow"
        { image: "20.jpeg", time: 212500 },     // "Then one night she walked the halls"
        { image: "21.jpeg", time: 217500 },     // "Found a door in the archive"
        { image: "22.jpeg", time: 223500 },     // "The key turned like it knew her"
        { image: "23.jpeg", time: 228500 },     // "Behind it: every answer"
        { image: "24.jpeg", time: 234000 },     // "Her name was in those pages"
        { image: "25.jpeg", time: 245500 },     // "Watch and learn"
        { image: "26.jpeg", time: 255500 },     // "But the door behind the door changed why she came to stay"
        { image: "27.jpeg", time: 261000 },     // "Not loyalty, not duty"
        { image: "28.jpeg", time: 266500 },     // "So she keeps the uniform"
        { image: "29.jpeg", time: 276500 },     // "Walks among Cartographers now"
        { image: "30.jpeg", time: 298000 },     // TRIX nameplate
    ],

    // Lyric timeline — all 46 lines from the SRT, in order, as bilingual
    // entries { section, en, de, s, e }: both start and end times rounded down
    // to the nearest 0.5s from the real SRT values. The engine resolves the
    // active language's text into timed words via _wordsFromLine() at
    // playback time (see startSong in storyline-engine.js).
    lines: [
        { section: 'Verse 1', en: 'Three hundred years since the world came apart', de: 'Dreihundert Jahre, seit die Welt zerbrach', s: 10500, e: 15000 },
        { section: 'Verse 1', en: 'Since the Apex cracked open and the sky lost its math', de: 'seit der Apex aufriss und der Himmel seine Mathematik verlor', s: 15500, e: 21000 },
        { section: 'Verse 1', en: 'A handful of Cartographers stood up and swore', de: 'eine Handvoll Kartografen erhob sich und schwor', s: 21500, e: 26500 },
        { section: 'Verse 1', en: 'Somebody broke this - and we want to know what for', de: 'jemand hat das zerstört – und wir wollen wissen, warum', s: 26500, e: 32500 },

        { section: 'Verse 2', en: 'The Guild called it heresy, struck them from the page', de: 'Die Gilde nannte es Ketzerei, strich sie von der Seite', s: 33500, e: 37500 },
        { section: 'Verse 2', en: "Walked them past the border into someone else's cage", de: 'führte sie über die Grenze in den Käfig eines anderen', s: 38000, e: 44000 },
        { section: 'Verse 2', en: "A fold in the world where the numbers don't behave", de: 'eine Falte in der Welt, wo die Zahlen sich nichts sagen', s: 44000, e: 48500 },
        { section: 'Verse 2', en: 'The Regression Rift - half a colony, half a grave', de: 'der Regressionsrift – halb Kolonie, halb Grab', s: 48500, e: 56500 },

        { section: 'Chorus 1', en: 'Generations learned to live on borrowed time', de: 'Generationen lernten, auf geliehener Zeit zu leben', s: 57000, e: 62000 },
        { section: 'Chorus 1', en: 'Counting what was left of them, line by fading line', de: 'zählten, was von ihnen blieb, Zeile um verblasste Zeile', s: 62000, e: 68500 },
        { section: 'Chorus 1', en: 'But the Rift was a teacher and it taught them something true', de: 'doch der Rift war ein Lehrer, und er lehrte sie etwas Wahres', s: 68500, e: 72000 },
        { section: 'Chorus 1', en: 'Get close enough to anything, it starts to learn from you', de: 'komm allem nahe genug, beginnt es, von dir zu lernen', s: 72000, e: 88000 },

        { section: 'Verse 3', en: 'Trix was born in the one room still burning light', de: 'Trix wurde geboren in dem einen Raum, der noch Licht brannte', s: 90000, e: 93500 },
        { section: 'Verse 3', en: 'The OLS Observatory, watching numbers half the night', de: 'im OLS-Observatorium, halbe Nächte lang den Zahlen zuschauend', s: 94000, e: 100500 },
        { section: 'Verse 3', en: 'Raised on ruins, raised on questions no one round her could answer', de: 'gewachsen auf Ruinen, mit Fragen, die niemand um sie beantworten konnte', s: 100501, e: 106000 },
        { section: 'Verse 3', en: 'Why her name was poison, why her blood was called a cancer', de: 'warum ihr Name Gift war, warum man ihr Blut Krebs nannte', s: 106000, e: 111500 },

        { section: 'Verse 4', en: 'Then the readings started sliding, drifting toward a wall', de: 'Dann begannen die Messwerte zu gleiten, drifteten auf eine Wand zu', s: 111500, e: 115500 },
        { section: 'Verse 4', en: 'Every variance collapsing into nothing left at all', de: 'jede Varianz fiel zusammen zu nichts, das übrig blieb', s: 115500, e: 120500 },
        { section: 'Verse 4', en: "Zero isn't quiet - zero's a verdict, not a pause", de: 'Null ist nicht still – Null ist ein Urteil, keine Pause', s: 121000, e: 127000 },
        { section: 'Verse 4', en: 'A world with zero chance in it was a world erasing cause', de: 'eine Welt ohne jede Chance war eine Welt, die Ursachen tilgt', s: 127500, e: 134000 },

        { section: 'Chorus 2', en: "She knew her family wasn't wrong, not for one single day", de: 'Sie wusste, ihre Familie lag nicht falsch, nicht an einem einzigen Tag', s: 134500, e: 140500 },
        { section: 'Chorus 2', en: "Something never finished what it started - and it's still finding its way", de: 'etwas vollendete nie, was es begann – und findet noch immer seinen Weg', s: 140500, e: 145500 },
        { section: 'Chorus 2', en: 'So she packed a lantern, left the Rift behind for good', de: 'also packte sie eine Laterne, ließ den Rift für immer zurück', s: 145500, e: 151500 },
        { section: 'Chorus 2', en: 'Walked out to prove the thing they always said she should', de: 'zog hinaus, um das zu beweisen, das sie immer beweisen sollte', s: 151501, e: 157500 },

        { section: 'Bridge', en: 'The guards brought her in to a man called the Warden', de: 'Die Wachen brachten sie zu einem Mann namens der Warden', s: 158000, e: 162000 },
        { section: 'Bridge', en: 'Are you here to join us? - not a question, more a warning', de: 'Kommst du, dich uns anzuschließen? – keine Frage, eher eine Warnung', s: 162500, e: 167500 },
        { section: 'Bridge', en: "She'd never heard the name before that very day", de: 'diesen Namen hatte sie vor jenem Tag nie gehört', s: 167500, e: 173000 },
        { section: 'Bridge', en: 'Of course - easier than fighting, easier than locked away', de: 'natürlich – leichter als Kämpfen, leichter als eingesperrt sein', s: 173500, e: 179000 },
        { section: 'Bridge', en: 'He talked of duty while she counted what he wore', de: 'er sprach von Pflicht, während sie zählte, was er trug', s: 179000, e: 184000 },
        { section: 'Bridge', en: 'A key around his neck, gone before he closed the door', de: 'ein Schlüssel um seinen Hals, fort, bevor er die Tür schloss', s: 184001, e: 189000 },
        { section: 'Bridge', en: 'She took her oath with both hands clean and bowed her head just right', de: 'sie schwor ihren Eid mit reinen Händen und neigte den Kopf genau richtig', s: 189500, e: 194000 },
        { section: 'Bridge', en: "Already counting down the days until she'd leave at first light", de: 'zählte längst die Tage herunter bis zur Flucht beim ersten Licht', s: 194500, e: 201500 },

        { section: 'Final Verse', en: 'She hid the key beneath her pillow, kept her face a perfect blank', de: 'Sie versteckte den Schlüssel unter ihrem Kissen, ihr Gesicht blieb vollkommen leer', s: 202000, e: 206500 },
        { section: 'Final Verse', en: 'Played the dutiful student, took her seat, took her rank', de: 'spielte die pflichtbewusste Schülerin, nahm ihren Platz, nahm ihren Rang', s: 207000, e: 212000 },
        { section: 'Final Verse', en: 'Then one night she walked the halls where no one walked at all', de: 'dann lief sie in einer Nacht die Gänge, in denen niemand ging', s: 212500, e: 217500 },
        { section: 'Final Verse', en: "Found a door in the archive that wasn't on the wall", de: 'fand eine Tür im Archiv, die nicht auf dem Plan stand', s: 217500, e: 222000 },
        { section: 'Final Verse', en: 'The key turned like it knew her, like it had waited just for this', de: 'der Schlüssel drehte sich, als kennt er sie, als hätte er nur darauf gewartet', s: 222500, e: 228000 },
        { section: 'Final Verse', en: 'Behind it: every answer that her family ever missed', de: 'hinter ihr: jede Antwort, die ihrer Familie je fehlte', s: 228500, e: 233500 },
        { section: 'Final Verse', en: 'Her name was in those pages - not as exile, not as ghost', de: 'ihr Name stand in diesen Seiten – nicht als Verbannte, nicht als Geist', s: 234000, e: 238500 },
        { section: 'Final Verse', en: "But as the reason she'd been right to want this most", de: 'sondern als Beweis, dass sie recht hatte, dies mehr als alles zu wollen', s: 238500, e: 245500 },

        { section: 'Outro', en: "Watch and learn - that's what she'd say", de: 'Schau und lern – so würde sie sagen', s: 245500, e: 249500 },
        { section: 'Outro', en: 'She came here with an exit already halfway planned away', de: 'sie kam hierher mit einem Ausweg, schon halb geplant', s: 250000, e: 255000 },
        { section: 'Outro', en: 'But the door behind the door changed why she came to stay', de: 'doch die Tür hinter der Tür änderte, warum sie blieb', s: 255500, e: 260500 },
        { section: 'Outro', en: 'Not loyalty, not duty - just a debt she means to repay', de: 'keine Loyalität, keine Pflicht – nur eine Schuld, die sie tilgen will', s: 261000, e: 266500 },
        { section: 'Outro', en: 'So she keeps the uniform, keeps the key, keeps her secrets unsaid', de: 'also behält sie die Uniform, den Schlüssel, ihre ungesagten Geheimnisse', s: 266500, e: 273000 },
        { section: 'Outro', en: 'Walks among Cartographers now... chasing ghosts inside her head', de: 'wandelt nun unter Kartografen... jagt Geister in ihrem Kopf', s: 273500, e: 298500 },
    ],
};