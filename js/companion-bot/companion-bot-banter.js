//------------------------------------------------------------------------
//-------------------COMPANION BOT BANTER----------------------------------
//------------------------------------------------------------------------
// What the summoned friend says while it plays along: reactions to what just
// happened (arriving, helping, hitting, the player's mistakes, the win) and
// real puzzle tips worked out from the clues ("Row 3 is fully determined...").
// Each hero has a voice: Stox dry and analytical, Trix arrogant and quick,
// Syla warm and childish. Plain data and pure functions (no DOM, no game
// state), so the rules can be tested alone. Every line has an English and a
// German text.

//------------------------------------------------------------------------
// LINES
//------------------------------------------------------------------------

// hero -> event -> [{ en, de }]. Events: arrive, hint, fill, mark, strike,
// mistake, idle (general advice), win.
export const BANTER_LINES = {
    stox: {
        arrive: [
            { en: 'I have joined the experiment. Do not touch my cells.', de: 'Ich bin dem Experiment beigetreten. Fass meine Zellen nicht an.' },
            { en: 'Reporting in. I will mark what I can prove.', de: 'Melde mich. Ich markiere, was ich beweisen kann.' },
            { en: 'Two observers, one grid. Efficient.', de: 'Zwei Beobachter, ein Raster. Effizient.' },
        ],
        hint: [
            { en: 'That glowing cell is certain. Take it.', de: 'Die leuchtende Zelle ist sicher. Nimm sie.' },
            { en: 'I have marked a candidate. The proof is yours.', de: 'Ich habe einen Kandidaten markiert. Den Beweis führst du.' },
        ],
        fill: [
            { en: 'Filled. The line closes cleanly.', de: 'Gefüllt. Die Linie schließt sich sauber.' },
            { en: 'One cell, derived and placed.', de: 'Eine Zelle, hergeleitet und gesetzt.' },
        ],
        mark: [
            { en: 'That one is empty. I have crossed it out.', de: 'Die ist leer. Ich habe sie durchgestrichen.' },
            { en: 'Eliminated. Fewer variables.', de: 'Eliminiert. Weniger Variablen.' },
        ],
        strike: [
            { en: 'Impact confirmed.', de: 'Treffer bestätigt.' },
            { en: 'Within expected parameters.', de: 'Innerhalb der erwarteten Parameter.' },
            { en: 'Contact. Logged.', de: 'Kontakt. Protokolliert.' },
        ],
        mistake: [
            { en: 'An outlier. It happens. Do not repeat it.', de: 'Ein Ausreißer. Passiert. Wiederhole ihn nicht.' },
            { en: 'Mistakes cost time. Mark only what is certain.', de: 'Fehler kosten Zeit. Markiere nur, was sicher ist.' },
            { en: 'Recalculate. The grid has not changed, only your guess.', de: 'Neu rechnen. Das Raster hat sich nicht geändert, nur deine Vermutung.' },
        ],
        idle: [
            { en: 'Work the lines with the biggest clues first. They leave the least slack.', de: 'Bearbeite zuerst die Linien mit den größten Hinweisen. Sie lassen am wenigsten Spielraum.' },
            { en: 'A cross on a certain empty cell is progress too.', de: 'Ein Kreuz auf einer sicher leeren Zelle ist auch Fortschritt.' },
            { en: 'When one line closes, check its neighbours. Constraints propagate.', de: 'Wenn eine Linie sich schließt, prüfe ihre Nachbarn. Einschränkungen pflanzen sich fort.' },
        ],
        win: [
            { en: 'Q.E.D. Together, the error was zero.', de: 'Q.E.D. Zusammen war der Fehler null.' },
            { en: 'Solved. Your affinity has been noted.', de: 'Gelöst. Deine Verbundenheit wurde vermerkt.' },
        ],
    },
    trix: {
        arrive: [
            { en: 'Fine, I will help. Try to keep up.', de: 'Na schön, ich helfe. Versuch mitzuhalten.' },
            { en: 'Oh good, a puzzle. This will take me a minute.', de: 'Oh, ein Rätsel. Das dauert bei mir eine Minute.' },
            { en: 'Do not worry, I have got this. Mostly.', de: 'Keine Sorge, ich hab das. Meistens.' },
        ],
        hint: [
            { en: 'Look there. Obviously.', de: 'Schau dorthin. Offensichtlich.' },
            { en: 'I lit a cell for you. You are welcome.', de: 'Ich habe dir eine Zelle beleuchtet. Gern geschehen.' },
        ],
        fill: [
            { en: 'Done. Too easy.', de: 'Erledigt. Zu einfach.' },
            { en: 'There. Was that so hard?', de: 'So. War das so schwer?' },
        ],
        mark: [
            { en: 'Empty. I could see that from here.', de: 'Leer. Das sah ich von hier aus.' },
            { en: 'Crossed out. Next.', de: 'Durchgestrichen. Nächste.' },
        ],
        strike: [
            { en: 'Boom. Bolt delivered.', de: 'Bumm. Blitz geliefert.' },
            { en: 'Too slow, little thing.', de: 'Zu langsam, Kleiner.' },
            { en: 'Sparks fly.', de: 'Funken fliegen.' },
        ],
        mistake: [
            { en: 'Ugh. Look before you click.', de: 'Ugh. Erst schauen, dann klicken.' },
            { en: 'That cost us time. Do not do it again.', de: 'Das hat uns Zeit gekostet. Nicht nochmal.' },
            { en: 'Even I would have caught that one.', de: 'Selbst ich hätte die gesehen.' },
        ],
        idle: [
            { en: 'Rows and columns that are nearly full are the best place to start.', de: 'Fast volle Zeilen und Spalten sind der beste Startpunkt.' },
            { en: 'If a clue is as long as the line, you can just fill it. Free cells.', de: 'Ist ein Hinweis so lang wie die Linie, kannst du sie einfach füllen. Geschenkte Zellen.' },
            { en: 'Do not guess. A wrong cell costs more than a slow one.', de: 'Rate nicht. Eine falsche Zelle kostet mehr als eine langsame.' },
        ],
        win: [
            { en: 'And that is how it is done. You are welcome.', de: 'So macht man das. Gern geschehen.' },
            { en: 'Not bad. For a team.', de: 'Nicht schlecht. Für ein Team.' },
        ],
    },
    syla: {
        arrive: [
            { en: 'Yay, we get to do this together!', de: 'Juhu, wir machen das zusammen!' },
            { en: 'Hello hello! I will help where I can.', de: 'Hallo hallo! Ich helfe, wo ich kann.' },
            { en: 'The grid hums a little. I like it.', de: 'Das Raster summt ein bisschen. Ich mag es.' },
        ],
        hint: [
            { en: 'Ooh, try that one! It glows!', de: 'Ooh, probier die! Sie leuchtet!' },
            { en: 'I think this cell is happy to be filled.', de: 'Ich glaube, diese Zelle freut sich, gefüllt zu werden.' },
        ],
        fill: [
            { en: 'Got one!', de: 'Eine geschafft!' },
            { en: 'Filled it! Did you see?', de: 'Gefüllt! Hast du das gesehen?' },
        ],
        mark: [
            { en: 'This one is empty, I am sure.', de: 'Die ist leer, da bin ich sicher.' },
            { en: 'A little cross, so nobody picks it by accident.', de: 'Ein kleines Kreuz, damit sie keiner aus Versehen nimmt.' },
        ],
        strike: [
            { en: 'Sorry, little guy!', de: 'Entschuldige, Kleiner!' },
            { en: 'Hee, that one hit!', de: 'Hihi, der hat getroffen!' },
        ],
        mistake: [
            { en: 'Oops! It is okay, everyone makes them.', de: 'Hoppla! Ist okay, das passiert jedem.' },
            { en: 'Do not worry, we can fix it.', de: 'Keine Sorge, das kriegen wir hin.' },
            { en: 'Careful now. Take a breath.', de: 'Vorsicht. Atme kurz durch.' },
        ],
        idle: [
            { en: 'If a line has no clue at all, all its cells are empty. Easy crosses!', de: 'Hat eine Linie gar keinen Hinweis, sind alle Zellen leer. Einfache Kreuze!' },
            { en: 'Start where the numbers are big. They know the most.', de: 'Fang dort an, wo die Zahlen groß sind. Die wissen am meisten.' },
            { en: 'Listen to the grid. Patterns repeat.', de: 'Hör auf das Raster. Muster wiederholen sich.' },
        ],
        win: [
            { en: 'We did it! That was so much fun!', de: 'Wir haben es geschafft! Das hat so viel Spaß gemacht!' },
            { en: 'Yay! Teamwork!', de: 'Juhu! Teamarbeit!' },
        ],
    },
};

