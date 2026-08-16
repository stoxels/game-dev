const ACHIEVEMENT_DEFS = [

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
            { threshold: 10, labelEn: 'Getting Started', labelDE: 'Am Anfang' },
            { threshold: 50, labelEn: 'Puzzle Enthusiast', labelDE: 'Rätsel-Enthusiast' },
            { threshold: 100, labelEn: 'Dedicated Solver', labelDE: 'Engagierter Löser' },
            { threshold: 250, labelEn: 'Puzzle Veteran', labelDE: 'Rätsel-Veteran' },
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
            { threshold: 10, labelEn: 'Clean Slate', labelDE: 'Reiner Tisch' },
            { threshold: 30, labelEn: 'Flawless', labelDE: 'Makellos' },
            { threshold: 60, labelEn: 'Untouchable', labelDE: 'Unberührbar' },
            { threshold: 100, labelEn: 'Diamond Mind', labelDE: 'Diamantgeist' },
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
            { threshold: 10, labelEn: 'Going Solo', labelDE: 'Alleingang' },
            { threshold: 30, labelEn: 'Minimalist', labelDE: 'Minimalist' },
            { threshold: 60, labelEn: 'Ironclad', labelDE: 'Eisenhart' },
            { threshold: 100, labelEn: 'True Purist', labelDE: 'Echter Purist' },
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
            { threshold: 10, labelEn: 'Crystal Clear', labelDE: 'Glasklar' },
            { threshold: 50, labelEn: 'Unassisted', labelDE: 'Ohne Hilfe' },
            { threshold: 100, labelEn: 'Logical Ascendant', labelDE: 'Logischer Aufsteiger' },
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
            { threshold: 5, labelEn: 'Try Again', labelDE: 'Nochmal versuchen' },
            { threshold: 20, labelEn: 'Stubborn', labelDE: 'Stur' },
            { threshold: 50, labelEn: 'Obsessed', labelDE: 'Besessen' },
            { threshold: 100, labelEn: 'Relentless', labelDE: 'Unnachgiebig' }, 
            { threshold: 200, labelEn: 'Persistent', labelDE: 'Beharrlich' }, 
            { threshold: 500, labelEn: 'Unyielding', labelDE: 'Unbeugsam' }, 
            { threshold: 1000, labelEn: 'Indomitable', labelDE: 'Unbezwingbar' },
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
            { threshold: 13, labelEn: 'Completionist Supreme', labelDE: 'Supreme Perfektionist' },
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
            { threshold: 13, labelEn: 'World Traveller', labelDE: 'Weltreisender' },
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
            { threshold: 5, labelEn: 'Casual Solver', labelDE: 'Gelegenheitsknacker' },
            { threshold: 15, labelEn: 'Puzzle Tourist', labelDE: 'Puzzle-Tourist' },
            { threshold: 30, labelEn: 'Gentle Navigator', labelDE: 'Sanfter Navigator' },
            { threshold: 60, labelEn: 'Easy Expert', labelDE: 'Leicht-Experte' },
            { threshold: 100, labelEn: 'Master of Leisure', labelDE: 'Meister der Gelassenheit' },
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
            { threshold: 10, labelEn: 'Steady Mind', labelDE: 'Solider Geist' },
            { threshold: 25, labelEn: 'Reliable Solver', labelDE: 'Verlässlicher Löser' },
            { threshold: 45, labelEn: 'Methodical Thinker', labelDE: 'Methodischer Denker' },
            { threshold: 70, labelEn: 'Puzzle Veteran', labelDE: 'Puzzle-Veteran' },
            { threshold: 100, labelEn: 'Master of Balance', labelDE: 'Meister der Balance' },
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
            { threshold: 5, labelEn: 'Hard Starter', labelDE: 'Schwer-Einsteiger' },
            { threshold: 15, labelEn: 'Hard Gainer', labelDE: 'Schwer-Aufsteiger' },
            { threshold: 30, labelEn: 'Masochist', labelDE: 'Masochist' },
            { threshold: 60, labelEn: 'Glutton for Pain', labelDE: 'Schmerzenssucher' },
            { threshold: 100, labelEn: 'Punishment Incarnate', labelDE: 'Verkörperte Strafe' },
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
            { threshold: 10, labelEn: 'Fearless', labelDE: 'Furchtlos' },
            { threshold: 25, labelEn: 'Immortal', labelDE: 'Unsterblich' },
            { threshold: 50, labelEn: 'Death Denier', labelDE: 'Todverweigerer' },
            { threshold: 100, labelEn: 'Legend Unbroken', labelDE: 'Ungebrochene Legende' },
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
            { threshold: 10, labelEn: 'Quick Fingers', labelDE: 'Schnelle Finger' },
            { threshold: 25, labelEn: 'Lightning Solver', labelDE: 'Blitz-Löser' },
            { threshold: 50, labelEn: 'Time Bender', labelDE: 'Zeitbezwinger' },
            { threshold: 100, labelEn: 'Chronomancer', labelDE: 'Chronomant' },
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
            { threshold: 10, labelEn: 'Man of Steel', labelDE: 'Stahlmann' },
            { threshold: 25, labelEn: 'Unyielding', labelDE: 'Unbeugsam' },
            { threshold: 50, labelEn: 'Titanium Mind', labelDE: 'Titan-Geist' },
            { threshold: 100, labelEn: 'Adamant Champion', labelDE: 'Adamant-Champion' },
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
            { threshold: 10, labelEn: 'Self Made Scholar', labelDE: 'Selbstgemachter Gelehrter' },
            { threshold: 25, labelEn: 'Independent Thinker', labelDE: 'Unabhängiger Denker' },
            { threshold: 50, labelEn: 'Natural Genius', labelDE: 'Naturtalent' },
            { threshold: 100, labelEn: 'Mind Over Matter', labelDE: 'Geist über Materie' },
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
            { threshold: 10, labelEn: 'Branching Out Solo', labelDE: 'Einzelgänger' },
            { threshold: 25, labelEn: 'Forest Exile', labelDE: 'Waldverbannter' },
            { threshold: 50, labelEn: 'Lumber Legend', labelDE: 'Holzfäller-Legende' },
            { threshold: 100, labelEn: 'Enemy of Nature', labelDE: 'Feind der Natur' },
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
            { threshold: 100, labelEn: 'First Hundred', labelDE: 'Erste Hundert' },
            { threshold: 500, labelEn: 'Builder', labelDE: 'Erbauer' },
            { threshold: 2000, labelEn: 'Architect', labelDE: 'Architekt' },
            { threshold: 10000, labelEn: 'Master Builder', labelDE: 'Meister-Erbauer' },
            { threshold: 50000, labelEn: 'God of Reveals', labelDE: 'Gott der Enthüllungen' },
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
            { threshold: 100, labelEn: 'First Light', labelDE: 'Erstes Licht' },
            { threshold: 500, labelEn: 'Torch Bearer', labelDE: 'Fackelträger' },
            { threshold: 2000, labelEn: 'Floodlight', labelDE: 'Flutlicht' },
            { threshold: 5000, labelEn: 'Oracle', labelDE: 'Orakel' },
            { threshold: 10000, labelEn: 'All-Seeing', labelDE: 'Allsehend' },
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
            { threshold: 100, labelEn: 'First Cross', labelDE: 'Erstes Kreuz' },
            { threshold: 500, labelEn: 'Crossword Fan', labelDE: 'Kreuzworträtsel-Fan' },
            { threshold: 2000, labelEn: 'Eliminator', labelDE: 'Eliminator' },
            { threshold: 10000, labelEn: 'Master Deducer', labelDE: 'Meisterdetektiv' },
            { threshold: 50000, labelEn: 'God of Marks', labelDE: 'Gott der Markierungen' },
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
            { threshold: 100, labelEn: 'First Marks', labelDE: 'Erste Markierungen' },
            { threshold: 500, labelEn: 'Error Spotter', labelDE: 'Fehlersucher' },
            { threshold: 2000, labelEn: 'Systematic Hunter', labelDE: 'Systematischer Jäger' },
            { threshold: 5000, labelEn: 'Master Eliminator', labelDE: 'Meister-Eliminator' },
            { threshold: 10000, labelEn: 'God of Error Detection', labelDE: 'Gott der Fehlererkennung' },
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
            { threshold: 10, labelEn: 'Mini Master', labelDE: 'Mini-Meister' },
            { threshold: 25, labelEn: 'Pure and Simple', labelDE: 'Schlicht und einfach' },
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
            { threshold: 10, labelEn: 'Standard Expert', labelDE: 'Standard-Experte' },
            { threshold: 25, labelEn: 'Flawless Routine', labelDE: 'Makellose Routine' },
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
            { threshold: 10, labelEn: 'Grand Master', labelDE: 'Großmeister' },
            { threshold: 25, labelEn: 'Calculated Perfection', labelDE: 'Berechnete Perfektion' },
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
            { threshold: 10, labelEn: 'Infinite Patience', labelDE: 'Unendliche Geduld' },
            { threshold: 25, labelEn: 'Omniscient Solver', labelDE: 'Allwissender Löser' },
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
            { threshold: 10, labelEn: 'Packed', labelDE: 'Vollgepackt' },
            { threshold: 30, labelEn: 'Dense', labelDE: 'Dicht' },
            { threshold: 50, labelEn: 'Solid Block', labelDE: 'Massiv' },
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
            { threshold: 25, labelEn: 'Lucky Streak', labelDE: 'Glückssträhne' },
            { threshold: 50, labelEn: 'Fortune Hunter', labelDE: 'Glücksjäger' },
            { threshold: 100, labelEn: 'Four-Leaf Expert', labelDE: 'Kleeblatt-Experte' },
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
            { threshold: 1000, labelEn: 'Thousand Points', labelDE: 'Tausend Punkte' },
            { threshold: 10000, labelEn: 'Ten Thousand', labelDE: 'Zehntausend' },
            { threshold: 50000, labelEn: 'Fifty Grand', labelDE: 'Fünfzigtausend' },
            { threshold: 100000, labelEn: 'Century', labelDE: 'Jahrhundert' },
            { threshold: 200000, labelEn: 'Double Century', labelDE: 'Doppeltes Jahrhundert' },
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
            { threshold: 10, labelEn: 'Big Points', labelDE: 'Viele Punkte' },
            { threshold: 30, labelEn: 'Point Machine', labelDE: 'Punktemaschine' },
            { threshold: 50, labelEn: 'Overachiever', labelDE: 'Überflieger' },
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
            { threshold: 10, labelEn: 'New Record', labelDE: 'Neuer Rekord' },
            { threshold: 30, labelEn: 'Record Breaker', labelDE: 'Rekordbrechter' },
            { threshold: 50, labelEn: 'Self-Improver', labelDE: 'Selbstoptimierer' },
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
            { threshold: 10, labelEn: 'Double Trouble', labelDE: 'Doppelter Ertrag' },
            { threshold: 30, labelEn: 'Stacked', labelDE: 'Gestapelt' },
            { threshold: 50, labelEn: 'Max Power', labelDE: 'Volle Kraft' },
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
            { threshold: 600, labelEn: 'Extra Minutes', labelDE: 'Extra Minuten' },
            { threshold: 5000, labelEn: 'Time Stretcher', labelDE: 'Zeitstrecker' },
            { threshold: 10000, labelEn: 'Quarter-Hour', labelDE: 'Viertelstunde' },
            { threshold: 50000, labelEn: 'Chronomancer', labelDE: 'Chronomant' },
            { threshold: 100000, labelEn: 'God of Time', labelDE: 'Gott der Zeit' },
            { threshold: 500000, labelEn: 'At the End of Time', labelDE: 'Am Ende der Zeit' },
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
            { threshold: 5, labelEn: 'Last Second Hero', labelDE: 'Held in letzter Sekunde' },
            { threshold: 15, labelEn: 'Adrenaline Junkie', labelDE: 'Adrenalinjunkie' },
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
            { threshold: 10, labelEn: 'Speed Demon', labelDE: 'Speedläufer' },
            { threshold: 50, labelEn: 'Blink and Miss', labelDE: 'Im Nu vorbei' },
            { threshold: 100, labelEn: 'Flash Solver', labelDE: 'Blitzlöser' },
            { threshold: 200, labelEn: 'Speedforce', labelDE: 'Speedforce' },
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
            { threshold: 10, labelEn: 'Early Bird', labelDE: 'Frühaufsteher' },
            { threshold: 25, labelEn: 'Ahead of Time', labelDE: 'Zeitvorsprung' },
            { threshold: 50, labelEn: 'No Sweat', labelDE: 'Kein Problem' },
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
            { threshold: 5, labelEn: 'Cryogenic', labelDE: 'Kryogenisch' },
            { threshold: 10, labelEn: 'Absolute Zero', labelDE: 'Absoluter Nullpunkt' },
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
            { threshold: 15, labelEn: 'Learning Curve', labelDE: 'Lernkurve' },
            { threshold: 50, labelEn: 'Serial Wrongdoer', labelDE: 'Serientäter' },
            { threshold: 100, labelEn: 'Mistake Machine', labelDE: 'Fehlermaschine' },
            { threshold: 250, labelEn: 'Chaos Agent', labelDE: 'Chaos-Agent' },
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
            { threshold: 5, labelEn: 'Never Give Up', labelDE: 'Niemals aufgeben' },
            { threshold: 25, labelEn: 'Resilient', labelDE: 'Belastbar' },
            { threshold: 50, labelEn: 'Unbreakable', labelDE: 'Unzerstörbar' },
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
            { threshold: 10, labelEn: 'Danger Zone Pro', labelDE: 'Profi der Gefahrenzone' },
            { threshold: 25, labelEn: 'Indestructible', labelDE: 'Unzerstörbar' },
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
            { threshold: 5, labelEn: 'Back on Track', labelDE: 'Wieder auf Kurs' },
            { threshold: 15, labelEn: 'Determined', labelDE: 'Entschlossen' },
            { threshold: 30, labelEn: 'Relentless', labelDE: 'Unerbittlich' },
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
            { threshold: 5, labelEn: 'Transcendent', labelDE: 'Transzendent' },
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
            { threshold: 10, labelEn: 'First Use', labelDE: 'Erste Nutzung' },
            { threshold: 50, labelEn: 'Resourceful', labelDE: 'Einfallsreich' },
            { threshold: 200, labelEn: 'Power User', labelDE: 'Powernutzer' },
            { threshold: 500, labelEn: 'Item Addict', labelDE: 'Item-Süchtiger' },
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
            { threshold: 15, labelEn: 'Dabbling in Darkness', labelDE: 'Im Dunkel tastend' },
            { threshold: 50, labelEn: 'Cursed Devotee', labelDE: 'Fluch-Geweihter' },
            { threshold: 100, labelEn: 'Servant of Entropy', labelDE: 'Diener der Entropie' },
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
            { threshold: 10, labelEn: 'Full Collection', labelDE: 'Vollständige Sammlung' },
            { threshold: 50, labelEn: 'Curator', labelDE: 'Kurator' },
            { threshold: 100, labelEn: 'Connoisseur', labelDE: 'Kenner' },
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
            { threshold: 20, labelEn: 'Spendthrift', labelDE: 'Verschwender' },
            { threshold: 50, labelEn: 'Power Shopper', labelDE: 'Power-Shopper' },
            { threshold: 100, labelEn: 'Item Addict', labelDE: 'Item-Süchtig' },
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
            { threshold: 10, labelEn: 'Born Reckless', labelDE: 'Zum Draufgänger geboren' },
            { threshold: 25, labelEn: 'Cursed by Default', labelDE: 'Standardmäßig verflucht' },
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
            { threshold: 5, labelEn: 'Bargain Hunter', labelDE: 'Schnäppchenjäger' },
            { threshold: 20, labelEn: 'Trader', labelDE: 'Händler' },
            { threshold: 50, labelEn: 'Merchant', labelDE: 'Kaufmann' },
            { threshold: 100, labelEn: 'Tycoon', labelDE: 'Tycoon' },
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
            { threshold: 5, labelEn: 'Shielded', labelDE: 'Abgeschirmt' },
            { threshold: 25, labelEn: 'Fortified', labelDE: 'Befestigt' },
            { threshold: 50, labelEn: 'Impenetrable', labelDE: 'Undurchdringlich' },
            { threshold: 100, labelEn: 'Unbreakable', labelDE: 'Unzerbrechlich' },
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
            { threshold: 15, labelEn: 'Cold Shoulder', labelDE: 'Kalte Schulter' },
            { threshold: 35, labelEn: 'Permafrost', labelDE: 'Permafrost' },
        ]
    },





    // ── MISTAKE ERASER USED ──────────────────────
    {
        id: 'eraser_used',
        category: 'items',
        icon: '🎓',
        nameEn: 'The Tutor\'s Way',
        nameDE: 'Des Tutors Weg',
        descEn: 'Use Mistake Eraser items to reduce your mistake count.',
        descDE: 'Nutze Fehlerradierer-Items, um deine Fehleranzahl zu reduzieren.',
        stat: 'eraserUsed',
        tiers: [
            { threshold: 1, labelEn: 'Second Chance', labelDE: 'Zweite Chance' },
            { threshold: 20, labelEn: 'Clean Record', labelDE: 'Saubere Akte' },
            { threshold: 50, labelEn: 'Revisionist', labelDE: 'Revisionist' },
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
            { threshold: 5, labelEn: 'Field Ready', labelDE: 'Einsatzbereit' },
            { threshold: 15, labelEn: 'Veteran Scout', labelDE: 'Erfahrener Pfadfinder' },
            { threshold: 30, labelEn: 'Eagle Scout', labelDE: 'Adler - Pfadfinder' },
            { threshold: 50, labelEn: 'Master Navigator', labelDE: 'Meister-Navigator' },
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
            { threshold: 10, labelEn: 'Shortcut Taker', labelDE: 'Abkürzer' },
            { threshold: 35, labelEn: 'Line Breaker', labelDE: 'Zeilenbrecher' },
            { threshold: 75, labelEn: 'Grid Surgeon', labelDE: 'Gitter-Chirurg' },
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
            { threshold: 10, labelEn: 'Shadowed Eye', labelDE: 'Beschattetes Auge' },
            { threshold: 30, labelEn: 'Cursed Gaze', labelDE: 'Verfluchter Blick' },
            { threshold: 50, labelEn: 'Eyes of Shadow', labelDE: 'Schattenaugen' },
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
            { threshold: 10, labelEn: 'Time Gambler', labelDE: 'Zeit-Spieler' },
            { threshold: 30, labelEn: 'Bound to the Clock', labelDE: 'An die Uhr gebunden' },
            { threshold: 50, labelEn: 'Temporal Pact', labelDE: 'Zeitpakt' },
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
            { threshold: 10, labelEn: 'Infernal Guard', labelDE: 'Höllenwacht' },
            { threshold: 30, labelEn: 'Unwavering Stare', labelDE: 'Unverwandter Blick' },
            { threshold: 50, labelEn: 'Abyssal Sight', labelDE: 'Abyssaler Blick' },
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
            { threshold: 10, labelEn: 'Rising Tide', labelDE: 'Steigende Flut' },
            { threshold: 25, labelEn: 'Tidal Force', labelDE: 'Gezeitenkraft' },
            { threshold: 50, labelEn: 'Tsunami', labelDE: 'Tsunami' },
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
            { threshold: 10, labelEn: 'Spinning Up', labelDE: 'Im Aufwind' },
            { threshold: 25, labelEn: 'Cyclone', labelDE: 'Zyklon' },
            { threshold: 50, labelEn: 'Eye of the Storm', labelDE: 'Auge des Sturms' },
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
            { threshold: 10, labelEn: 'Entropy Unleashed', labelDE: 'Entropie entfesselt' },
            { threshold: 25, labelEn: 'Mayhem', labelDE: 'Chaos' },
            { threshold: 50, labelEn: 'Total Chaos', labelDE: 'Totales Chaos' },
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
            { threshold: 10, labelEn: 'Deep Diver', labelDE: 'Tiefseetaucher' },
            { threshold: 30, labelEn: 'Pearl Collector', labelDE: 'Perlensammler' },
            { threshold: 50, labelEn: 'Ocean\'s Bounty', labelDE: 'Ozeanische Beute' },
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
            { threshold: 10, labelEn: 'Familiar Bond', labelDE: 'Vertraute Verbindung' },
            { threshold: 30, labelEn: 'Coven Master', labelDE: 'Hexenzirkel-Meister' },
            { threshold: 50, labelEn: 'Scarlet Witch', labelDE: 'Scharlachrote Hexe' },
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
            { threshold: 10, labelEn: 'Time is Gold', labelDE: 'Zeit ist Gold' },
            { threshold: 30, labelEn: 'Gilded Timekeeper', labelDE: 'Vergoldeter Zeithüter' },
            { threshold: 50, labelEn: 'Midas Touch', labelDE: 'Midas-Touch' },
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
            { threshold: 10, labelEn: 'Dark Covenant', labelDE: 'Dunkler Bund' },
            { threshold: 30, labelEn: 'Eclipse Keeper', labelDE: 'Finsterwächter' },
            { threshold: 50, labelEn: 'Shadow Master', labelDE: 'Schattenmeister' },
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
            { threshold: 5, labelEn: 'First Answers', labelDE: 'Erste Antworten' },
            { threshold: 20, labelEn: 'Sharp Mind', labelDE: 'Scharfer Verstand' },
            { threshold: 50, labelEn: 'Scholar', labelDE: 'Gelehrter' },
            { threshold: 100, labelEn: 'Professor', labelDE: 'Professor' },
            { threshold: 200, labelEn: 'Stochastic Sage', labelDE: 'Stochastischer Weise' },
            { threshold: 500, labelEn: 'Master of Stochastics', labelDE: 'Meister der Stochastik' },
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
            { threshold: 15, labelEn: 'Wrong Answer', labelDE: 'Falsche Antwort' },
            { threshold: 50, labelEn: 'Persistent', labelDE: 'Ausdauernd' },
            { threshold: 100, labelEn: 'Never Gives Up', labelDE: 'Gibt nie auf' },
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
            { threshold: 5, labelEn: 'Prepared', labelDE: 'Vorbereitet' },
            { threshold: 25, labelEn: 'Always Ready', labelDE: 'Immer bereit' },
            { threshold: 50, labelEn: 'Eagle Scout', labelDE: 'Adlerpfadfinder' },
            { threshold: 100, labelEn: 'Master Pathfinder', labelDE: 'Meister-Pfadfinder' },
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
            { threshold: 5, labelEn: 'Data Recruit', labelDE: 'Daten-Rekrut' },
            { threshold: 20, labelEn: 'Sample Warrior', labelDE: 'Stichproben-Krieger' },
            { threshold: 50, labelEn: 'Distribution Knight', labelDE: 'Verteilungsritter' },
            { threshold: 100, labelEn: 'Grand Statistician', labelDE: 'Großer Statistiker' },
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
            { threshold: 5, labelEn: 'Apprentice Mage', labelDE: 'Lehrlings-Magier' },
            { threshold: 20, labelEn: 'Arcane Student', labelDE: 'Arkaner Schüler' },
            { threshold: 50, labelEn: 'Spellweaver', labelDE: 'Zauberwirker' },
            { threshold: 100, labelEn: 'Grand Mathmagician', labelDE: 'Großer Mathemagier' },
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
            { threshold: 5, labelEn: 'Probability Novice', labelDE: 'Wahrscheinlichkeits-Novize' },
            { threshold: 20, labelEn: 'Bayesian Scout', labelDE: 'Bayesianischer Scout' },
            { threshold: 50, labelEn: 'Field Ranger', labelDE: 'Feld-Ranger' },
            { threshold: 100, labelEn: 'Grand Probabilist', labelDE: 'Großer Probabilist' },
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
            { threshold: 10, labelEn: 'Snowball', labelDE: 'Schneeball' },
            { threshold: 100, labelEn: 'Avalanche', labelDE: 'Lawine' },
            { threshold: 1000, labelEn: 'Perpetual Motion', labelDE: 'Perpetuum Mobile' },
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
            { threshold: 10, labelEn: 'Cushioned', labelDE: 'Abgepuffert' },
            { threshold: 100, labelEn: 'Protected', labelDE: 'Geschützt' },
            { threshold: 300, labelEn: 'Teflon', labelDE: 'Teflon' },
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
            { threshold: 10, labelEn: 'Prior Belief', labelDE: 'Vorannahme' },
            { threshold: 100, labelEn: 'Posterior Update', labelDE: 'Posterior-Update' },
            { threshold: 500, labelEn: 'Maximum Likelihood', labelDE: 'Maximale Wahrscheinlichkeit' },
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
            { threshold: 10, labelEn: 'First Strike', labelDE: 'Erster Hieb' },
            { threshold: 50, labelEn: 'Assault Mode', labelDE: 'Angriffsmodus' },
            { threshold: 100, labelEn: 'Data Berserker', labelDE: 'Daten-Berserker' },
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
            { threshold: 10, labelEn: 'First Reveals', labelDE: 'Erste Enthüllungen' },
            { threshold: 50, labelEn: 'Seer', labelDE: 'Seher' },
            { threshold: 100, labelEn: 'All is Known', labelDE: 'Alles ist bekannt' },
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
            { threshold: 10, labelEn: 'Marked', labelDE: 'Markiert' },
            { threshold: 50, labelEn: 'Sharpshooter', labelDE: 'Scharfschütze' },
            { threshold: 100, labelEn: 'Dead Eye', labelDE: 'Scharfes Auge' },
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
            { threshold: 10, labelEn: 'Cross-Cutter', labelDE: 'Kreuzschneider' },
            { threshold: 50, labelEn: 'Slash Artist', labelDE: 'Schnitt-Künstler' },
            { threshold: 100, labelEn: 'X-Factor', labelDE: 'X-Faktor' },
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
            { threshold: 10, labelEn: 'First Freeze', labelDE: 'Erstes Einfrieren' },
            { threshold: 50, labelEn: 'Cryomancer', labelDE: 'Kryomant' },
            { threshold: 100, labelEn: 'Permafrost', labelDE: 'Permafrost' },
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
            { threshold: 10, labelEn: 'Radar Ping', labelDE: 'Radar-Ping' },
            { threshold: 50, labelEn: 'Sonar Expert', labelDE: 'Sonar-Experte' },
            { threshold: 100, labelEn: 'Full Sweep', labelDE: 'Vollständiger Scan' },
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
            { threshold: 10, labelEn: 'Unstoppable', labelDE: 'Unaufhaltbar' },
            { threshold: 25, labelEn: 'Perpetual Motion', labelDE: 'Perpetuum Mobile' },
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
            { threshold: 10, labelEn: 'Fortress', labelDE: 'Festung' },
            { threshold: 25, labelEn: 'Untouchable Mage', labelDE: 'Unberührbarer Magier' },
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
            { threshold: 10, labelEn: 'Hawk Eye', labelDE: 'Habichtauge' },
            { threshold: 25, labelEn: 'Omniscient', labelDE: 'Allwissend' },
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
            { threshold: 5, labelEn: 'Anomaly', labelDE: 'Anomalie' },
            { threshold: 25, labelEn: 'Statistical Ghost', labelDE: 'Statistischer Geist' },
            { threshold: 50, labelEn: 'Outlier', labelDE: 'Ausreißer' },
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
            { threshold: 5, labelEn: 'Iteration', labelDE: 'Iteration' },
            { threshold: 25, labelEn: 'Infinite Depth', labelDE: 'Unendliche Tiefe' },
            { threshold: 50, labelEn: 'Recursionist', labelDE: 'Rekursionist' },
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
            { threshold: 5, labelEn: 'Belief Updated', labelDE: 'Überzeugung aktualisiert' },
            { threshold: 25, labelEn: 'Posterior Truth', labelDE: 'A-posteriori Wahrheit' },
            { threshold: 50, labelEn: 'Bayesian', labelDE: 'Bayesianer' },
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
            { threshold: 10, labelEn: 'Calculated Gamble', labelDE: 'Kalkuliertes Risiko' },
            { threshold: 50, labelEn: 'Fat Tails', labelDE: 'Fat Tails' },
            { threshold: 100, labelEn: 'Tail Risk Master', labelDE: 'Tail-Risk-Meister' },
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
            { threshold: 10, labelEn: 'Lingering Error', labelDE: 'Verweilender Fehler' },
            { threshold: 50, labelEn: 'Ghost in the Data', labelDE: 'Geist in den Daten' },
            { threshold: 100, labelEn: 'Infinite Recursion', labelDE: 'Unendliche Rekursion' },
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
            { threshold: 10, labelEn: 'Prior Belief', labelDE: 'Prior-Annahme' },
            { threshold: 50, labelEn: 'Updated Posterior', labelDE: 'Aktualisierter Posterior' },
            { threshold: 100, labelEn: 'Perfect Inference', labelDE: 'Perfekte Inferenz' },

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
            { threshold: 10, labelEn: 'Flow State', labelDE: 'Flow-Zustand' },
            { threshold: 50, labelEn: 'Time Distortion', labelDE: 'Zeitverzerrung' },
            { threshold: 100, labelEn: 'SPEEDFORCE Master', labelDE: 'SPEEDFORCE-Meister' },
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
            { threshold: 10, labelEn: 'Boundless', labelDE: 'Grenzenlos' },
            { threshold: 50, labelEn: 'Unshackled', labelDE: 'Entfesselt' },
            { threshold: 100, labelEn: 'Degree of Freedom', labelDE: 'Freiheitsgrad' },
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
            { threshold: 10, labelEn: 'Noise Filtered', labelDE: 'Rauschen gefiltert' },
            { threshold: 50, labelEn: 'False Positives Blocked', labelDE: 'Falschpositive blockiert' },
            { threshold: 100, labelEn: 'Type I Nullification', labelDE: 'Typ-I-Neutralisierung' },
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
            { threshold: 10, labelEn: 'Tail Exposure', labelDE: 'Tailsrisiko-Exposition' },
            { threshold: 25, labelEn: 'Hunger Satisfied', labelDE: 'Hunger gestillt' },
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
            { threshold: 50, labelEn: 'Laser Show', labelDE: 'Lasershow' },
            { threshold: 250, labelEn: 'Orbital Strike', labelDE: 'Orbitaler Schlag' },
            { threshold: 500, labelEn: 'Crossfire', labelDE: 'Kreuzfeuer' },
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
            { threshold: 25, labelEn: 'Master Trapper', labelDE: 'Meister-Fallensteller' },
            { threshold: 50, labelEn: 'Minefield', labelDE: 'Minenfeld' },
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
            { threshold: 10, labelEn: 'Swan Tamer', labelDE: 'Schwanenbändiger' },
            { threshold: 25, labelEn: 'Riding the Swan', labelDE: 'Auf dem Schwan reiten' },
        ]
    },





    {
        id: 'recursionist_DoF_time_recovered',
        category: 'class',
        icon: '⏳',
        nameEn: 'Time Reclaimer',
        nameDE: 'Zeitzurückgewinner',
        descEn: 'Use Degrees of Freedom to recover atleast 5 minutes.',
        descDE: 'Verwende Freiheitsgrade um mindestens 5 Minuten zurückzuerhalten.',
        stat: 'doftimerecovered',
        tiers: [
            { threshold: 1, labelEn: 'Broken Timeline Fixed', labelDE: 'Gebrochene Zeitlinie repariert' },
            { threshold: 10, labelEn: 'State Rewritten', labelDE: 'Zustand umgeschrieben' },
            { threshold: 25, labelEn: 'Entropy Reclaimed', labelDE: 'Entropie zurückgewonnen' },
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
            { threshold: 5, labelEn: 'Shielded', labelDE: 'Abgeschirmt' },
            { threshold: 25, labelEn: 'Aegis', labelDE: 'Aegis' },
            { threshold: 50, labelEn: 'False Positive', labelDE: 'Falsch Positiv' },
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
            { threshold: 5, labelEn: 'Calculated Risk', labelDE: 'Kalkuliertes Risiko' },
            { threshold: 25, labelEn: 'Actuarial Master', labelDE: 'Aktuar-Meister' },
            { threshold: 50, labelEn: 'Actuary', labelDE: 'Aktuar' },
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
            { threshold: 5, labelEn: 'State Shift', labelDE: 'Zustandswechsel' },
            { threshold: 25, labelEn: 'Memoryless Master', labelDE: 'Gedächtnisloser Meister' },
            { threshold: 50, labelEn: 'Markovian', labelDE: 'Markovianer' },
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
            { threshold: 5, labelEn: 'Stochastic Steps', labelDE: 'Stochastische Schritte' },
            { threshold: 25, labelEn: 'Pathfinder', labelDE: 'Pfadfinder' },
            { threshold: 50, labelEn: 'Random Walker', labelDE: 'Random Walker' },
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
            { threshold: 10, labelEn: 'Error Erased', labelDE: 'Fehler gelöscht' },
            { threshold: 50, labelEn: 'Time Heals', labelDE: 'Die Zeit heilt' },
            { threshold: 100, labelEn: 'Revert to Mean', labelDE: 'Rückkehr zum Mittelwert' },
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
            { threshold: 10, labelEn: 'Recent History Erased', labelDE: 'Jüngste Vergangenheit gelöscht' },
            { threshold: 50, labelEn: 'State Rewritten', labelDE: 'Zustand umgeschrieben' },
            { threshold: 100, labelEn: 'Markov Chain', labelDE: 'Markov-Kette' },
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
            { threshold: 10, labelEn: 'Random Walk Initiated', labelDE: 'Zufallsweg gestartet' },
            { threshold: 50, labelEn: 'Diffusion Stabilized', labelDE: 'Diffusion stabilisiert' },
            { threshold: 100, labelEn: 'Brownian Ensemble', labelDE: 'Brownsches Ensemble' },
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
            { threshold: 10, labelEn: 'Noise Ignored', labelDE: 'Rauschen ignoriert' },
            { threshold: 50, labelEn: 'Significant Signal', labelDE: 'Signifikantes Signal' },
            { threshold: 100, labelEn: 'Statistical Authority', labelDE: 'Statistische Autorität' },
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
            { threshold: 10, labelEn: 'State Shift Detected', labelDE: 'Zustandswechsel erkannt' },
            { threshold: 50, labelEn: 'Transition Network Formed', labelDE: 'Transitionsnetzwerk gebildet' },
            { threshold: 100, labelEn: 'Markov Engine Online', labelDE: 'Markov-Engine aktiv' },
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
            { threshold: 10, labelEn: 'Summoned Companion', labelDE: 'Beschworener Begleiter' },
            { threshold: 50, labelEn: 'Bonded Wanderer', labelDE: 'Gebundener Wanderer' },
            { threshold: 100, labelEn: 'Loyal Drifter', labelDE: 'Loyaler Drifter' },
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
            { threshold: 10, labelEn: 'Time Healer', labelDE: 'Zeitheiler' },
            { threshold: 25, labelEn: 'Master of Time', labelDE: 'Meister der Zeit' },
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
            { threshold: 5, labelEn: 'Time Traveler', labelDE: 'Zeitreisender' },
            { threshold: 10, labelEn: 'Cheat Death', labelDE: 'Dem Tod entronnen' },
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
            { threshold: 10, labelEn: 'Drifting', labelDE: 'Treiben' },
            { threshold: 100, labelEn: 'Scattered', labelDE: 'Verstreut' },
            { threshold: 200, labelEn: 'Dust in the Wind', labelDE: 'Staub im Wind' },
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
            { threshold: 10, labelEn: 'Statistically Significant', labelDE: 'Statistisch signifikant' },
            { threshold: 25, labelEn: 'Highly Significant', labelDE: 'Hoch signifikant' },
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
            { threshold: 10, labelEn: 'Chain Reaction', labelDE: 'Kettenreaktion' },
            { threshold: 100, labelEn: 'Markov Chain', labelDE: 'Markov-Kette' },
            { threshold: 250, labelEn: 'Markov Cascade', labelDE: 'Markov-Kaskade' },
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
            { threshold: 20, labelEn: 'Alpha Beast', labelDE: 'Alpha-Tier' },
            { threshold: 50, labelEn: 'Good Boy', labelDE: 'Guter Junge' },

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


    // ── NODES ALLOCATED ──────────────────────────
    {
        id: 'tree_nodes_allocated',
        category: 'tree',
        icon: '🌳',
        nameEn: 'Tree Climber',
        nameDE: 'Baumkletterer',
        descEn: 'Allocate nodes in the Probability Tree.',
        descDE: 'Verteile Punkte im Wahrscheinlichkeitsbaum.',
        stat: 'treeNodesAllocated',
        tiers: [
            { threshold: 1, labelEn: 'First Branch', labelDE: 'Erster Ast' },
            { threshold: 10, labelEn: 'Growing Roots', labelDE: 'Wachsende Wurzeln' },
            { threshold: 20, labelEn: 'Deep Forest', labelDE: 'Tiefer Wald' },
            { threshold: 35, labelEn: 'Ancient Tree', labelDE: 'Uralter Baum' },
            { threshold: 50, labelEn: 'World Tree', labelDE: 'Weltbaum' },
            { threshold: 66, labelEn: 'Full Convergence', labelDE: 'Volle Konvergenz' },
        ]
    },

    // ── TOTAL POINTS SPENT ───────────────────────
    {
        id: 'tree_points_spent',
        category: 'tree',
        icon: '💠',
        nameEn: 'Point Investor',
        nameDE: 'Punkte-Investor',
        descEn: 'Spend Convergence Points in the Probability Tree.',
        descDE: 'Gib Konvergenzpunkte im Wahrscheinlichkeitsbaum aus.',
        stat: 'treePointsSpent',
        tiers: [
            { threshold: 10, labelEn: 'Seed Money', labelDE: 'Startkapital' },
            { threshold: 50, labelEn: 'Invested', labelDE: 'Investiert' },
            { threshold: 100, labelEn: 'All In', labelDE: 'Alles gesetzt' },
            { threshold: 300, labelEn: 'Convergence Master', labelDE: 'Konvergenz-Meister' },
        ]
    },

    // ── NODES DEALLOCATED ────────────────────────
    {
        id: 'tree_nodes_deallocated',
        category: 'tree',
        icon: '✂️',
        nameEn: 'Respeccer',
        nameDE: 'Umverteiler',
        descEn: 'Deallocate nodes from the Probability Tree.',
        descDE: 'Entferne Punkte aus dem Wahrscheinlichkeitsbaum.',
        stat: 'treeNodesDeallocated',
        tiers: [
            { threshold: 10, labelEn: 'Change of Plans', labelDE: 'Planänderung' },
            { threshold: 50, labelEn: 'Experimenter', labelDE: 'Experimentator' },
            { threshold: 100, labelEn: 'Indecisive', labelDE: 'Unentschlossen' },
        ]
    },

    // ── KEYSTONE NODES ALLOCATED ─────────────────
    {
        id: 'tree_keystones_allocated',
        category: 'tree',
        icon: '🔑',
        nameEn: 'Keystone Seeker',
        nameDE: 'Eckstein-Sucher',
        descEn: 'Allocate Keystone nodes in the Probability Tree.',
        descDE: 'Verteile Keystone-Knoten im Wahrscheinlichkeitsbaum.',
        stat: 'treeKeystonesAllocated',
        tiers: [
            { threshold: 1, labelEn: 'First Keystone', labelDE: 'Erster Eckstein' },
            { threshold: 3, labelEn: 'Cornerstone', labelDE: 'Grundstein' },
            { threshold: 7, labelEn: 'Architect', labelDE: 'Architekt' },
            { threshold: 15, labelEn: 'Master Architect', labelDE: 'Meister-Architekt' },
        ]
    },

    // ── GOD NODES ────────────────────────────────
    {
        id: 'tree_god_of_statistics',
        category: 'tree',
        icon: '✨',
        nameEn: 'God of Statistics',
        nameDE: 'Gott der Statistik',
        descEn: 'Allocate the God of Statistics node.',
        descDE: 'Verteile den Gott der Statistik Knoten.',
        stat: 'treeGodStatisticsAllocated',
        tiers: [
            { threshold: 1, labelEn: 'Statistical Deity', labelDE: 'Statistische Gottheit' },
        ]
    },
    {
        id: 'tree_god_of_math',
        category: 'tree',
        icon: '✨',
        nameEn: 'God of Math',
        nameDE: 'Gott der Mathematik',
        descEn: 'Allocate the God of Math node.',
        descDE: 'Verteile den Gott der Mathematik Knoten.',
        stat: 'treeGodMathAllocated',
        tiers: [
            { threshold: 1, labelEn: 'Mathematical Deity', labelDE: 'Mathematische Gottheit' },
        ]
    },
    {
        id: 'tree_god_of_probabilities',
        category: 'tree',
        icon: '✨',
        nameEn: 'God of Probabilities',
        nameDE: 'Gott der Wahrscheinlichkeiten',
        descEn: 'Allocate the God of Probabilities node.',
        descDE: 'Verteile den Gott der Wahrscheinlichkeiten Knoten.',
        stat: 'treeGodProbabilitiesAllocated',
        tiers: [
            { threshold: 1, labelEn: 'Probabilistic Deity', labelDE: 'Wahrscheinlichkeits-Gottheit' },
        ]
    },
    {
        id: 'tree_all_gods',
        category: 'tree',
        icon: '🌟',
        nameEn: 'Pantheon',
        nameDE: 'Pantheon',
        descEn: 'Allocate all three God nodes.',
        descDE: 'Verteile alle drei Gott-Knoten.',
        stat: 'treeAllGodsAllocated',
        tiers: [
            { threshold: 1, labelEn: 'The Trinity', labelDE: 'Die Trinität' },
            { threshold: 3, labelEn: 'Omniscient', labelDE: 'Allwissend' },
        ]
    },

    // ── FULL CLASS BRANCH ────────────────────────
    {
        id: 'tree_statistician_branch',
        category: 'tree',
        icon: '📊',
        nameEn: 'Statistician Branch Complete',
        nameDE: 'Statistiker-Ast vollständig',
        descEn: 'Allocate every node in the Statistician branch of the tree.',
        descDE: 'Verteile jeden Knoten im Statistiker-Ast des Baums.',
        stat: 'treeStatisticianBranchComplete',
        tiers: [
            { threshold: 1, labelEn: 'Statistical Mastery', labelDE: 'Statistische Meisterschaft' },
        ]
    },
    {
        id: 'tree_mathmagician_branch',
        category: 'tree',
        icon: '🧮',
        nameEn: 'Mathmagician Branch Complete',
        nameDE: 'Mathemagier-Ast vollständig',
        descEn: 'Allocate every node in the Mathmagician branch of the tree.',
        descDE: 'Verteile jeden Knoten im Mathemagier-Ast des Baums.',
        stat: 'treeMathmagicianBranchComplete',
        tiers: [
            { threshold: 1, labelEn: 'Mathematical Mastery', labelDE: 'Mathematische Meisterschaft' },
        ]
    },
    {
        id: 'tree_probabilist_branch',
        category: 'tree',
        icon: '🎲',
        nameEn: 'Probabilist Branch Complete',
        nameDE: 'Probabilisten-Ast vollständig',
        descEn: 'Allocate every node in the Probabilist branch of the tree.',
        descDE: 'Verteile jeden Knoten im Probabilisten-Ast des Baums.',
        stat: 'treeProbabilistBranchComplete',
        tiers: [
            { threshold: 1, labelEn: 'Probabilistic Mastery', labelDE: 'Probabilistische Meisterschaft' },
        ]
    },

    // ── KEYSTONE COMBOS ──────────────────────────
    {
        id: 'tree_keystone_duo',
        category: 'tree',
        icon: '⚗️',
        nameEn: 'Dangerous Combination',
        nameDE: 'Gefährliche Kombination',
        descEn: 'Have two or more Keystone nodes active at the same time.',
        descDE: 'Habe zwei oder mehr Keystone-Knoten gleichzeitig aktiv.',
        stat: 'treeKeystoneDuoActive',
        tiers: [
            { threshold: 1, labelEn: 'Dual Keystones', labelDE: 'Doppelte Keystones' },
            { threshold: 10, labelEn: 'Synergist', labelDE: 'Synergetiker' },
            { threshold: 25, labelEn: 'Mad Scientist', labelDE: 'Verrückter Wissenschaftler' },
        ]
    },

    // ── LUCKY TILE BUILD ─────────────────────────
    {
        id: 'tree_lucky_build',
        category: 'tree',
        icon: '🍀',
        nameEn: 'Fortune Seeker',
        nameDE: 'Glückssucher',
        descEn: 'Have all Lucky Tile nodes allocated simultaneously.',
        descDE: 'Habe alle Glücksfeld-Knoten gleichzeitig aktiv.',
        stat: 'treeLuckyBuildActive',
        tiers: [
            { threshold: 1, labelEn: 'Four Leaf Clover', labelDE: 'Vierblättriges Kleeblatt' },
            { threshold: 10, labelEn: 'Born Lucky', labelDE: 'Mit Glück geboren' },
        ]
    },



    // ── TUTOR BRANCH COMPLETE ────────────────────
    {
        id: 'tree_tutor_branch',
        category: 'tree',
        icon: '🎓',
        nameEn: 'Tutor Specialist',
        nameDE: 'Tutor-Spezialist',
        descEn: 'Allocate every node in the Tutor branch of the tree.',
        descDE: 'Verteile jeden Knoten im Tutor-Ast des Baums.',
        stat: 'treeTutorBranchComplete',
        tiers: [
            { threshold: 1, labelEn: 'Tutored to Perfection', labelDE: 'Perfekt betreut' },
        ]
    },

    // ── PRIMER BRANCH COMPLETE ───────────────────
    {
        id: 'tree_primer_branch',
        category: 'tree',
        icon: '📜',
        nameEn: 'Primer Specialist',
        nameDE: 'Kompass-Spezialist',
        descEn: "Allocate every node in the Scout's Primer branch of the tree.",
        descDE: "Verteile jeden Knoten im Pfadfinder-Kompass-Ast des Baums.",
        stat: 'treePrimerBranchComplete',
        tiers: [
            { threshold: 1, labelEn: 'Fully Scouted', labelDE: 'Vollständig erkundet' },
        ]
    },

    // ── ALL TIMER EXTENSION NODES ────────────────
    {
        id: 'tree_time_hoarder',
        category: 'tree',
        icon: '⏰',
        nameEn: 'Time Hoarder',
        nameDE: 'Zeit-Hamsterer',
        descEn: 'Allocate all three Time Extension nodes.',
        descDE: 'Verteile alle drei Zeitverlängerungs-Knoten.',
        stat: 'treeTimeExtensionComplete',
        tiers: [
            { threshold: 1, labelEn: 'All the Time in the World', labelDE: 'Alle Zeit der Welt' },
        ]
    },

    // ── ALL TIMED STASIS NODES ───────────────────
    {
        id: 'tree_stasis_complete',
        category: 'tree',
        icon: '⏸️',
        nameEn: 'Frozen in Time',
        nameDE: 'In der Zeit eingefroren',
        descEn: 'Allocate all three Timed Stasis nodes.',
        descDE: 'Verteile alle drei Zeitstase-Knoten.',
        stat: 'treeTimedStasisComplete',
        tiers: [
            { threshold: 1, labelEn: 'Stasis Master', labelDE: 'Stase-Meister' },
        ]
    },

    // ── ALL PATTERN MOMENTUM NODES ───────────────
    {
        id: 'tree_pattern_momentum',
        category: 'tree',
        icon: '📉',
        nameEn: 'Structural Rhythm',
        nameDE: 'Strukturrhythmus',
        descEn: 'Allocate all three Pattern Momentum nodes.',
        descDE: 'Verteile alle drei Musterdynamik-Knoten.',
        stat: 'treePatternMomentumComplete',
        tiers: [
            { threshold: 1, labelEn: 'In the Zone', labelDE: 'In der Zone' },
        ]
    },

    // ── ALL BAYESIAN UPDATE NODES ────────────────
    {
        id: 'tree_bayesian_believer',
        category: 'tree',
        icon: '🔃',
        nameEn: 'Bayesian Believer',
        nameDE: 'Bayesianischer Gläubiger',
        descEn: 'Allocate all three Bayesian Update nodes.',
        descDE: 'Verteile alle drei Bayessche-Anpassungs-Knoten.',
        stat: 'treeBayesianUpdateComplete',
        tiers: [
            { threshold: 1, labelEn: 'Posterior Perfection', labelDE: 'Posteriore Perfektion' },
        ]
    },

    // ── ALL CONFIDENCE INTERVAL NODES ───────────
    {
        id: 'tree_confidence_complete',
        category: 'tree',
        icon: '📐',
        nameEn: 'Margin of Error',
        nameDE: 'Fehlertoleranz',
        descEn: 'Allocate all three Confidence Interval nodes.',
        descDE: 'Verteile alle drei Konfidenzintervall-Knoten.',
        stat: 'treeConfidenceIntervalComplete',
        tiers: [
            { threshold: 1, labelEn: 'Statistically Significant', labelDE: 'Statistisch signifikant' },
        ]
    },

    // ── ALL SAMPLE EFFICIENCY NODES ─────────────
    {
        id: 'tree_sample_efficiency',
        category: 'tree',
        icon: '📈',
        nameEn: 'Efficient Sampler',
        nameDE: 'Effizienter Stichprobennehmer',
        descEn: 'Allocate all three Sample Efficiency nodes.',
        descDE: 'Verteile alle drei Stichprobeneffizienz-Knoten.',
        stat: 'treeSampleEfficiencyComplete',
        tiers: [
            { threshold: 1, labelEn: 'Maximum Efficiency', labelDE: 'Maximale Effizienz' },
        ]
    },

    // ── ALL STREAK BONUS NODES ───────────────────
    {
        id: 'tree_streak_complete',
        category: 'tree',
        icon: '🔥',
        nameEn: 'On Fire',
        nameDE: 'In Flammen',
        descEn: 'Allocate all three Streak Bonus nodes.',
        descDE: 'Verteile alle drei Serienbonus-Knoten.',
        stat: 'treeStreakBonusComplete',
        tiers: [
            { threshold: 1, labelEn: 'Unstoppable Streak', labelDE: 'Unaufhaltsame Serie' },
        ]
    },

    // ── ALL EMERGENCY SCAN NODES ─────────────────
    {
        id: 'tree_emergency_scan',
        category: 'tree',
        icon: '🚨',
        nameEn: 'Crisis Analyst',
        nameDE: 'Krisen-Analyst',
        descEn: 'Allocate all three Emergency Scan nodes.',
        descDE: 'Verteile alle drei Notfall-Scan-Knoten.',
        stat: 'treeEmergencyScanComplete',
        tiers: [
            { threshold: 1, labelEn: 'Always Prepared', labelDE: 'Immer vorbereitet' },
        ]
    },

    // ── ALL BLACKOUT WARD NODES ──────────────────
    {
        id: 'tree_blackout_ward',
        category: 'tree',
        icon: '🌑',
        nameEn: 'Shadow Proof',
        nameDE: 'Schattenresistent',
        descEn: 'Allocate all three Blackout Ward nodes.',
        descDE: 'Verteile alle drei Verdunklungsschutz-Knoten.',
        stat: 'treeBlackoutWardComplete',
        tiers: [
            { threshold: 1, labelEn: 'Lights On', labelDE: 'Licht an' },
        ]
    },

    // ── ALL REMOVAL WARD NODES ───────────────────
    {
        id: 'tree_removal_ward',
        category: 'tree',
        icon: '🔒',
        nameEn: 'Integrity Guardian',
        nameDE: 'Integritätshüter',
        descEn: 'Allocate all three Removal Ward nodes.',
        descDE: 'Verteile alle drei Entfernungsschutz-Knoten.',
        stat: 'treeRemovalWardComplete',
        tiers: [
            { threshold: 1, labelEn: 'Nothing Can Be Taken', labelDE: 'Nichts kann genommen werden' },
        ]
    },

    // ── ALL INTERQUARTILE VISION NODES ───────────
    {
        id: 'tree_interquartile',
        category: 'tree',
        icon: '📊',
        nameEn: 'Central Observer',
        nameDE: 'Zentraler Beobachter',
        descEn: 'Allocate all three Interquartile Vision nodes.',
        descDE: 'Verteile alle drei Interquartil-Vision-Knoten.',
        stat: 'treeInterquartileComplete',
        tiers: [
            { threshold: 1, labelEn: 'Middle Ground', labelDE: 'Mittelweg' },
        ]
    },

    // ── ALL REVEAL ITEM NODES ────────────────────
    {
        id: 'tree_reveal_devotee',
        category: 'tree',
        icon: '🕯️',
        nameEn: 'Reveal Devotee',
        nameDE: 'Enthüllungs-Anhänger',
        descEn: 'Allocate all Reveal item booster nodes.',
        descDE: 'Verteile alle Enthüllungs-Item-Verstärker-Knoten.',
        stat: 'treeRevealItemsComplete',
        tiers: [
            { threshold: 1, labelEn: 'Nothing Hidden', labelDE: 'Nichts verborgen' },
        ]
    },

    // ── ALL SHIELD ITEM NODES ────────────────────
    {
        id: 'tree_shield_devotee',
        category: 'tree',
        icon: '🛡️',
        nameEn: 'Shield Devotee',
        nameDE: 'Schild-Anhänger',
        descEn: 'Allocate all Shield item booster nodes.',
        descDE: 'Verteile alle Schild-Item-Verstärker-Knoten.',
        stat: 'treeShieldItemsComplete',
        tiers: [
            { threshold: 1, labelEn: 'Impenetrable', labelDE: 'Undurchdringlich' },
        ]
    },

    // ── ALL MARK-WRONG ITEM NODES ────────────────
    {
        id: 'tree_mark_devotee',
        category: 'tree',
        icon: '✏️',
        nameEn: 'Mark Devotee',
        nameDE: 'Markierungs-Anhänger',
        descEn: 'Allocate all Mark-wrong item booster nodes.',
        descDE: 'Verteile alle Markierungs-Item-Verstärker-Knoten.',
        stat: 'treeMarkItemsComplete',
        tiers: [
            { threshold: 1, labelEn: 'Error Exterminator', labelDE: 'Fehler-Vernichter' },
        ]
    },

    // ── OUTER RIM EXPLORER ───────────────────────
    {
        id: 'tree_outer_rim',
        category: 'tree',
        icon: '🌌',
        nameEn: 'Outer Rim',
        nameDE: 'Äußerer Rand',
        descEn: 'Allocate nodes at the far right edge of the tree (x > 3400).',
        descDE: 'Verteile Knoten am äußersten rechten Rand des Baums.',
        stat: 'treeOuterRimNodes',
        tiers: [
            { threshold: 1, labelEn: 'Edge Walker', labelDE: 'Randwanderer' },
            { threshold: 5, labelEn: 'Deep Explorer', labelDE: 'Tiefen-Entdecker' },
            { threshold: 10, labelEn: 'Fringe Theorist', labelDE: 'Randtheoretiker' },
            { threshold: 14, labelEn: 'Beyond the Pale', labelDE: 'Jenseits der Grenzen' },
        ]
    },

    // ── ALL POISSON PROCESS NODES ────────────────
    {
        id: 'tree_poisson_complete',
        category: 'tree',
        icon: '⚗️',
        nameEn: 'Poisson Expert',
        nameDE: 'Poisson-Experte',
        descEn: 'Allocate all three Poisson Process nodes.',
        descDE: 'Verteile alle drei Poisson-Prozess-Knoten.',
        stat: 'treePoissonComplete',
        tiers: [
            { threshold: 1, labelEn: 'Random Events Mastered', labelDE: 'Zufallsereignisse gemeistert' },
        ]
    },

    // ── ALL EXPECTED VALUE NODES ─────────────────
    {
        id: 'tree_expected_value',
        category: 'tree',
        icon: '🧮',
        nameEn: 'Expected Value',
        nameDE: 'Erwartungswert',
        descEn: 'Allocate all three Expected Value nodes.',
        descDE: 'Verteile alle drei Erwartungswert-Knoten.',
        stat: 'treeExpectedValueComplete',
        tiers: [
            { threshold: 1, labelEn: 'Calculated Advantage', labelDE: 'Berechneter Vorteil' },
        ]
    },

    // ── ALL MARGINAL DISTRIBUTION NODES ─────────
    {
        id: 'tree_marginal_dist',
        category: 'tree',
        icon: '📦',
        nameEn: 'Edge Case Handler',
        nameDE: 'Randfall-Behandler',
        descEn: 'Allocate all three Marginal Distribution nodes.',
        descDE: 'Verteile alle drei Randverteilungs-Knoten.',
        stat: 'treeMarginalDistComplete',
        tiers: [
            { threshold: 1, labelEn: 'Every Edge Covered', labelDE: 'Jeder Rand abgedeckt' },
        ]
    },



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

];