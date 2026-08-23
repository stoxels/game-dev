// =============================================================================
// storyline-intro-stox.js — The Cartographers of Chance
// ---------------------------------------------------------------------------
// Character intro data for Stox ("The Analyst").
// Depends on: storyline-engine.js (_wordsFromLine, MAX_SONG_SECTION_LINES,
// DEFAULT_SLIDE_DURATION_MS etc.) — must load AFTER that file.

// Folder where Stox's intro images live (relative to your index.html)
const STOX_INTRO_IMAGE_PATH = "images/Intro/Stox_Intro/";


// ---------------------------------------------------------------------------
// SONG BEAT — karaoke-style Stox intro
// ---------------------------------------------------------------------------
//
// STOX_INTRO_SONG — timed from Stox_Intro_Song.srt. Each line's start/end
// comes directly from the SRT (real vocal timing), with start times rounded
// DOWN to the nearest 0.5s (e.g. 9367 -> 9000) so line-changes land on a
// clean half-second beat. End times are left as-is from the SRT. Word-level
// reveal within each line is interpolated evenly across that line's window
// via _wordsFromLine, same approach as INTRO_SONG in storyline-intro.js.
//
// Regenerate this block any time the SRT changes by re-parsing it the same
// way: round each cue's start down to the nearest 500ms, keep its real end,
// and emit one _wordsFromLine(...) call per cue.
//
// The `images` timeline below is the final 30-image set (see
// stox-intro-image-prompts.md for what each one depicts and why it's timed
// where it is). Filenames are matched to their original shot-list slot
// numbers, but the array is ordered chronologically by `time` (slot 27 fires
// before slot 26, since "He is finished waiting" lands earlier in the song
// than "The archive kept its secrets..."). If you regenerate or reorder any
// images, keep this array sorted by ascending `time`.
const STOX_INTRO_SONG = {
    audio: "audio/Intro/Stox_Intro_Song.mp3",
    imagePath: STOX_INTRO_IMAGE_PATH,

    images: [
        { image: "1.jpeg", time: 0 },           // establishing: alone in the archive
        { image: "2.jpeg", time: 9000 },        // "Inside this archive"
        { image: "3.jpeg", time: 16000 },       // "He didn't write a word of it"
        { image: "4.jpeg", time: 20500 },       // "But he's read every line"
        { image: "5.jpeg", time: 25500 },       // "Every note, every survey log"
        { image: "6.jpeg", time: 29500 },       // "Every parameter they made"
        { image: "7.jpeg", time: 36000 },       // "Everything the First Cartographers"
        { image: "8.jpeg", time: 40500 },       // "Ever left in their wake"
        { image: "9.jpeg", time: 46500 },       // "He's been through it all"
        { image: "10.jpeg", time: 68000 },      // "The timeline never added up"
        { image: "11.jpeg", time: 73000 },      // "The failures came too clean"
        { image: "12.jpeg", time: 79500 },      // "The corruption spread in a pattern"
        { image: "13.jpeg", time: 89500 },      // "He's mapped every connection"
        { image: "14.jpeg", time: 105000 },     // "Understood it down to every part"
        { image: "15.jpeg", time: 124000 },     // "One of the First Cartographers"
        { image: "16.jpeg", time: 133500 },     // "He cannot find who, or why"
        { image: "17.jpeg", time: 140000 },     // "The archive won't tell him how"
        { image: "18.jpeg", time: 151000 },     // "The shelves have run dry"
        { image: "19.jpeg", time: 161500 },     // "He's read everything they kept"
        { image: "20.jpeg", time: 171000 },     // "Whatever's still hidden"
        { image: "21.jpeg", time: 182000 },     // "In the regions, in the Stoxels"
        { image: "22.jpeg", time: 194500 },     // "The records all point inward" (Chorus 2)
        { image: "23.jpeg", time: 208000 },     // "Not from someone who won't stop"
        { image: "24.jpeg", time: 221500 },     // "But he knows where the answers drop"
        { image: "25.jpeg", time: 233000 },     // "The archive ran out of answers"
        { image: "26.jpeg", time: 247000 },     // "He is finished waiting"
        { image: "27.jpeg", time: 273500 },     // "The archive kept its secrets..."
        { image: "28.jpeg", time: 282000 },     // "Now he steps out past it"
        { image: "29.jpeg", time: 291000 },     // "He'll trade his pages..."
        { image: "30.jpeg", time: 313000 },     // "Ready to learn what he can't understand"
        { image: "31.jpeg", time: 325000 },
    ],

    // Lyric timeline — all 57 lines from the SRT, in order, as bilingual
    // entries { section, en, de, s, e }: start times rounded down to the
    // nearest 0.5s; end times are the real SRT ends. The engine resolves the
    // active language's text into timed words via _wordsFromLine() at
    // playback time (see startSong in storyline-engine.js).
    lines: [
        { section: 'Verse 1', en: 'Stox has spent his whole life', de: 'Stox verbrachte sein ganzes Leben', s: 4000, e: 6999 },
        { section: 'Verse 1', en: 'Inside this archive', de: 'in diesem Archiv', s: 7000, e: 14999 },
        { section: 'Verse 1', en: "He didn't write a word of it", de: 'er schrieb kein Wort davon', s: 15000, e: 19499 },
        { section: 'Verse 1', en: "But he's read every line", de: 'doch er las jede Zeile', s: 19500, e: 24499 },
        { section: 'Verse 1', en: 'Every note, every survey log', de: 'jede Notiz, jedes Vermessungsprotokoll', s: 24500, e: 27999 },
        { section: 'Verse 1', en: 'Every parameter they made', de: 'jeden Parameter, den sie setzten', s: 28000, e: 34999 },
        { section: 'Verse 1', en: 'Everything the First Cartographers', de: 'alles, was die Ersten Kartografen', s: 35000, e: 39499 },
        { section: 'Verse 1', en: 'Ever left in their wake', de: 'jemals zurückließen', s: 39500, e: 45000 },

        { section: 'Verse 2', en: "He's been through it all", de: 'Er hat alles durchgesehen', s: 45500, e: 50999 },
        { section: 'Verse 2', en: 'Again and again', de: 'immer und immer wieder', s: 51000, e: 54642 },
        { section: 'Verse 2', en: 'Studying a catastrophe', de: 'er studierte die Katastrophe', s: 57000, e: 61617 },
        { section: 'Verse 2', en: 'From three hundred years back then', de: 'von vor dreihundert Jahren', s: 62000, e: 65374 },
        { section: 'Verse 2', en: 'The timeline never added up', de: 'die Zeitleiste ging nie auf', s: 67000, e: 70933 },
        { section: 'Verse 2', en: 'The failures came too clean', de: 'die Fehlschläge kamen zu sauber', s: 73000, e: 77235 },
        { section: 'Verse 2', en: 'The corruption spread in a pattern', de: 'die Korruption breitete sich in einem Muster aus', s: 79500, e: 81999 },
        { section: 'Verse 2', en: 'Too deliberate to be unseen', de: 'zu absichtlich, um ungesehen zu bleiben', s: 82000, e: 86444 },

        { section: 'Verse 3', en: "He's mapped every connection", de: 'Er kartierte jede Verbindung', s: 89500, e: 92528 },
        { section: 'Verse 3', en: 'Cross-referenced every log', de: 'glich jedes Protokoll ab', s: 94500, e: 98199 },
        { section: 'Verse 3', en: 'Every maintenance record', de: 'jede Wartungsaufzeichnung', s: 99500, e: 102499 },
        { section: 'Verse 3', en: 'Against every failure he could log', de: 'gegen jeden Fehler, den er fand', s: 102500, e: 112693 },

        { section: 'Chorus', en: 'The records all point inward', de: 'Alle Aufzeichnungen zeigen nach innen', s: 112500, e: 114999 },
        { section: 'Chorus', en: 'Someone knew it from the start', de: 'jemand wusste es von Anfang an', s: 115000, e: 118181 },
        { section: 'Chorus', en: 'Whoever broke the Apex', de: 'wer auch immer den Apex zerbrach', s: 118500, e: 120726 },
        { section: 'Chorus', en: 'Understood it down to every part', de: 'verstand ihn bis in jeden Teil', s: 120500, e: 123717 },
        { section: 'Chorus', en: 'One of the First Cartographers', de: 'einer der Ersten Kartografen', s: 124000, e: 126479 },
        { section: 'Chorus', en: "Did this, he's sure of it now", de: 'tat dies, jetzt ist er sich sicher', s: 126500, e: 132499 },
        { section: 'Chorus', en: 'He cannot find who, or why', de: 'er kann nicht finden, wer oder warum', s: 132500, e: 138999 },
        { section: 'Chorus', en: "The archive won't tell him how", de: 'das Archiv verrät ihm nicht wie', s: 139000, e: 147235 },

        { section: 'Verse 4', en: 'The shelves have run dry', de: 'Die Regale sind leer', s: 151000, e: 153353 },
        { section: 'Verse 4', en: 'No more pages left to turn', de: 'keine Seiten mehr zum Umblättern', s: 153500, e: 158620 },
        { section: 'Verse 4', en: "He's read everything they kept", de: 'er las alles, was sie bewahrten', s: 161500, e: 163499 },
        { section: 'Verse 4', en: 'Every secret, every burn', de: 'jedes Geheimnis, jeden Brand', s: 163500, e: 169999 },
        { section: 'Verse 4', en: "Whatever's still hidden", de: 'was auch immer noch verborgen liegt', s: 170000, e: 175101 },
        { section: 'Verse 4', en: "It's out there, past these walls", de: 'ist draußen, hinter diesen Mauern', s: 176500, e: 180292 },
        { section: 'Verse 4', en: 'In the regions, in the Stoxels', de: 'in den Regionen, in den Stoxeln', s: 182000, e: 184948 },
        { section: 'Verse 4', en: "In whatever's left when something falls", de: 'in dem, was übrig bleibt, wenn etwas fällt', s: 185000, e: 194296 },

        { section: 'Chorus 2', en: 'The records all point inward', de: 'Alle Aufzeichnungen zeigen nach innen', s: 194500, e: 196971 },
        { section: 'Chorus 2', en: 'Someone knew it from the start', de: 'jemand wusste es von Anfang an', s: 197000, e: 199681 },
        { section: 'Chorus 2', en: 'Whoever broke the Apex', de: 'wer auch immer den Apex zerbrach', s: 200000, e: 202447 },
        { section: 'Chorus 2', en: 'Understood it down to every part', de: 'verstand ihn bis in jeden Teil', s: 202500, e: 205367 },
        { section: 'Chorus 2', en: "A truth can't stay buried", de: 'Eine Wahrheit bleibt nicht vergraben', s: 205500, e: 206999 },
        { section: 'Chorus 2', en: "Not from someone who won't stop", de: 'nicht vor jemandem, der nicht aufhört', s: 207000, e: 214499 },
        { section: 'Chorus 2', en: 'He cannot find who, or why', de: 'er kann nicht finden, wer oder warum', s: 214500, e: 219999 },
        { section: 'Chorus 2', en: 'But he knows where the answers drop', de: 'doch er weiß, wo die Antworten liegen', s: 220000, e: 232863 },

        { section: 'Bridge', en: 'The archive ran out of answers', de: 'Das Archiv ging die Antworten aus', s: 233000, e: 235778 },
        { section: 'Bridge', en: 'A long time ago', de: 'vor langer Zeit', s: 236000, e: 241379 },
        { section: 'Bridge', en: 'He has decided', de: 'Er hat entschieden', s: 241500, e: 244999 },
        { section: 'Bridge', en: 'He is finished waiting', de: 'er ist fertig mit dem Warten', s: 245000, e: 254810 },

        { section: 'Final Verse', en: 'The answer exists, somewhere past these doors', de: 'Die Antwort existiert, irgendwo hinter diesen Türen', s: 254000, e: 259499 },
        { section: 'Final Verse', en: "He is going to find it, he won't search anymore", de: 'er wird sie finden, er sucht nicht länger', s: 259500, e: 264499 },
        { section: 'Final Verse', en: "Every page he's learn was a door left ajar", de: 'jede Seite, die er lernte, war eine angelehnte Tür', s: 264500, e: 270635 },
        { section: 'Final Verse', en: "Now he's done with paper", de: 'jetzt ist er Papier los', s: 270500, e: 272999 },
        { section: 'Final Verse', en: 'Now he follows the scar', de: 'jetzt folgt er der Narbe', s: 273000, e: 280999 },

        { section: 'Outro', en: 'The archive kept its secrets for three hundred years', de: 'Das Archiv hütete seine Geheimnisse dreihundert Jahre lang', s: 281000, e: 288785 },
        { section: 'Outro', en: 'Now he steps out past it, leaving the fears', de: 'jetzt tritt er hinaus daran vorbei, lässt die Ängste zurück', s: 291500, e: 294499 },
        { section: 'Outro', en: "He'll trade his pages for a teacher's hand", de: 'er tauscht seine Seiten gegen die Hand eines Lehrers', s: 299500, e: 311683 },
        { section: 'Outro', en: "Ready to learn what he can't understand", de: 'bereit zu lernen, was er nicht verstehen kann', s: 313000, e: 321012 },
    ],
};