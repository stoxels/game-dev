//------------------------------------------------------------------------
//-------------------ENDGAME PUZZLE GENERATOR-----------------------------
//------------------------------------------------------------------------
// Procedurally generates nonogram puzzle levels for endgame map runs so
// the chain is no longer limited to story puzzles from the world list.
//
// Two generation modes:
//   'symbol' — rasterises a glyph onto an offscreen canvas (Greek letters,
//              math operators, card suits, weather, ... any Unicode symbol)
//              and downsamples the pixels into a binary solution grid
//   'random' — random structures of various sizes: drunkard-walk blobs,
//              refined by cellular-automata smoothing, optionally mirrored
//   'mixed'  — per puzzle: 70% symbol / 30% random
//
// Generated levels are appended to ALL and flagged with isGeneratedPuzzle
// so _egBuildChainPool() never leaks them into the story pool. They carry
// a real world number (random 1..WORLDS.length) so backgrounds, BGM and
// all cur.world consumers keep working unchanged.
//
// Entry point:
//   _egCreateGeneratedLevel(opts) → gi | null
//     opts: { mode:'symbol'|'random'|'mixed', tier:Number, minCells:Number }
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------SYMBOL POOLS-----------------------------------------
//------------------------------------------------------------------------

// Glyphs that can be drawn as puzzle shapes. en/de names are used for the
// level hint + reveal text so both languages read naturally.

