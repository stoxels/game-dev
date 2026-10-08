//------------------------------------------------------------------------
//-------------------COMBAT PUZZLE GENERATOR DATA----------------------
//------------------------------------------------------------------------
// Static pools used by the procedural puzzle generator.
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------SYMBOL POOLS-----------------------------------------
//------------------------------------------------------------------------

// Glyphs that can be drawn as puzzle shapes. en/de names are used for the
// level hint + reveal text so both languages read naturally.

export const EG_GEN_SYMBOLS = [
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

    // Everything else - not limited to math structures
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

    // Greek - capitals & more
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

    // Math - relations, logic and set symbols
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

    // I Ching trigrams - perfect blocky nonogram material
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

    // Science & hazard - very much at home in Stoxels
    { ch: '☢', en: 'Radioactive',  de: 'Radioaktiv' },
    { ch: '☣', en: 'Biohazard',    de: 'Biogefährdung' },
    { ch: '⚗', en: 'Alembic',      de: 'Retorte' },
    { ch: '⚕', en: 'Staff Asclepius', de: 'Äskulapstab' },
    { ch: '⚛', en: 'Atom',         de: 'Atom' },

    // Time & misc
    { ch: '⏳', en: 'Hourglass Flowing', de: 'Sanduhr (laufend)' },
    { ch: '⚐', en: 'Flag Outline', de: 'Flagge (Umriss)' },
    { ch: '⌘', en: 'Command Key',  de: 'Befehlstaste' },
    { ch: '⌀', en: 'Diameter',     de: 'Durchmesser' },

    // Chess - remaining pieces
    { ch: '♚', en: 'Black King',   de: 'Schwarzer König' },
    { ch: '♜', en: 'Black Rook',   de: 'Schwarzer Turm' },
    { ch: '♝', en: 'Black Bishop', de: 'Schwarzer Läufer' },

    // Crosses & faith
    { ch: '✝', en: 'Latin Cross',  de: 'Lateinisches Kreuz' },
    { ch: '☩', en: 'Cross of Jerusalem', de: 'Jerusalemer Kreuz' },
    { ch: '☨', en: 'Cross of Lorraine',  de: 'Lothringer Kreuz' },
    { ch: '☦', en: 'Orthodox Cross',     de: 'Orthodoxes Kreuz' },
    { ch: '☧', en: 'Chi Rho',      de: 'Chi-Rho' },
    { ch: '⛨', en: 'Shield Cross', de: 'Schild mit Kreuz' },
    { ch: '✡', en: 'Star of David', de: 'Davidsstern' },

    // Astrological aspects & lunar nodes
    { ch: '☊', en: 'Ascending Node', de: 'Aufsteigender Knoten' },
    { ch: '☋', en: 'Descending Node', de: 'Absteigender Knoten' },
    { ch: '☌', en: 'Conjunction',  de: 'Konjunktion' },
    { ch: '☍', en: 'Opposition',   de: 'Opposition' },
    { ch: '⚹', en: 'Sextile',      de: 'Sextil' },
    { ch: '⚻', en: 'Quincunx',     de: 'Quincunx' },
    { ch: '☽', en: 'First Quarter Moon', de: 'Zunehmender Mond' },

    // Stars, sparkles & asterisks
    { ch: '✴', en: 'Eight-Pointed Black Star', de: 'Achtstrahlstern (gefüllt)' },
    { ch: '✳', en: 'Eight-Spoked Asterisk', de: 'Achtstrahl-Asterisk' },
    { ch: '❉', en: 'Balloon Asterisk', de: 'Ballon-Asterisk' },
    { ch: '❋', en: 'Heavy Teardrop Asterisk', de: 'Tropfen-Asterisk (dick)' },
    { ch: '❇', en: 'Sparkle',      de: 'Funkeln' },
    { ch: '❈', en: 'Heavy Sparkle', de: 'Funkeln (dick)' },
    { ch: '✻', en: 'Teardrop Asterisk', de: 'Tropfen-Asterisk' },

    // Divided circles
    { ch: '◑', en: 'Half Circle Right', de: 'Halbkreis (rechts)' },
    { ch: '◒', en: 'Half Circle Bottom', de: 'Halbkreis (unten)' },
    { ch: '◔', en: 'Circle Upper Quarter', de: 'Kreis (Viertel oben)' },
    { ch: '◕', en: 'Circle Half Black', de: 'Kreis (halb gefüllt)' },

    // Squares & corner triangles
    { ch: '▣', en: 'Square With Core', de: 'Quadrat mit Kern' },
    { ch: '▦', en: 'Grid Square',  de: 'Rasterquadrat' },
    { ch: '▩', en: 'Shaded Square', de: 'Schraffiertes Quadrat' },
    { ch: '▤', en: 'Lined Square', de: 'Quadrat (Linien)' },
    { ch: '◺', en: 'Lower Left Triangle', de: 'Dreieck unten links' },
    { ch: '◹', en: 'Upper Right Triangle', de: 'Dreieck oben rechts' },
    { ch: '◸', en: 'Upper Left Triangle', de: 'Dreieck oben links' },
    { ch: '◿', en: 'Lower Right Triangle', de: 'Dreieck unten rechts' },

    // Elder Futhark runes - bold strokes, ideal nonogram material
    { ch: 'ᚠ', en: 'Rune Fehu',    de: 'Rune Fehu' },
    { ch: 'ᚢ', en: 'Rune Uruz',    de: 'Rune Uruz' },
    { ch: 'ᚦ', en: 'Rune Thurisaz', de: 'Rune Thurisaz' },
    { ch: 'ᚨ', en: 'Rune Ansuz',   de: 'Rune Ansuz' },
    { ch: 'ᚱ', en: 'Rune Raidho',  de: 'Rune Raidho' },
    { ch: 'ᛉ', en: 'Rune Algiz',   de: 'Rune Algiz' },
    { ch: 'ᛞ', en: 'Rune Dagaz',   de: 'Rune Dagaz' },
    { ch: 'ᛟ', en: 'Rune Othala',  de: 'Rune Othala' },

    // Braille patterns - chunky dot grids
    { ch: '⣿', en: 'Full Braille Pattern', de: 'Braille-Muster (voll)' },
    { ch: '⠿', en: 'Six-Dot Braille', de: 'Braille (sechs Punkte)' },

    // I Ching hexagrams - blocky stacked bars
    { ch: '䷀', en: 'Hexagram Creation', de: 'Hexagramm Schöpfung' },
    { ch: '䷾', en: 'Hexagram Completion', de: 'Hexagramm Vollendung' },

    // Everyday objects & signals
    { ch: '✌', en: 'Victory Hand', de: 'Victory-Zeichen' },
    { ch: '☎', en: 'Telephone Sign', de: 'Telefonzeichen' },
    { ch: '⚔', en: 'Crossed Swords', de: 'Gekreuzte Schwerter' },
    { ch: '⏦', en: 'AC Sine Wave', de: 'Sinuswelle' },

    // Crosses - outlined & shadowed variants
    { ch: '✙', en: 'Outlined Greek Cross', de: 'Kreuz (umrissen)' },
    { ch: '✛', en: 'Heavy Open Cross', de: 'Dickes offenes Kreuz' },
    { ch: '✞', en: 'Shadowed Latin Cross', de: 'Kreuz mit Schatten' },
    { ch: '✟', en: 'Outlined Latin Cross', de: 'Lateinisches Kreuz (Umriss)' },

    // Snowflakes
    { ch: '❅', en: 'Snowflake Variant', de: 'Schneeflocke (Variante)' },
    { ch: '❆', en: 'Tight Snowflake', de: 'Schneeflocke (dicht)' },

    // Card suits - outline versions
    { ch: '♤', en: 'Spades Outline', de: 'Pik (Umriss)' },
    { ch: '♡', en: 'Hearts Outline', de: 'Herz (Umriss)' },
    { ch: '♧', en: 'Clubs Outline', de: 'Kreuz-Symbol (Umriss)' },
    { ch: '♢', en: 'Diamonds Outline', de: 'Karo (Umriss)' },
    { ch: '♙', en: 'White Pawn', de: 'Weißer Bauer' },

    // Hearts extra
    { ch: '❥', en: 'Rotated Heart', de: 'Gedrehtes Herz' },
    { ch: '❣', en: 'Heart Exclamation', de: 'Herz-Ausrufezeichen' },

    // Alchemy - classical elements
    { ch: '🜁', en: 'Alchemy Air',   de: 'Alchemie Luft' },
    { ch: '🜂', en: 'Alchemy Fire',  de: 'Alchemie Feuer' },
    { ch: '🜃', en: 'Alchemy Water', de: 'Alchemie Wasser' },
    { ch: '🜄', en: 'Alchemy Earth', de: 'Alchemie Erde' },

    // Technical & keyboard
    { ch: '⏚', en: 'Earth Ground', de: 'Erdung' },
    { ch: '⎓', en: 'Direct Current', de: 'Gleichstrom' },
    { ch: '⏏', en: 'Eject',        de: 'Auswerfen' },
    { ch: '⎋', en: 'Escape Key',   de: 'Escape-Taste' },
    { ch: '⌫', en: 'Backspace',    de: 'Löschen-Taste' },
    { ch: '⏎', en: 'Return Key',   de: 'Enter-Taste' },
    { ch: '⏻', en: 'Power Symbol', de: 'Ein-/Aus-Schalter' },

    // Target & nested shapes
    { ch: '◎', en: 'Bullseye',     de: 'Zielscheibe' },
    { ch: '◉', en: 'Fisheye',      de: 'Fischauge' },
    { ch: '◈', en: 'Diamond With Core', de: 'Raute mit Kern' },
    { ch: '▥', en: 'Patterned Square', de: 'Quadrat (Muster)' },
    { ch: '▧', en: 'Hatched Square', de: 'Quadrat (Schraffur)' },

    // Runes - more Elder Futhark
    { ch: 'ᚲ', en: 'Rune Kenaz',   de: 'Rune Kenaz' },
    { ch: 'ᚹ', en: 'Rune Wunjo',   de: 'Rune Wunjo' },
    { ch: 'ᛒ', en: 'Rune Berkano', de: 'Rune Berkano' },

    // Astrology - Ophiuchus & asteroids
    { ch: '⛎', en: 'Ophiuchus',   de: 'Schlangenträger' },
    { ch: '⚳', en: 'Pallas',       de: 'Pallas' },
    { ch: '⚴', en: 'Juno',         de: 'Juno' },
    { ch: '⚷', en: 'Chiron',       de: 'Chiron' },

    // Hands - filled pointers
    { ch: '☛', en: 'Pointing Right Black', de: 'Zeigende Hand rechts (schwarz)' },
    { ch: '☟', en: 'Pointing Down', de: 'Zeigende Hand unten' },
    { ch: '☚', en: 'Pointing Left Black', de: 'Zeigende Hand links (schwarz)' },

    // Typography marks
    { ch: '‽', en: 'Interrobang',  de: 'Interrobang' },
    { ch: '⁂', en: 'Asterism',     de: 'Asterismus' },
    { ch: '※', en: 'Reference Mark', de: 'Verweiszeichen' },
    { ch: '⚭', en: 'Wedding Rings', de: 'Eheringe' },
    { ch: '☬', en: 'Khanda',       de: 'Khanda' },
    { ch: '𝄞', en: 'Treble Clef',  de: 'Violinschlüssel' },

    // Weather & misc objects
    { ch: '☇', en: 'Lightning Streak', de: 'Blitzstrahl' },
    { ch: '☔', en: 'Rain Umbrella', de: 'Regenschirm (Regen)' },
    { ch: '⚚', en: 'Staff of Hermes', de: 'Hermesstab' },
    { ch: '➔', en: 'Wide Right Arrow', de: 'Pfeil nach rechts (dick)' },

    // Planets, astrology & zodiac - leftovers
    { ch: '⚶', en: 'Vesta',        de: 'Vesta' },

    // Weather & sky
    { ch: '⛅', en: 'Sun Behind Cloud', de: 'Sonne hinter Wolke' },
    { ch: '⛄', en: 'Snowman Without Snow', de: 'Schneemann (ohne Schnee)' },

    // Writing & marks
    { ch: '✒', en: 'Black Nib',    de: 'Schreibfeder' },
    { ch: '✔', en: 'Check Mark',   de: 'Häkchen' },
    { ch: '✘', en: 'Heavy Ballot X', de: 'Dickes X' },
    { ch: '✱', en: 'Heavy Asterisk', de: 'Sternchen (dick)' },
    { ch: '✵', en: 'Pinwheel Star', de: 'Windradstern' },
    { ch: '№', en: 'Numero Sign',  de: 'Nummer' },
    { ch: '℮', en: 'Estimated Sign', de: 'e-Zeichen' },
    { ch: '⁜', en: 'Double Cross', de: 'Doppelkreuz (Verweis)' },

    // Arrows
    { ch: '⇐', en: 'Double Left Arrow', de: 'Doppelpfeil links' },
    { ch: '↩', en: 'Hook Left Arrow', de: 'Abgebogener Pfeil links' },
    { ch: '↪', en: 'Hook Right Arrow', de: 'Abgebogener Pfeil rechts' },
    { ch: '➜', en: 'Round-Tipped Arrow', de: 'Pfeil (rund, dick)' },

    // Music
    { ch: '𝄐', en: 'Fermata',      de: 'Fermate' },
    { ch: '🀄', en: 'Mahjong Red Dragon', de: 'Mahjong Drache' },

    // Geometry - rectangles & triangles
    { ch: '▭', en: 'Rectangle',    de: 'Rechteck' },
    { ch: '◫', en: 'Vertical Rectangle', de: 'Rechteck (senkrecht)' },
    { ch: '⬒', en: 'Square Top Half', de: 'Quadrat (oben gefüllt)' },
    { ch: '⬓', en: 'Square Bottom Half', de: 'Quadrat (unten gefüllt)' },
    { ch: '▰', en: 'Parallelogram', de: 'Parallelogramm' },
    { ch: '◬', en: 'Triangle in Triangle', de: 'Dreieck im Dreieck' },
    { ch: '◭', en: 'Left-Half Triangle', de: 'Dreieck (halb gefüllt)' },
    { ch: '⏢', en: 'Trapezoid',    de: 'Trapez' },
    { ch: '⏣', en: 'Benzene Ring', de: 'Benzolring' },
    { ch: '⌗', en: 'Viewdata Square', de: 'Gitterquadrat' },

    // Runes - final Elder Futhark
    { ch: 'ᛗ', en: 'Rune Mannaz',  de: 'Rune Mannaz' },
    { ch: 'ᛜ', en: 'Rune Ingwaz',  de: 'Rune Ingwaz' },
    { ch: 'ᛏ', en: 'Rune Tiwaz',   de: 'Rune Tiwaz' },
    { ch: 'ᛋ', en: 'Rune Sowilo',  de: 'Rune Sowilo' },

    // Alchemy - compounds
    { ch: '🜍', en: 'Alchemy Sulfur', de: 'Alchemie Schwefel' },
    { ch: '🜔', en: 'Alchemy Salt', de: 'Alchemie Salz' },

    // Keyboard & system
    { ch: '⎌', en: 'Undo Symbol',  de: 'Rückgängig' },
    { ch: '⌦', en: 'Delete Key',   de: 'Entfernen-Taste' },
    { ch: '⎀', en: 'Insertion Symbol', de: 'Einfügemarke' },
    { ch: '⎚', en: 'Clear Screen', de: 'Bildschirm löschen' },
    { ch: '⌨', en: 'Keyboard',     de: 'Tastatur' },
    { ch: '⎙', en: 'Print Screen', de: 'Bildschirm drucken' },

    // Culture & everyday
    { ch: '⛩', en: 'Shinto Shrine', de: 'Shinto-Schrein' },
    { ch: '⛓', en: 'Chains',       de: 'Ketten' },
    { ch: '☏', en: 'White Telephone', de: 'Telefon (Umriss)' },
    { ch: '✇', en: 'Tape Head',    de: 'Tonbandkopf' },
    { ch: '☺', en: 'Smile Outline', de: 'Smiley (Umriss)' },
    { ch: '☻', en: 'Black Smiley', de: 'Smiley (schwarz)' },

    // Flowers & asterisks - final
    { ch: '☙', en: 'Reversed Floral Heart', de: 'Blütenherz (gespiegelt)' },
    { ch: '❃', en: 'Chevron Snowflake', de: 'Schneeflocke (Winkel)' },
    { ch: '✽', en: 'Heavy Teardrop Asterisk', de: 'Tropfen-Asterisk' },

    // Currency
    { ch: '¤', en: 'Currency Sign', de: 'Währungssymbol' },
    { ch: '₿', en: 'Bitcoin',      de: 'Bitcoin' },

    // Katakana - bold blocky strokes, excellent nonogram material
    { ch: 'ロ', en: 'Katakana Ro', de: 'Katakana Ro' },
    { ch: 'コ', en: 'Katakana Ko', de: 'Katakana Ko' },
    { ch: 'ニ', en: 'Katakana Ni', de: 'Katakana Ni' },
    { ch: 'ホ', en: 'Katakana Ho', de: 'Katakana Ho' },
    { ch: 'リ', en: 'Katakana Ri', de: 'Katakana Ri' },
    { ch: 'ヘ', en: 'Katakana He', de: 'Katakana He' },
    { ch: 'マ', en: 'Katakana Ma', de: 'Katakana Ma' },
    { ch: 'モ', en: 'Katakana Mo', de: 'Katakana Mo' },

    // Simple kanji - iconic pictographs
    { ch: '日', en: 'Kanji Sun',     de: 'Zeichen Sonne' },
    { ch: '月', en: 'Kanji Moon',    de: 'Zeichen Mond' },
    { ch: '山', en: 'Kanji Mountain', de: 'Zeichen Berg' },
    { ch: '田', en: 'Kanji Rice Field', de: 'Zeichen Reisfeld' },
    { ch: '王', en: 'Kanji King',    de: 'Zeichen König' },
    { ch: '中', en: 'Kanji Middle',  de: 'Zeichen Mitte' },
    { ch: '川', en: 'Kanji River',   de: 'Zeichen Fluss' },
    { ch: '十', en: 'Kanji Ten',     de: 'Zeichen Zehn' },

    // Hangul jamo - geometric letter blocks
    { ch: 'ㅁ', en: 'Hangul Mieum', de: 'Hangul Mieum' },
    { ch: 'ㅅ', en: 'Hangul Siots', de: 'Hangul Siot' },
    { ch: 'ㅈ', en: 'Hangul Jieut', de: 'Hangul Jieut' },
    { ch: 'ㅌ', en: 'Hangul Tieut', de: 'Hangul Tieut' },

    // Cyrillic capitals - striking symmetric forms
    { ch: 'Ж', en: 'Cyrillic Zhe', de: 'Kyrillisch Sche' },
    { ch: 'Ф', en: 'Cyrillic Ef',  de: 'Kyrillisch Ef' },
    { ch: 'Ц', en: 'Cyrillic Tse', de: 'Kyrillisch Ze' },
    { ch: 'Ш', en: 'Cyrillic Sha', de: 'Kyrillisch Scha' },
    { ch: 'Я', en: 'Cyrillic Ya',  de: 'Kyrillisch Ja' },

    // Semitic & Indic scripts
    { ch: 'א', en: 'Hebrew Alef',  de: 'Hebräisch Alef' },
    { ch: 'ש', en: 'Hebrew Shin',  de: 'Hebräisch Schin' },
    { ch: '۞', en: 'Rub El Hizb',  de: 'Rub-el-Hizb' },
    { ch: 'ॐ', en: 'Om Sign',      de: 'Om-Zeichen' },

    // Glagolitic - ancient Slavic letters
    { ch: 'Ⰰ', en: 'Glagolitic Az',   de: 'Glagolitisch Az' },
    { ch: 'Ⱄ', en: 'Glagolitic Slovo', de: 'Glagolitisch Slovo' },
    { ch: 'Ⱌ', en: 'Glagolitic Yest', de: 'Glagolitisch Yest' },

    // Divination marks
    { ch: '𝌀', en: 'Divination Monogram', de: 'Divinationsmonogramm' },

    // Music & chemistry extras
    { ch: '𝄆', en: 'Repeat Sign', de: 'Wiederholungszeichen' },
    { ch: '⌬', en: 'Benzene Ring Variant', de: 'Benzolring (Variante)' },

    // Geometry - striped circle, quarter circles, quadrant squares
    { ch: '◍', en: 'Striped Circle', de: 'Kreis (gestreift)' },
    { ch: '◲', en: 'Circle Lower Left Quarter', de: 'Kreis (Viertel unten links)' },
    { ch: '◳', en: 'Circle Lower Right Quarter', de: 'Kreis (Viertel unten rechts)' },
    { ch: '▚', en: 'Quadrant Pattern', de: 'Quadrantenmuster' },
    { ch: '▞', en: 'Quadrant Pattern Diagonal', de: 'Quadrantenmuster (diagonal)' },

    // Runes - remaining Elder Futhark
    { ch: 'ᚷ', en: 'Rune Gebo',    de: 'Rune Gebo' },
    { ch: 'ᛇ', en: 'Rune Eihwaz',  de: 'Rune Eihwaz' },
    { ch: 'ᛈ', en: 'Rune Perthro', de: 'Rune Perthro' },
    { ch: 'ᛚ', en: 'Rune Laguz',   de: 'Rune Laguz' },

    // Games - more mahjong & cards
    { ch: '🀅', en: 'Mahjong Green Dragon', de: 'Mahjong grüner Drache' },
    { ch: '🀆', en: 'Mahjong White Dragon', de: 'Mahjong weißer Drache' },
    { ch: '🂠', en: 'Playing Card Back', de: 'Kartenrückseite' },

    // Misc distinct marks
    { ch: '⛬', en: 'Historic Site', de: 'Historische Stätte' },
    { ch: '⚿', en: 'Key in Square', de: 'Schlüssel im Quadrat' },
    { ch: '〰', en: 'Wavy Dash',   de: 'Wellenlinie' },
];

