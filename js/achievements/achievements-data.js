// Phase 3 step 2: REAL ES MODULE - pure data, zero imports.
export const ACHIEVEMENT_DEFS = [

    //------------------------------------------------------------------------
    //--------------------COMPLETION------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------



    // ── LEVELS COMPLETED ────────────────────────
    {
        id: 'levels_completed',
        category: 'completion',
        icon: '🏁',
        nameEn: 'Finisher',
        nameDE: 'Abschließer',
        descEn: 'Complete levels.',
        descDE: 'Schließe Levels ab.',
        stat: 'levelsCompleted',
        tiers: [
            { threshold: 1, labelEn: 'First Step', labelDE: 'Erster Schritt' },
            { threshold: 13, labelEn: 'Getting Started', labelDE: 'Am Anfang' },
            { threshold: 65, labelEn: 'Puzzle Enthusiast', labelDE: 'Rätsel-Enthusiast' },
            { threshold: 130, labelEn: 'Dedicated Solver', labelDE: 'Engagierter Löser' },
            { threshold: 325, labelEn: 'Puzzle Veteran', labelDE: 'Rätsel-Veteran' },
        ]
    },



    // ── LEVELS COMPLETED NO-MISTAKE ─────────────
    {
        id: 'perfect_levels',
        category: 'completion',
        icon: '⭐',
        nameEn: 'Perfectionist',
        nameDE: 'Perfektionist',
        descEn: 'Complete levels without making a single mistake.',
        descDE: 'Schließe Level ohne einen einzigen Fehler ab.',
        stat: 'perfectLevels',
        tiers: [
            { threshold: 13, labelEn: 'Clean Slate', labelDE: 'Reiner Tisch' },
            { threshold: 39, labelEn: 'Flawless', labelDE: 'Makellos' },
            { threshold: 80, labelEn: 'Untouchable', labelDE: 'Unberührbar' },
            { threshold: 130, labelEn: 'Diamond Mind', labelDE: 'Diamantgeist' },
        ]
    },



    // ── LEVELS COMPLETED NO-ITEM ─────────────────
    {
        id: 'noitem_levels',
        category: 'completion',
        icon: '🎒',
        nameEn: 'Self-Reliant',
        nameDE: 'Selbstständig',
        descEn: 'Complete levels without using any items.',
        descDE: 'Schließe Level ohne den Einsatz von Items ab.',
        stat: 'noItemLevels',
        tiers: [
            { threshold: 13, labelEn: 'Going Solo', labelDE: 'Alleingang' },
            { threshold: 39, labelEn: 'Minimalist', labelDE: 'Minimalist' },
            { threshold: 80, labelEn: 'Ironclad', labelDE: 'Eisenhart' },
            { threshold: 130, labelEn: 'True Purist', labelDE: 'Echter Purist' },
        ]
    },



    // ── LEVELS COMPLETED NO-ITEM AND NO-MISTAKE ──
    {
        id: 'pure_levels',
        category: 'completion',
        icon: '💎',
        nameEn: 'Pure Logic',
        nameDE: 'Reine Logik',
        descEn: 'Complete levels without any mistakes and without using items.',
        descDE: 'Schließe Level ohne Fehler und ohne den Einsatz von Items ab.',
        stat: 'pureLevels',
        tiers: [
            { threshold: 13, labelEn: 'Crystal Clear', labelDE: 'Glasklar' },
            { threshold: 65, labelEn: 'Unassisted', labelDE: 'Ohne Hilfe' },
            { threshold: 130, labelEn: 'Logical Ascendant', labelDE: 'Logischer Aufsteiger' },
        ]
    },


    // ── LEVEL REPLAYED ────────────────────────────
    {
        id: 'level_replayed',
        category: 'completion',
        icon: '🔁',
        nameEn: 'Persistent',
        nameDE: 'Beharrlich',
        descEn: 'Replay a level you have already completed.',
        descDE: 'Wiederhole ein Level das du bereits abgeschlossen hast.',
        stat: 'levelsReplayed',
        tiers: [
            { threshold: 7, labelEn: 'Try Again', labelDE: 'Nochmal versuchen' },
            { threshold: 26, labelEn: 'Stubborn', labelDE: 'Stur' },
            { threshold: 65, labelEn: 'Obsessed', labelDE: 'Besessen' },
            { threshold: 130, labelEn: 'Relentless', labelDE: 'Unnachgiebig' }, 
            { threshold: 250, labelEn: 'Persistent', labelDE: 'Beharrlich' }, 
            { threshold: 650, labelEn: 'Unyielding', labelDE: 'Unbeugsam' }, 
            { threshold: 1300, labelEn: 'Indomitable', labelDE: 'Unbezwingbar' },
        ]
    },


    // ── PRIMER SOLVED ALL ─────────────────────────
    {
        id: 'primer_solved_all',
        category: 'completion',
        icon: '🎁',
        nameEn: 'Lucky Start',
        nameDE: 'Glücklicher Start',
        descEn: "Have the Scout's Primer headstart solve the entire puzzle for you.",
        descDE: 'Lass den Pfadfinder-Kompass-Vorsprung das gesamte Puzzle für dich lösen.',
        stat: 'primerSolvedAll',
        tiers: [
            { threshold: 1, labelEn: 'Blessed', labelDE: 'Gesegnet' },
            { threshold: 3, labelEn: 'Fortune Favours', labelDE: 'Glück begünstigt' },
        ]
    },


    // ── WORLD ALL BONUS CLAIMED ───────────────────
    {
        id: 'world_all_bonus',
        category: 'completion',
        icon: '🏆',
        nameEn: 'Completionist',
        nameDE: 'Perfektionist',
        descEn: 'Claim all bonus objectives in an entire world.',
        descDE: 'Erfülle alle Bonusziele in einer gesamten Welt.',
        stat: 'worldAllBonusClaimed',
        tiers: [
            { threshold: 1, labelEn: 'World Champion', labelDE: 'Weltmeister' },
            { threshold: 2, labelEn: 'Double Champion', labelDE: 'Doppelweltmeister' },
            { threshold: 5, labelEn: 'Grand Completionist', labelDE: 'Groß-Perfektionist' },
            { threshold: 10, labelEn: 'Ultimate Completionist', labelDE: 'Ultimativer Perfektionist' },
            { threshold: 14, labelEn: 'Completionist Supreme', labelDE: 'Supreme Perfektionist' },
        ]
    },


    // ── ALL LEVELS IN A WORLD COMPLETED ─────────────
    {
        id: 'world1_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 1 Complete',
        nameDE: 'Welt 1 Abgeschlossen',
        descEn: 'Complete all levels in World 1.',
        descDE: 'Schließe alle Level in Welt 1 ab.',
        stat: 'world1Complete',
        tiers: [
            { threshold: 1, labelEn: 'Probability Pioneer', labelDE: 'Wahrscheinlichkeits-Pionier' },
        ]
    },
    {
        id: 'world2_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 2 Complete',
        nameDE: 'Welt 2 Abgeschlossen',
        descEn: 'Complete all levels in World 2.',
        descDE: 'Schließe alle Level in Welt 2 ab.',
        stat: 'world2Complete',
        tiers: [
            { threshold: 1, labelEn: 'Combinatorics Conqueror', labelDE: 'Kombinatorik-Bezwinger' },
        ]
    },
    {
        id: 'world3_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 3 Complete',
        nameDE: 'Welt 3 Abgeschlossen',
        descEn: 'Complete all levels in World 3.',
        descDE: 'Schließe alle Level in Welt 3 ab.',
        stat: 'world3Complete',
        tiers: [
            { threshold: 1, labelEn: 'Random Variable Ranger', labelDE: 'Zufallsvariablen-Ranger' },
        ]
    },
    {
        id: 'world4_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 4 Complete',
        nameDE: 'Welt 4 Abgeschlossen',
        descEn: 'Complete all levels in World 4.',
        descDE: 'Schließe alle Level in Welt 4 ab.',
        stat: 'world4Complete',
        tiers: [
            { threshold: 1, labelEn: 'Expected Value Expert', labelDE: 'Erwartungswert-Experte' },
        ]
    },
    {
        id: 'world5_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 5 Complete',
        nameDE: 'Welt 5 Abgeschlossen',
        descEn: 'Complete all levels in World 5.',
        descDE: 'Schließe alle Level in Welt 5 ab.',
        stat: 'world5Complete',
        tiers: [
            { threshold: 1, labelEn: 'Distribution Dominator', labelDE: 'Verteilungsdominator' },
        ]
    },

    {
        id: 'world6_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 6 Complete',
        nameDE: 'Welt 6 Abgeschlossen',
        descEn: 'Complete all levels in World 6.',
        descDE: 'Schließe alle Level in Welt 6 ab.',
        stat: 'world6Complete',
        tiers: [
            { threshold: 1, labelEn: 'Variance Vanguard', labelDE: 'Varianz-Vorreiter' },
        ]
    },
    {
        id: 'world7_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 7 Complete',
        nameDE: 'Welt 7 Abgeschlossen',
        descEn: 'Complete all levels in World 7.',
        descDE: 'Schließe alle Level in Welt 7 ab.',
        stat: 'world7Complete',
        tiers: [
            { threshold: 1, labelEn: 'Probability Prodigy', labelDE: 'Wahrscheinlichkeits-Genie' },
        ]
    },


    {
        id: 'world8_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 8 Complete',
        nameDE: 'Welt 8 Abgeschlossen',
        descEn: 'Complete all levels in World 8.',
        descDE: 'Schließe alle Level in Welt 8 ab.',
        stat: 'world8Complete',
        tiers: [
            { threshold: 1, labelEn: 'Deviation Detective', labelDE: 'Abweichungs-Detektiv' },
        ]
    },
    {
        id: 'world9_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 9 Complete',
        nameDE: 'Welt 9 Abgeschlossen',
        descEn: 'Complete all levels in World 9.',
        descDE: 'Schließe alle Level in Welt 9 ab.',
        stat: 'world9Complete',
        tiers: [
            { threshold: 1, labelEn: 'Theorem Titan', labelDE: 'Theorem-Titan' },
        ]
    },
    {
        id: 'world10_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 10 Complete',
        nameDE: 'Welt 10 Abgeschlossen',
        descEn: 'Complete all levels in World 10.',
        descDE: 'Schließe alle Level in Welt 10 ab.',
        stat: 'world10Complete',
        tiers: [
            { threshold: 1, labelEn: 'Hypothesis Hero', labelDE: 'Hypothesen-Held' },
        ]
    },
    {
        id: 'world11_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 11 Complete',
        nameDE: 'Welt 11 Abgeschlossen',
        descEn: 'Complete all levels in World 11.',
        descDE: 'Schließe alle Level in Welt 11 ab.',
        stat: 'world11Complete',
        tiers: [
            { threshold: 1, labelEn: 'Regression Ruler', labelDE: 'Regressions-Regent' },
        ]
    },
    {
        id: 'world12_complete',
        category: 'completion',
        icon: '🌍',
        nameEn: 'World 12 Complete',
        nameDE: 'Welt 12 Abgeschlossen',
        descEn: 'Complete all levels in World 12.',
        descDE: 'Schließe alle Level in Welt 12 ab.',
        stat: 'world12Complete',
        tiers: [
            { threshold: 1, labelEn: 'Stochastic Overlord', labelDE: 'Stochastik-Overlord' },
        ]
    },
    {
        id: 'world13_complete',
        category: 'completion',
        icon: '🏆',
        nameEn: 'World 13 Complete',
        nameDE: 'Welt 13 Abgeschlossen',
        descEn: 'Complete all levels in World 13.',
        descDE: 'Schließe alle Level in Welt 13 ab.',
        stat: 'world13Complete',
        tiers: [
            { threshold: 1, labelEn: 'Grandmaster of Chance', labelDE: 'Großmeister des Zufalls' },
        ]
    },
    {
        id: 'world14_complete',
        category: 'completion',
        icon: '🌌',
        nameEn: 'World 14 Complete',
        nameDE: 'Welt 14 Abgeschlossen',
        descEn: 'Complete all levels in World 14.',
        descDE: 'Schließe alle Level in Welt 14 ab.',
        stat: 'world14Complete',
        tiers: [
            { threshold: 1, labelEn: 'Cartographer of the Nexus', labelDE: 'Kartograf des Nexus' },
        ]
    },


    // ── DIFFERENT WORLDS PLAYED ───────────────────
    {
        id: 'worlds_played',
        category: 'completion',
        icon: '🗺️',
        nameEn: 'Explorer',
        nameDE: 'Entdecker',
        descEn: 'Complete at least one level in different worlds.',
        descDE: 'Schließe mindestens ein Level in verschiedenen Welten ab.',
        stat: 'worldsPlayed',
        tiers: [
            { threshold: 3, labelEn: 'First Worlds', labelDE: 'Erste Welten' },
            { threshold: 7, labelEn: 'Explorer', labelDE: 'Entdecker' },
            { threshold: 10, labelEn: 'Adventurer', labelDE: 'Abenteurer' },
            { threshold: 14, labelEn: 'World Traveller', labelDE: 'Weltreisender' },
        ]
    },


    //------------------------------------------------------------------------
    //-------------------------------DIFFICULTY-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------




    // ── EASY DIFFICULTY LEVELS COMPLETED ─────────
    {
        id: 'easy_levels',
        category: 'difficulty',
        icon: '🟢',
        nameEn: 'Smooth Sailing',
        nameDE: 'Ruhige See',
        descEn: 'Complete levels on Easy difficulty.',
        descDE: 'Schließe Level auf Leicht ab.',
        stat: 'easyLevels',
        tiers: [
            { threshold: 7, labelEn: 'Casual Solver', labelDE: 'Gelegenheitsknacker' },
            { threshold: 20, labelEn: 'Puzzle Tourist', labelDE: 'Puzzle-Tourist' },
            { threshold: 39, labelEn: 'Gentle Navigator', labelDE: 'Sanfter Navigator' },
            { threshold: 80, labelEn: 'Easy Expert', labelDE: 'Leicht-Experte' },
            { threshold: 130, labelEn: 'Master of Leisure', labelDE: 'Meister der Gelassenheit' },
        ]
    },

    // ── NORMAL DIFFICULTY LEVELS COMPLETED ───────
    {
        id: 'normal_levels',
        category: 'difficulty',
        icon: '🔵',
        nameEn: 'Standard Deviation',
        nameDE: 'Standardabweichung',
        descEn: 'Complete levels on Normal difficulty.',
        descDE: 'Schließe Level auf Normal ab.',
        stat: 'normalLevels',
        tiers: [
            { threshold: 13, labelEn: 'Steady Mind', labelDE: 'Solider Geist' },
            { threshold: 33, labelEn: 'Reliable Solver', labelDE: 'Verlässlicher Löser' },
            { threshold: 60, labelEn: 'Methodical Thinker', labelDE: 'Methodischer Denker' },
            { threshold: 90, labelEn: 'Puzzle Veteran', labelDE: 'Puzzle-Veteran' },
            { threshold: 130, labelEn: 'Master of Balance', labelDE: 'Meister der Balance' },
        ]
    },


    // ── HARD DIFFICULTY LEVELS COMPLETED ─────────
    {
        id: 'hard_levels',
        category: 'difficulty',
        icon: '🔥',
        nameEn: 'Hard Boiled',
        nameDE: 'Hartgekocht',
        descEn: 'Complete levels on Hard difficulty.',
        descDE: 'Schließe Level auf Schwer ab.',
        stat: 'hardLevels',
        tiers: [
            { threshold: 7, labelEn: 'Hard Starter', labelDE: 'Schwer-Einsteiger' },
            { threshold: 20, labelEn: 'Hard Gainer', labelDE: 'Schwer-Aufsteiger' },
            { threshold: 39, labelEn: 'Masochist', labelDE: 'Masochist' },
            { threshold: 80, labelEn: 'Glutton for Pain', labelDE: 'Schmerzenssucher' },
            { threshold: 130, labelEn: 'Punishment Incarnate', labelDE: 'Verkörperte Strafe' },
        ]
    },

    // ── HARDCORE MODE LEVELS COMPLETED ───────────
    {
        id: 'hardcore_levels',
        category: 'difficulty',
        icon: '💀',
        nameEn: 'No Second Chances',
        nameDE: 'Keine zweite Chance',
        descEn: 'Complete levels in Hardcore mode.',
        descDE: 'Schließe Level im Hardcore-Modus ab.',
        stat: 'hardcoreLevels',
        tiers: [
            { threshold: 3, labelEn: 'Daredevil', labelDE: 'Draufgänger' },
            { threshold: 13, labelEn: 'Fearless', labelDE: 'Furchtlos' },
            { threshold: 33, labelEn: 'Immortal', labelDE: 'Unsterblich' },
            { threshold: 65, labelEn: 'Death Denier', labelDE: 'Todverweigerer' },
            { threshold: 130, labelEn: 'Legend Unbroken', labelDE: 'Ungebrochene Legende' },
        ]
    },

    // ── TIME TRIAL LEVELS COMPLETED ──────────────
    {
        id: 'timetrial_levels',
        category: 'difficulty',
        icon: '⚡',
        nameEn: 'Speed Runner',
        nameDE: 'Speed Runner',
        descEn: 'Complete levels in Time Trial mode.',
        descDE: 'Schließe Level im Time Trial Modus ab.',
        stat: 'timeTrialLevels',
        tiers: [
            { threshold: 3, labelEn: 'Against the Clock', labelDE: 'Gegen die Uhr' },
            { threshold: 13, labelEn: 'Quick Fingers', labelDE: 'Schnelle Finger' },
            { threshold: 33, labelEn: 'Lightning Solver', labelDE: 'Blitz-Löser' },
            { threshold: 65, labelEn: 'Time Bender', labelDE: 'Zeitbezwinger' },
            { threshold: 130, labelEn: 'Chronomancer', labelDE: 'Chronomant' },
        ]
    },


    // ── IRONMAN MODE LEVELS COMPLETED ────────────
    {
        id: 'ironman_levels',
        category: 'difficulty',
        icon: '⛓️',
        nameEn: 'Fe-Maleable Logic',
        nameDE: 'Eiserne Logik',
        descEn: 'Complete levels in Ironman mode.',
        descDE: 'Schließe Level im Ironman-Modus ab.',
        stat: 'ironmanLevels',
        tiers: [
            { threshold: 3, labelEn: 'Iron Will', labelDE: 'Eiserner Wille' },
            { threshold: 13, labelEn: 'Man of Steel', labelDE: 'Stahlmann' },
            { threshold: 33, labelEn: 'Unyielding', labelDE: 'Unbeugsam' },
            { threshold: 65, labelEn: 'Titanium Mind', labelDE: 'Titan-Geist' },
            { threshold: 130, labelEn: 'Adamant Champion', labelDE: 'Adamant-Champion' },
        ]
    },

    // ── CLASSLESS MODE LEVELS COMPLETED ──────────
    {
        id: 'classless_levels',
        category: 'difficulty',
        icon: '🚫',
        nameEn: 'Purely Intellectual',
        nameDE: 'Rein Intellektuell',
        descEn: 'Complete levels with the Classless modifier active.',
        descDE: 'Schließe Level mit dem Klassenlos-Modifikator ab.',
        stat: 'classlessLevels',
        tiers: [
            { threshold: 3, labelEn: 'No Magic Needed', labelDE: 'Keine Magie nötig' },
            { threshold: 13, labelEn: 'Self Made Scholar', labelDE: 'Selbstgemachter Gelehrter' },
            { threshold: 33, labelEn: 'Independent Thinker', labelDE: 'Unabhängiger Denker' },
            { threshold: 65, labelEn: 'Natural Genius', labelDE: 'Naturtalent' },
            { threshold: 130, labelEn: 'Mind Over Matter', labelDE: 'Geist über Materie' },
        ]
    },

    // ── TREELESS MODE LEVELS COMPLETED ───────────
    {
        id: 'treeless_levels',
        category: 'difficulty',
        icon: '🪓',
        nameEn: 'Deforested',
        nameDE: 'Abgeholzt',
        descEn: 'Complete levels with the Treeless modifier active.',
        descDE: 'Schließe Level mit dem Baumlos-Modifikator ab.',
        stat: 'treelessLevels',
        tiers: [
            { threshold: 3, labelEn: 'Rootless Victory', labelDE: 'Wurzelloser Sieg' },
            { threshold: 13, labelEn: 'Branching Out Solo', labelDE: 'Einzelgänger' },
            { threshold: 33, labelEn: 'Forest Exile', labelDE: 'Waldverbannter' },
            { threshold: 65, labelEn: 'Lumber Legend', labelDE: 'Holzfäller-Legende' },
            { threshold: 130, labelEn: 'Enemy of Nature', labelDE: 'Feind der Natur' },
        ]
    },


    //------------------------------------------------------------------------
    //---------------------------------GRID-----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------




    // ── TOTAL CELLS FILLED CORRECTLY ─────────────
    {
        id: 'cells_filled',
        category: 'grid',
        icon: '🔲',
        nameEn: 'Cell Filler',
        nameDE: 'Zellen-Füllen',
        descEn: 'Fill correct cells manually in puzzles.',
        descDE: 'Fülle richtige Zellen manuell im Puzzle.',
        stat: 'cellsFilled',
        tiers: [
            { threshold: 130, labelEn: 'First Hundred', labelDE: 'Erste Hundert' },
            { threshold: 650, labelEn: 'Builder', labelDE: 'Erbauer' },
            { threshold: 2600, labelEn: 'Architect', labelDE: 'Architekt' },
            { threshold: 13000, labelEn: 'Master Builder', labelDE: 'Meister-Erbauer' },
            { threshold: 65000, labelEn: 'God of Reveals', labelDE: 'Gott der Enthüllungen' },
        ]
    },

    // ── TILES REVEALED ───────────────────────────
    {
        id: 'tiles_revealed',
        category: 'grid',
        icon: '🔦',
        nameEn: 'Illuminator',
        nameDE: 'Erheller',
        descEn: 'Reveal correct tiles using reveal items or class abilities.',
        descDE: 'Enthülle richtige Felder mit Enthüllungs-Items oder Klassenfähigkeiten.',
        stat: 'tilesRevealed',
        tiers: [
            { threshold: 130, labelEn: 'First Light', labelDE: 'Erstes Licht' },
            { threshold: 650, labelEn: 'Torch Bearer', labelDE: 'Fackelträger' },
            { threshold: 2600, labelEn: 'Floodlight', labelDE: 'Flutlicht' },
            { threshold: 6500, labelEn: 'Oracle', labelDE: 'Orakel' },
            { threshold: 13000, labelEn: 'All-Seeing', labelDE: 'Allsehend' },
        ]
    },




    // ── WRONG TILES MARKED (✕) ──────────────────
    {
        id: 'tiles_marked',
        category: 'grid',
        icon: '✕',
        nameEn: 'Process of Elimination',
        nameDE: 'Ausschlussverfahren',
        descEn: 'Mark incorrect empty cells manually with ✕.',
        descDE: 'Markiere leere Felder manuell mit ✕.',
        stat: 'tilesMarked',
        tiers: [
            { threshold: 130, labelEn: 'First Cross', labelDE: 'Erstes Kreuz' },
            { threshold: 650, labelEn: 'Crossword Fan', labelDE: 'Kreuzworträtsel-Fan' },
            { threshold: 2600, labelEn: 'Eliminator', labelDE: 'Eliminator' },
            { threshold: 13000, labelEn: 'Master Deducer', labelDE: 'Meisterdetektiv' },
            { threshold: 65000, labelEn: 'God of Marks', labelDE: 'Gott der Markierungen' },
        ]
    },


    // ─── MARK-WRONG ITEMS OR CLASS ABILITIES──────────────────────────
    {
        id: 'ach_tiles_marked_wrong',
        category: 'grid',
        icon: '✏️',
        nameEn: 'Error Hunter',
        nameDE: 'Fehler-Jäger',
        descEn: 'Mark wrong tiles using mark items or class abilities.',
        descDE: 'Markiere falsche Felder mit Markierungs-Items oder Klassenfähigkeiten.',
        stat: 'tilesMarkedWrong',
        tiers: [
            { threshold: 130, labelEn: 'First Marks', labelDE: 'Erste Markierungen' },
            { threshold: 650, labelEn: 'Error Spotter', labelDE: 'Fehlersucher' },
            { threshold: 2600, labelEn: 'Systematic Hunter', labelDE: 'Systematischer Jäger' },
            { threshold: 6500, labelEn: 'Master Eliminator', labelDE: 'Meister-Eliminator' },
            { threshold: 13000, labelEn: 'God of Error Detection', labelDE: 'Gott der Fehlererkennung' },
        ]
    },



    // ── PERFECT BRACKETS OVERVIEW ─────────────────
    {
        id: 'small_perfect',
        category: 'grid',
        icon: '🎯',
        nameEn: 'Tiny Perfection',
        nameDE: 'Kleine Perfektion',
        descEn: 'Complete a Small puzzle (< 100 cells) with 0 mistakes and 0 items used.',
        descDE: 'Schließe ein kleines Puzzle (< 100 Zellen) ohne Fehler und ohne Items ab.',
        stat: 'smallPerfectClears',
        tiers: [
            { threshold: 1, labelEn: 'Perfect Starter', labelDE: 'Perfekter Start' },
            { threshold: 13, labelEn: 'Mini Master', labelDE: 'Mini-Meister' },
            { threshold: 33, labelEn: 'Pure and Simple', labelDE: 'Schlicht und einfach' },
        ]
    },
    {
        id: 'medium_perfect',
        category: 'grid',
        icon: '💎',
        nameEn: 'Flawless Mid-Size',
        nameDE: 'Mittlere Perfektion',
        descEn: 'Complete a Medium puzzle (100–199 cells) with 0 mistakes and 0 items used.',
        descDE: 'Schließe ein mittleres Puzzle (100–199 Zellen) ohne Fehler und ohne Items ab.',
        stat: 'mediumPerfectClears',
        tiers: [
            { threshold: 1, labelEn: 'Steady Mind', labelDE: 'Ruhiger Verstand' },
            { threshold: 13, labelEn: 'Standard Expert', labelDE: 'Standard-Experte' },
            { threshold: 33, labelEn: 'Flawless Routine', labelDE: 'Makellose Routine' },
        ]
    },
    {
        id: 'large_perfect',
        category: 'grid',
        icon: '👑',
        nameEn: 'Grand Architect',
        nameDE: 'Großarchitekt',
        descEn: 'Complete a Large puzzle (200–399 cells) with 0 mistakes and 0 items used.',
        descDE: 'Schließe ein großes Puzzle (200–399 Zellen) ohne Fehler und ohne Items ab.',
        stat: 'largePerfectClears',
        tiers: [
            { threshold: 1, labelEn: 'Macro Precision', labelDE: 'Makro-Präzision' },
            { threshold: 13, labelEn: 'Grand Master', labelDE: 'Großmeister' },
            { threshold: 33, labelEn: 'Calculated Perfection', labelDE: 'Berechnete Perfektion' },
        ]
    },
    {
        id: 'massive_perfect',
        category: 'grid',
        icon: '🌌',
        nameEn: 'God of Logic',
        nameDE: 'Gott der Logik',
        descEn: 'Complete a Massive puzzle (400+ cells) with 0 mistakes and 0 items used.',
        descDE: 'Schließe ein gewaltiges Puzzle (400+ Zellen) ohne Fehler und ohne Items ab.',
        stat: 'massivePerfectClears',
        tiers: [
            { threshold: 1, labelEn: 'Universal Mind', labelDE: 'Universeller Verstand' },
            { threshold: 13, labelEn: 'Infinite Patience', labelDE: 'Unendliche Geduld' },
            { threshold: 33, labelEn: 'Omniscient Solver', labelDE: 'Allwissender Löser' },
        ]
    },


    // ── DENSE GRID ────────────────────────────────
    {
        id: 'dense_grid',
        category: 'grid',
        icon: '⬛',
        nameEn: 'Dense Grid',
        nameDE: 'Dichtes Gitter',
        descEn: 'Complete a level where more than half the cells need to be filled.',
        descDE: 'Schließe ein Level ab, bei dem mehr als die Hälfte der Zellen gefüllt werden muss.',
        stat: 'denseGridClears',
        tiers: [
            { threshold: 13, labelEn: 'Packed', labelDE: 'Vollgepackt' },
            { threshold: 39, labelEn: 'Dense', labelDE: 'Dicht' },
            { threshold: 65, labelEn: 'Solid Block', labelDE: 'Massiv' },
        ]
    },


    // ── LUCKY TILES FOUND ────────────────────────
    {
        id: 'lucky_tiles_found',
        category: 'grid',
        icon: '🍀',
        nameEn: 'Lucky Charm',
        nameDE: 'Glücksbringer',
        descEn: 'Find lucky tiles.',
        descDE: 'Finde Glücksfelder.',
        stat: 'luckyTilesFound',
        tiers: [
            { threshold: 1, labelEn: 'First Find', labelDE: 'Erster Fund' },
            { threshold: 33, labelEn: 'Lucky Streak', labelDE: 'Glückssträhne' },
            { threshold: 65, labelEn: 'Fortune Hunter', labelDE: 'Glücksjäger' },
            { threshold: 130, labelEn: 'Four-Leaf Expert', labelDE: 'Kleeblatt-Experte' },
        ]
    },


    //------------------------------------------------------------------------
    //--------------------------------SCORE-----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------



    // ── TOTAL SCORE ──────────────────────────────
    {
        id: 'total_score',
        category: 'score',
        icon: '💰',
        nameEn: 'High Scorer',
        nameDE: 'Punktesammler',
        descEn: 'Accumulate total score across all playthroughs.',
        descDE: 'Sammle Gesamtpunkte über alle Spielläufe.',
        stat: 'totalScoreEarned',
        tiers: [
            { threshold: 1300, labelEn: 'Thousand Points', labelDE: 'Tausend Punkte' },
            { threshold: 13000, labelEn: 'Ten Thousand', labelDE: 'Zehntausend' },
            { threshold: 65000, labelEn: 'Fifty Grand', labelDE: 'Fünfzigtausend' },
            { threshold: 130000, labelEn: 'Century', labelDE: 'Jahrhundert' },
            { threshold: 260000, labelEn: 'Double Century', labelDE: 'Doppeltes Jahrhundert' },
        ]
    },



    // ── HIGH SCORE ON A SINGLE LEVEL ─────────────
    {
        id: 'high_score_level',
        category: 'score',
        icon: '🏅',
        nameEn: 'High Scorer',
        nameDE: 'Punkterekord',
        descEn: 'Earn 500 or more points on a single level.',
        descDE: 'Verdiene 500 oder mehr Punkte in einem einzigen Level.',
        stat: 'highScoreLevels',
        tiers: [
            { threshold: 13, labelEn: 'Big Points', labelDE: 'Viele Punkte' },
            { threshold: 39, labelEn: 'Point Machine', labelDE: 'Punktemaschine' },
            { threshold: 65, labelEn: 'Overachiever', labelDE: 'Überflieger' },
        ]
    },


    // ── PERSONAL BEST ─────────────────────────────
    {
        id: 'personal_best',
        category: 'score',
        icon: '📈',
        nameEn: 'Personal Best',
        nameDE: 'Persönlicher Rekord',
        descEn: 'Beat your own high score on a level you have completed before.',
        descDE: 'Übertreffe deinen eigenen Rekord in einem bereits abgeschlossenen Level.',
        stat: 'personalBestsBroken',
        tiers: [
            { threshold: 13, labelEn: 'New Record', labelDE: 'Neuer Rekord' },
            { threshold: 39, labelEn: 'Record Breaker', labelDE: 'Rekordbrechter' },
            { threshold: 65, labelEn: 'Self-Improver', labelDE: 'Selbstoptimierer' },
        ]
    },


    // ── HIGH MULTIPLIER ───────────────────────────
    {
        id: 'high_multiplier',
        category: 'score',
        icon: '✖️',
        nameEn: 'Multiplier Master',
        nameDE: 'Multiplikator-Meister',
        descEn: 'Complete a level with a score multiplier of 2.0 or higher.',
        descDE: 'Schließe ein Level mit einem Punktemultiplikator von 2,0 oder mehr ab.',
        stat: 'highMultiplierWins',
        tiers: [
            { threshold: 13, labelEn: 'Double Trouble', labelDE: 'Doppelter Ertrag' },
            { threshold: 39, labelEn: 'Stacked', labelDE: 'Gestapelt' },
            { threshold: 65, labelEn: 'Max Power', labelDE: 'Volle Kraft' },
        ]
    },

    //------------------------------------------------------------------------
    //--------------------------------TIME------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------




    // ── TIME ADDED THROUGH ITEMS / SKILLS ────────
    {
        id: 'time_added',
        category: 'time',
        icon: '⏳',
        nameEn: 'Time Lord',
        nameDE: 'Zeitherr',
        descEn: 'Add seconds to the timer using items, class abilities or probability tree nodes.',
        descDE: 'Füge dem Timer Sekunden durch Items, Klassenfähigkeiten oder Wahrscheinlichkeitsbaum-Knoten hinzu.',
        stat: 'timeAdded',  // in seconds
        tiers: [
            { threshold: 775, labelEn: 'Extra Minutes', labelDE: 'Extra Minuten' },
            { threshold: 6500, labelEn: 'Time Stretcher', labelDE: 'Zeitstrecker' },
            { threshold: 13000, labelEn: 'Quarter-Hour', labelDE: 'Viertelstunde' },
            { threshold: 65000, labelEn: 'Chronomancer', labelDE: 'Chronomant' },
            { threshold: 130000, labelEn: 'God of Time', labelDE: 'Gott der Zeit' },
            { threshold: 650000, labelEn: 'At the End of Time', labelDE: 'Am Ende der Zeit' },
        ]
    },



    // ── CLUTCH WIN ────────────────────────────────
    {
        id: 'clutch_win',
        category: 'time',
        icon: '⏰',
        nameEn: 'Clutch',
        nameDE: 'Auf den letzten Drücker',
        descEn: 'Win a level with 10 seconds or less remaining on the clock.',
        descDE: 'Gewinne ein Level mit 10 oder weniger Sekunden auf der Uhr.',
        stat: 'clutchWins',
        tiers: [
            { threshold: 1, labelEn: 'Photo Finish', labelDE: 'Fotofinish' },
            { threshold: 7, labelEn: 'Last Second Hero', labelDE: 'Held in letzter Sekunde' },
            { threshold: 20, labelEn: 'Adrenaline Junkie', labelDE: 'Adrenalinjunkie' },
        ]
    },



    // ── FAST CLEAR ────────────────────────────────
    {
        id: 'fast_clear',
        category: 'time',
        icon: '⚡',
        nameEn: 'Lightning Clear',
        nameDE: 'Blitzlösung',
        descEn: 'Complete a level in under 30 seconds.',
        descDE: 'Schließe ein Level in unter 30 Sekunden ab.',
        stat: 'fastClears',
        tiers: [
            { threshold: 13, labelEn: 'Speed Demon', labelDE: 'Speedläufer' },
            { threshold: 65, labelEn: 'Blink and Miss', labelDE: 'Im Nu vorbei' },
            { threshold: 130, labelEn: 'Flash Solver', labelDE: 'Blitzlöser' },
            { threshold: 250, labelEn: 'Speedforce', labelDE: 'Speedforce' },
        ]
    },

    // ── BIG TIME LEFT ─────────────────────────────
    {
        id: 'big_time_left',
        category: 'time',
        icon: '🕰️',
        nameEn: 'Time to Spare',
        nameDE: 'Noch Zeit übrig',
        descEn: 'Win a level with more than 30 minutes on the clock.',
        descDE: 'Gewinne ein Level mit mehr als 30 Minuten auf der Uhr.',
        stat: 'bigTimeLeftWins',
        tiers: [
            { threshold: 13, labelEn: 'Early Bird', labelDE: 'Frühaufsteher' },
            { threshold: 33, labelEn: 'Ahead of Time', labelDE: 'Zeitvorsprung' },
            { threshold: 65, labelEn: 'No Sweat', labelDE: 'Kein Problem' },
        ]
    },

    // ── FREEZE CLUTCH ─────────────────────────────
    {
        id: 'freeze_clutch',
        category: 'time',
        icon: '🧊',
        nameEn: 'Frozen Clutch',
        nameDE: 'Eiskalte Rettung',
        descEn: 'Use a Time Freeze item or the Absolute Zero ability while at 10 seconds or less on the clock.',
        descDE: 'Nutze ein Zeitfrieren-Item oder die Absoluter Nullpunkt Fähigkeit mit höchstens 10 Sekunden auf der Uhr.',
        stat: 'freezeClutches',
        tiers: [
            { threshold: 1, labelEn: 'Ice Cold', labelDE: 'Eiskalt' },
            { threshold: 7, labelEn: 'Cryogenic', labelDE: 'Kryogenisch' },
            { threshold: 13, labelEn: 'Absolute Zero', labelDE: 'Absoluter Nullpunkt' },
        ]
    },


    //------------------------------------------------------------------------
    //-----------------------------MISTAKES-----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------



    // ── MISTAKES MADE ────────────────────────────
    {
        id: 'mistakes_made',
        category: 'mistakes',
        icon: '💥',
        nameEn: 'Oops!',
        nameDE: 'Hoppla!',
        descEn: 'Make mistakes while filling the puzzle.',
        descDE: 'Mache Fehler beim Ausfüllen des Puzzles.',
        stat: 'mistakesMade',
        tiers: [
            { threshold: 1, labelEn: 'First Blood', labelDE: 'Erste Fehler' },
            { threshold: 20, labelEn: 'Learning Curve', labelDE: 'Lernkurve' },
            { threshold: 65, labelEn: 'Serial Wrongdoer', labelDE: 'Serientäter' },
            { threshold: 130, labelEn: 'Mistake Machine', labelDE: 'Fehlermaschine' },
            { threshold: 325, labelEn: 'Chaos Agent', labelDE: 'Chaos-Agent' },
        ]
    },


    // ── COMEBACK WIN ──────────────────────────────
    {
        id: 'comeback_win',
        category: 'mistakes',
        icon: '🔥',
        nameEn: 'Comeback King',
        nameDE: 'Comeback-König',
        descEn: 'Win a level despite making 5 or more mistakes.',
        descDE: 'Gewinne ein Level trotz 5 oder mehr Fehlern.',
        stat: 'comebackWins',
        tiers: [
            { threshold: 7, labelEn: 'Never Give Up', labelDE: 'Niemals aufgeben' },
            { threshold: 33, labelEn: 'Resilient', labelDE: 'Belastbar' },
            { threshold: 65, labelEn: 'Unbreakable', labelDE: 'Unzerstörbar' },
        ]
    },


    // ── PENALTY CLUTCH ────────────────────────────
    {
        id: 'penalty_clutch',
        category: 'mistakes',
        icon: '💸',
        nameEn: 'Penalty Survivor',
        nameDE: 'Strafen-Überleber',
        descEn: 'Have a penalty drop your timer below 60 seconds and still win the level.',
        descDE: 'Lass eine Strafe deinen Timer unter 60 Sekunden fallen und gewinne trotzdem.',
        stat: 'penaltyClutchwins',
        tiers: [
            { threshold: 2, labelEn: 'Lucky Escape', labelDE: 'Glückliche Flucht' },
            { threshold: 13, labelEn: 'Danger Zone Pro', labelDE: 'Profi der Gefahrenzone' },
            { threshold: 33, labelEn: 'Indestructible', labelDE: 'Unzerstörbar' },
        ]
    },



    // ── BOUNCEBACK ────────────────────────────────
    {
        id: 'bounceback',
        category: 'mistakes',
        icon: '🏀',
        nameEn: 'Bounceback',
        nameDE: 'Zurückschlagen',
        descEn: 'Immediately replay and win a level you just failed.',
        descDE: 'Wiederhole und gewinne sofort ein Level, das du gerade verloren hast.',
        stat: 'bouncebackWins',
        tiers: [
            { threshold: 7, labelEn: 'Back on Track', labelDE: 'Wieder auf Kurs' },
            { threshold: 20, labelEn: 'Determined', labelDE: 'Entschlossen' },
            { threshold: 39, labelEn: 'Relentless', labelDE: 'Unerbittlich' },
        ]
    },

    // ── FLAWLESS WORLD ────────────────────────────
    {
        id: 'world_no_mistake',
        category: 'mistakes',
        icon: '🌟',
        nameEn: 'Flawless World',
        nameDE: 'Fehlerfreie Welt',
        descEn: 'Complete all levels of an entire world without making a single mistake across them.',
        descDE: 'Schließe alle Level einer Welt ab, ohne einen einzigen Fehler über alle Level zu machen.',
        stat: 'flawlessWorlds',
        tiers: [
            { threshold: 1, labelEn: 'Perfect World', labelDE: 'Perfekte Welt' },
            { threshold: 3, labelEn: 'Double Perfection', labelDE: 'Doppelte Perfektion' },
            { threshold: 7, labelEn: 'Transcendent', labelDE: 'Transzendent' },
        ]
    },


    //------------------------------------------------------------------------
    //----------------------------------ITEMS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


 


    // ── ITEMS USED (total) ───────────────────────
    {
        id: 'items_used',
        category: 'items',
        icon: '🎁',
        nameEn: 'Item Hoarder',
        nameDE: 'Gegenstands-Sammler',
        descEn: 'Use items from your inventory.',
        descDE: 'Nutze Items aus deinem Inventar.',
        stat: 'itemsUsed',
        tiers: [
            { threshold: 13, labelEn: 'First Use', labelDE: 'Erste Nutzung' },
            { threshold: 65, labelEn: 'Resourceful', labelDE: 'Einfallsreich' },
            { threshold: 250, labelEn: 'Power User', labelDE: 'Powernutzer' },
            { threshold: 650, labelEn: 'Item Addict', labelDE: 'Item-Süchtiger' },
        ]
    },

    

    // ─── CURSED (aggregate) ──────────────────────────────────────────────────────
    {
        id: 'ach_cursed_items_used',
        category: 'items',
        icon: '☠️',
        nameEn: 'Hexed',
        nameDE: 'Verhext',
        descEn: 'Use cursed items.',
        descDE: 'Nutze verfluchte Items.',
        stat: 'cursedItemsUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Curse', labelDE: 'Erster Fluch' },
            { threshold: 20, labelEn: 'Dabbling in Darkness', labelDE: 'Im Dunkel tastend' },
            { threshold: 65, labelEn: 'Cursed Devotee', labelDE: 'Fluch-Geweihter' },
            { threshold: 130, labelEn: 'Servant of Entropy', labelDE: 'Diener der Entropie' },
        ]
    },



    // ── ITEM HOARDER (inventory size) ────────────
    {
        id: 'item_hoarder',
        category: 'items',
        icon: '📦',
        nameEn: 'Hoarder',
        nameDE: 'Hamsterer',
        descEn: 'Have 10 or more items in your inventory at the same time.',
        descDE: 'Habe 10 oder mehr Items gleichzeitig in deinem Inventar.',
        stat: 'maxInventoryReached',
        tiers: [
            { threshold: 5, labelEn: 'Pack Rat', labelDE: 'Messi' },
            { threshold: 15, labelEn: 'Stockpiler', labelDE: 'Vorrätesammler' },
            { threshold: 30, labelEn: 'Warehouse', labelDE: 'Lagerhaus' },
        ]
    },

    // ── COLLECTOR ─────────────────────────────────
    {
        id: 'collector',
        category: 'items',
        icon: '🎨',
        nameEn: 'Collector',
        nameDE: 'Sammler',
        descEn: 'Own at least one item of every rarity tier at the same time.',
        descDE: 'Besitze gleichzeitig mindestens ein Item jeder Seltenheitsstufe.',
        stat: 'collectorAllRarities',
        tiers: [
            { threshold: 13, labelEn: 'Full Collection', labelDE: 'Vollständige Sammlung' },
            { threshold: 65, labelEn: 'Curator', labelDE: 'Kurator' },
            { threshold: 130, labelEn: 'Connoisseur', labelDE: 'Kenner' },
        ]
    },




    // ── THREE ITEMS IN ONE LEVEL ──────────────────
    {
        id: 'three_items_level',
        category: 'items',
        icon: '🎒',
        nameEn: 'Item Spree',
        nameDE: 'Item-Kaufrausch',
        descEn: 'Use 3 or more items in a single level.',
        descDE: 'Nutze 3 oder mehr Items in einem einzigen Level.',
        stat: 'threeItemsOneLevelCount',
        tiers: [
            { threshold: 26, labelEn: 'Spendthrift', labelDE: 'Verschwender' },
            { threshold: 65, labelEn: 'Power Shopper', labelDE: 'Power-Shopper' },
            { threshold: 130, labelEn: 'Item Addict', labelDE: 'Item-Süchtig' },
        ]
    },




    // ── CURSED ITEM ON FIRST ATTEMPT ─────────────

    {
        id: 'ach_cursed_first_attempt',
        category: 'items',
        icon: '💀',
        nameEn: 'Daring Soul',
        nameDE: 'Verwegene Seele',
        descEn: 'Use a cursed item before completing a level for the first attempt.',
        descDE: 'Nutze einen verfluchten Gegenstand bevor du das erste Mal ein Level abschließt.',
        stat: 'cursedFirstAttempts',
        tiers: [
            { threshold: 1, labelEn: 'Leap of Faith', labelDE: 'Sprung ins Ungewisse' },
            { threshold: 13, labelEn: 'Born Reckless', labelDE: 'Zum Draufgänger geboren' },
            { threshold: 33, labelEn: 'Cursed by Default', labelDE: 'Standardmäßig verflucht' },
        ]
    },




    // ── MERCHANT ──────────────────────────────────
    {
        id: 'merchant',
        category: 'items',
        icon: '💰',
        nameEn: 'Merchant',
        nameDE: 'Händler',
        descEn: 'Reshuffle items from your inventory.',
        descDE: 'Tausche Items aus deinem Inventar.',
        stat: 'itemsSold',
        tiers: [
            { threshold: 7, labelEn: 'Bargain Hunter', labelDE: 'Schnäppchenjäger' },
            { threshold: 26, labelEn: 'Trader', labelDE: 'Händler' },
            { threshold: 65, labelEn: 'Merchant', labelDE: 'Kaufmann' },
            { threshold: 130, labelEn: 'Tycoon', labelDE: 'Tycoon' },
        ]
    },






    // Utility Items useage

    // ── SHIELD ITEMS USED ────────────────────────
    {
        id: 'shields_used',
        category: 'items',
        icon: '🛡️',
        nameEn: 'Guardian',
        nameDE: 'Wächter',
        descEn: 'Use Shield items to block mistakes.',
        descDE: 'Nutze Schild-Gegenstände um Fehler abzublocken.',
        stat: 'shieldsUsed',
        tiers: [
            { threshold: 7, labelEn: 'Shielded', labelDE: 'Abgeschirmt' },
            { threshold: 33, labelEn: 'Fortified', labelDE: 'Befestigt' },
            { threshold: 65, labelEn: 'Impenetrable', labelDE: 'Undurchdringlich' },
            { threshold: 130, labelEn: 'Unbreakable', labelDE: 'Unzerbrechlich' },
]
    },






    // ── FREEZE ITEMS USED ────────────────────────
    {
        id: 'freeze_used',
        category: 'items',
        icon: '❄️',
        nameEn: 'Time Stopper',
        nameDE: 'Zeitanhalter',
        descEn: 'Use Time Freeze items.',
        descDE: 'Nutze Zeitfrieren-Items.',
        stat: 'freezeUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Freeze', labelDE: 'Erstes Einfrieren' },
            { threshold: 20, labelEn: 'Cold Shoulder', labelDE: 'Kalte Schulter' },
            { threshold: 46, labelEn: 'Permafrost', labelDE: 'Permafrost' },
        ]
    },





    // ── MISTAKE ERASER USED ──────────────────────
    {
        id: 'eraser_used',
        category: 'items',
        icon: '🎓',
        nameEn: 'The Tutor\'s Way',
        nameDE: 'Des Tutors Weg',
        descEn: 'Use Tutor items to reduce your mistake count.',
        descDE: 'Nutze Tutor-Items, um deine Fehleranzahl zu reduzieren.',
        stat: 'eraserUsed',
        tiers: [
            { threshold: 1, labelEn: 'Second Chance', labelDE: 'Zweite Chance' },
            { threshold: 26, labelEn: 'Clean Record', labelDE: 'Saubere Akte' },
            { threshold: 65, labelEn: 'Revisionist', labelDE: 'Revisionist' },
        ]
    },



    // ─── SCOUT'S PRIMER ──────────────────────────────────────────────────────────

    {
        id: 'ach_scout_primer_used',
        category: 'items',
        icon: '📜',
        nameEn: 'Prepared Adventurer',
        nameDE: 'Vorbereiteter Abenteurer',
        descEn: 'Use the Scout\'s Primer.',
        descDE: 'Nutze den Pfadfinder-Kompass.',
        stat: 'scoutPrimerUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Consultation', labelDE: 'Erste Befragung' },
            { threshold: 7, labelEn: 'Field Ready', labelDE: 'Einsatzbereit' },
            { threshold: 20, labelEn: 'Veteran Scout', labelDE: 'Erfahrener Pfadfinder' },
            { threshold: 39, labelEn: 'Eagle Scout', labelDE: 'Adler - Pfadfinder' },
            { threshold: 65, labelEn: 'Master Navigator', labelDE: 'Meister-Navigator' },
        ]
    },





    // ── ROW / COL SOLVE ITEMS USED ───────────────
    {
        id: 'rowcol_solved',
        category: 'items',
        icon: '📐',
        nameEn: 'Line Reader',
        nameDE: 'Zeilenleser',
        descEn: 'Use row-solve or column-solve items.',
        descDE: 'Nutze Zeilen- oder Spalten-Löse-Items.',
        stat: 'rowColSolved',
        tiers: [
            { threshold: 13, labelEn: 'Shortcut Taker', labelDE: 'Abkürzer' },
            { threshold: 46, labelEn: 'Line Breaker', labelDE: 'Zeilenbrecher' },
            { threshold: 100, labelEn: 'Grid Surgeon', labelDE: 'Gitter-Chirurg' },
        ]
    },



    // ─── ARTIFACT ────────────────────────────────────────────────────────────────
    {
        id: 'ach_artifact_used',
        category: 'items',
        icon: '🌟',
        nameEn: 'Codex Bearer',
        nameDE: 'Kodex-Träger',
        descEn: 'Use the Codex of Completion.',
        descDE: 'Nutze den Kodex der Fertigstellung.',
        stat: 'artifactUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Invocation', labelDE: 'Erste Beschwörung' },
            { threshold: 5, labelEn: 'Codex Adept', labelDE: 'Kodex-Adept' },
            { threshold: 14, labelEn: 'Bound to the Book', labelDE: 'Ans Buch gebunden' },
        ]
    },







    // ── INDIVIDUAL CURSED ITEMS ───────────────────


    {
        id: 'ach_cursed_lens',
        category: 'items',
        icon: '☠️',
        nameEn: 'Tainted Vision',
        nameDE: 'Getrübte Sicht',
        descEn: 'Use the Cursed Lens.',
        descDE: 'Nutze die Verfluchte Linse.',
        stat: 'cursedLensUsed',
        tiers: [
            { threshold: 1, labelEn: 'Dark Glance', labelDE: 'Dunkler Blick' },
            { threshold: 13, labelEn: 'Shadowed Eye', labelDE: 'Beschattetes Auge' },
            { threshold: 39, labelEn: 'Cursed Gaze', labelDE: 'Verfluchter Blick' },
            { threshold: 65, labelEn: 'Eyes of Shadow', labelDE: 'Schattenaugen' },
        ]
    },





    {
        id: 'ach_cursed_clock',
        category: 'items',
        icon: '💀',
        nameEn: 'Borrowed Time',
        nameDE: 'Geliehene Zeit',
        descEn: 'Use the Cursed Clock.',
        descDE: 'Nutze die Verfluchte Uhr.',
        stat: 'cursedClockUsed',
        tiers: [
            { threshold: 1, labelEn: 'Warped Time', labelDE: 'Verzerrte Zeit' },
            { threshold: 13, labelEn: 'Time Gambler', labelDE: 'Zeit-Spieler' },
            { threshold: 39, labelEn: 'Bound to the Clock', labelDE: 'An die Uhr gebunden' },
            { threshold: 65, labelEn: 'Temporal Pact', labelDE: 'Zeitpakt' },
        ]
    },



    {
        id: 'ach_demon_eye',
        category: 'items',
        icon: '👁️',
        nameEn: 'All-Seeing Curse',
        nameDE: 'Allsehender Fluch',
        descEn: 'Use the Demon Eye.',
        descDE: 'Nutze das Dämonenauge.',
        stat: 'demonEyeUsed',
        tiers: [
            { threshold: 1, labelEn: 'Eye Opened', labelDE: 'Auge geöffnet' },
            { threshold: 13, labelEn: 'Infernal Guard', labelDE: 'Höllenwacht' },
            { threshold: 39, labelEn: 'Unwavering Stare', labelDE: 'Unverwandter Blick' },
            { threshold: 65, labelEn: 'Abyssal Sight', labelDE: 'Abyssaler Blick' },
        ]
    },

    {
        id: 'ach_tidal_wave',
        category: 'items',
        icon: '🌊',
        nameEn: 'Flood and Ebb',
        nameDE: 'Flut und Ebbe',
        descEn: 'Use the Tidal Wave.',
        descDE: 'Nutze die Flutwelle.',
        stat: 'tidalWaveUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Wave', labelDE: 'Erste Welle' },
            { threshold: 13, labelEn: 'Rising Tide', labelDE: 'Steigende Flut' },
            { threshold: 33, labelEn: 'Tidal Force', labelDE: 'Gezeitenkraft' },
            { threshold: 65, labelEn: 'Tsunami', labelDE: 'Tsunami' },
        ]
    },

    {
        id: 'ach_vortex',
        category: 'items',
        icon: '🌪️',
        nameEn: 'Eye of the Storm',
        nameDE: 'Auge des Sturms',
        descEn: 'Use the Vortex.',
        descDE: 'Nutze den Wirbelwind.',
        stat: 'vortexUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Gust', labelDE: 'Erster Windstoß' },
            { threshold: 13, labelEn: 'Spinning Up', labelDE: 'Im Aufwind' },
            { threshold: 33, labelEn: 'Cyclone', labelDE: 'Zyklon' },
            { threshold: 65, labelEn: 'Eye of the Storm', labelDE: 'Auge des Sturms' },
        ]
    },

    {
        id: 'ach_chaos_grid',
        category: 'items',
        icon: '💥',
        nameEn: 'Pure Chaos',
        nameDE: 'Reines Chaos',
        descEn: 'Use the Chaos Grid.',
        descDE: 'Nutze das Chaos-Gitter.',
        stat: 'chaosGridUsed',
        tiers: [
            { threshold: 1, labelEn: 'Anarchy', labelDE: 'Anarchie' },
            { threshold: 13, labelEn: 'Entropy Unleashed', labelDE: 'Entropie entfesselt' },
            { threshold: 33, labelEn: 'Mayhem', labelDE: 'Chaos' },
            { threshold: 65, labelEn: 'Total Chaos', labelDE: 'Totales Chaos' },
        ]
    },


    // ─── PEARLS ──────────────────────────────────────────────────────────────────
    {
        id: 'ach_pearls_used',
        category: 'items',
        icon: '🔵',
        nameEn: 'Pearl Diver',
        nameDE: 'Perlen-Taucher',
        descEn: 'Use Pearl items.',
        descDE: 'Nutze Perlen-Items.',
        stat: 'pearlsUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Pearl', labelDE: 'Erste Perle' },
            { threshold: 13, labelEn: 'Deep Diver', labelDE: 'Tiefseetaucher' },
            { threshold: 39, labelEn: 'Pearl Collector', labelDE: 'Perlensammler' },
            { threshold: 65, labelEn: 'Ocean\'s Bounty', labelDE: 'Ozeanische Beute' },
        ]
    },



    // ─── THE WITCH ───────────────────────────────────────────────────────────────
    {
        id: 'ach_witch_used',
        category: 'items',
        icon: '🧙',
        nameEn: 'Witch Hunter',
        nameDE: 'Hexenjäger',
        descEn: 'Use The Witch.',
        descDE: 'Nutze die Hexe.',
        stat: 'witchUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Summoning', labelDE: 'Erste Beschwörung' },
            { threshold: 13, labelEn: 'Familiar Bond', labelDE: 'Vertraute Verbindung' },
            { threshold: 39, labelEn: 'Coven Master', labelDE: 'Hexenzirkel-Meister' },
            { threshold: 65, labelEn: 'Scarlet Witch', labelDE: 'Scharlachrote Hexe' },
        ]
    },

    // ─── GOLDEN CLOCK ────────────────────────────────────────────────────────────
    {
        id: 'ach_golden_clock_used',
        category: 'items',
        icon: '🕰️',
        nameEn: 'Frozen Fortune',
        nameDE: 'Gefrorenes Glück',
        descEn: 'Use the Golden Clock.',
        descDE: 'Nutze die Goldene Uhr.',
        stat: 'goldenClockUsed',
        tiers: [
            { threshold: 1, labelEn: 'Golden Moment', labelDE: 'Goldener Moment' },
            { threshold: 13, labelEn: 'Time is Gold', labelDE: 'Zeit ist Gold' },
            { threshold: 39, labelEn: 'Gilded Timekeeper', labelDE: 'Vergoldeter Zeithüter' },
            { threshold: 65, labelEn: 'Midas Touch', labelDE: 'Midas-Touch' },
        ]
    },

    // ─── SHADOW SEAL ─────────────────────────────────────────────────────────────
    {
        id: 'ach_shadow_seal_used',
        category: 'items',
        icon: '🌑',
        nameEn: 'Into the Dark',
        nameDE: 'Ins Dunkel',
        descEn: 'Use the Shadow Seal.',
        descDE: 'Nutze das Schattensiegel.',
        stat: 'shadowSealUsed',
        tiers: [
            { threshold: 1, labelEn: 'Sealed in Shadow', labelDE: 'Im Schatten versiegelt' },
            { threshold: 13, labelEn: 'Dark Covenant', labelDE: 'Dunkler Bund' },
            { threshold: 39, labelEn: 'Eclipse Keeper', labelDE: 'Finsterwächter' },
            { threshold: 65, labelEn: 'Shadow Master', labelDE: 'Schattenmeister' },
        ]
    },







    //------------------------------------------------------------------------
    //----------------------------QUIZ & EXCERCISES---------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // ── QUIZ / MATHGATE ANSWERED CORRECTLY ───────
    {
        id: 'questions_correct',
        category: 'quiz',
        icon: '🧠',
        nameEn: 'Know-It-All',
        nameDE: 'Alleswisser',
        descEn: 'Answer Multiple Choice questions and solve Excercises correctly.',
        descDE: 'Beantworte Multiple Choice Fragen und löse Aufgaben richtig.',
        stat: 'questionsCorrect',
        tiers: [
            { threshold: 7, labelEn: 'First Answers', labelDE: 'Erste Antworten' },
            { threshold: 26, labelEn: 'Sharp Mind', labelDE: 'Scharfer Verstand' },
            { threshold: 65, labelEn: 'Scholar', labelDE: 'Gelehrter' },
            { threshold: 130, labelEn: 'Professor', labelDE: 'Professor' },
            { threshold: 250, labelEn: 'Stochastic Sage', labelDE: 'Stochastischer Weise' },
            { threshold: 650, labelEn: 'Master of Stochastics', labelDE: 'Meister der Stochastik' },
        ]
    },

    // ── GATE REJECTED ─────────────────────────────
    {
        id: 'gate_rejected',
        category: 'quiz',
        icon: '🚫',
        nameEn: 'Stubborn Student',
        nameDE: 'Sturer Student',
        descEn: 'Get rejected by a Probability Gate.',
        descDE: 'Werde von einem Wahrscheinlichkeitstor abgewiesen.',
        stat: 'gateRejections',
        tiers: [
            { threshold: 20, labelEn: 'Wrong Answer', labelDE: 'Falsche Antwort' },
            { threshold: 65, labelEn: 'Persistent', labelDE: 'Ausdauernd' },
            { threshold: 130, labelEn: 'Never Gives Up', labelDE: 'Gibt nie auf' },
        ]
    },


    // ── PRIMER CORRECT ───────────────────────────
    {
        id: 'primer_correct',
        category: 'quiz',
        icon: '📜',
        nameEn: 'Scout\'s Honor',
        nameDE: 'Pfadfinder-Ehre',
        descEn: 'Answer a Scout\'s Primer question correctly to earn a headstart.',
        descDE: 'Beantworte eine Pfadfinder-Kompass-Frage richtig.',
        stat: 'primerCorrect',
        tiers: [
            { threshold: 7, labelEn: 'Prepared', labelDE: 'Vorbereitet' },
            { threshold: 33, labelEn: 'Always Ready', labelDE: 'Immer bereit' },
            { threshold: 65, labelEn: 'Eagle Scout', labelDE: 'Adlerpfadfinder' },
            { threshold: 130, labelEn: 'Master Pathfinder', labelDE: 'Meister-Pfadfinder' },
        ]
    },






    //------------------------------------------------------------------------
    //-------------------------------CLASSES----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // CLASS UPGRADES APPLIED 
    {
        id: 'class_upgrades',
        category: 'class',
        icon: '⬆️',
        nameEn: 'Power Up',
        nameDE: 'Stärker werden',
        descEn: 'Apply class ability upgrades by completing Ascension levels.',
        descDE: 'Wende Klassenverbesserungen durch Aufstiegs-Level an.',
        stat: 'classUpgradesApplied',
        tiers: [
            { threshold: 1, labelEn: 'Rank Up', labelDE: 'Aufgestiegen' },
            { threshold: 3, labelEn: 'Power Surge', labelDE: 'Energiestoß' },
            { threshold: 6, labelEn: 'Fully Upgraded', labelDE: 'Voll ausgerüstet' },
        ]
    },


    {
        id: 'ascendency_awakened',
        category: 'class',
        icon: '✨',
        nameEn: 'Awakened',
        nameDE: 'Erwacht',
        descEn: 'Choose an Ascendency class.',
        descDE: 'Wähle eine Aufstiegs-Klasse.',
        stat: 'ascendencyChosen',
        tiers: [
            { threshold: 1, labelEn: 'Evolution', labelDE: 'Evolution' }
        ]
    },

    {
        id: 'ascendency_upgrades',
        category: 'class',
        icon: '⬆️',
        nameEn: 'Ascendant',
        nameDE: 'Der Aufgestiegene',
        descEn: 'Apply ascension class ability upgrades by completing Ascension levels.',
        descDE: 'Wende Aufstiegs-Klassenverbesserungen durch Aufstiegs-Level an.',
        stat: 'ascendencyUpgradesApplied',
        tiers: [
            { threshold: 1, labelEn: 'First Awakening', labelDE: 'Erstes Erwachen' },
            { threshold: 3, labelEn: 'Rising Power', labelDE: 'Wachsende Macht' },
            { threshold: 6, labelEn: 'True Ascendant', labelDE: 'Wahrer Aufgestiegener' },
        ]
    },



    // ── CLASS: LEVELS AS STATISTICIAN ────────────
    {
        id: 'class_statistician',
        category: 'class',
        icon: '⚔️',
        nameEn: 'Statistician\'s Path',
        nameDE: 'Weg des Statistikers',
        descEn: 'Complete levels while playing as the Statistician class.',
        descDE: 'Schließe Level als Statistiker ab.',
        stat: 'levelsAsStatistician',
        tiers: [
            { threshold: 7, labelEn: 'Data Recruit', labelDE: 'Daten-Rekrut' },
            { threshold: 26, labelEn: 'Sample Warrior', labelDE: 'Stichproben-Krieger' },
            { threshold: 65, labelEn: 'Distribution Knight', labelDE: 'Verteilungsritter' },
            { threshold: 130, labelEn: 'Grand Statistician', labelDE: 'Großer Statistiker' },
        ]
    },


    // ── CLASS: LEVELS AS MATHMAGICIAN ────────────
    {
        id: 'class_mathmagician',
        category: 'class',
        icon: '🔮',
        nameEn: 'Mathmagician\'s Path',
        nameDE: 'Weg des Mathemagiers',
        descEn: 'Complete levels while playing as the Mathmagician class.',
        descDE: 'Schließe Level als Mathemagier ab.',
        stat: 'levelsAsMathmagician',
        tiers: [
            { threshold: 7, labelEn: 'Apprentice Mage', labelDE: 'Lehrlings-Magier' },
            { threshold: 26, labelEn: 'Arcane Student', labelDE: 'Arkaner Schüler' },
            { threshold: 65, labelEn: 'Spellweaver', labelDE: 'Zauberwirker' },
            { threshold: 130, labelEn: 'Grand Mathmagician', labelDE: 'Großer Mathemagier' },
        ]
    },



    // ── CLASS: LEVELS AS PROBABILIST ─────────────
    {
        id: 'class_probabilist',
        category: 'class',
        icon: '🎯',
        nameEn: 'Probabilist\'s Path',
        nameDE: 'Weg des Probabilisten',
        descEn: 'Complete levels while playing as the Probabilist class.',
        descDE: 'Schließe Level als Probabilist ab.',
        stat: 'levelsAsProbabilist',
        tiers: [
            { threshold: 7, labelEn: 'Probability Novice', labelDE: 'Wahrscheinlichkeits-Novize' },
            { threshold: 26, labelEn: 'Bayesian Scout', labelDE: 'Bayesianischer Scout' },
            { threshold: 65, labelEn: 'Field Ranger', labelDE: 'Feld-Ranger' },
            { threshold: 130, labelEn: 'Grand Probabilist', labelDE: 'Großer Probabilist' },
        ]
    },




    // ── MOMENTUM BONUS TRIGGERED (Statistician) ───
    {
        id: 'momentum_triggered',
        category: 'class',
        icon: '💨',
        nameEn: 'On a Roll',
        nameDE: 'Im Schwung',
        descEn: 'Trigger the Momentum time bonus streak.',
        descDE: 'Löse den Momentum-Zeitbonus aus.',
        stat: 'momentumTriggered',
        tiers: [
            { threshold: 13, labelEn: 'Snowball', labelDE: 'Schneeball' },
            { threshold: 130, labelEn: 'Avalanche', labelDE: 'Lawine' },
            { threshold: 1300, labelEn: 'Perpetual Motion', labelDE: 'Perpetuum Mobile' },
        ]
    },

    // ── FREE MISTAKES ABSORBED (Mathmagician passive) ─
    {
        id: 'mistakes_absorbed',
        category: 'class',
        icon: '🌀',
        nameEn: 'Variance Shield',
        nameDE: 'Varianzschild',
        descEn: 'Have mistakes absorbed by the Variance Shield passive.',
        descDE: 'Lass Fehler vom Varianzschild absorbieren.',
        stat: 'mistakesAbsorbed',
        tiers: [
            { threshold: 13, labelEn: 'Cushioned', labelDE: 'Abgepuffert' },
            { threshold: 130, labelEn: 'Protected', labelDE: 'Geschützt' },
            { threshold: 400, labelEn: 'Teflon', labelDE: 'Teflon' },
        ]
    },


    // ── INCORRECT CELLS AUTO MARKED WITH BAYESIAN INSIGHT (Probabilist passive) ─
    {
        id: 'bayesian_insight',
        category: 'class',
        icon: '🎯',
        nameEn: 'Bayesian Insight',
        nameDE: 'Bayesianische Einsicht',
        descEn: 'Have incorrect cells auto-marked with the Bayesian Insight passive.',
        descDE: 'Lass falsche Zellen automatisch mit der Bayesianischen Einsicht markieren.',
        stat: 'bayesianInsightUsed',
        tiers: [
            { threshold: 13, labelEn: 'Prior Belief', labelDE: 'Vorannahme' },
            { threshold: 130, labelEn: 'Posterior Update', labelDE: 'Posterior-Update' },
            { threshold: 650, labelEn: 'Maximum Likelihood', labelDE: 'Maximale Wahrscheinlichkeit' },
        ]
    },


    // ── CLASS SKILL: DATA STRIKE USED ────────────
    {
        id: 'skill_data_strike',
        category: 'class',
        icon: '⚔️',
        nameEn: 'Data Striker',
        nameDE: 'Datenhauer',
        descEn: 'Use the Data Strike class skill.',
        descDE: 'Nutze die Datenhieb-Fähigkeit.',
        stat: 'skillDataStrikeUsed',
        tiers: [
            { threshold: 13, labelEn: 'First Strike', labelDE: 'Erster Hieb' },
            { threshold: 65, labelEn: 'Assault Mode', labelDE: 'Angriffsmodus' },
            { threshold: 130, labelEn: 'Data Berserker', labelDE: 'Daten-Berserker' },
        ]
    },

    // ── CLASS SKILL: ARCANE REVEAL USED ──────────
    {
        id: 'skill_arcane_reveal',
        category: 'class',
        icon: '✨',
        nameEn: 'Arcane Revealer',
        nameDE: 'Arkaner Enthüller',
        descEn: 'Use the Arcane Reveal class skill.',
        descDE: 'Nutze die Arkane-Enthüllung-Fähigkeit.',
        stat: 'skillArcaneRevealUsed',
        tiers: [
            { threshold: 13, labelEn: 'First Reveals', labelDE: 'Erste Enthüllungen' },
            { threshold: 65, labelEn: 'Seer', labelDE: 'Seher' },
            { threshold: 130, labelEn: 'All is Known', labelDE: 'Alles ist bekannt' },
        ]
    },

    // ── CLASS SKILL: PRECISION MARK USED ─────────
    {
        id: 'skill_precision_mark',
        category: 'class',
        icon: '🎯',
        nameEn: 'Precision Striker',
        nameDE: 'Präzisionsmarkierer',
        descEn: 'Use the Precision Mark class skill.',
        descDE: 'Nutze die Präzisionsmarkierung-Fähigkeit.',
        stat: 'skillPrecisionMarkUsed',
        tiers: [
            { threshold: 13, labelEn: 'Marked', labelDE: 'Markiert' },
            { threshold: 65, labelEn: 'Sharpshooter', labelDE: 'Scharfschütze' },
            { threshold: 130, labelEn: 'Dead Eye', labelDE: 'Scharfes Auge' },
        ]
    },

    // ── CLASS SKILL: DIAGONAL STRIKE USED ────────
    {
        id: 'skill_diagonal_strike',
        category: 'class',
        icon: '✂️',
        nameEn: 'Diagonal Cutter',
        nameDE: 'Diagonal-Schneider',
        descEn: 'Use the Diagonal Strike class skill.',
        descDE: 'Nutze die Diagonalschlag-Fähigkeit.',
        stat: 'skillDiagonalStrikeUsed',
        tiers: [
            { threshold: 13, labelEn: 'Cross-Cutter', labelDE: 'Kreuzschneider' },
            { threshold: 65, labelEn: 'Slash Artist', labelDE: 'Schnitt-Künstler' },
            { threshold: 130, labelEn: 'X-Factor', labelDE: 'X-Faktor' },
        ]
    },

    // ── CLASS SKILL: ABSOLUTE ZERO USED ──────────
    {
        id: 'skill_absolute_zero',
        category: 'class',
        icon: '❄️',
        nameEn: 'Frozen Moment',
        nameDE: 'Gefrorener Moment',
        descEn: 'Use the Absolute Zero class skill.',
        descDE: 'Nutze die Absolute-Nullpunkt-Fähigkeit.',
        stat: 'skillAbsoluteZeroUsed',
        tiers: [
            { threshold: 13, labelEn: 'First Freeze', labelDE: 'Erstes Einfrieren' },
            { threshold: 65, labelEn: 'Cryomancer', labelDE: 'Kryomant' },
            { threshold: 130, labelEn: 'Permafrost', labelDE: 'Permafrost' },
        ]
    },

    // ── CLASS SKILL: FIELD SCAN USED ─────────────
    {
        id: 'skill_field_scan',
        category: 'class',
        icon: '📡',
        nameEn: 'Scanner',
        nameDE: 'Scanner',
        descEn: 'Use the Field Scan class skill.',
        descDE: 'Nutze die Feldscan-Fähigkeit.',
        stat: 'skillFieldScanUsed',
        tiers: [
            { threshold: 13, labelEn: 'Radar Ping', labelDE: 'Radar-Ping' },
            { threshold: 65, labelEn: 'Sonar Expert', labelDE: 'Sonar-Experte' },
            { threshold: 130, labelEn: 'Full Sweep', labelDE: 'Vollständiger Scan' },
        ]
    },
    // ── CLASS-SPECIFIC FLAVOUR ────────────────────
    {
        id: 'statistician_momentum_level',
        category: 'class',
        icon: '⚔️',
        nameEn: 'Momentum Machine',
        nameDE: 'Momentum-Maschine',
        descEn: 'As Statistician, trigger Momentum 10 or more times in a single level.',
        descDE: 'Als Statistiker: Löse Momentum 10 oder mehr Mal in einem Level aus.',
        stat: 'statistician3MomentumOneLevel',
        tiers: [
            { threshold: 1, labelEn: 'On a Roll', labelDE: 'Im Schwung' },
            { threshold: 13, labelEn: 'Unstoppable', labelDE: 'Unaufhaltbar' },
            { threshold: 33, labelEn: 'Perpetual Motion', labelDE: 'Perpetuum Mobile' },
        ]
    },
    {
        id: 'mathmagician_absorb_level',
        category: 'class',
        icon: '🔮',
        nameEn: 'Variance Fortress',
        nameDE: 'Varianz-Festung',
        descEn: 'As Mathmagician, absorb 5 or more mistakes with Variance Shield in a single level.',
        descDE: 'Als Mathemagier: Absorbiere 5 oder mehr Fehler mit dem Varianzschild in einem Level.',
        stat: 'mathmagician3AbsorbOneLevel',
        tiers: [
            { threshold: 1, labelEn: 'Shielded Master', labelDE: 'Schild-Meister' },
            { threshold: 13, labelEn: 'Fortress', labelDE: 'Festung' },
            { threshold: 33, labelEn: 'Untouchable Mage', labelDE: 'Unberührbarer Magier' },
        ]
    },

    {
        id: 'probabilist_big_scan',
        category: 'class',
        icon: '🎯',
        nameEn: 'Eagle Eye',
        nameDE: 'Adlerauge',
        descEn: 'As Probabilist, have a single Field Scan reveal 20 or more correct cells.',
        descDE: 'Als Probabilist: Enthülle mit einem einzigen Feldscan 20 oder mehr richtige Zellen.',
        stat: 'probabilistBigScan',
        tiers: [
            { threshold: 1, labelEn: 'Sharp Vision', labelDE: 'Scharfe Sicht' },
            { threshold: 13, labelEn: 'Hawk Eye', labelDE: 'Habichtauge' },
            { threshold: 33, labelEn: 'Omniscient', labelDE: 'Allwissend' },
        ]
    },


    {
        id: 'ascendency_outlier_levels',
        category: 'class',
        icon: '☄️',
        nameEn: 'Path of the Outlier',
        nameDE: 'Pfad des Ausreißers',
        descEn: 'Complete levels as the Outlier ascendency.',
        descDE: 'Schließe Level als Ausreißer ab.',
        stat: 'levelsAsOutlier',
        tiers: [
            { threshold: 7, labelEn: 'Anomaly', labelDE: 'Anomalie' },
            { threshold: 33, labelEn: 'Statistical Ghost', labelDE: 'Statistischer Geist' },
            { threshold: 65, labelEn: 'Outlier', labelDE: 'Ausreißer' },
        ]
    },



    {
        id: 'ascendency_recursionist_levels',
        category: 'class',
        icon: '🔁',
        nameEn: 'Path of the Recursionist',
        nameDE: 'Pfad des Rekursionisten',
        descEn: 'Complete levels as the Recursionist ascendency.',
        descDE: 'Schließe Level als Rekursionist ab.',
        stat: 'levelsAsRecursionist',
        tiers: [
            { threshold: 7, labelEn: 'Iteration', labelDE: 'Iteration' },
            { threshold: 33, labelEn: 'Infinite Depth', labelDE: 'Unendliche Tiefe' },
            { threshold: 65, labelEn: 'Recursionist', labelDE: 'Rekursionist' },
        ]
    },


    {
        id: 'ascendency_bayesian_levels',
        category: 'class',
        icon: '👁️',
        nameEn: 'Path of the Bayesian',
        nameDE: 'Pfad des Bayesianers',
        descEn: 'Complete levels as the Bayesian ascendency.',
        descDE: 'Schließe Level als Bayesianer ab.',
        stat: 'levelsAsBayesian',
        tiers: [
            { threshold: 7, labelEn: 'Belief Updated', labelDE: 'Überzeugung aktualisiert' },
            { threshold: 33, labelEn: 'Posterior Truth', labelDE: 'A-posteriori Wahrheit' },
            { threshold: 65, labelEn: 'Bayesian', labelDE: 'Bayesianer' },
        ]
    },


    // ── Ascendency Classes Skill 1 ──────────────
    {
        id: 'outlier_tail_risk_used',
        category: 'class',
        icon: '🧨',
        nameEn: 'Living Dangerously',
        nameDE: 'Gefährlich leben',
        descEn: 'Use the Tail Risk ability.',
        descDE: 'Nutze die Tail Risk Fähigkeit.',
        stat: 'skillTailRiskUsed',
        tiers: [
            { threshold: 13, labelEn: 'Calculated Gamble', labelDE: 'Kalkuliertes Risiko' },
            { threshold: 65, labelEn: 'Fat Tails', labelDE: 'Fat Tails' },
            { threshold: 130, labelEn: 'Tail Risk Master', labelDE: 'Tail-Risk-Meister' },
        ]
    },


    {
        id: 'recursionist_residual_used',
        category: 'class',
        icon: '👻',
        nameEn: 'Mistakes Never Die',
        nameDE: 'Fehler sterben nie',
        descEn: 'Use the Residual ability.',
        descDE: 'Nutze die Residual Fähigkeit.',
        stat: 'skillResidualUsed',
        tiers: [
            { threshold: 13, labelEn: 'Lingering Error', labelDE: 'Verweilender Fehler' },
            { threshold: 65, labelEn: 'Ghost in the Data', labelDE: 'Geist in den Daten' },
            { threshold: 130, labelEn: 'Infinite Recursion', labelDE: 'Unendliche Rekursion' },
        ]
    },


    {
        id: 'bayesian_bayes_traps_used',
        category: 'class',
        icon: '',
        nameEn: 'Bayes Gambit',
        nameDE: 'Bayes-Gambit',
        descEn: 'Use the Bayes Traps ability.',
        descDE: 'Nutze die Bayes - Fallen Fähigkeit.',
        stat: 'skillBayesTrapsUsed',
        tiers: [
            { threshold: 13, labelEn: 'Prior Belief', labelDE: 'Prior-Annahme' },
            { threshold: 65, labelEn: 'Updated Posterior', labelDE: 'Aktualisierter Posterior' },
            { threshold: 130, labelEn: 'Perfect Inference', labelDE: 'Perfekte Inferenz' },

        ]
    },

    // ── Ascendency Classes Skill 2 ──────────────


    {
        id: 'outlier_speedforce_used',
        category: 'class',
        icon: '🦅',
        nameEn: 'SPEEDFORCE',
        nameDE: 'SPEEDFORCE',
        descEn: 'Use the SPEEDFORCE ability.',
        descDE: 'Nutze die SPEEDFORCE-Fähigkeit.',
        stat: 'skillSpeedforceUsed',
        tiers: [
            { threshold: 13, labelEn: 'Flow State', labelDE: 'Flow-Zustand' },
            { threshold: 65, labelEn: 'Time Distortion', labelDE: 'Zeitverzerrung' },
            { threshold: 130, labelEn: 'SPEEDFORCE Master', labelDE: 'SPEEDFORCE-Meister' },
        ]
    },

    {
        id: 'recursionist_dof_used',
        category: 'class',
        icon: '🔗',
        nameEn: 'Degrees of Freedom',
        nameDE: 'Freiheitsgrade',
        descEn: 'Confirm and solve cells using Degrees of Freedom.',
        descDE: 'Bestätige und löse Zellen mit Degrees of Freedom.',
        stat: 'skillDoFUsed',
        tiers: [
            { threshold: 13, labelEn: 'Boundless', labelDE: 'Grenzenlos' },
            { threshold: 65, labelEn: 'Unshackled', labelDE: 'Entfesselt' },
            { threshold: 130, labelEn: 'Degree of Freedom', labelDE: 'Freiheitsgrad' },
        ]
    },

    {
        id: 'bayesian_type1_used',
        category: 'class',
        icon: '🛡️',
        nameEn: 'Type - 1 Error Shield',
        nameDE: 'Typ 1 Fehler Schild',
        descEn: 'Use the Type 1 Error Shield.',
        descDE: 'Nutze den Typ 1 Fehler Schild.',
        stat: 'skillType1ErrorShieldUsed',
        tiers: [
            { threshold: 13, labelEn: 'Noise Filtered', labelDE: 'Rauschen gefiltert' },
            { threshold: 65, labelEn: 'False Positives Blocked', labelDE: 'Falschpositive blockiert' },
            { threshold: 130, labelEn: 'Type I Nullification', labelDE: 'Typ-I-Neutralisierung' },
        ]
    },


    {
        id: 'outlier_infinite_hunger',
        category: 'class',
        icon: '🐙',
        nameEn: 'Infinite Hunger',
        nameDE: 'Unendlicher Hunger',
        descEn: 'Have the Infinite Hunger reveal 20 cells.',
        descDE: 'Lass den Unendlichen Hunger 20 Zellen enthüllen.',
        stat: 'outlierInfiniteHunger20Reveals',
        tiers: [
            { threshold: 1, labelEn: 'Edge Observation', labelDE: 'Randbeobachtung' },
            { threshold: 13, labelEn: 'Tail Exposure', labelDE: 'Tailsrisiko-Exposition' },
            { threshold: 33, labelEn: 'Hunger Satisfied', labelDE: 'Hunger gestillt' },
        ]
    },



    {
        id: 'recursionist_residual_beams',
        category: 'class',
        icon: '🔥',
        nameEn: 'Crossfire',
        nameDE: 'Kreuzfeuer',
        descEn: 'Have Residual Totems fire tracking beams to solve cells.',
        descDE: 'Lass Residual Totems Suchstrahlen abfeuern, um Zellen zu lösen.',
        stat: 'residualBeamsFired',
        tiers: [
            { threshold: 65, labelEn: 'Laser Show', labelDE: 'Lasershow' },
            { threshold: 325, labelEn: 'Orbital Strike', labelDE: 'Orbitaler Schlag' },
            { threshold: 650, labelEn: 'Crossfire', labelDE: 'Kreuzfeuer' },
        ]
    },

    {
        id: 'bayesian_all_traps',
        category: 'class',
        icon: '🕸️',
        nameEn: 'Minefield',
        nameDE: 'Minenfeld',
        descEn: 'Successfully place all available Bayes Traps on the grid at once.',
        descDE: 'Platziere erfolgreich alle verfügbaren Bayes Traps gleichzeitig auf dem Raster.',
        stat: 'bayesTrapsAllPlaced',
        tiers: [
            { threshold: 1, labelEn: 'Prepared', labelDE: 'Vorbereitet' },
            { threshold: 33, labelEn: 'Master Trapper', labelDE: 'Meister-Fallensteller' },
            { threshold: 65, labelEn: 'Minefield', labelDE: 'Minenfeld' },
        ]
    },

    {
        id: 'outlier_speedforce_survive',
        category: 'class',
        icon: '🦅',
        nameEn: 'Riding the Swan',
        nameDE: 'Auf dem Schwan reiten',
        descEn: 'Survive a full SPEEDFORCE duration without breaking it.',
        descDE: 'Überlebe eine volle SPEEDFORCE Dauer ohne Abbruch.',
        stat: 'speedforceNaturalCompletions',
        tiers: [
            { threshold: 1, labelEn: 'Unbroken Focus', labelDE: 'Ungebrochener Fokus' },
            { threshold: 13, labelEn: 'Swan Tamer', labelDE: 'Schwanenbändiger' },
            { threshold: 33, labelEn: 'Riding the Swan', labelDE: 'Auf dem Schwan reiten' },
        ]
    },





    {
        id: 'recursionist_dof_curses',
        category: 'class',
        icon: '🧟',
        nameEn: 'Grave Whisperer',
        nameDE: 'Grabflüsterer',
        descEn: "Answer the Degrees of Freedom zombie's challenges to curse cells.",
        descDE: 'Beantworte die Herausforderungen des Freiheitsgrade-Zombies, um Zellen zu verfluchen.',
        stat: 'dofZombieChallengesWon',
        tiers: [
            { threshold: 13, labelEn: 'First Whispers', labelDE: 'Erstes Flüstern' },
            { threshold: 65, labelEn: 'Cursed Grid', labelDE: 'Verfluchtes Raster' },
            { threshold: 130, labelEn: 'Master of the Dead', labelDE: 'Meister der Toten' },
        ]
    },


    {
        id: 'bayesian_type1_intercept',
        category: 'class',
        icon: '🛑',
        nameEn: 'False Positive',
        nameDE: 'Falsch Positiv',
        descEn: 'Have Type I Shield intercept and convert a mistake.',
        descDE: 'Lass ein Type I Shield einen Fehler abfangen und umwandeln.',
        stat: 'type1Intercepts',
        tiers: [
            { threshold: 7, labelEn: 'Shielded', labelDE: 'Abgeschirmt' },
            { threshold: 33, labelEn: 'Aegis', labelDE: 'Aegis' },
            { threshold: 65, labelEn: 'False Positive', labelDE: 'Falsch Positiv' },
        ]
    },