const EG_GEN_SYMBOLS = [
    // Greek letters
    { ch: 'α', en: 'Alpha',        de: 'Alpha' },
    { ch: 'β', en: 'Beta',         de: 'Beta' },
    { ch: 'γ', en: 'Gamma',        de: 'Gamma' },
    { ch: 'δ', en: 'Delta',        de: 'Delta' },
    { ch: 'ε', en: 'Epsilon',      de: 'Epsilon' },
    { ch: 'θ', en: 'Theta',        de: 'Theta' },
    { ch: 'λ', en: 'Lambda',       de: 'Lambda' },
    { ch: 'μ', en: 'Mu',           de: 'Mu' },
    { ch: 'π', en: 'Pi',           de: 'Pi' },
    { ch: 'ρ', en: 'Rho',          de: 'Rho' },
    { ch: 'σ', en: 'Sigma',        de: 'Sigma' },
    { ch: 'τ', en: 'Tau',          de: 'Tau' },
    { ch: 'φ', en: 'Phi',          de: 'Phi' },
    { ch: 'χ', en: 'Chi',          de: 'Chi' },
    { ch: 'ψ', en: 'Psi',          de: 'Psi' },
    { ch: 'Ω', en: 'Omega',        de: 'Omega' },

    // Math operators
    { ch: '∞', en: 'Infinity',     de: 'Unendlich' },
    { ch: '√', en: 'Root',         de: 'Wurzel' },
    { ch: '∑', en: 'Sum',          de: 'Summe' },
    { ch: '∫', en: 'Integral',     de: 'Integral' },
    { ch: '∂', en: 'Partial',      de: 'Partiell' },
    { ch: '∇', en: 'Nabla',        de: 'Nabla' },
    { ch: '∆', en: 'Delta Sign',   de: 'Delta-Zeichen' },
    { ch: '≠', en: 'Unequal',      de: 'Ungleich' },
    { ch: '≈', en: 'Approximate',  de: 'Ungefähr' },
    { ch: '±', en: 'Plus-Minus',   de: 'Plus-Minus' },
    { ch: '∈', en: 'Element Of',   de: 'Element von' },
    { ch: '∅', en: 'Empty Set',    de: 'Leere Menge' },
    { ch: '∪', en: 'Union',        de: 'Vereinigung' },
    { ch: '∩', en: 'Intersection', de: 'Schnittmenge' },
    { ch: 'Ø', en: 'Average',      de: 'Durchschnitt' },
    { ch: 'µ', en: 'Micro',        de: 'Mikro' },

    // Everything else — not limited to math structures
    { ch: '♠', en: 'Spades',       de: 'Pik' },
    { ch: '♥', en: 'Hearts',       de: 'Herz' },
    { ch: '♦', en: 'Diamonds',     de: 'Karo' },
    { ch: '♣', en: 'Clubs',        de: 'Kreuz' },
    { ch: '★', en: 'Star',         de: 'Stern' },
    { ch: '☀', en: 'Sun',          de: 'Sonne' },
    { ch: '☾', en: 'Moon',         de: 'Mond' },
    { ch: '❄', en: 'Snowflake',    de: 'Schneeflocke' },
    { ch: '⚡', en: 'Lightning',    de: 'Blitz' },
    { ch: '☂', en: 'Umbrella',     de: 'Regenschirm' },
    { ch: '☘', en: 'Clover',       de: 'Kleeblatt' },
    { ch: '♪', en: 'Note',         de: 'Note' },
    { ch: '♫', en: 'Notes',        de: 'Noten' },
    { ch: '⚓', en: 'Anchor',       de: 'Anker' },
    { ch: '⚑', en: 'Flag',         de: 'Flagge' },
    { ch: '✈', en: 'Airplane',     de: 'Flugzeug' },
    { ch: '✉', en: 'Letter',       de: 'Brief' },
    { ch: '⌂', en: 'House',        de: 'Haus' },
    { ch: '✚', en: 'Cross',        de: 'Kreuz-Zeichen' },
    { ch: '❤', en: 'Heart',        de: 'Herz-Zeichen' },

    // Greek — capitals & more
    { ch: 'Ζ', en: 'Zeta',         de: 'Zeta' },
    { ch: 'Η', en: 'Eta',          de: 'Eta' },
    { ch: 'Ι', en: 'Iota',         de: 'Iota' },
    { ch: 'Κ', en: 'Kappa',        de: 'Kappa' },
    { ch: 'Ν', en: 'Nu',           de: 'Ny' },
    { ch: 'Ξ', en: 'Xi',           de: 'Xi' },
    { ch: 'Ο', en: 'Omicron',      de: 'Omikron' },
    { ch: 'Π', en: 'Pi Capital',   de: 'Pi (groß)' },
    { ch: 'Σ', en: 'Sigma Capital', de: 'Sigma (groß)' },
    { ch: 'Υ', en: 'Upsilon',      de: 'Upsilon' },
    { ch: 'Φ', en: 'Phi Capital',  de: 'Phi (groß)' },
    { ch: 'Ψ', en: 'Psi Capital',  de: 'Psi (groß)' },

    // Math — relations, logic and set symbols
    { ch: '≤', en: 'Less Equal',   de: 'Kleiner gleich' },
    { ch: '≥', en: 'Greater Equal', de: 'Größer gleich' },
    { ch: '≡', en: 'Identical',    de: 'Identisch' },
    { ch: '∝', en: 'Proportional', de: 'Proportional zu' },
    { ch: '⊥', en: 'Perpendicular', de: 'Senkrecht' },
    { ch: '∥', en: 'Parallel',     de: 'Parallel' },
    { ch: '∴', en: 'Therefore',    de: 'Daraus folgt' },
    { ch: '∵', en: 'Because',      de: 'Weil' },
    { ch: '⊗', en: 'Tensor Product', de: 'Tensorprodukt' },
    { ch: '⊕', en: 'Direct Sum',   de: 'Direkte Summe' },
    { ch: '⊂', en: 'Subset',       de: 'Teilmenge' },
    { ch: '⊆', en: 'Subset Equal', de: 'Teilmenge (eq)' },
    { ch: 'ℝ', en: 'Real Numbers', de: 'Reelle Zahlen' },
    { ch: 'ℕ', en: 'Natural Numbers', de: 'Natürliche Zahlen' },
    { ch: 'ℚ', en: 'Rational Numbers', de: 'Rationale Zahlen' },
    { ch: 'ℂ', en: 'Complex Numbers', de: 'Komplexe Zahlen' },
    { ch: '∀', en: 'For All',      de: 'Für alle' },
    { ch: '∃', en: 'There Exists', de: 'Es existiert' },
    { ch: '¬', en: 'Negation',     de: 'Negation' },
    { ch: '∧', en: 'And',          de: 'Und' },
    { ch: '∨', en: 'Or',           de: 'Oder' },
    { ch: '‰', en: 'Per Mille',    de: 'Promille' },

    // Arrows
    { ch: '↑', en: 'Up Arrow',     de: 'Pfeil nach oben' },
    { ch: '↓', en: 'Down Arrow',   de: 'Pfeil nach unten' },
    { ch: '→', en: 'Right Arrow',  de: 'Pfeil nach rechts' },
    { ch: '←', en: 'Left Arrow',   de: 'Pfeil nach links' },
    { ch: '↔', en: 'Left-Right Arrow', de: 'Doppelpfeil' },
    { ch: '↯', en: 'Zigzag Arrow', de: 'Blitzpfeil' },

    // Chess pieces
    { ch: '♔', en: 'White King',   de: 'Weißer König' },
    { ch: '♕', en: 'White Queen',  de: 'Weiße Königin' },
    { ch: '♖', en: 'White Rook',   de: 'Weißer Turm' },
    { ch: '♗', en: 'White Bishop', de: 'Weißer Läufer' },
    { ch: '♘', en: 'White Knight', de: 'Weißer Springer' },
    { ch: '♟', en: 'Black Pawn',   de: 'Schwarzer Bauer' },
    { ch: '♞', en: 'Black Knight', de: 'Schwarzer Springer' },
    { ch: '♛', en: 'Black Queen',  de: 'Schwarze Königin' },

    // Planets & zodiac
    { ch: '☿', en: 'Mercury',      de: 'Merkur' },
    { ch: '♀', en: 'Venus',        de: 'Venus' },
    { ch: '♂', en: 'Mars',         de: 'Mars' },
    { ch: '♃', en: 'Jupiter',      de: 'Jupiter' },
    { ch: '♄', en: 'Saturn',       de: 'Saturn' },
    { ch: '♅', en: 'Uranus',       de: 'Uranus' },
    { ch: '♆', en: 'Neptune',      de: 'Neptun' },
    { ch: '♇', en: 'Pluto',        de: 'Pluto' },
    { ch: '♈', en: 'Aries',        de: 'Widder' },
    { ch: '♉', en: 'Taurus',       de: 'Stier' },
    { ch: '♊', en: 'Gemini',       de: 'Zwillinge' },
    { ch: '♋', en: 'Cancer',       de: 'Krebs' },
    { ch: '♌', en: 'Leo',          de: 'Löwe' },
    { ch: '♍', en: 'Virgo',        de: 'Jungfrau' },
    { ch: '♎', en: 'Libra',        de: 'Waage' },
    { ch: '♏', en: 'Scorpio',      de: 'Skorpion' },
    { ch: '♐', en: 'Sagittarius',  de: 'Schütze' },
    { ch: '♑', en: 'Capricorn',    de: 'Steinbock' },
    { ch: '♒', en: 'Aquarius',     de: 'Wassermann' },
    { ch: '♓', en: 'Pisces',       de: 'Fische' },

    // Dice & games
    { ch: '⚀', en: 'Die One',      de: 'Würfel Eins' },
    { ch: '⚂', en: 'Die Three',    de: 'Würfel Drei' },
    { ch: '⚄', en: 'Die Five',     de: 'Würfel Fünf' },
    { ch: '⚅', en: 'Die Six',      de: 'Würfel Sechs' },

    // Everyday objects & misc
    { ch: '✂', en: 'Scissors',     de: 'Schere' },
    { ch: '⚙', en: 'Gear',         de: 'Zahnrad' },
    { ch: '⚖', en: 'Scales',       de: 'Waage (Gerät)' },
    { ch: '⚠', en: 'Warning',      de: 'Warnung' },
    { ch: '♻', en: 'Recycle',      de: 'Recycling' },
    { ch: '⌛', en: 'Hourglass',    de: 'Sanduhr' },
    { ch: '☕', en: 'Coffee',       de: 'Kaffee' },
    { ch: '✆', en: 'Telephone',    de: 'Telefon' },
    { ch: '☁', en: 'Cloud',        de: 'Wolke' },
    { ch: '☼', en: 'Bright Sun',   de: 'Sonne (strahlend)' },
    { ch: '☃', en: 'Snowman',      de: 'Schneemann' },
    { ch: '✿', en: 'Flower',       de: 'Blume' },
    { ch: '❦', en: 'Floral Heart', de: 'Blütenherz' },
    { ch: '✦', en: 'Four-Pointed Star', de: 'Vierstrahlstern' },
    { ch: '✜', en: 'Heavy Cross',  de: 'Dickes Kreuz' },
    { ch: '❖', en: 'Diamond Dot',  de: 'Raute' },
    { ch: '⬢', en: 'Hexagon',      de: 'Sechseck' },
    { ch: '⬡', en: 'Hexagon Outline', de: 'Sechseck (Umriss)' },
    { ch: '○', en: 'Circle',       de: 'Kreis' },
    { ch: '△', en: 'Triangle',     de: 'Dreieck' },
    { ch: '□', en: 'Square',       de: 'Quadrat' },
    { ch: '◇', en: 'Diamond',      de: 'Rhombus' },
    { ch: '☆', en: 'Star Outline', de: 'Stern (Umriss)' },

    // Music notation
    { ch: '♩', en: 'Quarter Note', de: 'Viertelnote' },
    { ch: '♬', en: 'Beamed Notes', de: 'Noten (balken)' },
    { ch: '♭', en: 'Flat Sign',    de: 'B' },
    { ch: '♮', en: 'Natural Sign', de: 'Auflösungszeichen' },
    { ch: '♯', en: 'Sharp Sign',   de: 'Kreuz' },

    // Peace, belief & mythology
    { ch: '☮', en: 'Peace',        de: 'Frieden' },
    { ch: '☯', en: 'Yin Yang',     de: 'Yin Yang' },
    { ch: '☥', en: 'Ankh',         de: 'Ankh' },
    { ch: '☸', en: 'Dharma Wheel', de: 'Dharma-Rad' },
    { ch: '✠', en: 'Cross Potent', de: 'Prälatenkreuz' },
    { ch: '†', en: 'Dagger',       de: 'Kreuz (Dagger)' },
    { ch: '‡', en: 'Double Dagger', de: 'Doppelkreuz (Dagger)' },
    { ch: '☪', en: 'Star-Crescent', de: 'Stern und Halbmond' },

    // I Ching trigrams — perfect blocky nonogram material
    { ch: '☰', en: 'Trigram Heaven', de: 'Trigramm Himmel' },
    { ch: '☱', en: 'Trigram Lake',   de: 'Trigramm See' },
    { ch: '☲', en: 'Trigram Fire',   de: 'Trigramm Feuer' },
    { ch: '☳', en: 'Trigram Thunder', de: 'Trigramm Donner' },
    { ch: '☴', en: 'Trigram Wind',   de: 'Trigramm Wind' },
    { ch: '☵', en: 'Trigram Water',  de: 'Trigramm Wasser' },
    { ch: '☶', en: 'Trigram Mountain', de: 'Trigramm Berg' },
    { ch: '☷', en: 'Trigram Earth',  de: 'Trigramm Erde' },

    // Remaining dice faces
    { ch: '⚁', en: 'Die Two',      de: 'Würfel Zwei' },
    { ch: '⚃', en: 'Die Four',     de: 'Würfel Vier' },

    // Solid shapes
    { ch: '●', en: 'Filled Circle', de: 'Gefüllter Kreis' },
    { ch: '◐', en: 'Half Circle',  de: 'Halbkreis' },
    { ch: '◓', en: 'Half Circle Top', de: 'Halbkreis (oben)' },
    { ch: '▲', en: 'Filled Triangle', de: 'Gefülltes Dreieck' },
    { ch: '▼', en: 'Down Triangle', de: 'Dreieck nach unten' },
    { ch: '◆', en: 'Filled Diamond', de: 'Gefüllte Raute' },
    { ch: '■', en: 'Filled Square', de: 'Gefülltes Quadrat' },
    { ch: '◄', en: 'Left Pointer', de: 'Zeiger nach links' },
    { ch: '►', en: 'Right Pointer', de: 'Zeiger nach rechts' },

    // More arrows
    { ch: '⇒', en: 'Double Right Arrow', de: 'Doppelpfeil rechts' },
    { ch: '⇔', en: 'Double Both Arrow',  de: 'Doppelpfeil beidseitig' },
    { ch: '⇑', en: 'Double Up Arrow',    de: 'Doppelpfeil hoch' },
    { ch: '⇓', en: 'Double Down Arrow',  de: 'Doppelpfeil runter' },
    { ch: '↺', en: 'Counterclockwise',   de: 'Gegen Uhrzeigersinn' },
    { ch: '↻', en: 'Clockwise',          de: 'Im Uhrzeigersinn' },
    { ch: '➤', en: 'Arrowhead',          de: 'Pfeilspitze' },

    // Star cluster
    { ch: '✶', en: 'Six-Pointed Star', de: 'Sechsstrahlstern' },
    { ch: '✷', en: 'Six-Pointed Star Fat', de: 'Sechsstrahlstern (fett)' },
    { ch: '✸', en: 'Eight-Pointed Star', de: 'Achtstrahlstern' },
    { ch: '✹', en: 'Twelve-Pointed Star', de: 'Zwölfstrahlstern' },
    { ch: '✺', en: 'Sixteen-Pointed Star', de: 'Sechzehnstrahlstern' },

    // Currency
    { ch: '€', en: 'Euro',         de: 'Euro' },
    { ch: '$', en: 'Dollar',       de: 'Dollar' },
    { ch: '¥', en: 'Yen',          de: 'Yen' },
    { ch: '£', en: 'Pound',        de: 'Pfund' },
    { ch: '¢', en: 'Cent',         de: 'Cent' },

    // Text & office marks
    { ch: '§', en: 'Section Sign', de: 'Paragraf' },
    { ch: '¶', en: 'Paragraph Mark', de: 'Absatzzeichen' },
    { ch: '©', en: 'Copyright',    de: 'Copyright' },
    { ch: '®', en: 'Registered',   de: 'Registriert' },
    { ch: '™', en: 'Trademark',    de: 'Marke' },

    // Hands, writing & tools
    { ch: '☜', en: 'Pointing Left',  de: 'Zeigende Hand links' },
    { ch: '☞', en: 'Pointing Right', de: 'Zeigende Hand rechts' },
    { ch: '☝', en: 'Pointing Up',    de: 'Zeigende Hand hoch' },
    { ch: '✍', en: 'Writing Hand',   de: 'Schreibende Hand' },
    { ch: '✎', en: 'Pencil',         de: 'Stift' },
    { ch: '⚒', en: 'Hammer Pick',    de: 'Hammer und Spitzhacke' },

    // Nature & weather
    { ch: '☄', en: 'Comet',        de: 'Komet' },
    { ch: '♨', en: 'Hot Springs',  de: 'Heiße Quelle' },
    { ch: '☈', en: 'Thunderstorm', de: 'Gewitter' },
    { ch: '❁', en: 'Flower Round', de: 'Blume (rund)' },
    { ch: '❀', en: 'Flower Outline', de: 'Blume (Umriss)' },
    { ch: '✾', en: 'Flower Six Petals', de: 'Sechsblütige Blume' },
    { ch: '⚘', en: 'Flower Stem',  de: 'Blume mit Stiel' },
    { ch: '❧', en: 'Rotated Floral Heart', de: 'Blütenherz (gedreht)' },

    // Science & hazard — very much at home in Stoxels
    { ch: '☢', en: 'Radioactive',  de: 'Radioaktiv' },
    { ch: '☣', en: 'Biohazard',    de: 'Biogefährdung' },
    { ch: '⚗', en: 'Alembic',      de: 'Retorte' },
    { ch: '⚕', en: 'Staff Asclepius', de: 'Äskulapstab' },
    { ch: '⚛', en: 'Atom',         de: 'Atom' },
    { ch: '⚛', en: 'Atom',         de: 'Atom' },

    // Time & misc
    { ch: '⏳', en: 'Hourglass Flowing', de: 'Sanduhr (laufend)' },
    { ch: '⚐', en: 'Flag Outline', de: 'Flagge (Umriss)' },
    { ch: '⌘', en: 'Command Key',  de: 'Befehlstaste' },
    { ch: '⌀', en: 'Diameter',     de: 'Durchmesser' },
];