//------------------------------------------------------------------------
// TIP WORDING
//------------------------------------------------------------------------

// Words for the line a tip is about: "Row 3" / "Column 4" (numbers from 1).
function _where(tip, de) {
    return (tip.axis === 'row' ? (de ? 'Reihe' : 'Row') : (de ? 'Spalte' : 'Column')) + ' ' + tip.index;
}

// Tip wording per hero and kind. Each returns the text for one tip.
const TIP_TEXT = {
    stox: {
        full: (t, de) => de
            ? `${_where(t, de)} ist vollständig bestimmt: die Hinweise ${t.clues.join(' ')} füllen alle ${t.len} Zellen genau aus. Beginne dort.`
            : `${_where(t, de)} is fully determined: the clues ${t.clues.join(' ')} fill all ${t.len} cells exactly. Start there.`,
        certain: (t, de) => de
            ? `${_where(t, de)}: Der Hinweis ${t.clues.join(' ')} lässt wenig Spielraum. ${t.count} Zellen darin sind sicher.`
            : `${_where(t, de)}: the clue ${t.clues.join(' ')} leaves little slack. ${t.count} cells in it are certain.`,
        empty: (t, de) => de
            ? `${_where(t, de)} hat keine gefüllte Zelle. Markiere jede Zelle darin als leer.`
            : `${_where(t, de)} has no filled cells at all. Mark every cell in it as empty.`,
    },
    trix: {
        full: (t, de) => de
            ? `${_where(t, de)}? Offensichtlich komplett bestimmt, ${t.clues.join(' ')} füllt alle ${t.len} Zellen. Los.`
            : `${_where(t, de)}? Obviously fully determined, ${t.clues.join(' ')} fills all ${t.len} cells. Go.`,
        certain: (t, de) => de
            ? `In ${_where(t, de)} sind ${t.count} Zellen sicher, schau dir den Hinweis ${t.clues.join(' ')} an. Wirklich, so schwer ist das nicht.`
            : `${_where(t, de)} has ${t.count} certain cells, look at the clue ${t.clues.join(' ')}. Really, it is not that hard.`,
        empty: (t, de) => de
            ? `${_where(t, de)} ist komplett leer. Kreuze sie ab, das ist geschenkt.`
            : `${_where(t, de)} is completely empty. Cross it out, that is free.`,
    },
    syla: {
        full: (t, de) => de
            ? `Oh, schau! ${_where(t, de)} ist ganz eindeutig: ${t.clues.join(' ')} passt genau in ${t.len} Zellen!`
            : `Oh, look! ${_where(t, de)} is totally clear: ${t.clues.join(' ')} fits exactly into ${t.len} cells!`,
        certain: (t, de) => de
            ? `In ${_where(t, de)} kann ich ${t.count} Zellen sicher spüren, der Hinweis ist ${t.clues.join(' ')}!`
            : `In ${_where(t, de)} I can feel ${t.count} cells for sure, the clue is ${t.clues.join(' ')}!`,
        empty: (t, de) => de
            ? `${_where(t, de)} ist ganz leer! Lauter kleine Kreuze, ja?`
            : `${_where(t, de)} is all empty! Lots of little crosses, yes?`,
    },
};

