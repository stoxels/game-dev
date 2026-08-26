//------------------------------------------------------------------------
//-------------------BASE CLASS DEFINITIONS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const CLASS_DEFS = {

    // MATHMAGICIAN (Mage archetype)
    mathmagician: {
        id: 'mathmagician',
        icon: '🔮',
        nameEn: 'Mathmagician',
        nameDE: 'Mathemagier',
        descEn: 'Wield the arcane power of probability. Master of chance and revelation.',
        descDE: 'Führe die arkane Macht der Wahrscheinlichkeit. Meister des Zufalls und Chancen.',
        color: '#9b59b6',
        colorLight: '#c39bd3',

        passive: {
            nameEn: 'Variance Shield',
            nameDE: 'Varianzschild',
            levels: [
                {
                    level: 1,
                    descEn: 'Start each level with 1 free mistake.',
                    descDE: 'Beginne jedes Level mit 1 freiem Fehler.',
                    effect: { freeMistakes: 1 }
                },
                {
                    level: 2,
                    descEn: 'Start each level with 2 free mistakes.',
                    descDE: 'Beginne jedes Level mit 2 freien Fehlern.',
                    effect: { freeMistakes: 2 }
                },
                {
                    level: 3,
                    descEn: 'Start each level with 3 free mistakes.',
                    descDE: 'Beginne jedes Level mit 3 freien Fehlern.',
                    effect: { freeMistakes: 3 }
                },
            ]
        },

        active1: {
            nameEn: 'Arcane Reveal',
            nameDE: 'Arkane Enthüllung',
            descCursorEn: 'Select a cell to reveal a limited amount of correct neighhbours.',
            descCursorDE: 'Wähle eine Zelle, um eine begrenzte Anzahl korrekter Nachbarn zu enthüllen.',
            cooldownSeconds: 300,
            manaCost: 50,
            levels: [
                {
                    level: 1,
                    descEn: 'Select a cell to reveal up to 4 correct neighbours within 1 step. Cooldown: 5 minutes.',
                    descDE: 'Wähle eine Zelle, um bis zu 4 korrekte Nachbarn im Umkreis von 1 Schritt zu enthüllen. Abklingzeit: 5 Minuten.',
                    effect: { radius: 1, maxReveals: 4 }
                },
                {
                    level: 2,
                    descEn: 'Select a cell to reveal up to 5 correct neighbours within 2 steps. Cooldown: 5 minutes.',
                    descDE: 'Wähle eine Zelle, um bis zu 5 korrekte Nachbarn im Umkreis von 2 Schritten zu enthüllen. Abklingzeit: 5 Minuten.',
                    effect: { radius: 2, maxReveals: 5 }
                },
                {
                    level: 3,
                    descEn: 'Select a cell to reveal up to 6 correct neighbours within 3 steps. Cooldown: 5 minutes.',
                    descDE: 'Wähle eine Zelle, um bis zu 6 korrekte Nachbarn im Umkreis von 3 Schritten zu enthüllen. Abklingzeit: 5 Minuten.',
                    effect: { radius: 3, maxReveals: 6 }
                },
            ]
        },

        active2: {
            nameEn: 'Absolute Zero',
            nameDE: 'Absoluter Nullpunkt',
            descCursorEn: 'Click a cell to freeze time and click without causing mistakes',
            descCursorDE: 'Klicke eine Zelle zum Einfrieren der Zeit und klicke danach schnell ohne Fehler zu verursachen',
            cooldownSeconds: 300,
            manaCost: 40,
            levels: [
                {
                    level: 1,
                    descEn: 'Freeze the timer for 1s. Mistakes cause no penalties. Cooldown: 5 minutes.',
                    descDE: 'Friere die Zeit für 1s ein. Fehler verursachen keine Strafen. Abklingzeit: 5 Minuten.',
                    effect: { freezeDuration: 1000 }
                },
                {
                    level: 2,
                    descEn: 'Freeze the timer for 1.5s. Mistakes cause no penalties. Cooldown: 5 minutes.',
                    descDE: 'Friere die Zeit für 1.5 ein. Fehler verursachen keine Strafen. Abklingzeit: 5 Minuten.',
                    effect: { freezeDuration: 1500 }
                },
                {
                    level: 3,
                    descEn: 'Freeze the timer for 2s. Mistakes cause no penalties. Cooldown: 5 minutes.',
                    descDE: 'Friere die Zeit für 2s ein. Fehler verursachen keine Strafen. Abklingzeit: 5 Minuten.',
                    effect: { freezeDuration: 2000 }
                },
            ]
        },

    },

    // STATISTICIAN (Warrior archetype)
    statistician: {
        id: 'statistician',
        icon: '⚔️',
        nameEn: 'Statistician',
        nameDE: 'Statistiker',
        descEn: 'Harness the power of data. Every mistake is a sample. Every victory is a distribution.',
        descDE: 'Nutze die Macht der Daten aus. Jeder Fehler ist eine Stichprobe. Jeder Sieg eine Verteilung.',
        color: '#e74c3c',
        colorLight: '#f1948a',

        passive: {
            nameEn: 'Momentum',
            nameDE: 'Momentum',
            levels: [
                {
                    level: 1,
                    descEn: 'Every 15 correct fills in a row without mistake grant +10 seconds added to the timer.',
                    descDE: '15 korrekte Klicks hintereinander ohne Fehler geben +10 Sekunden mehr Zeit.',
                    effect: { streakForBonus: 15, bonusSeconds: 10 }
                },
                {
                    level: 2,
                    descEn: 'Every 15 correct fills in a row without mistake grant +15 seconds added to the timer.',
                    descDE: '15 korrekte Klicks hintereinander ohne Fehler geben +15 Sekunden mehr Zeit.',
                    effect: { streakForBonus: 15, bonusSeconds: 15 }
                },
                {
                    level: 3,
                    descEn: 'Every 15 correct fills in a row without mistake grant +20 seconds added to the timer.',
                    descDE: '15 korrekte Klicks hintereinander ohne Fehler geben +20 Sekunden mehr Zeit.',
                    effect: { streakForBonus: 15, bonusSeconds: 20 }
                },
            ]
        },

        active1: {
            nameEn: 'Data Strike',
            nameDE: 'Datenhieb',
            descCursorEn: 'Click a cell to make your choice between row or column.',
            descCursorDE: 'Klicke auf eine Zelle um deine Wahl zwischen Zeile oder Spalte zu treffen.',
            cooldownSeconds: 300,
            manaCost: 50,
            levels: [
                {
                    level: 1,
                    descEn: 'Choose between instantly revealing 5 unfilled correct cells in 1 random unsolved row or column. Cooldown: 5 minutes.',
                    descDE: 'Wähle zwischen dem sofortigen Lösen von 5 ungelösten Zellen in einer zufälligen ungelösten Zeile oder Spalte. Abklingzeit: 5 Minuten.',
                    effect: { solveCount: 1, revealCap: 5 }
                },
                {
                    level: 2,
                    descEn: 'Choose between instantly revealing 6 unfilled correct cells in 2 random unsolved rows or columns each. Cooldown: 5 minutes.',
                    descDE: 'Wähle zwischen dem sofortigen Lösen von jeweils 6 ungelösten Zellen in 2 zufälligen ungelösten Zeilen oder Spalten. Abklingzeit: 5 Minuten.',
                    effect: { solveCount: 2, revealCap: 6 }
                },
                {
                    level: 3,
                    descEn: 'Choose between instantly revealing 7 unfilled correct cells in 3 random unsolved rows or columns each. Cooldown: 5 minutes.',
                    descDE: 'Wähle zwischen dem sofortigen Lösen von jeweils 7 ungelösten Zellen in 3 zufälligen ungelösten Zeilen oder Spalten. Abklingzeit: 5 Minuten.',
                    effect: { solveCount: 3, revealCap: 7 }
                },
            ]
        },

        active2: {
            nameEn: 'Diagonal Strike',
            nameDE: 'Diagonalschlag',
            descCursorEn: 'Select a cell to strike.',
            descCursorDE: 'Wähle eine Zelle zum Zuschlagen aus.',
            cooldownSeconds: 180,
            manaCost: 40,
            levels: [
                {
                    level: 1,
                    descEn: 'Strike diagonally through a cell. Reveals up to 5 unfilled correct cells. Cooldown: 3 minutes.',
                    descDE: 'Gehe diagonal durch eine Zelle. Löst bis zu 5 ungelöste Zellen. Abklingzeit: 3 Minuten.',
                    effect: { diagonals: 1, revealCap: 5 }
                },
                {
                    level: 2,
                    descEn: 'Strike diagonally through a cell. Covers both diagonals. Reveals up to 7 unfilled correct cells. Cooldown: 3 minutes.',
                    descDE: 'Gehe diagonal durch eine Zelle. Erfasst beide Diagonalen. Löst bis zu 7 ungelöste Zellen. Abklingzeit: 3 Minuten.',
                    effect: { diagonals: 2, revealCap: 7 }
                },
                {
                    level: 3,
                    descEn: 'Strike diagonally, horizontally and vertically through a cell. Reveals up to 10 unfilled correct cells. Cooldown: 3 minutes.',
                    descDE: 'Gehe diagonal, horizontal und vertikal durch eine Zelle. Löst bis zu 10 ungelöste Zellen. Abklingzeit: 3 Minuten.',
                    effect: { diagonals: 4, revealCap: 10 }
                },
            ]
        },

    },

    // PROBABILIST (Ranger archetype)
    probabilist: {
        id: 'probabilist',
        icon: '🎯',
        nameEn: 'Probabilist',
        nameDE: 'Probabilist',
        descEn: 'Calculate the odds. Strike with precision. The sample space is your hunting ground.',
        descDE: 'Berechne die Chancen. Schlage präzise zu. Die Ergebnismenge ist dein Jagdrevier.',
        color: '#27ae60',
        colorLight: '#58d68d',

        passive: {
            nameEn: 'Bayesian Insight',
            nameDE: 'Bayesianische Einsicht',
            levels: [
                {
                    level: 1,
                    descEn: 'When the level loads, 2 random empty cells are automatically marked with ✕.',
                    descDE: 'Beim Laden des Levels werden 2 zufällige leere Zellen automatisch mit ✕ markiert.',
                    effect: { autoMarkCount: 2 }
                },
                {
                    level: 2,
                    descEn: 'When the level loads, 5 random empty cells are automatically marked with ✕.',
                    descDE: 'Beim Laden des Levels werden 5 zufällige leere Zellen automatisch mit ✕ markiert.',
                    effect: { autoMarkCount: 5 }
                },
                {
                    level: 3,
                    descEn: 'When the level loads, 10 random empty cells are automatically marked with ✕.',
                    descDE: 'Beim Laden des Levels werden 10 zufällige leere Zellen automatisch mit ✕ markiert.',
                    effect: { autoMarkCount: 10 }
                },
            ]
        },

        active1: {
            nameEn: 'Precision Shot',
            nameDE: 'Präzisionsschuss',
            descCursorEn: 'Click a cell to mark up to 5 wrong cells in its row and column with ✕',
            descCursorDE: 'Klicke eine Zelle, um bis zu 5 falsche Zellen in Zeile und Spalte mit ✕ zu markieren',
            cooldownSeconds: 300,
            manaCost: 45,
            levels: [
                {
                    level: 1,
                    descEn: 'Click a cell to mark up to 5 wrong cells in that row and column with ✕. Cooldown: 5 minutes.',
                    descDE: 'Klicke eine Zelle um bis zu 5 falsche Zellen in dieser Zeile und Spalte mit einem ✕ zu markieren. Abklingzeit: 5 Minuten.',
                    effect: { crossMark: true, extraLines: 0 }
                },
                {
                    level: 2,
                    descEn: 'Click a cell to mark up to 6 wrong cells in that row, column and 1 adjacent row and column with ✕. Cooldown: 5 minutes.',
                    descDE: 'Klicke eine Zelle um bis zu 6 falsche Zellen in dieser Zeile, Spalte, und 1 angrenzende Zeile und Spalte mit ✕ zu markieren. Abklingzeit: 5 Minuten',
                    effect: { crossMark: true, extraLines: 1 }
                },
                {
                    level: 3,
                    descEn: 'Click a cell to mark up to 7 wrong cells in that row, column and 2 adjacent rows and columns with ✕. Cooldown: 5 minutes.',
                    descDE: 'Klicke eine Zelle um bis zu 7 falsche Zellen in dieser Zeile, Spalte, und 2 angrenzenden Zeilen und Spalten mit ✕ zu markieren. Abklingzeit: 5 Minuten',
                    effect: { crossMark: true, extraLines: 2 }
                },
            ]
        },

        active2: {
            nameEn: 'Rain of Arrows',
            nameDE: 'Pfeilregen',
            descCursorEn: 'Click a cell to scan that area',
            descCursorDE: 'Klicke eine Zelle an, um diesen Bereich zu scannen',
            cooldownSeconds: 300,
            manaCost: 35,
            levels: [
                {
                    level: 1,
                    descEn: 'Scans a 2×2 region on the grid for 1 second. Cooldown: 5 minutes.',
                    descDE: 'Scannt eine 2×2-Region auf dem Spielfeld für 1 Sekunde. Abklingzeit: 5 Minuten.',
                    effect: { scanSize: 2, scanDuration: 1000 }
                },
                {
                    level: 2,
                    descEn: 'Scans a 3×3 region on the grid for 1.5 seconds. Cooldown: 5 minutes.',
                    descDE: 'Enthüllt eine 3×3-Region auf dem Spielfeld für 1,5 Sekunden. Abklingzeit: 5 Minuten.',
                    effect: { scanSize: 3, scanDuration: 1500 }
                },
                {
                    level: 3,
                    descEn: 'Reveals a 4×4 region on the grid for 2 seconds. Cooldown: 5 minutes.',
                    descDE: 'Enthüllt eine 4×4-Region auf dem Spielfeld für 2 Sekunden. Abklingzeit: 5 Minuten.',
                    effect: { scanSize: 4, scanDuration: 2000 }
                },
            ]
        },
    }
};

const CLASS_LIST = ['statistician', 'mathmagician', 'probabilist'];


//------------------------------------------------------------------------
//-------------------BASE CLASS SPELL ICONS--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Per-spell locker icons for the class-upgrade screen (base classes only).
// Keyed by classId -> ability type ('passive' | 'active1' | 'active2').
const CLASS_SPELL_ICONS = {
    mathmagician: {
        passive: '💠',   // Variance Shield
        active1: '👁️',   // Arcane Reveal
        active2: '❄️',   // Absolute Zero
    },
    statistician: {
        passive: '♻️',   // Momentum
        active1: '🗡️',   // Data Strike
        active2: '✖️',   // Diagonal Strike
    },
    probabilist: {
        passive: '♟️',   // Bayesian Insight
        active1: '➶',   // Precision Shot
        active2: '🌠',   // Rain of Arrows
    },
};