// Grid sizes the generator can draw into. Higher map tiers bias toward the
// larger entries. minCells filters out everything below the floor set by
// the "% larger Puzzle Grids" map mod.
const EG_GEN_SIZES = [
    { rows: 5,  cols: 5 },   //   25 cells → small
    { rows: 5,  cols: 10 },  //   50 cells → small
    { rows: 10, cols: 10 },  //  100 cells → medium
    { rows: 10, cols: 15 },  //  150 cells → medium
    { rows: 15, cols: 15 },  //  225 cells → large
    { rows: 15, cols: 20 },  //  300 cells → large
    { rows: 20, cols: 20 },  //  400 cells → massive
    { rows: 20, cols: 25 },  //  500 cells → massive
];

// Grid-size buckets (same thresholds as EG_GRID_SIZE_BUCKETS in
// endgame-maps.js). A requested bucket constrains which sizes are drawn.
const EG_GEN_BUCKETS = {
    small:   [1, 99],
    medium:  [100, 199],
    large:   [200, 399],
    massive: [400, Infinity],
};

const EG_GEN_FONT_STACK =
    '"Segoe UI Symbol","Segoe UI Emoji","Noto Sans Symbols2","Noto Sans Symbols",Arial,serif';


//------------------------------------------------------------------------
//-------------------MODE 1: SYMBOL RASTERISER----------------------------
//------------------------------------------------------------------------