// Ascendency Classes Level Completion

    {
        id: 'ascendency_actuary_levels',
        category: 'class',
        icon: '⚖️',
        nameEn: 'Path of the Actuary',
        nameDE: 'Pfad des Aktuars',
        descEn: 'Complete levels as the Actuary ascendency.',
        descDE: 'Schließe Level als Aktuar ab.',
        stat: 'levelsAsActuary',
        tiers: [
            { threshold: 7, labelEn: 'Calculated Risk', labelDE: 'Kalkuliertes Risiko' },
            { threshold: 33, labelEn: 'Actuarial Master', labelDE: 'Aktuar-Meister' },
            { threshold: 65, labelEn: 'Actuary', labelDE: 'Aktuar' },
        ]
    },


    {
        id: 'ascendency_markovian_levels',
        category: 'class',
        icon: '⛓️',
        nameEn: 'Path of the Markovian',
        nameDE: 'Pfad des Markovianers',
        descEn: 'Complete levels as the Markovian ascendency.',
        descDE: 'Schließe Level als Markovianer ab.',
        stat: 'levelsAsMarkovian',
        tiers: [
            { threshold: 7, labelEn: 'State Shift', labelDE: 'Zustandswechsel' },
            { threshold: 33, labelEn: 'Memoryless Master', labelDE: 'Gedächtnisloser Meister' },
            { threshold: 65, labelEn: 'Markovian', labelDE: 'Markovianer' },
        ]
    },



    {
        id: 'ascendency_randomwalker_levels',
        category: 'class',
        icon: '🐾',
        nameEn: 'Path of the Random Walker',
        nameDE: 'Pfad des Random Walkers',
        descEn: 'Complete levels as the Random Walker ascendency.',
        descDE: 'Schließe Level als Random Walker ab.',
        stat: 'levelsAsRandom_walker',
        tiers: [
            { threshold: 7, labelEn: 'Stochastic Steps', labelDE: 'Stochastische Schritte' },
            { threshold: 33, labelEn: 'Pathfinder', labelDE: 'Pfadfinder' },
            { threshold: 65, labelEn: 'Random Walker', labelDE: 'Random Walker' },
        ]
    },


    // ── ACTUARY SKILLS & MILESTONES ──────────────
    {
        id: 'actuary_regression_used',
        category: 'class',
        icon: '⏪',
        nameEn: 'Revert to Mean',
        nameDE: 'Rückkehr zum Mittelwert',
        descEn: 'Use the Regression to Prior skill to erase mistakes.',
        descDE: 'Nutze Regression to Prior, um Fehler zu löschen.',
        stat: 'skillRegressionPriorUsed',
        tiers: [
            { threshold: 13, labelEn: 'Error Erased', labelDE: 'Fehler gelöscht' },
            { threshold: 65, labelEn: 'Time Heals', labelDE: 'Die Zeit heilt' },
            { threshold: 130, labelEn: 'Revert to Mean', labelDE: 'Rückkehr zum Mittelwert' },
        ]
    },


    {
        id: 'markovian_rollback_used',
        category: 'class',
        icon: '⏳',
        nameEn: 'Memoryless Undo',
        nameDE: 'Gedächtnisloses Zurücksetzen',
        descEn: 'Use the State Rollback ability.',
        descDE: 'Nutze die Zustandsrücksetzer Fähigkeit.',
        stat: 'skillRollbackUsed',
        tiers: [
            { threshold: 13, labelEn: 'Recent History Erased', labelDE: 'Jüngste Vergangenheit gelöscht' },
            { threshold: 65, labelEn: 'State Rewritten', labelDE: 'Zustand umgeschrieben' },
            { threshold: 130, labelEn: 'Markov Chain', labelDE: 'Markov-Kette' },
        ]
    },


    {
        id: 'randomwalker_browney_wiener_summoned',
        category: 'class',
        icon: '🐾',
        nameEn: 'Browney & Wiener',
        nameDE: 'Browney & Wiener',
        descEn: 'Summon Browney and Wiener onto the grid.',
        descDE: 'Beschwäre Browney und Wiener herbei.',
        stat: 'skillBrowneyWienerSummon',
        tiers: [
            { threshold: 13, labelEn: 'Random Walk Initiated', labelDE: 'Zufallsweg gestartet' },
            { threshold: 65, labelEn: 'Diffusion Stabilized', labelDE: 'Diffusion stabilisiert' },
            { threshold: 130, labelEn: 'Brownian Ensemble', labelDE: 'Brownsches Ensemble' },
        ]
    },


    {
        id: 'actuary_significance_treshold',
        category: 'class',
        icon: '📊',
        nameEn: 'Significance Threshold',
        nameDE: 'Signifikanzschwelle',
        descEn: 'Use the Significance Treshold ability.',
        descDE: '',
        stat: 'skillSignificanceTreshold',
        tiers: [
            { threshold: 13, labelEn: 'Noise Ignored', labelDE: 'Rauschen ignoriert' },
            { threshold: 65, labelEn: 'Significant Signal', labelDE: 'Signifikantes Signal' },
            { threshold: 130, labelEn: 'Statistical Authority', labelDE: 'Statistische Autorität' },
        ]
    },


    {
        id: 'markovian_transition_matrix_used',
        category: 'class',
        icon: '🧮',
        nameEn: 'Transition Matrix',
        nameDE: 'Übergangsmatrix',
        descEn: 'Use the Transition Matrix ability.',
        descDE: 'Nutze die Übergangssmatrix Fähigkeit.',
        stat: 'skillTransitionMatrixUsed',
        tiers: [
            { threshold: 13, labelEn: 'State Shift Detected', labelDE: 'Zustandswechsel erkannt' },
            { threshold: 65, labelEn: 'Transition Network Formed', labelDE: 'Transitionsnetzwerk gebildet' },
            { threshold: 130, labelEn: 'Markov Engine Online', labelDE: 'Markov-Engine aktiv' },
        ]
    },


    {
        id: 'random_walker_summon_drifter',
        category: 'class',
        icon: '🐕',
        nameEn: 'Drifter',
        nameDE: 'Drifter',
        descEn: 'Summon Drifter onto the grid.',
        descDE: 'Beschwöre Drifter auf das Feld.',
        stat: 'skillSummonDrifter',
        tiers: [
            { threshold: 13, labelEn: 'Summoned Companion', labelDE: 'Beschworener Begleiter' },
            { threshold: 65, labelEn: 'Bonded Wanderer', labelDE: 'Gebundener Wanderer' },
            { threshold: 130, labelEn: 'Loyal Drifter', labelDE: 'Loyaler Drifter' },
        ]
    },


 


    {
        id: 'regression_to_prior_effect',
        category: 'class',
        icon: '⏱️',
        nameEn: 'Regression to the Mean',
        nameDE: 'Rückkehr zum Mittelwert',
        descEn: 'Correct a mistake that costed you atleast 120 seconds.',
        descDE: 'Korrigiere einen Fehler, der dich mindestens 120 Sekunden gekostet hat.',
        stat: 'correct120smistake',
        tiers: [
            { threshold: 1, labelEn: 'Minor Setback', labelDE: 'Kleiner Rückschlag' },
            { threshold: 13, labelEn: 'Time Healer', labelDE: 'Zeitheiler' },
            { threshold: 33, labelEn: 'Master of Time', labelDE: 'Meister der Zeit' },
        ]
    },



    {
        id: 'markovian_rollback_save',
        category: 'class',
        icon: '⏳',
        nameEn: 'Cheat Death',
        nameDE: 'Dem Tod entronnen',
        descEn: 'Have State Rollback save you when the timer hits less than 10 seconds remaining.',
        descDE: 'Lass dich von State Rollback retten, wenn nur noch weniger als 10 Sekunden Zeit sind.',
        stat: 'rollbackSaves',
        tiers: [
            { threshold: 1, labelEn: 'Not Today', labelDE: 'Nicht heute' },
            { threshold: 7, labelEn: 'Time Traveler', labelDE: 'Zeitreisender' },
            { threshold: 13, labelEn: 'Cheat Death', labelDE: 'Dem Tod entronnen' },
        ]
    },



    {
        id: 'walker_brownian_reveals',
        category: 'class',
        icon: '💨',
        nameEn: 'Dust in the Wind',
        nameDE: 'Staub im Wind',
        descEn: 'Reveal cells using Brownian Motion.',
        descDE: 'Enthülle Zellen durch Brownsche Bewegung.',
        stat: 'brownianCellsRevealed',
        tiers: [
            { threshold: 13, labelEn: 'Drifting', labelDE: 'Treiben' },
            { threshold: 130, labelEn: 'Scattered', labelDE: 'Verstreut' },
            { threshold: 250, labelEn: 'Dust in the Wind', labelDE: 'Staub im Wind' },
        ]
    },



    {
        id: 'actuary_sig_thresh_intercept',
        category: 'class',
        icon: '🛡️',
        nameEn: 'Null Hypothesis Rejected',
        nameDE: 'Nullhypothese abgelehnt',
        descEn: 'Have Significance Threshold protect you from a mistake.',
        descDE: 'Lass dich von Significance Threshold vor einem Fehler schützen.',
        stat: 'sigThresholdIntercepts',
        tiers: [
            { threshold: 1, labelEn: 'Access Denied', labelDE: 'Zugriff verweigert' },
            { threshold: 13, labelEn: 'Statistically Significant', labelDE: 'Statistisch signifikant' },
            { threshold: 33, labelEn: 'Highly Significant', labelDE: 'Hoch signifikant' },
        ]
    },



    {
        id: 'markovian_transition_cascades',
        category: 'class',
        icon: '🧩',
        nameEn: 'Domino Effect',
        nameDE: 'Dominoeffekt',
        descEn: 'Trigger combo cascades using the Transition Matrix skill.',
        descDE: 'Löse Kombi-Kaskaden mit der Transition Matrix Fähigkeit aus.',
        stat: 'transitionMatrixCascades',
        tiers: [
            { threshold: 13, labelEn: 'Chain Reaction', labelDE: 'Kettenreaktion' },
            { threshold: 130, labelEn: 'Markov Chain', labelDE: 'Markov-Kette' },
            { threshold: 325, labelEn: 'Markov Cascade', labelDE: 'Markov-Kaskade' },
        ]
    },


    {
        id: 'walker_drifter_level',
        category: 'class',
        icon: '🐕',
        nameEn: 'Good Boy',
        nameDE: 'Guter Junge',
        descEn: 'Have your summoned Drifter level up by finding correct cells.',
        descDE: 'Lass deinen beschworenen Drifter im Level aufsteigen, indem er richtige Zellen findet.',
        stat: 'drifterLevelUps',
        tiers: [
            { threshold: 1, labelEn: 'Woof', labelDE: 'Woof' },
            { threshold: 26, labelEn: 'Alpha Beast', labelDE: 'Alpha-Tier' },
            { threshold: 65, labelEn: 'Good Boy', labelDE: 'Guter Junge' },

        ]
    },


    //------------------------------------------------------------------------
    //----------------------------META----------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


 

    //------------------------------------------------------------------------
    //-------------------------------TREE-------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


    // (Passive-tree achievements removed - to be redesigned for the new tree.)


    //------------------------------------------------------------------------
    //-----------------------------INFERENCE----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


    // ── QUESTS CLAIMED ───────────────────────────
    {
        id: 'inference_quests_claimed',
        category: 'inference',
        icon: '📋',
        nameEn: 'Inference Engine',
        nameDE: 'Inferenz-Motor',
        descEn: 'Claim milestones from the Inference Ledger.',
        descDE: 'Beanspruche Meilensteine aus dem Inferenz-Buch.',
        stat: 'inferenceQuestsClaimed',
        tiers: [
            { threshold: 1, labelEn: 'First Claim', labelDE: 'Erste Beanspruchung' },
            { threshold: 10, labelEn: 'Regular Claimer', labelDE: 'Regelmäßiger Beansprucher' },
            { threshold: 25, labelEn: 'Ledger Adept', labelDE: 'Buch-Adept' },
            { threshold: 50, labelEn: 'Ledger Expert', labelDE: 'Buch-Experte' },
            { threshold: 100, labelEn: 'Ledger Master', labelDE: 'Buch-Meister' },
        ]
    },

    // ── CONVERGENCE POINTS FROM QUESTS ───────────
    {
        id: 'inference_pt_points_earned',
        category: 'inference',
        icon: '🌳',
        nameEn: 'Convergence Earner',
        nameDE: 'Konvergenz-Verdiener',
        descEn: 'Earn Convergence Points from Inference Ledger rewards.',
        descDE: 'Verdiene Konvergenzpunkte durch Inferenz-Buch-Belohnungen.',
        stat: 'inferencePtPointsEarned',
        tiers: [
            { threshold: 1, labelEn: 'First Point', labelDE: 'Erster Punkt' },
            { threshold: 5, labelEn: 'Growing Tree', labelDE: 'Wachsender Baum' },
            { threshold: 13, labelEn: 'Half the Tree', labelDE: 'Halber Baum' },
            { threshold: 26, labelEn: 'Full Ledger', labelDE: 'Vollständiges Buch' },
        ]
    },

    // ── TOTAL SCORE MILESTONES ────────────────────
    {
        id: 'inference_total_score',
        category: 'inference',
        icon: '💰',
        nameEn: 'Expected Value',
        nameDE: 'Erwartungswert',
        descEn: 'Reach total score milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Gesamtpunktzahl-Meilensteine, die vom Inferenz-Buch verfolgt werden.',
        stat: 'inferenceScoreMilestones',
        tiers: [
            { threshold: 1, labelEn: '5,000 Points', labelDE: '5.000 Punkte' },
            { threshold: 2, labelEn: '20,000 Points', labelDE: '20.000 Punkte' },
            { threshold: 3, labelEn: '50,000 Points', labelDE: '50.000 Punkte' },
            { threshold: 4, labelEn: '100,000 Points', labelDE: '100.000 Punkte' },
        ]
    },

    // ── CORRECT ANSWERS MILESTONES ────────────────
    {
        id: 'inference_correct_answers',
        category: 'inference',
        icon: '🎯',
        nameEn: 'Confidence Interval',
        nameDE: 'Konfidenzintervall',
        descEn: 'Reach correct-answer milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche richtige-Antworten-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceAnswerMilestones',
        tiers: [
            { threshold: 1, labelEn: '20 Correct', labelDE: '20 Richtig' },
            { threshold: 2, labelEn: '50 Correct', labelDE: '50 Richtig' },
            { threshold: 3, labelEn: '150 Correct', labelDE: '150 Richtig' },
            { threshold: 4, labelEn: '300 Correct', labelDE: '300 Richtig' },
            { threshold: 5, labelEn: '500 Correct', labelDE: '500 Richtig' },
        ]
    },

    // ── GATES PASSED ─────────────────────────────
    {
        id: 'inference_gates_passed',
        category: 'inference',
        icon: '🔐',
        nameEn: 'Conditional Probability',
        nameDE: 'Bedingte Wahrscheinlichkeit',
        descEn: 'Reach probability gate milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Wahrscheinlichkeitstor-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceGateMilestones',
        tiers: [
            { threshold: 1, labelEn: '5 Gates', labelDE: '5 Tore' },
            { threshold: 2, labelEn: '15 Gates', labelDE: '15 Tore' },
            { threshold: 3, labelEn: '35 Gates', labelDE: '35 Tore' },
        ]
    },

    // ── WORLDS COMPLETED VIA LEDGER ──────────────
    {
        id: 'inference_worlds',
        category: 'inference',
        icon: '🌍',
        nameEn: 'Parameter Space',
        nameDE: 'Parameterraum',
        descEn: 'Complete world milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Welten-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceWorldMilestones',
        tiers: [
            { threshold: 1, labelEn: '1 World', labelDE: '1 Welt' },
            { threshold: 2, labelEn: '4 Worlds', labelDE: '4 Welten' },
            { threshold: 3, labelEn: '8 Worlds', labelDE: '8 Welten' },
            { threshold: 4, labelEn: 'All Worlds', labelDE: 'Alle Welten' },
        ]
    },

    // ── CONVERGENCE LEVELS VIA LEDGER ────────────
    {
        id: 'inference_convergence',
        category: 'inference',
        icon: '🌿',
        nameEn: 'Convergence',
        nameDE: 'Konvergenz',
        descEn: 'Complete convergence level milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Konvergenz-Level-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceConvergenceMilestones',
        tiers: [
            { threshold: 1, labelEn: '5 Levels', labelDE: '5 Level' },
            { threshold: 2, labelEn: '13 Levels', labelDE: '13 Level' },
            { threshold: 3, labelEn: '26 Levels', labelDE: '26 Level' },
        ]
    },

    // ── PASSIVE TREE LEDGER ───────────────────────
    {
        id: 'inference_passive_tree',
        category: 'inference',
        icon: '🌳',
        nameEn: 'Probability Tree Ledger',
        nameDE: 'Wahrscheinlichkeitsbaum-Buch',
        descEn: 'Reach passive tree point milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche passive Baum-Meilensteine im Inferenz-Buch.',
        stat: 'inferencePTMilestones',
        tiers: [
            { threshold: 1, labelEn: '5 Points', labelDE: '5 Punkte' },
            { threshold: 2, labelEn: '20 Points', labelDE: '20 Punkte' },
            { threshold: 3, labelEn: '40 Points', labelDE: '40 Punkte' },
        ]
    },

    // ── CLASS UPGRADES VIA LEDGER ─────────────────
    {
        id: 'inference_class_upgrades',
        category: 'inference',
        icon: '⬆️',
        nameEn: 'Maximum Likelihood',
        nameDE: 'Maximum-Likelihood',
        descEn: 'Complete class upgrade milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Klassen-Upgrade-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceClassUpgradeMilestones',
        tiers: [
            { threshold: 1, labelEn: '1 Upgrade', labelDE: '1 Upgrade' },
            { threshold: 2, labelEn: '3 Upgrades', labelDE: '3 Upgrades' },
            { threshold: 3, labelEn: 'All 6 Upgrades', labelDE: 'Alle 6 Upgrades' },
        ]
    },

    // ── ASCENDENCY VIA LEDGER ─────────────────────
    {
        id: 'inference_ascendency',
        category: 'inference',
        icon: '✨',
        nameEn: 'Ascendency Ledger',
        nameDE: 'Aufstiegs-Buch',
        descEn: 'Complete ascendency milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Aufstiegs-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceAscendencyMilestones',
        tiers: [
            { threshold: 1, labelEn: 'Ascendency Chosen', labelDE: 'Aufstieg gewählt' },
            { threshold: 2, labelEn: '1 Skill Upgraded', labelDE: '1 Fähigkeit verbessert' },
            { threshold: 3, labelEn: '3 Skills Upgraded', labelDE: '3 Fähigkeiten verbessert' },
            { threshold: 4, labelEn: 'All Skills Maxed', labelDE: 'Alle Fähigkeiten maximiert' },
        ]
    },

    // ── ACHIEVEMENTS VIA LEDGER ───────────────────
    {
        id: 'inference_achievements',
        category: 'inference',
        icon: '🏆',
        nameEn: 'Descriptive Statistics',
        nameDE: 'Deskriptive Statistik',
        descEn: 'Reach achievement-count milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Erfolg-Anzahl-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceAchievementMilestones',
        tiers: [
            { threshold: 1, labelEn: '10 Achievements', labelDE: '10 Erfolge' },
            { threshold: 2, labelEn: '25 Achievements', labelDE: '25 Erfolge' },
            { threshold: 3, labelEn: '50 Achievements', labelDE: '50 Erfolge' },
            { threshold: 4, labelEn: '100 Achievements', labelDE: '100 Erfolge' },
        ]
    },

    // ── LUCKY DROPS VIA LEDGER ────────────────────
    {
        id: 'inference_lucky_drops',
        category: 'inference',
        icon: '🍀',
        nameEn: 'Rare Event',
        nameDE: 'Seltenes Ereignis',
        descEn: 'Reach Lucky Drop milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Glücksfund-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceLuckyMilestones',
        tiers: [
            { threshold: 1, labelEn: '1 Drop', labelDE: '1 Fund' },
            { threshold: 2, labelEn: '10 Drops', labelDE: '10 Funde' },
            { threshold: 3, labelEn: '40 Drops', labelDE: '40 Funde' },
            { threshold: 4, labelEn: '77 Drops', labelDE: '77 Funde' },
        ]
    },

    // ── FLAWLESS LEVELS VIA LEDGER ────────────────
    {
        id: 'inference_zero_variance',
        category: 'inference',
        icon: '📉',
        nameEn: 'Zero Variance',
        nameDE: 'Null-Varianz',
        descEn: 'Reach flawless-level milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche fehlerfreie-Level-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceFlawlessMilestones',
        tiers: [
            { threshold: 1, labelEn: '10 Flawless', labelDE: '10 Makellos' },
            { threshold: 2, labelEn: '30 Flawless', labelDE: '30 Makellos' },
            { threshold: 3, labelEn: '60 Flawless', labelDE: '60 Makellos' },
            { threshold: 4, labelEn: '100 Flawless', labelDE: '100 Makellos' },
        ]
    },

    // ── KEYSTONE QUEST COMPLETIONS ────────────────
    {
        id: 'inference_keystone_quests',
        category: 'inference',
        icon: '🔑',
        nameEn: 'Keystone Quester',
        nameDE: 'Eckstein-Quester',
        descEn: 'Complete quests tied to Keystone passive tree nodes.',
        descDE: 'Schließe Quests ab, die mit Eckstein-Passivbaum-Knoten verbunden sind.',
        stat: 'inferenceKeystoneQuestsDone',
        tiers: [
            { threshold: 1, labelEn: 'First Keystone Quest', labelDE: 'Erster Eckstein-Quest' },
            { threshold: 5, labelEn: 'Keystone Seeker', labelDE: 'Eckstein-Sucher' },
            { threshold: 10, labelEn: 'Keystone Master', labelDE: 'Eckstein-Meister' },
        ]
    },

    // ── FULL CATEGORY COMPLETIONS ─────────────────
    {
        id: 'inference_full_categories',
        category: 'inference',
        icon: '📚',
        nameEn: 'Full Analysis',
        nameDE: 'Vollständige Analyse',
        descEn: 'Claim every milestone in an entire Inference Ledger category.',
        descDE: 'Beanspruche jeden Meilenstein in einer gesamten Inferenz-Buch-Kategorie.',
        stat: 'inferenceFullCategoriesClaimed',
        tiers: [
            { threshold: 1, labelEn: 'Category Champion', labelDE: 'Kategorie-Champion' },
            { threshold: 3, labelEn: 'Multi-Analyst', labelDE: 'Multi-Analyst' },
            { threshold: 7, labelEn: 'Grand Analyst', labelDE: 'Großer Analyst' },
        ]
    },

    // ── SAMPLE SIZE LEDGER ────────────────────────
    {
        id: 'inference_sample_size',
        category: 'inference',
        icon: '📊',
        nameEn: 'Sample Size',
        nameDE: 'Stichprobengröße',
        descEn: 'Reach level-count milestones tracked by the Inference Ledger.',
        descDE: 'Erreiche Level-Anzahl-Meilensteine im Inferenz-Buch.',
        stat: 'inferenceSampleMilestones',
        tiers: [
            { threshold: 1, labelEn: 'n = 10', labelDE: 'n = 10' },
            { threshold: 2, labelEn: 'n = 50', labelDE: 'n = 50' },
            { threshold: 3, labelEn: 'n = 100', labelDE: 'n = 100' },
            { threshold: 4, labelEn: 'n = 200', labelDE: 'n = 200' },
            { threshold: 5, labelEn: 'n = 500', labelDE: 'n = 500' },
        ]
    },

    //------------------------------------------------------------------------
    //-----------------------------ENDGAME------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // ── ATLAS: REGIONS COMPLETED ──────────────────
    {
        id: 'eg_atlas_regions',
        category: 'endgame',
        icon: '🗺️',
        nameEn: 'Cartographer',
        nameDE: 'Kartograf',
        descEn: 'Complete atlas regions on their required difficulty.',
        descDE: 'Schließe Atlas-Regionen auf ihrer erforderlichen Schwierigkeit ab.',
        stat: 'egAtlasRegions',
        tiers: [
            { threshold: 7, labelEn: 'Scout', labelDE: 'Kundschafter' },
            { threshold: 20, labelEn: 'Explorer', labelDE: 'Entdecker' },
            { threshold: 39, labelEn: 'Pathfinder', labelDE: 'Pfadfinder' },
            { threshold: 65, labelEn: 'Master Cartographer', labelDE: 'Meisterkartograf' },
            { threshold: 86, labelEn: 'Atlas Complete', labelDE: 'Atlas vollständig' },
        ]
    },

    // ── ATLAS: HIGHEST TIER REACHED ───────────────
    {
        id: 'eg_atlas_highest_tier',
        category: 'endgame',
        icon: '⛰️',
        nameEn: 'Ascension',
        nameDE: 'Aufstieg',
        descEn: 'Reach higher atlas tiers.',
        descDE: 'Erreiche höhere Atlas-Stufen.',
        stat: 'egAtlasHighestTier',
        tiers: [
            { threshold: 5, labelEn: 'Tier 5', labelDE: 'Stufe 5' },
            { threshold: 10, labelEn: 'Tier 10', labelDE: 'Stufe 10' },
            { threshold: 13, labelEn: 'Tier 13', labelDE: 'Stufe 13' },
            { threshold: 16, labelEn: 'Pinnacle', labelDE: 'Gipfel' },
        ]
    },

    // ── ATLAS: PINNACLE REGIONS (T16) ─────────────
    {
        id: 'eg_atlas_pinnacle',
        category: 'endgame',
        icon: '🏔️',
        nameEn: 'At the Summit',
        nameDE: 'Am Gipfel',
        descEn: 'Complete pinnacle (Tier 16) atlas regions.',
        descDE: 'Schließe Gipfel-Regionen (Stufe 16) ab.',
        stat: 'egAtlasPinnacle',
        tiers: [
            { threshold: 1, labelEn: 'First Pinnacle', labelDE: 'Erster Gipfel' },
            { threshold: 2, labelEn: 'Twin Peaks', labelDE: 'Doppelgipfel' },
            { threshold: 4, labelEn: 'Absolute Inference', labelDE: 'Absolute Inferenz' },
        ]
    },

    // ── MAPS: COMPLETED ───────────────────────────
    {
        id: 'eg_maps_completed',
        category: 'endgame',
        icon: '🗺️',
        nameEn: 'Map Runner',
        nameDE: 'Kartenläufer',
        descEn: 'Complete endgame maps.',
        descDE: 'Schließe Endgame-Karten ab.',
        stat: 'egMapsCompleted',
        tiers: [
            { threshold: 13, labelEn: 'Wayfarer', labelDE: 'Wanderer' },
            { threshold: 39, labelEn: 'Voyager', labelDE: 'Reisender' },
            { threshold: 100, labelEn: 'Expedition Leader', labelDE: 'Expeditionsleiter' },
            { threshold: 195, labelEn: 'Atlas Conqueror', labelDE: 'Atlas-Eroberer' },
            { threshold: 400, labelEn: 'Endless Cartographer', labelDE: 'Endloser Kartograf' },
        ]
    },

    // ── MAPS: T16 COMPLETED ───────────────────────
    {
        id: 'eg_maps_t16',
        category: 'endgame',
        icon: '🔥',
        nameEn: 'Pinnacle Runner',
        nameDE: 'Gipfelläufer',
        descEn: 'Complete Tier 16 maps.',
        descDE: 'Schließe Stufe-16-Karten ab.',
        stat: 'egMapsT16Completed',
        tiers: [
            { threshold: 1, labelEn: 'First T16', labelDE: 'Erste T16' },
            { threshold: 7, labelEn: 'Pinnacle Grinder', labelDE: 'Gipfel-Schleifer' },
            { threshold: 20, labelEn: 'Pinnacle Master', labelDE: 'Gipfelmeister' },
            { threshold: 39, labelEn: 'Pinnacle Overlord', labelDE: 'Gipfel-Overlord' },
        ]
    },

    // ── MAPS: HEAVILY MODDED (4+ mods) ────────────
    {
        id: 'eg_maps_heavily_modded',
        category: 'endgame',
        icon: '⚙️',
        nameEn: 'Risk Taker',
        nameDE: 'Risikoträger',
        descEn: 'Complete maps with 4 or more modifiers.',
        descDE: 'Schließe Karten mit 4 oder mehr Modifikatoren ab.',
        stat: 'egMapsHeavilyModded',
        tiers: [
            { threshold: 7, labelEn: 'Daredevil', labelDE: 'Draufgänger' },
            { threshold: 20, labelEn: 'High Roller', labelDE: 'High Roller' },
            { threshold: 50, labelEn: 'Masochist', labelDE: 'Masochist' },
            { threshold: 105, labelEn: 'Glutton for Punishment', labelDE: 'Unersättlich' },
        ]
    },

    // ── MAPS: HAZARD MAPS ─────────────────────────
    {
        id: 'eg_maps_hazard',
        category: 'endgame',
        icon: '🌋',
        nameEn: 'Hazard Pay',
        nameDE: 'Gefahrenzulage',
        descEn: 'Complete maps with elemental hazards (lava, blizzard, lightning, etc.).',
        descDE: 'Schließe Karten mit Elementargefahren ab (Lava, Blizzard, Blitz usw.).',
        stat: 'egMapsHazardCompleted',
        tiers: [
            { threshold: 7, labelEn: 'Hazard Scout', labelDE: 'Gefahrenkundschafter' },
            { threshold: 20, labelEn: 'Storm Chaser', labelDE: 'Sturmjäger' },
            { threshold: 39, labelEn: 'Cataclysm Survivor', labelDE: 'Katastrophen-Überlebender' },
            { threshold: 80, labelEn: 'Force of Nature', labelDE: 'Naturgewalt' },
        ]
    },

    // ── MAPS: FLAWLESS (0 mistakes) ───────────────
    {
        id: 'eg_maps_flawless',
        category: 'endgame',
        icon: '💎',
        nameEn: 'Flawless Cartographer',
        nameDE: 'Makelloser Kartograf',
        descEn: 'Complete maps without making a single mistake.',
        descDE: 'Schließe Karten ohne einen einzigen Fehler ab.',
        stat: 'egMapsFlawless',
        tiers: [
            { threshold: 7, labelEn: 'Steady Hand', labelDE: 'Ruhige Hand' },
            { threshold: 20, labelEn: 'Precision Mapping', labelDE: 'Präzise Kartierung' },
            { threshold: 39, labelEn: 'Immaculate', labelDE: 'Makellos' },
            { threshold: 65, labelEn: 'Perfection Incarnate', labelDE: 'Perfektion in Person' },
        ]
    },

    // ── MAPS: LAUNCHED VIA GATE ───────────────────
    {
        id: 'eg_maps_launched',
        category: 'endgame',
        icon: '🎲',
        nameEn: 'Gatekeeper',
        nameDE: 'Torwächter',
        descEn: 'Launch maps through the Probability Gate.',
        descDE: 'Starte Karten durch das Wahrscheinlichkeitstor.',
        stat: 'egMapsLaunched',
        tiers: [
            { threshold: 13, labelEn: 'First Steps', labelDE: 'Erste Schritte' },
            { threshold: 39, labelEn: 'Commuter', labelDE: 'Pendler' },
            { threshold: 100, labelEn: 'Gate Veteran', labelDE: 'Torveteran' },
            { threshold: 195, labelEn: 'Gate Master', labelDE: 'Tormeister' },
        ]
    },

    // ── NEXUS: FIRST VISIT ────────────────────────
    {
        id: 'eg_nexus_visit',
        category: 'endgame',
        icon: '🌀',
        nameEn: 'Beyond the Veil',
        nameDE: 'Jenseits des Schleiers',
        descEn: 'Enter the endgame Nexus and hubs.',
        descDE: 'Betrete den Endgame-Nexus und die Drehscheiben.',
        stat: 'egNexusVisits',
        tiers: [
            { threshold: 1, labelEn: 'Arrival', labelDE: 'Ankunft' },
            { threshold: 13, labelEn: 'Frequent Traveller', labelDE: 'Vielreisender' },
            { threshold: 39, labelEn: 'Nexus Dweller', labelDE: 'Nexus-Bewohner' },
        ]
    },

    // ── COMBAT: MONSTERS SLAIN ────────────────────
    {
        id: 'eg_monsters_slain',
        category: 'endgame',
        icon: '👹',
        nameEn: 'Monster Slayer',
        nameDE: 'Monsterschlächter',
        descEn: 'Defeat monsters.',
        descDE: 'Besiege Monster.',
        stat: 'egMonstersSlain',
        tiers: [
            { threshold: 130, labelEn: 'Hunter', labelDE: 'Jäger' },
            { threshold: 650, labelEn: 'Slayer', labelDE: 'Schlächter' },
            { threshold: 2600, labelEn: 'Eradicator', labelDE: 'Ausrotter' },
            { threshold: 6500, labelEn: 'Annihilator', labelDE: 'Vernichter' },
            { threshold: 13000, labelEn: 'Extinction Event', labelDE: 'Auslöschung' },
        ]
    },

    // ── COMBAT: BOSS KILLS ────────────────────────
    {
        id: 'eg_boss_kills',
        category: 'endgame',
        icon: '👁️',
        nameEn: 'Boss Hunter',
        nameDE: 'Bossjäger',
        descEn: 'Defeat bosses.',
        descDE: 'Besiege Bosse.',
        stat: 'egBossKills',
        tiers: [
            { threshold: 7, labelEn: 'Boss Novice', labelDE: 'Boss-Neuling' },
            { threshold: 26, labelEn: 'Boss Slayer', labelDE: 'Boss-Schlächter' },
            { threshold: 65, labelEn: 'Demon Slayer', labelDE: 'Dämonenschlächter' },
            { threshold: 130, labelEn: 'Pinnacle Slayer', labelDE: 'Gipfelschlächter' },
            { threshold: 325, labelEn: 'God Slayer', labelDE: 'Götterschlächter' },
        ]
    },

    // ── COMBAT: BOSS VARIETY ──────────────────────
    {
        id: 'eg_boss_variety',
        category: 'endgame',
        icon: '💫',
        nameEn: 'Pantheon',
        nameDE: 'Pantheon',
        descEn: 'Defeat each of the four Tier 16 bosses in Tier 16 maps.',
        descDE: 'Besiege jeden der vier Bosse der Stufe 16 in Karten der Stufe 16.',
        stat: 'egT16BossTypesSlain',
        tiers: [
            { threshold: 2, labelEn: 'Duo', labelDE: 'Duo' },
            { threshold: 3, labelEn: 'Trinity', labelDE: 'Trinität' },
            { threshold: 4, labelEn: 'Pantheon Vanquished', labelDE: 'Pantheon bezwungen' },
        ]
    },

    // ── CURRENCY: LOOTED ──────────────────────────
    {
        id: 'eg_currency_looted',
        category: 'endgame',
        icon: '🔮',
        nameEn: 'Core Collector',
        nameDE: 'Kernsammler',
        descEn: 'Loot reality cores from monsters.',
        descDE: 'Sammle Realitätskerne von Monstern.',
        stat: 'egCurrencyLooted',
        tiers: [
            { threshold: 33, labelEn: 'Collector', labelDE: 'Sammler' },
            { threshold: 130, labelEn: 'Hoarder', labelDE: 'Horter' },
            { threshold: 325, labelEn: 'Vault Filler', labelDE: 'Tresorfüller' },
            { threshold: 650, labelEn: 'Core Tycoon', labelDE: 'Kerntycoon' },
        ]
    },

    // ── CURRENCY: APPLIED ─────────────────────────
    {
        id: 'eg_currency_applied',
        category: 'endgame',
        icon: '✨',
        nameEn: 'Alchemist',
        nameDE: 'Alchemist',
        descEn: 'Apply reality cores to equipment or maps.',
        descDE: 'Wende Realitätskerne auf Ausrüstung oder Karten an.',
        stat: 'egCurrencyApplied',
        tiers: [
            { threshold: 13, labelEn: 'Tinkerer', labelDE: 'Bastler' },
            { threshold: 65, labelEn: 'Artificer', labelDE: 'Kunsthandwerker' },
            { threshold: 195, labelEn: 'Transmuter', labelDE: 'Transmutator' },
            { threshold: 400, labelEn: 'Master Alchemist', labelDE: 'Meisteralchemist' },
        ]
    },

    // ── CURRENCY: MIRROR USED ─────────────────────
    {
        id: 'eg_mirrors_used',
        category: 'endgame',
        icon: '🪞',
        nameEn: 'Reflections',
        nameDE: 'Spiegelungen',
        descEn: 'Use Echo Cores to copy items.',
        descDE: 'Nutze Echokerne, um Gegenstände zu kopieren.',
        stat: 'egMirrorsUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Reflection', labelDE: 'Erste Reflexion' },
            { threshold: 3, labelEn: 'Hall of Mirrors', labelDE: 'Spiegelkabinett' },
            { threshold: 7, labelEn: 'Infinite Regress', labelDE: 'Unendlicher Regress' },
        ]
    },

    // ── ESSENCES: LOOTED ──────────────────────────
    {
        id: 'eg_essences_looted',
        category: 'endgame',
        icon: '🧬',
        nameEn: 'Essence Collector',
        nameDE: 'Essenzsammler',
        descEn: 'Loot essences from monsters.',
        descDE: 'Sammle Essenzen von Monstern.',
        stat: 'egEssencesLooted',
        tiers: [
            { threshold: 33, labelEn: 'Gatherer', labelDE: 'Sammler' },
            { threshold: 130, labelEn: 'Harvester', labelDE: 'Ernter' },
            { threshold: 325, labelEn: 'Essence Hoarder', labelDE: 'Essenz-Horter' },
            { threshold: 650, labelEn: 'Essence Overlord', labelDE: 'Essenz-Overlord' },
        ]
    },

    // ── ESSENCES: APPLIED ─────────────────────────
    {
        id: 'eg_essences_applied',
        category: 'endgame',
        icon: '⚗️',
        nameEn: 'Essence Weaver',
        nameDE: 'Essenzweber',
        descEn: 'Apply essences to re-forge equipment.',
        descDE: 'Wende Essenzen an, um Ausrüstung neu zu schmieden.',
        stat: 'egEssencesApplied',
        tiers: [
            { threshold: 7, labelEn: 'First Infusion', labelDE: 'Erste Infusion' },
            { threshold: 33, labelEn: 'Adept Weaver', labelDE: 'Adeptenweber' },
            { threshold: 100, labelEn: 'Master Weaver', labelDE: 'Meisterweber' },
            { threshold: 195, labelEn: 'Essence God', labelDE: 'Essenzgott' },
        ]
    },

    // ── CRAFTING BENCH ────────────────────────────
    {
        id: 'eg_bench_crafts',
        category: 'endgame',
        icon: '⚒️',
        nameEn: 'Craftsman',
        nameDE: 'Handwerker',
        descEn: 'Craft modifiers at the Crafting Bench.',
        descDE: 'Fertige Modifikatoren an der Werkbank.',
        stat: 'egBenchCrafts',
        tiers: [
            { threshold: 7, labelEn: 'Apprentice', labelDE: 'Lehrling' },
            { threshold: 33, labelEn: 'Journeyman', labelDE: 'Geselle' },
            { threshold: 100, labelEn: 'Artisan', labelDE: 'Kunsthandwerker' },
            { threshold: 195, labelEn: 'Grandmaster Smith', labelDE: 'Großmeister-Schmied' },
        ]
    },

    // ── EQUIPMENT: EPIC DROPS ─────────────────────
    {
        id: 'eg_epic_looted',
        category: 'endgame',
        icon: '🟣',
        nameEn: 'Epic Hunter',
        nameDE: 'Epik-Jäger',
        descEn: 'Loot epic (purple) equipment.',
        descDE: 'Sammle epische (lila) Ausrüstung.',
        stat: 'egEpicLooted',
        tiers: [
            { threshold: 13, labelEn: 'First Epics', labelDE: 'Erste Epik' },
            { threshold: 50, labelEn: 'Epic Collector', labelDE: 'Epiksammler' },
            { threshold: 130, labelEn: 'Epic Hoarder', labelDE: 'Epik-Horter' },
            { threshold: 325, labelEn: 'Drowning in Epics', labelDE: 'Ertrinkt in Epik' },
        ]
    },

    // ── EQUIPMENT: 6-MOD EPIC ─────────────────────
    {
        id: 'eg_six_mod_epic',
        category: 'endgame',
        icon: '🌟',
        nameEn: 'Perfection Rolled',
        nameDE: 'Perfekt gewürfelt',
        descEn: 'Loot epic items with 6 modifiers (max rolled).',
        descDE: 'Sammle epische Gegenstände mit 6 Modifikatoren (maximal).',
        stat: 'egSixModLooted',
        tiers: [
            { threshold: 1, labelEn: 'Jackpot', labelDE: 'Jackpot' },
            { threshold: 7, labelEn: 'High Roller', labelDE: 'High Roller' },
            { threshold: 20, labelEn: 'God-Tier', labelDE: 'Göttlich' },
            { threshold: 50, labelEn: 'Mirror-Tier', labelDE: 'Spiegelstufe' },
        ]
    },

    // ── EQUIPMENT: BLESSING (IMPLICITS) ───────────
    {
        id: 'eg_blessings_used',
        category: 'endgame',
        icon: '🙏',
        nameEn: 'Blessed',
        nameDE: 'Gesegnet',
        descEn: 'Use Origin Cores to re-roll implicits.',
        descDE: 'Nutze Ursprungskerne, um Implizite neu zu würfeln.',
        stat: 'egBlessingsUsed',
        tiers: [
            { threshold: 1, labelEn: 'First Blessing', labelDE: 'Erster Segen' },
            { threshold: 13, labelEn: 'Anointed', labelDE: 'Gesalbt' },
            { threshold: 39, labelEn: 'Divinely Touched', labelDE: 'Göttlich berührt' },
            { threshold: 80, labelEn: 'Avatar of Blessing', labelDE: 'Avatar des Segens' },
        ]
    },

    // ── UNIQUES: COLLECTED ────────────────────────
    {
        id: 'eg_uniques_collected',
        category: 'endgame',
        icon: '👑',
        nameEn: 'Unique Collector',
        nameDE: 'Einzigartiger Sammler',
        descEn: 'Collect unique (legendary) items.',
        descDE: 'Sammle einzigartige (legendäre) Gegenstände.',
        stat: 'egUniquesCollected',
        tiers: [
            { threshold: 7, labelEn: 'Curator', labelDE: 'Kurator' },
            { threshold: 20, labelEn: 'Connoisseur', labelDE: 'Kenner' },
            { threshold: 39, labelEn: 'Legend Seeker', labelDE: 'Legendensucher' },
            { threshold: 60, labelEn: 'Vault of Legends', labelDE: 'Tresor der Legenden' },
        ]
    },

    // ── LEVELING: CHARACTER LEVEL ─────────────────
    {
        id: 'eg_player_level',
        category: 'endgame',
        icon: '⭐',
        nameEn: 'Level Up',
        nameDE: 'Stufenaufstieg',
        descEn: 'Reach character levels in the endgame.',
        descDE: 'Erreiche Charakterstufen im Endgame.',
        stat: 'egPlayerLevel',
        tiers: [
            { threshold: 30, labelEn: 'Seasoned', labelDE: 'Erfahren' },
            { threshold: 50, labelEn: 'Veteran', labelDE: 'Veteran' },
            { threshold: 70, labelEn: 'Elite', labelDE: 'Elite' },
            { threshold: 90, labelEn: 'Master', labelDE: 'Meister' },
            { threshold: 100, labelEn: 'Level 100', labelDE: 'Stufe 100' },
        ]
    },

    // ── GOLD: EARNED ──────────────────────────────
    {
        id: 'eg_gold_earned',
        category: 'endgame',
        icon: '🪙',
        nameEn: 'Treasure Hunter',
        nameDE: 'Schatzjäger',
        descEn: 'Earn gold from map completion rewards.',
        descDE: 'Verdiene Gold durch Kartenabschluss-Belohnungen.',
        stat: 'egGoldEarned',
        tiers: [
            { threshold: 1300, labelEn: 'Pocket Change', labelDE: 'Kleingeld' },
            { threshold: 6500, labelEn: 'Coin Purse', labelDE: 'Münzbeutel' },
            { threshold: 26000, labelEn: 'Treasure Chest', labelDE: 'Schatztruhe' },
            { threshold: 65000, labelEn: 'Dragon Hoard', labelDE: 'Drachenhort' },
            { threshold: 130000, labelEn: 'Kingdom Wealth', labelDE: 'Königreichsreichtum' },
        ]
    },

    // ── GOLD: SPENT ───────────────────────────────
    {
        id: 'eg_gold_spent',
        category: 'endgame',
        icon: '💸',
        nameEn: 'Big Spender',
        nameDE: 'Großer Geldausgeber',
        descEn: 'Spend gold at the Vendor and elsewhere.',
        descDE: 'Gib Gold beim Händler und anderswo aus.',
        stat: 'egGoldSpent',
        tiers: [
            { threshold: 1300, labelEn: 'First Purchase', labelDE: 'Erster Kauf' },
            { threshold: 6500, labelEn: 'Patron', labelDE: 'Gönner' },
            { threshold: 26000, labelEn: 'Whale', labelDE: 'Wal' },
            { threshold: 65000, labelEn: 'Money to Burn', labelDE: 'Geld zum Verbrennen' },
        ]
    },

    // ── VENDOR: PURCHASES ─────────────────────────
    {
        id: 'eg_vendor_purchases',
        category: 'endgame',
        icon: '🏪',
        nameEn: 'Patron of the Bazaar',
        nameDE: 'Gönner des Basars',
        descEn: 'Purchase items from the Vendor.',
        descDE: 'Kaufe Gegenstände beim Händler.',
        stat: 'egVendorPurchases',
        tiers: [
            { threshold: 7, labelEn: 'Window Shopper', labelDE: 'Schaufensterbummler' },
            { threshold: 26, labelEn: 'Regular', labelDE: 'Stammkunde' },
            { threshold: 65, labelEn: 'VIP', labelDE: 'VIP' },
            { threshold: 130, labelEn: 'Bazaar Lord', labelDE: 'Basar-Lord' },
        ]
    },

    // ── SHARDS: ITEMS SOLD ────────────────────────
    {
        id: 'eg_items_sold',
        category: 'endgame',
        icon: '🔨',
        nameEn: 'Salvager',
        nameDE: 'Verwerter',
        descEn: 'Sell items for fragments (Ctrl+click in stash).',
        descDE: 'Verkaufe Gegenstände für Fragmente (Strg+Klick im Lager).',
        stat: 'egItemsSold',
        tiers: [
            { threshold: 13, labelEn: 'Scrapper', labelDE: 'Schrotthändler' },
            { threshold: 65, labelEn: 'Salvage Expert', labelDE: 'Verwertungsexperte' },
            { threshold: 195, labelEn: 'Recycling Plant', labelDE: 'Recyclinganlage' },
            { threshold: 400, labelEn: 'Industrial Salvager', labelDE: 'Industrieller Verwerter' },
        ]
    },

    // ── SHARDS: CONVERTED TO ORBS ─────────────────
    {
        id: 'eg_shards_converted',
        category: 'endgame',
        icon: '💠',
        nameEn: 'Fragment Assembler',
        nameDE: 'Fragmentenbauer',
        descEn: 'Convert full fragment stacks into cores.',
        descDE: 'Wandle volle Fragmentenstapel in Kerne um.',
        stat: 'egShardsConverted',
        tiers: [
            { threshold: 13, labelEn: 'First Conversions', labelDE: 'Erste Umwandlungen' },
            { threshold: 39, labelEn: 'Fragment Weaver', labelDE: 'Fragmentenweber' },
            { threshold: 100, labelEn: 'Fragment Master', labelDE: 'Fragmentenmeister' },
            { threshold: 195, labelEn: 'Fragment God', labelDE: 'Fragmentengott' },
        ]
    },

    // ── QUIZ: CORRECT IN MAPS ─────────────────────
    {
        id: 'eg_quiz_correct',
        category: 'endgame',
        icon: '🧠',
        nameEn: 'Scholar of the Atlas',
        nameDE: 'Gelehrter des Atlas',
        descEn: 'Answer quiz questions correctly during maps.',
        descDE: 'Beantworte Quizfragen während Karten korrekt.',
        stat: 'egQuizCorrect',
        tiers: [
            { threshold: 13, labelEn: 'Student', labelDE: 'Student' },
            { threshold: 65, labelEn: 'Scholar', labelDE: 'Gelehrter' },
            { threshold: 195, labelEn: 'Professor', labelDE: 'Professor' },
            { threshold: 400, labelEn: 'Sage of the Atlas', labelDE: 'Weiser des Atlas' },
        ]
    },

    // ── AILMENTS: INFLICTED ON MONSTERS ───────────
    {
        id: 'eg_ailments_inflicted',
        category: 'endgame',
        icon: '🔥',
        nameEn: 'Afflictionist',
        nameDE: 'Leidensbringer',
        descEn: 'Inflict elemental ailments on monsters (ignite, chill, shock, etc.).',
        descDE: 'Füge Monstern Elementarzustände zu (Entzünden, Kälte, Schock usw.).',
        stat: 'egAilmentsInflicted',
        tiers: [
            { threshold: 33, labelEn: 'First Ailments', labelDE: 'Erste Leiden' },
            { threshold: 130, labelEn: 'Afflictor', labelDE: 'Peiniger' },
            { threshold: 325, labelEn: 'Plague Bringer', labelDE: 'Seuchenbringer' },
            { threshold: 650, labelEn: 'Master of Maladies', labelDE: 'Meister der Leiden' },
        ]
    },

    // ── LOOT FILTER: AUTO-VENDORED ────────────────
    {
        id: 'eg_lootfilter_vendored',
        category: 'endgame',
        icon: '🗑️',
        nameEn: 'Filter Manager',
        nameDE: 'Filtermanager',
        descEn: 'Have the loot filter automatically vendor items.',
        descDE: 'Lass den Lootfilter Gegenstände automatisch verwerten.',
        stat: 'egLootFilterVendored',
        tiers: [
            { threshold: 13, labelEn: 'First Filtered', labelDE: 'Erst gefiltert' },
            { threshold: 65, labelEn: 'Assembly Line', labelDE: 'Fließband' },
            { threshold: 195, labelEn: 'Automated', labelDE: 'Automatisiert' },
            { threshold: 400, labelEn: 'Full Automation', labelDE: 'Vollautomatisiert' },
        ]
    },

    // Passive-tree achievements are GLOBAL (all save slots): peak / distinct
    // stats, never raw click counters - see _ptTrackAllocationAchievements.
    //------------------------------------------------------------------------
    //--------------------PROBABILITY TREE------------------------------------------
    //------------------------------------------------------------------------

    {
        id: 'tree_nodes_peak',
        category: 'tree',
        icon: '🌱',
        nameEn: 'Rooted Growth',
        nameDE: 'Wurzelwachstum',
        descEn: 'Have this many passive nodes allocated at once (best result across all save slots).',
        descDE: 'Habe so viele Passivknoten gleichzeitig vergeben (Bestwert über alle Spielstände).',
        stat: 'treeNodesPeak',
        tiers: [
            { threshold: 10, labelEn: 'Seedling', labelDE: 'Setzling' },
            { threshold: 25, labelEn: 'Sapling', labelDE: 'Schössling' },
            { threshold: 50, labelEn: 'Grown Tree', labelDE: 'Ausgewachsen' },
            { threshold: 75, labelEn: 'Great Oak', labelDE: 'Große Eiche' },
            { threshold: 100, labelEn: 'World Tree', labelDE: 'Weltenbaum' },
        ]
    },

    {
        id: 'tree_notables_peak',
        category: 'tree',
        icon: '💠',
        nameEn: 'Notable Collection',
        nameDE: 'Bemerkenswerte Sammlung',
        descEn: 'Have Notable nodes allocated at the same time.',
        descDE: 'Habe gleichzeitig Notable-Knoten vergeben.',
        stat: 'treeNotablesPeak',
        tiers: [
            { threshold: 5, labelEn: 'Standouts', labelDE: 'Hingucker' },
            { threshold: 15, labelEn: 'Highlight Reel', labelDE: 'Highlights' },
            { threshold: 30, labelEn: 'Specialist', labelDE: 'Spezialist' },
            { threshold: 50, labelEn: 'Master Build', labelDE: 'Meisterbuild' },
        ]
    },

    {
        id: 'tree_notables_unique',
        category: 'tree',
        icon: '📖',
        nameEn: 'Notable Hunter',
        nameDE: 'Notable-Jäger',
        descEn: 'Allocate different Notable nodes at least once. Respeccing never loses this tally.',
        descDE: 'Vergib verschiedene Notable-Knoten mindestens einmal. Umskillen kostet dich diesen Fortschritt nie.',
        stat: 'treeNotablesUnique',
        tiers: [
            { threshold: 25, labelEn: 'Window Shopper', labelDE: 'Schaufensterbummler' },
            { threshold: 100, labelEn: 'Browser', labelDE: 'Stöberer' },
            { threshold: 250, labelEn: 'Connoisseur', labelDE: 'Kenner' },
            { threshold: 400, labelEn: 'Completionist', labelDE: 'Komplettist' },
        ]
    },

    {
        id: 'tree_keystones_peak',
        category: 'tree',
        icon: '🗝️',
        nameEn: 'Rule Breaker',
        nameDE: 'Regelbrecher',
        descEn: 'Have Keystones active at the same time (God Keystones do not count).',
        descDE: 'Habe gleichzeitig Schlüsselsteine aktiv (Gott-Schlüsselsteine zählen nicht).',
        stat: 'treeKeystonesPeak',
        tiers: [
            { threshold: 1, labelEn: 'Bold Choice', labelDE: 'Mutige Wahl' },
            { threshold: 2, labelEn: 'Double Down', labelDE: 'Doppelt hält besser' },
            { threshold: 3, labelEn: 'Triple Threat', labelDE: 'Dreifachbedrohung' },
            { threshold: 5, labelEn: 'Keystone Collector', labelDE: 'Schlusssteinsammler' },
        ]
    },

    {
        id: 'tree_keystones_unique',
        category: 'tree',
        icon: '🔑',
        nameEn: 'Keystone Explorer',
        nameDE: 'Schlüsselstein-Entdecker',
        descEn: 'Try different Keystones (God Keystones do not count). Respeccing never loses this tally.',
        descDE: 'Probiere verschiedene Schlüsselsteine aus (Gott-Schlüsselsteine zählen nicht). Umskillen kostet dich diesen Fortschritt nie.',
        stat: 'treeKeystonesUnique',
        tiers: [
            { threshold: 3, labelEn: 'Curious', labelDE: 'Neugierig' },
            { threshold: 10, labelEn: 'Experimenter', labelDE: 'Experimentierer' },
            { threshold: 25, labelEn: 'Theorycrafter', labelDE: 'Theoretiker' },
            { threshold: 50, labelEn: 'Master of Mechanics', labelDE: 'Mechanik-Meister' },
            { threshold: 75, labelEn: 'Keystone Sage', labelDE: 'Schlusstein-Weiser' },
        ]
    },

    {
        id: 'tree_gods_unique',
        category: 'tree',
        icon: '✨',
        nameEn: 'Pantheon',
        nameDE: 'Pantheon',
        descEn: 'Allocate each God Keystone at least once: Statistics, Math and Probabilities.',
        descDE: 'Vergib jeden Gott-Schlüsselstein mindestens einmal: Statistik, Mathe und Wahrscheinlichkeit.',
        stat: 'treeGodsUnique',
        tiers: [
            { threshold: 1, labelEn: 'First Devotion', labelDE: 'Erste Hingabe' },
            { threshold: 2, labelEn: 'Two Gods', labelDE: 'Zwei Götter' },
            { threshold: 3, labelEn: 'Full Pantheon', labelDE: 'Volles Pantheon' },
        ]
    },

    {
        id: 'tree_branches_unique',
        category: 'tree',
        icon: '🔱',
        nameEn: 'Wheel Master',
        nameDE: 'Radmeister',
        descEn: 'Complete an entire class wheel of Stox, Trix or Syla: all 18 nodes, God Keystone included.',
        descDE: 'Vervollständige ein komplettes Klassenrad von Stox, Trix oder Syla: alle 18 Knoten inklusive Gott-Schlüsselstein.',
        stat: 'treeBranchesUnique',
        tiers: [
            { threshold: 1, labelEn: 'Wheel Complete', labelDE: 'Rad vollendet' },
            { threshold: 2, labelEn: 'Two Wheels', labelDE: 'Zwei Räder' },
            { threshold: 3, labelEn: 'Trinity', labelDE: 'Dreifaltigkeit' },
        ]
    },

    {
        id: 'tree_wheel_extension',
        category: 'tree',
        icon: '🎡',
        nameEn: 'Outer Rings',
        nameDE: 'Äußere Ringe',
        descEn: 'Have class wheel extension notables allocated at the same time.',
        descDE: 'Habe gleichzeitig Erweiterungs-Notables der Klassenräder vergeben.',
        stat: 'treeWheelExtensionPeak',
        tiers: [
            { threshold: 5, labelEn: 'Extended Reach', labelDE: 'Erweiterte Reichweite' },
            { threshold: 10, labelEn: 'Wide Reach', labelDE: 'Weite Reichweite' },
            { threshold: 20, labelEn: 'Far Reach', labelDE: 'Fernste Reichweite' },
        ]
    },

    {
        id: 'tree_ascend_wheels',
        category: 'tree',
        icon: '🌀',
        nameEn: 'Ascended Wheels',
        nameDE: 'Aufgestiegene Räder',
        descEn: 'Complete an entire Ascendency wheel: all 8 of its notables.',
        descDE: 'Vervollständige ein komplettes Aufstiegsrad: alle 8 Notables.',
        stat: 'treeAscendWheelsUnique',
        tiers: [
            { threshold: 1, labelEn: 'First Ascent', labelDE: 'Erster Aufstieg' },
            { threshold: 3, labelEn: 'Triple Ascent', labelDE: 'Dreifacher Aufstieg' },
            { threshold: 6, labelEn: 'Total Ascent', labelDE: 'Totaler Aufstieg' },
        ]
    },

    {
        id: 'tree_travel_peak',
        category: 'tree',
        icon: '🛤️',
        nameEn: 'Long Road',
        nameDE: 'Langer Weg',
        descEn: 'Have Travel nodes allocated at the same time - the long paths between clusters.',
        descDE: 'Habe gleichzeitig Reiseknoten vergeben - die langen Wege zwischen den Clustern.',
        stat: 'treeTravelPeak',
        tiers: [
            { threshold: 5, labelEn: 'Wanderer', labelDE: 'Wanderer' },
            { threshold: 15, labelEn: 'Pathfinder', labelDE: 'Pfadfinder' },
            { threshold: 30, labelEn: 'Trailblazer', labelDE: 'Wegbereiter' },
            { threshold: 60, labelEn: 'Cartographer', labelDE: 'Kartograph' },
        ]
    },

    {
        id: 'tree_respecs',
        category: 'tree',
        icon: '♻️',
        nameEn: 'Second Thoughts',
        nameDE: 'Zweite Gedanken',
        descEn: 'Rebuild your tree: refund 5 or more nodes at once with Refund All.',
        descDE: 'Baue deinen Baum um: Erstatte mit Alles erstatten 5 oder mehr Knoten auf einmal.',
        stat: 'treeRespecs',
        tiers: [
            { threshold: 1, labelEn: 'Fresh Start', labelDE: 'Neuanfang' },
            { threshold: 5, labelEn: 'Rebuilder', labelDE: 'Umbauer' },
            { threshold: 15, labelEn: 'Eternal Tinkerer', labelDE: 'Ewiger Tüftler' },
        ]
    },

    // Combat achievements are fed by RunStats (js/combat/combat-run-stats.js).
    //------------------------------------------------------------------------
    //--------------------COMBAT------------------------------------------
    //------------------------------------------------------------------------

    {
        id: 'combat_crits',
        category: 'combat',
        icon: '💥',
        nameEn: 'Critical Mass',
        nameDE: 'Kritische Masse',
        descEn: 'Land critical hits.',
        descDE: 'Lande kritische Treffer.',
        stat: 'combatCrits',
        tiers: [
            { threshold: 33, labelEn: 'Lucky Strike', labelDE: 'Glückstreffer' },
            { threshold: 130, labelEn: 'Sharp Eye', labelDE: 'Scharfes Auge' },
            { threshold: 650, labelEn: 'Crit Machine', labelDE: 'Krit-Maschine' },
            { threshold: 2600, labelEn: 'Deadly Precision', labelDE: 'Tödliche Präzision' },
            { threshold: 6500, labelEn: 'Executioner', labelDE: 'Henker' },
        ]
    },

    {
        id: 'combat_damage_dealt',
        category: 'combat',
        icon: '⚔️',
        nameEn: 'Damage Dealer',
        nameDE: 'Schadensverursacher',
        descEn: 'Deal damage to monsters (all fights, all save slots).',
        descDE: 'Füge Monstern Schaden zu (alle Kämpfe, alle Spielstände).',
        stat: 'combatDamageDealt',
        tiers: [
            { threshold: 1300, labelEn: 'Scratches', labelDE: 'Kratzer' },
            { threshold: 13000, labelEn: 'Bruiser', labelDE: 'Raufbold' },
            { threshold: 130000, labelEn: 'Wrecking Crew', labelDE: 'Abrissbirne' },
            { threshold: 1300000, labelEn: 'Million Club', labelDE: 'Millionenclub' },
            { threshold: 6500000, labelEn: 'Calamity', labelDE: 'Katastrophe' },
        ]
    },

    {
        id: 'combat_big_hit',
        category: 'combat',
        icon: '🔨',
        nameEn: 'Heavy Hitter',
        nameDE: 'Schwerer Treffer',
        descEn: 'Deal a single hit of at least this much damage.',
        descDE: 'Verteile einen einzelnen Treffer mit mindestens so viel Schaden.',
        stat: 'combatBiggestHit',
        tiers: [
            { threshold: 130, labelEn: 'Solid Hit', labelDE: 'Solider Treffer' },
            { threshold: 650, labelEn: 'Haymaker', labelDE: 'Hammerschlag' },
            { threshold: 1950, labelEn: 'Bone Breaker', labelDE: 'Knochenbrecher' },
            { threshold: 6500, labelEn: 'Wall Crusher', labelDE: 'Mauerbrecher' },
            { threshold: 19500, labelEn: 'Cataclysm', labelDE: 'Kataklysmus' },
        ]
    },

    {
        id: 'combat_damage_taken',
        category: 'combat',
        icon: '🩹',
        nameEn: 'Thick Skin',
        nameDE: 'Dicke Haut',
        descEn: 'Take damage in combat and keep fighting.',
        descDE: 'Nimm im Kampf Schaden und kämpfe weiter.',
        stat: 'combatDamageTaken',
        tiers: [
            { threshold: 650, labelEn: 'Bruised', labelDE: 'Angeschlagen' },
            { threshold: 6500, labelEn: 'Battle-Scarred', labelDE: 'Kampfnarben' },
            { threshold: 32500, labelEn: 'Veteran Tank', labelDE: 'Veteranen-Tank' },
            { threshold: 130000, labelEn: 'Immovable', labelDE: 'Unbeweglich' },
        ]
    },

    {
        id: 'combat_dodges',
        category: 'combat',
        icon: '💨',
        nameEn: 'Evasive Maneuvers',
        nameDE: 'Ausweichmanöver',
        descEn: 'Dodge incoming attacks.',
        descDE: 'Weiche eingehenden Angriffen aus.',
        stat: 'combatDodges',
        tiers: [
            { threshold: 13, labelEn: 'Nimble', labelDE: 'Flink' },
            { threshold: 65, labelEn: 'Slippery', labelDE: 'Glitschig' },
            { threshold: 250, labelEn: 'Shadow Step', labelDE: 'Schattenschritt' },
            { threshold: 975, labelEn: 'Ghost', labelDE: 'Geist' },
        ]
    },

    {
        id: 'combat_blocks',
        category: 'combat',
        icon: '🧱',
        nameEn: 'Shield Wall',
        nameDE: 'Schildwall',
        descEn: 'Block incoming attacks.',
        descDE: 'Blocke eingehende Angriffe.',
        stat: 'combatBlocks',
        tiers: [
            { threshold: 13, labelEn: 'Steady Guard', labelDE: 'Feste Deckung' },
            { threshold: 65, labelEn: 'Bulwark', labelDE: 'Bollwerk' },
            { threshold: 250, labelEn: 'Fortress', labelDE: 'Festung' },
            { threshold: 975, labelEn: 'Unbreakable', labelDE: 'Unzerbrechlich' },
        ]
    },

    {
        id: 'combat_parries',
        category: 'combat',
        icon: '🤺',
        nameEn: 'Riposte',
        nameDE: 'Riposte',
        descEn: 'Parry incoming attacks.',
        descDE: 'Pariere eingehende Angriffe.',
        stat: 'combatParries',
        tiers: [
            { threshold: 7, labelEn: 'Quick Wrist', labelDE: 'Flinke Hand' },
            { threshold: 33, labelEn: 'Duelist', labelDE: 'Duellant' },
            { threshold: 130, labelEn: 'Swordmaster', labelDE: 'Schwertmeister' },
            { threshold: 525, labelEn: 'Flawless Form', labelDE: 'Makellose Form' },
        ]
    },

    {
        id: 'combat_melee_hits',
        category: 'combat',
        icon: '🗡️',
        nameEn: 'Up Close',
        nameDE: 'Nah dran',
        descEn: 'Land melee strikes.',
        descDE: 'Lande Nahkampftreffer.',
        stat: 'combatMeleeHits',
        tiers: [
            { threshold: 65, labelEn: 'Brawler', labelDE: 'Raufer' },
            { threshold: 325, labelEn: 'Blademaster', labelDE: 'Klingenmeister' },
            { threshold: 1300, labelEn: 'Warlord', labelDE: 'Kriegsherr' },
            { threshold: 5200, labelEn: 'Avatar of War', labelDE: 'Kriegsavatar' },
        ]
    },

    {
        id: 'combat_projectile_hits',
        category: 'combat',
        icon: '🏹',
        nameEn: 'Sharpshooter',
        nameDE: 'Scharfschütze',
        descEn: 'Hit monsters with projectiles.',
        descDE: 'Triff Monster mit Projektilen.',
        stat: 'combatProjectileHits',
        tiers: [
            { threshold: 65, labelEn: 'Marksman', labelDE: 'Schütze' },
            { threshold: 325, labelEn: 'Sniper', labelDE: 'Sniper' },
            { threshold: 1300, labelEn: 'Eagle Eye', labelDE: 'Adlerauge' },
            { threshold: 5200, labelEn: 'Rain of Arrows', labelDE: 'Pfeilhagel' },
        ]
    },

    {
        id: 'combat_spell_hits',
        category: 'combat',
        icon: '🔮',
        nameEn: 'Spellslinger',
        nameDE: 'Zauberschleuderer',
        descEn: 'Hit monsters with spells.',
        descDE: 'Triff Monster mit Zaubern.',
        stat: 'combatSpellHits',
        tiers: [
            { threshold: 65, labelEn: 'Apprentice', labelDE: 'Lehrling' },
            { threshold: 325, labelEn: 'Evoker', labelDE: 'Beschwörer' },
            { threshold: 1300, labelEn: 'Archmage', labelDE: 'Erzmagier' },
            { threshold: 5200, labelEn: 'Arcane Storm', labelDE: 'Arkanes Sturm' },
        ]
    },

    {
        id: 'combat_untouched',
        category: 'combat',
        icon: '🕊️',
        nameEn: 'Not a Scratch',
        nameDE: 'Nicht ein Kratzer',
        descEn: 'Win a fight without taking any damage.',
        descDE: 'Gewinne einen Kampf, ohne Schaden zu nehmen.',
        stat: 'combatUntouchedWins',
        tiers: [
            { threshold: 1, labelEn: 'Lucky Day', labelDE: 'Glückstag' },
            { threshold: 7, labelEn: 'Clean Fighter', labelDE: 'Sauberer Kampf' },
            { threshold: 20, labelEn: 'Dancer', labelDE: 'Tänzer' },
            { threshold: 50, labelEn: 'Phantom Fighter', labelDE: 'Phantomkämpfer' },
        ]
    },

    {
        id: 'combat_clutch',
        category: 'combat',
        icon: '❤️‍🔥',
        nameEn: 'Hanging by a Thread',
        nameDE: 'Am seidenen Faden',
        descEn: 'Win a fight with less than 10% of your Life left.',
        descDE: 'Gewinne einen Kampf mit weniger als 10 % deines Lebens.',
        stat: 'combatClutchWins',
        tiers: [
            { threshold: 1, labelEn: 'Close Call', labelDE: 'Knapp' },
            { threshold: 7, labelEn: 'Nerves of Steel', labelDE: 'Nerven aus Stahl' },
            { threshold: 20, labelEn: 'Living Dangerously', labelDE: 'Gefährlich gelebt' },
            { threshold: 50, labelEn: 'Death Defier', labelDE: 'Todesverächter' },
        ]
    },

    {
        id: 'combat_monster_level',
        category: 'combat',
        icon: '☠️',
        nameEn: 'Deep Dive',
        nameDE: 'Tiefer Tauchgang',
        descEn: 'Defeat a monster of at least this level.',
        descDE: 'Besiege ein Monster mit mindestens dieser Stufe.',
        stat: 'combatHighestMonsterLevel',
        tiers: [
            { threshold: 10, labelEn: 'Fresh Blood', labelDE: 'Frisches Blut' },
            { threshold: 25, labelEn: 'Hardened', labelDE: 'Abgehärtet' },
            { threshold: 50, labelEn: 'Giant Slayer', labelDE: 'Riesentöter' },
            { threshold: 70, labelEn: 'Dread Hunter', labelDE: 'Schreckensjäger' },
            { threshold: 90, labelEn: 'Legend', labelDE: 'Legende' },
        ]
    },
];