//------------------------------------------------------------------------
// PUZZLE ANALYSIS
//------------------------------------------------------------------------

// The block sizes of a line of 0/1 cells ([1,1,0,1] -> [2,1]).
export function lineClues(line) {
    const out = [];
    let n = 0;
    for (const v of line) {
        if (v) n++;
        else if (n) { out.push(n); n = 0; }
    }
    if (n) out.push(n);
    return out;
}

// Cells (0-based) of a line that are filled in every possible arrangement of
// its clues: the classic overlap rule. Empty for a line with no clues.
export function certainCells(len, clues) {
    if (!clues.length) return [];
    const slack = len - (clues.reduce((a, b) => a + b, 0) + clues.length - 1);
    const out = [];
    let pos = 0;
    for (const size of clues) {
        for (let k = Math.max(0, slack); k < size; k++) out.push(pos + k);
        pos += size + 1;
    }
    return out;
}

// What one line of the puzzle can tell the player right now, or null when
// there is nothing useful: 'full' (the clues fill it exactly), 'certain'
// (some cells are sure) or 'empty' (a line with no filled cells that still
// has unmarked cells). `cells` is that line's [solution, player, revealed] triples.
function _lineTip(axis, index, cells) {
    const sol = cells.map(c => c[0]);
    const clues = lineClues(sol);
    const len = sol.length;
    if (!clues.length) {
        return cells.some(c => c[1] !== 2) ? { kind: 'empty', axis, index: index + 1, clues, len, count: len, score: 4 } : null;
    }
    const open = certainCells(len, clues).filter(i => cells[i][1] !== 1 && !cells[i][2]);
    if (!open.length) return null;
    const exact = clues.reduce((a, b) => a + b, 0) + clues.length - 1 === len;
    return { kind: exact ? 'full' : 'certain', axis, index: index + 1, clues, len, count: open.length, score: (exact ? 10 : 0) + open.length };
}