// Draws the given character onto an offscreen canvas at supersampled
// resolution, then downsamples pixel coverage into a rows×cols binary grid.
// Tries progressively lower coverage thresholds until the fill ratio lands
// in a comfortable nonogram band; returns null when nothing was drawable.
function _egRasterizeSymbolGrid(ch, rows, cols) {
    if (typeof document === 'undefined') return null;

    const SS = 6;                       // supersample factor per grid cell
    const W = cols * SS;
    const H = rows * SS;

    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Fit the glyph: start large, measure, then scale so it fills ~92% of
    // the box on its dominant axis.
    let fontSize = Math.min(W, H);
    ctx.font = fontSize + 'px ' + EG_GEN_FONT_STACK;
    const m = ctx.measureText(ch);
    const gw = Math.max(1, m.width);
    const gh = Math.max(1,
        (m.actualBoundingBoxAscent || fontSize * 0.7) +
        (m.actualBoundingBoxDescent || fontSize * 0.25));
    const fit = Math.min((W * 0.92) / gw, (H * 0.92) / gh);
    fontSize = Math.max(10, Math.floor(fontSize * fit));
    ctx.font = fontSize + 'px ' + EG_GEN_FONT_STACK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, W / 2, H / 2);

    let data;
    try {
        data = ctx.getImageData(0, 0, W, H).data;
    } catch (e) {
        return null;
    }

    // Average alpha coverage per target cell (supersampling → smooth edges).
    const cover = Array.from({ length: rows }, () => new Float32Array(cols));
    const block = SS * SS;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let sum = 0;
            for (let y = 0; y < SS; y++) {
                const rowBase = ((r * SS + y) * W + c * SS) * 4;
                for (let x = 0; x < SS; x++) sum += data[rowBase + x * 4 + 3];
            }
            cover[r][c] = sum / (block * 255);
        }
    }

    const binarize = th => cover.map(row => Array.from(row, v => v >= th ? 1 : 0));

    let best = null;
    let bestDist = Infinity;
    for (const th of [0.45, 0.35, 0.28, 0.22, 0.16, 0.10]) {
        const grid = binarize(th);
        let filled = 0;
        grid.forEach(row => row.forEach(v => filled += v));
        const ratio = filled / (rows * cols);
        const dist = Math.abs(ratio - 0.38);
        if (dist < bestDist) { bestDist = dist; best = grid; }
        if (ratio >= 0.20 && ratio <= 0.60) return grid;   // comfortable band
    }
    return best;
}


