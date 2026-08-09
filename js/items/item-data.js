
//------------------------------------------------------------------------
//-------------------------ITEM DATA--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


const ITEM_DEFS = {

    // REVEAL items - show N correct (unfilled) tiles in green
    reveal1: {
        id: 'reveal1', icon: '🕯️',
        nameEn: 'Candle', nameDE: 'Kerze',
        descEn: 'Reveals 1 correct cell', descDE: 'Enthüllt eine richtige Zelle ',
        rarity: 'common', weight: 10
    },
    reveal2: {
        id: 'reveal2', icon: '🔍',
        nameEn: 'Magnifier', nameDE: 'Lupe',
        descEn: 'Reveals 2 correct cell', descDE: 'Enthüllt 2 richtige Zellen',
        rarity: 'uncommon', weight: 8
    },
    reveal3: {
        id: 'reveal3', icon: '🔭',
        nameEn: 'Spyglass', nameDE: 'Fernglas',
        descEn: 'Reveals 3 correct cell', descDE: 'Enthüllt 3 richtige Zellen',
        rarity: 'rare', weight: 5
    },
    reveal4: {
        id: 'reveal4', icon: '📡',
        nameEn: 'Scanner', nameDE: 'Scanner',
        descEn: 'Reveals 4 correct cell', descDE: 'Enthüllt 4 richtige Zellen',
        rarity: 'epic', weight: 3
    },

    // ROW-SOLVE 
    rowSolve: {
        id: 'rowSolve', icon: '📐',
        nameEn: 'Set Square', nameDE: 'Geodreieck',
        descEn: 'Fully reveals a random unsolved row', descDE: 'Enthüllt eine zufällige ungelöste Zeile',
        rarity: 'legendary', weight: 4
    },

    // COL-SOLVE 
    colSolve: {
        id: 'colSolve', icon: '📏',
        nameEn: 'Ruler', nameDE: 'Lineal',
        descEn: 'Fully reveals a random unsolved column', descDE: 'Enthüllt eine zufällige ungelöste Spalte',
        rarity: 'legendary', weight: 4
    },

    // SCOUTS-PRIMER
    scoutPrimer: {
        id: 'scoutPrimer', icon: '📜',
        nameEn: "Scout's Primer", nameDE: 'Pfadfinder-Kompass',
        descEn: 'On your next level start, answer up to 5 questions. Each correct answer pre-solves a row & column!',
        descDE: 'Beim nächsten Level-Start erscheinen bis zu 5 Fragen. Jede richtige Antwort gibt eine vorgelöste Zeile & Spalte!',
        rarity: 'epic', weight: 4
    },

    // CODEX OF COMPLETION
    artifactComplete: {
        id: 'artifactComplete', icon: '🌟',
        nameEn: 'Codex of Completion', nameDE: 'Kodex der Fertigstellung',
        descEn: 'Instantly solves the entire puzzle.',
        descDE: 'Löst das gesamte Puzzle sofort.',
        rarity: 'artifact', weight: 0
    },

    // ----------------------------------------------------------------------------------------


    // MARK-WRONG items - place a ✕ on N empty-but-wrong cells
    // Helps the player eliminate impossible cells without guessing
    markWrong2: {
        id: 'markWrong2', icon: '✏️',
        nameEn: 'Eraser', nameDE: 'Radierer',
        descEn: 'Marks 2 wrong empty tiles', descDE: 'Markiert 2 leere Felder',
        rarity: 'common', weight: 10
    },
    markWrong4: {
        id: 'markWrong4', icon: '🧹',
        nameEn: 'Sweeper', nameDE: 'Besen',
        descEn: 'Marks 4 wrong empty tiles', descDE: 'Markiert 4 leere Felder',
        rarity: 'uncommon', weight: 8
    },
    markWrong6: {
        id: 'markWrong6', icon: '🧲',
        nameEn: 'Error Magnet', nameDE: 'Fehlermagnet',
        descEn: 'Marks 6 wrong empty tiles', descDE: 'Markiert 6 leere Felder',
        rarity: 'rare', weight: 5
    },
    markWrong8: {
        id: 'markWrong8', icon: '💎',
        nameEn: 'Error Gem', nameDE: 'Fehlerstein',
        descEn: 'Marks 8 wrong empty tiles', descDE: 'Markiert 8 leere Felder',
        rarity: 'epic', weight: 3
    },


    // ----------------------------------------------------------------------------------------

    // ADD-TIME items - extend the Timer by N seconds
    addTime60: {
        id: 'addTime60', icon: '⏳',
        nameEn: 'Hourglass', nameDE: 'Sanduhr',
        descEn: 'Adds 60 seconds', descDE: 'Fügt 60 Sek. hinzu',
        rarity: 'common', weight: 10
    },
    addTime300: {
        id: 'addTime300', icon: '⏱️', 
        nameEn: 'Stopwatch', nameDE: 'Stoppuhr',
        descEn: 'Adds 5 minutes', descDE: 'Fügt 5 Min. hinzu',
        rarity: 'uncommon', weight: 8
    },
    addTime600: {
        id: 'addTime600', icon: '🕰️',
        nameEn: 'Clock', nameDE: 'Uhr',
        descEn: 'Adds 10 minutes', descDE: 'Fügt 10 Min. hinzu',
        rarity: 'rare', weight: 5
    },
    addTime900: {
        id: 'addTime900', icon: '⚡',
        nameEn: 'Chronobolt', nameDE: 'Chronoblitz',
        descEn: 'Adds 15 minutes', descDE: 'Fügt 15 Min. hinzu',
        rarity: 'epic', weight: 3
    },


    // ----------------------------------------------------------------------------------------


    // UTILITY items

    shield: {
        id: 'shield', icon: '🛡️',
        nameEn: 'Shield', nameDE: 'Schild',
        descEn: 'Shielded from the next mistake', descDE: 'Negiert den nächsten Fehler',
        rarity: 'epic', weight: 4
    },

    mistakeEraser: {
        id: 'mistakeEraser', icon: '🎓',
        nameEn: 'Tutor', nameDE: 'Tutor',
        descEn: 'Reduces your mistake count by 2', descDE: 'Reduziert deine Fehleranzahl um 2',
        rarity: 'rare', weight: 5
    },
    mistakeEraser4: {
        id: 'mistakeEraser4', icon: '📚',
        nameEn: 'Professor', nameDE: 'Professor',
        descEn: 'Reduces your mistake count by 4', descDE: 'Reduziert deine Fehleranzahl um 4',
        rarity: 'epic', weight: 3
    },
    mistakeEraser6: {
        id: 'mistakeEraser6', icon: '🏛️',
        nameEn: 'Scholar', nameDE: 'Gelehrter',
        descEn: 'Reduces your mistake count by 6', descDE: 'Reduziert deine Fehleranzahl um 6',
        rarity: 'legendary', weight: 2
    },
    mistakeEraserAll: {
        id: 'mistakeEraserAll', icon: '🧿',
        nameEn: 'Grand Mentor', nameDE: 'Großer Mentor',
        descEn: 'Resets your mistake count to 0', descDE: 'Setzt deine Fehleranzahl auf 0 zurück',
        rarity: 'legendary', weight: 1
    },


    freeze: {
        id: 'freeze', icon: '❄️',
        nameEn: 'Time Freeze', nameDE: 'Zeitfrieren',
        descEn: '❄️ Freezes the timer for 2s',
        descDE: '❄️ Friert den Timer für 2s ein',
        rarity: 'epic', weight: 3
    },


    // ----------------------------------------------------------------------------------------


    // CURSED items 

    cursedReveal: {
        id: 'cursedReveal', icon: '☠️',
        nameEn: 'Cursed Lens', nameDE: 'Verfluchte Linse',
        descEn: 'Reveals 6 cells, but also resets all ✕ - marks',
        descDE: 'Enthüllt 6 Zellen, aber setzt auch alle ✕-Markierungen zurück',
        rarity: 'cursed', weight: 4
    },
    cursedTime: {
        id: 'cursedTime', icon: '💀',
        nameEn: 'Cursed Clock', nameDE: 'Verfluchte Uhr',
        descEn: 'Increase the timer by 20 minutes, but also blackouts row & column clues for 30s',
        descDE: 'Erhöht die Zeit um 20 Minuten, aber versteckt auch Zeilen - und Spaltenhinweise für 30s',
        rarity: 'cursed', weight: 4
    },
    cursedShield: {
        id: 'cursedShield', icon: '👁️',
        nameEn: 'Demon Eye', nameDE: 'Dämonenauge',
        descEn: 'Shields the next mistake and reveals 2 cells, but also blackouts row clues for 30s',
        descDE: 'Negiert den nächsten Fehler und enthüllt 2 Zellen, aber versteckt auch Zeilenhinweise für 30s',
        rarity: 'cursed', weight: 4
    },
    cursedRowSolve: {
        id: 'cursedRowSolve', icon: '🌊',
        nameEn: 'Tidal Wave', nameDE: 'Flutwelle',
        descEn: 'Reveals 3 rows, but also erases one other row',
        descDE: 'Enthüllt 3 Zeilen, aber löscht auch eine andere Zeile',
        rarity: 'cursed', weight: 3
    },
    cursedColSolve: {
        id: 'cursedColSolve', icon: '🌪️',
        nameEn: 'Vortex', nameDE: 'Wirbelwind',
        descEn: 'Reveals 3 columns, but also erases one other column',
        descDE: 'Enthüllt 3 Spalten, aber löscht auch eine andere Spalte',
        rarity: 'cursed', weight: 3
    },
    cursedRowCol: {
        id: 'cursedRowCol', icon: '💥',
        nameEn: 'Chaos Grid', nameDE: 'Chaos-Gitter',
        descEn: 'Reveals 4 rows and 4 cols, but also blackouts all column clues for 45s',
        descDE: 'Enthüllt 4 Zeilen und 4 Spalten, aber alle Spaltenhinweise werden für 45s ausgeblendet',
        rarity: 'cursed', weight: 2
    },


    // ----------------------------------------------------------------------------------------

    // PASSIVE-TREE-UNLOCKED ITEMS (weight: 0 — only obtainable when node is active)

    // Pearl of Haste — reduces active1 cooldown to 1 s
    pearlOfHaste: {
        id: 'pearlOfHaste', icon: '🔵',
        nameEn: 'Pearl of Haste', nameDE: 'Perle der Schnelligkeit',
        descEn: 'Reduces the cooldown of your first active class skill to 1 second.',
        descDE: 'Reduziert die Abklingzeit deiner ersten aktiven Klassenfähigkeit auf 1 Sekunde.',
        rarity: 'epic', weight: 0
    },

    // Pearl of Swiftness — reduces active2 cooldown to 1 s
    pearlOfSwiftness: {
        id: 'pearlOfSwiftness', icon: '🟣',
        nameEn: 'Pearl of Swiftness', nameDE: 'Perle der Gewandtheit',
        descEn: 'Reduces the cooldown of your second active class skill to 1 second.',
        descDE: 'Reduziert die Abklingzeit deiner zweiten aktiven Klassenfähigkeit auf 1 Sekunde.',
        rarity: 'epic', weight: 0
    },

    // Grand Pearl — reduces both cooldowns to 1 s
    grandPearl: {
        id: 'grandPearl', icon: '⚪',
        nameEn: 'Grand Pearl', nameDE: 'Große Perle',
        descEn: 'Reduces the cooldowns of both active class skills to 1 second.',
        descDE: 'Setzt die Abklingzeit beider aktiver Klassenfähigkeiten auf 1 Sekunde.',
        rarity: 'legendary', weight: 0
    },

    // The Witch — cursed immunity 60 s, -10 min timer
    theWitch: {
        id: 'theWitch', icon: '🧙',
        nameEn: 'The Witch', nameDE: 'Die Hexe',
        descEn: 'Grants immunity to all cursed item downsides for 60 seconds, but reduces the timer by 10 minutes.',
        descDE: 'Gewährt 60 Sekunden Immunität gegen negative Effekte verfluchter Gegenstände, reduziert aber den Timer um 10 Minuten.',
        rarity: 'cursed', weight: 0
    },

    // Golden Clock — stops timer decrease, timer items 100% more effective, max 3 more mistakes
    goldenClock: {
        id: 'goldenClock', icon: '🕰️',
        nameEn: 'Golden Clock', nameDE: 'Goldene Uhr',
        descEn: 'The timer can no longer decrease. Timer items are 100% more effective. However, only 3 more mistakes are allowed.',
        descDE: 'Der Timer kann nicht mehr sinken. Timer-Gegenstände sind 100% effektiver. Allerdings sind nur noch 3 weitere Fehler erlaubt.',
        rarity: 'legendary', weight: 0
    },

    // Shadow Seal — hides all clues, marks 75% wrong tiles, sets timer to 5 min
    shadowSeal: {
        id: 'shadowSeal', icon: '🌑',
        nameEn: 'Shadow Seal', nameDE: 'Schattensiegel',
        descEn: 'Permanently hides all row and column clues. Instantly marks 75% of all wrong empty tiles. Reduces the timer to 5 minutes.',
        descDE: 'Versteckt dauerhaft alle Zeilen- und Spaltenhinweise. Markiert sofort 75% aller falschen leeren Felder. Reduziert die Zeit auf 5 Minuten.',
        rarity: 'cursed', weight: 0
    },
};