// Picks a useful tip for the grid as it stands, or null. The three best lines
// compete at random so the tips vary. `rand` returns 0..1.
export function findTip(sol, user, revealed, rand) {
    const tips = [];
    for (let r = 0; r < sol.length; r++) {
        const t = _lineTip('row', r, sol[r].map((v, c) => [v, user[r][c], revealed[r][c]]));
        if (t) tips.push(t);
    }
    for (let c = 0; c < sol[0].length; c++) {
        const t = _lineTip('col', c, sol.map((row, r) => [row[c], user[r][c], revealed[r][c]]));
        if (t) tips.push(t);
    }
    if (!tips.length) return null;
    tips.sort((a, b) => b.score - a.score);
    const top = tips.slice(0, 3);
    return top[Math.floor(rand() * top.length)];
}

// The words of a tip in the hero's voice and language.
export function tipText(heroId, tip, de) {
    return TIP_TEXT[heroId][tip.kind](tip, de);
}

//------------------------------------------------------------------------
// LINE PICKING
//------------------------------------------------------------------------

// Shuffled "hear every line once before any repeats" decks, per hero and event.
const _decks = {};

// Picks the next line for a hero and event in the given language, or null when
// the hero has none. `rand` returns 0..1.
export function banterLine(heroId, event, de, rand) {
    const lines = BANTER_LINES[heroId] && BANTER_LINES[heroId][event];
    if (!lines || !lines.length) return null;
    const key = `${heroId}:${event}`;
    let deck = _decks[key];
    if (!deck || !deck.length) {
        deck = lines.map((_, i) => i);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        _decks[key] = deck;
    }
    const entry = lines[deck.pop()];
    return (de && entry.de) ? entry.de : entry.en;
}