//------------------------------------------------------------------------
//-------------------MODE 2: RANDOM STRUCTURES---------------------------
//------------------------------------------------------------------------

// One cellular-automata smoothing pass: cells with many filled neighbours
// solidify, isolated cells vanish — turns noisy walks into organic blobs.
function _egSmoothStructure(grid, rows, cols) {
    const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let n = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const rr = r + dr, cc = c + dc;
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) n += grid[rr][cc];
                }
            }
            out[r][c] = n >= 5 ? 1 : (n <= 2 ? 0 : grid[r][c]);
        }
    }
    return out;
}

// Counts fill stats used to accept/reject a candidate structure.
function _egStructureStats(grid, rows, cols) {
    let filled = 0;
    let liveRows = 0;
    let liveCols = 0;
    for (let r = 0; r < rows; r++) {
        let rowHas = false;
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c]) continue;
            filled++;
            rowHas = true;
        }
        if (rowHas) liveRows++;
    }
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (grid[r][c]) { liveCols++; break; }
        }
    }
    return { filled, liveRows, liveCols };
}

// Generates one random structure: drunkard-walk blobs with directional
// momentum, CA smoothing, optional mirroring. Returns null if no valid
// candidate is found within the retry budget.
function _egGenerateRandomStructure(rows, cols) {
    const cells = rows * cols;

    for (let attempt = 0; attempt < 12; attempt++) {
        const targetFill = 0.32 + Math.random() * 0.26;
        let grid = Array.from({ length: rows }, () => new Array(cols).fill(0));

        // 1–3 walkers carve the shape; momentum keeps runs straight so the
        // result reads as structure instead of pure noise.
        const walkerCount = cells > 220 ? 3 : (cells > 80 ? 2 : 1);
        const walkers = Array.from({ length: walkerCount }, () => ({
            r: Math.floor(Math.random() * rows),
            c: Math.floor(Math.random() * cols),
            dr: 0,
            dc: 0,
        }));
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const steps = Math.ceil(targetFill * cells);

        for (let i = 0; i < steps; i++) {
            const w = walkers[i % walkerCount];
            grid[w.r][w.c] = 1;
            // 60% keep direction, else turn
            if (!(w.dr === 0 && w.dc === 0) && Math.random() < 0.6) {
                // keep
            } else {
                const d = dirs[Math.floor(Math.random() * dirs.length)];
                w.dr = d[0];
                w.dc = d[1];
            }
            w.r = Math.min(rows - 1, Math.max(0, w.r + w.dr));
            w.c = Math.min(cols - 1, Math.max(0, w.c + w.dc));
        }

        // Organic refinement
        grid = _egSmoothStructure(grid, rows, cols);
        if (Math.random() < 0.5) grid = _egSmoothStructure(grid, rows, cols);

        // Optional symmetry — mirrored halves feel far more "designed"
        const symRoll = Math.random();
        if (symRoll < 0.45) {          // horizontal mirror
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols >> 1; c++)
                    grid[r][cols - 1 - c] = grid[r][c];
        } else if (symRoll < 0.65) {   // vertical mirror
            for (let r = 0; r < rows >> 1; r++)
                for (let c = 0; c < cols; c++)
                    grid[rows - 1 - r][c] = grid[r][c];
        }

        // Acceptance check: sane density and enough clue-bearing lines
        const s = _egStructureStats(grid, rows, cols);
        const ratio = s.filled / cells;
        if (ratio < 0.20 || ratio > 0.70) continue;
        if (s.liveRows < rows * 0.7 || s.liveCols < cols * 0.7) continue;
        return grid;
    }

    // Fallback: seeded scatter + heavy smoothing — always yields something
    let grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.random() < 0.42 ? 1 : 0));
    grid = _egSmoothStructure(_egSmoothStructure(grid, rows, cols), rows, cols);
    return grid;
}