// Grid sizes the generator can draw into. Higher map tiers bias toward the
// larger entries. minCells filters out everything below the floor set by
// the "% larger Puzzle Grids" map mod.
// Encounter-chain caps: 15×30 is the widest allowed, 20×20 is the max when
// rows >15 (>15 rows && >20 cols is banned). Sizes beyond that are kept
// out of the pool so chains stay fun.
export const EG_GEN_SIZES = [
    { rows: 5,  cols: 5 },   //   25 cells → small
    { rows: 5,  cols: 10 },  //   50 cells → small
    { rows: 10, cols: 10 },  //  100 cells → medium
    { rows: 10, cols: 15 },  //  150 cells → medium
    { rows: 15, cols: 15 },  //  225 cells → large
    { rows: 15, cols: 20 },  //  300 cells → large
    { rows: 12, cols: 20 },  //  240 cells → large
    { rows: 10, cols: 25 },  //  250 cells → large
    { rows: 14, cols: 20 },  //  280 cells → large
    { rows: 12, cols: 25 },  //  300 cells → large
    { rows: 10, cols: 30 },  //  300 cells → large (wide format)
    { rows: 14, cols: 25 },  //  350 cells → large
    { rows: 12, cols: 30 },  //  360 cells → large (wide format)
    { rows: 15, cols: 25 },  //  375 cells → large
    { rows: 15, cols: 30 },  //  450 cells → massive (wide format, cap)
    { rows: 20, cols: 20 },  //  400 cells → massive (cap when tall)
];