//------------------------------------------------------------------------
//-------------------LEVEL FACTORY---------------------------------------
//------------------------------------------------------------------------

// Picks a grid size: honours the minCells floor from map mods and, when a
// size bucket is requested, only draws sizes inside that bucket's range.
// Biases toward bigger grids as the map tier climbs. Falls back to the
// closest eligible size when no size sits inside the bucket window.
function _egPickGeneratedSize(tier, minCells, bucket) {
    let lo = minCells || 0;
    let hi = Infinity;
    if (bucket && EG_GEN_BUCKETS[bucket]) {
        lo = Math.max(lo, EG_GEN_BUCKETS[bucket][0]);
        hi = EG_GEN_BUCKETS[bucket][1];
    }

    let list = EG_GEN_SIZES.filter(s => {
        const cells = s.rows * s.cols;
        return cells >= lo && cells <= hi;
    });

    // Nothing inside the window (e.g. tiny bucket + high minCells floor):
    // use the smallest size that still satisfies the floor.
    if (!list.length) {
        const above = EG_GEN_SIZES
            .filter(s => s.rows * s.cols >= lo)
            .sort((a, b) => (a.rows * a.cols) - (b.rows * b.cols));
        list = above.length ? [above[0]] : [EG_GEN_SIZES[EG_GEN_SIZES.length - 1]];
    }

    const weights = list.map((s, i) => 1 + i * Math.min(0.6, tier * 0.08));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
}

function _egPickRandomSymbol() {
    return EG_GEN_SYMBOLS[Math.floor(Math.random() * EG_GEN_SYMBOLS.length)];
}

const EG_GEN_RANDOM_REVEALS = [
    { en: 'A pattern woven by pure chance — order emerged anyway.', de: 'Ein vom reinen Zufall gewebtes Muster — und trotzdem entstand Ordnung.' },
    { en: 'The noise condensed into structure, exactly once.', de: 'Das Rauschen verdichtete sich zu einer Struktur — genau einmalig.' },
    { en: 'No sigil, no symbol: just randomness given form.', de: 'Kein Sigill, kein Symbol: nur Zufall, der Gestalt annimmt.' },
    { en: 'A shape sampled from the space of all possible shapes.', de: 'Eine Form, gezogen aus dem Raum aller möglichen Formen.' },
    { en: 'One realization of a random walk through the grid.', de: 'Eine Realisierung einer Zufallsbewegung über das Raster.' },
    { en: 'Coin flips, mirrored until they looked intentional.', de: 'Münzwürfe, gespiegelt, bis sie absichtlich aussahen.' },
    { en: 'Entropy painted this — then thought better of erasing it.', de: 'Die Entropie malte dies — und verzichtete dann doch auf das Löschen.' },
];