// Grid-size buckets (same thresholds as EG_GRID_SIZE_BUCKETS in
// endgame-maps.js). A requested bucket constrains which sizes are drawn.
export const EG_GEN_BUCKETS = {
    small:   [1, 99],
    medium:  [100, 199],
    large:   [200, 399],
    massive: [400, Infinity],
};

export const EG_GEN_FONT_STACK =
    '"Segoe UI Symbol","Segoe UI Emoji","Noto Sans Symbols2","Noto Sans Symbols",Arial,serif';


//------------------------------------------------------------------------
export const EG_GEN_RANDOM_REVEALS = [
    { en: 'A pattern woven by pure chance - order emerged anyway.', de: 'Ein vom reinen Zufall gewebtes Muster - und trotzdem entstand Ordnung.' },
    { en: 'The noise condensed into structure, exactly once.', de: 'Das Rauschen verdichtete sich zu einer Struktur - genau einmalig.' },
    { en: 'No sigil, no symbol: just randomness given form.', de: 'Kein Sigill, kein Symbol: nur Zufall, der Gestalt annimmt.' },
    { en: 'A shape sampled from the space of all possible shapes.', de: 'Eine Form, gezogen aus dem Raum aller möglichen Formen.' },
    { en: 'One realization of a random walk through the grid.', de: 'Eine Realisierung einer Zufallsbewegung über das Raster.' },
    { en: 'Coin flips, mirrored until they looked intentional.', de: 'Münzwürfe, gespiegelt, bis sie absichtlich aussahen.' },
    { en: 'Entropy painted this - then thought better of erasing it.', de: 'Die Entropie malte dies - und verzichtete dann doch auf das Löschen.' },
];