// Builds one generated puzzle level, appends it to ALL and returns its gi.
// opts: { mode, tier, minCells } — mode defaults to 'mixed'.
// Returns null only if even the random fallback failed.
function _egCreateGeneratedLevel(opts) {
    if (typeof ALL === 'undefined') return null;
    opts = opts || {};
    const tier = Math.max(1, opts.tier || 1);
    const mode = opts.mode || 'mixed';

    let effMode = mode;
    if (mode === 'mixed') effMode = Math.random() < 0.7 ? 'symbol' : 'random';

    const size = _egPickGeneratedSize(tier, opts.minCells, opts.bucket);

    let grid = null;
    let symbolMeta = null;

    if (effMode === 'symbol') {
        // Try a few different glyphs — exotic characters may render empty
        // depending on installed fonts.
        for (let attempt = 0; attempt < 4 && !grid; attempt++) {
            symbolMeta = _egPickRandomSymbol();
            grid = _egRasterizeSymbolGrid(symbolMeta.ch, size.rows, size.cols);
        }
        if (!grid) effMode = 'random';
    }

    if (!grid) {
        grid = _egGenerateRandomStructure(size.rows, size.cols);
        symbolMeta = null;
    }
    if (!grid) return null;

    const gi = ALL.length;
    const level = {
        world: 1 + Math.floor(Math.random() * (typeof WORLDS !== 'undefined' ? WORLDS.length : 1)),
        li: 0,
        gIdx: gi,
        size: size.cols,
        grid: grid,
        timer: 1800,
        bonusType: 'nomiss',
        bonusParam: 0,
        isGeneratedPuzzle: true,
        genMode: effMode,
    };

    if (symbolMeta) {
        level.hint = `${symbolMeta.ch} ${symbolMeta.en}`;
        level.hintDE = `${symbolMeta.ch} ${symbolMeta.de}`;
        level.reveal = `The sigil of ${symbolMeta.en} emerges from the static.`;
        level.revealDE = `Das Sigill von ${symbolMeta.de} erscheint aus dem Rauschen.`;
        level.bonusHint = 'Finish without mistakes';
        level.bonusHintDE = 'Beende das Level ohne Fehler';
    } else {
        level.hint = 'Stochastic Pattern';
        level.hintDE = 'Stochastisches Muster';
        const flavor = EG_GEN_RANDOM_REVEALS[Math.floor(Math.random() * EG_GEN_RANDOM_REVEALS.length)];
        level.reveal = flavor.en;
        level.revealDE = flavor.de;
        level.bonusHint = 'Finish without mistakes';
        level.bonusHintDE = 'Beende das Level ohne Fehler';
    }

    ALL.push(level);
    return gi;
}
