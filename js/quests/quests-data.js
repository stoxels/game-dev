// Sort leder by categories

const LEDGER_GROUPS = [
    { id: 'progression', labelEn: 'Progression', labelDE: 'Fortschritt' },
    { id: 'gameplay', labelEn: 'Gameplay', labelDE: 'Spielweise' },
    { id: 'itemsclasses', labelEn: 'Items & Classes', labelDE: 'Gegenstände & Klassen' },
    { id: 'challenges', labelEn: 'Challenges', labelDE: 'Herausforderungen' },
];


const LEDGER_CATEGORIES = [


    //------------------------------------------------------------------------
    //----------------------------PROGRESSION QUESTS--------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    //  EXPECTED VALUE 
    //  Theme: your total score is the expected value of your decisions
    {
        id: 'expected_value',
        groupId: 'progression',
        icon: '💰',
        titleEn: 'Expected Value', titleDE: 'Erwartungswert',
        descEn: 'E[X] = Σ x·p(x). Accumulate the expected return of every run.',
        descDE: 'E[X] = Σ x·p(x). Häufe den erwarteten Ertrag jedes Durchlaufs an.',
        milestones: [
            {
                id: 'ev_1', labelEn: '5,000 total score', labelDE: '5.000 Gesamtpunkte',
                check: () => ({ current: STATE.totalScore || 0, target: 5000 }),
                reward: { items: ['addTime300', 'reveal3'] }
            },
            {
                id: 'ev_2', labelEn: '20,000 total score', labelDE: '20.000 Gesamtpunkte',
                check: () => ({ current: STATE.totalScore || 0, target: 20000 }),
                reward: { items: ['addTime600', 'markWrong8'] }
            },
            {
                id: 'ev_3', labelEn: '50,000 total score', labelDE: '50.000 Gesamtpunkte',
                check: () => ({ current: STATE.totalScore || 0, target: 50000 }),
                reward: { items: ['addTime900', 'rowSolve'] }
            },
            {
                id: 'ev_4', labelEn: '100,000 total score', labelDE: '100.000 Gesamtpunkte',
                check: () => ({ current: STATE.totalScore || 0, target: 100000 }),
                reward: { ptPoints: 1, items: ['addTime900', 'colSolve'] }
            },
        ]
    },



    // SAMPLE SIZE 
    // Theme: the more observations you collect, the better
    {
        id: 'sample_size',
        groupId: 'progression',
        icon: '📊',
        titleEn: 'Sample Size', titleDE: 'Stichprobengröße',
        descEn: 'Every solved puzzle adds to your sample. Larger samples reveal the truth.',
        descDE: 'Jedes gelöste Rätsel vergrößert deine Stichprobe. Größere Stichproben enthüllen die Wahrheit.',
        milestones: [
            {
                id: 'sample_size_1', labelEn: 'n = 10', labelDE: 'n = 10',
                check: qs => ({ current: qs.levelsCompleted || 0, target: 10 }),
                reward: { items: ['reveal3', 'mistakeEraser4'] }
            },
            {
                id: 'sample_size_2', labelEn: 'n = 50', labelDE: 'n = 50',
                check: qs => ({ current: qs.levelsCompleted || 0, target: 50 }),
                reward: { items: ['reveal4', 'markWrong6'] }
            },
            {
                id: 'sample_size_3', labelEn: 'n = 100', labelDE: 'n = 100',
                check: qs => ({ current: qs.levelsCompleted || 0, target: 100 }),
                reward: { items: ['rowSolve'] }
            },
            {
                id: 'sample_size_4', labelEn: 'n = 200', labelDE: 'n = 200',
                check: qs => ({ current: qs.levelsCompleted || 0, target: 200 }),
                reward: { items: ['colSolve', 'mistakeEraser4'] }
            },
            {
                id: 'sample_size_5', labelEn: 'n = 500', labelDE: 'n = 500',
                check: qs => ({ current: qs.levelsCompleted || 0, target: 500 }),
                reward: { items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    //  PARAMETER SPACE (WORLD EXPLORATION) 
    //  Theme: a complete analysis covers the entire parameter space — finish every world
    {
        id: 'parameter_space',
        groupId: 'progression',
        icon: '🌍',
        titleEn: 'Parameter Space', titleDE: 'Parameterraum',
        descEn: 'A complete analysis covers the entire parameter space. Finish every world.',
        descDE: 'Eine vollständige Analyse deckt den gesamten Parameterraum ab. Beende jede Welt.',
        milestones: [
            {
                id: 'world_1', labelEn: '1 world completed', labelDE: '1 Welt abgeschlossen',
                check: qs => ({ current: qs.worldsCompleted || 0, target: 1 }),
                reward: { items: ['rowSolve', 'colSolve'] }
            },
            {
                id: 'world_2', labelEn: '4 worlds completed', labelDE: '4 Welten abgeschlossen',
                check: qs => ({ current: qs.worldsCompleted || 0, target: 4 }),
                reward: { items: ['rowSolve', 'colSolve', 'scoutPrimer'] }
            },
            {
                id: 'world_3', labelEn: '8 worlds completed', labelDE: '8 Welten abgeschlossen',
                check: qs => ({ current: qs.worldsCompleted || 0, target: 8 }),
                reward: { items: ['rowSolve', 'colSolve', 'mistakeEraserAll'] }
            },
            {
                id: 'world_4', labelEn: 'All worlds completed', labelDE: 'Alle Welten abgeschlossen',
                check: qs => ({ current: qs.worldsCompleted || 0, target: 13 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve', 'mistakeEraserAll', 'addTime900'] }
            },
        ]
    },

    //  CONDITIONAL PROBABILITY (GATES)
    //  Theme: passing gates = conditioning on the right event
    {
        id: 'probability_gate',
        groupId: 'progression',
        icon: '🔐',
        titleEn: 'Conditional Probability', titleDE: 'Bedingte Wahrscheinlichkeit',
        descEn: 'Given that you reach a probability gate - what are the odds you pass it?',
        descDE: 'Gegeben, dass du ein Tor erreichst — wie hoch sind deine Chancen es zu überwinden?',
        milestones: [
            {
                id: 'cond_prob_1', labelEn: '5 gates passed', labelDE: '5 Tore bestanden',
                check: qs => ({ current: qs.gatesPassed || 0, target: 5 }),
                reward: { items: ['reveal3', 'markWrong6'] }
            },
            {
                id: 'cond_prob_2', labelEn: '15 gates passed', labelDE: '15 Tore bestanden',
                check: qs => ({ current: qs.gatesPassed || 0, target: 15 }),
                reward: { items: ['scoutPrimer', 'markWrong8'] }
            },
            {
                id: 'cond_prob_3', labelEn: '35 gates passed', labelDE: '35 Tore bestanden',
                check: qs => ({ current: qs.gatesPassed || 0, target: 35 }),
                reward: { items: ['rowSolve', 'markWrong8'] }
            },
        ]
    },


    //  CONVERGENCE 
    //  Theme: the series converges - clearing convergence levels
    {
        id: 'convergence',
        groupId: 'progression',
        icon: '🌿',
        titleEn: 'Convergence', titleDE: 'Konvergenz',
        descEn: 'As the sample size n increases, the sequence converges to truth. Clear convergence levels.',
        descDE: 'Wenn der Stichprobneumfang wächst konvergiert die Folge zur Wahrheit. Schließe Konvergenz-Level ab.',
        milestones: [
            {
                id: 'conv_1', labelEn: '5 convergence levels', labelDE: '5 Konvergenz-Level',
                check: qs => ({ current: qs.convergenceLevels || 0, target: 5 }),
                reward: { items: ['reveal4', 'markWrong6'] }
            },
            {
                id: 'conv_2', labelEn: '13 convergence levels', labelDE: '13 Konvergenz-Level',
                check: qs => ({ current: qs.convergenceLevels || 0, target: 13 }),
                reward: { items: ['colSolve', 'mistakeEraser4'] }
            },
            {
                id: 'conv_3', labelEn: '26 convergence levels', labelDE: '26 Konvergenz-Level',
                check: qs => ({ current: qs.convergenceLevels || 0, target: 26 }),
                reward: { items: ['rowSolve', 'colSolve'] }
            },
        ]
    },


    //  PROBABILITY TREE (PASSIVE SKILL POINTS)
    //  Theme: the passive skill tree IS a probability tree — branch through it
    {
        id: 'probability_tree',
        groupId: 'progression',
        icon: '🌳',
        titleEn: 'Probability Tree', titleDE: 'Wahrscheinlichkeitsbaum',
        descEn: 'Branch through the probability tree. Spend passive skill points.',
        descDE: 'Verzweige dich durch den Wahrscheinlichkeitsbaum. Gib passive Fähigkeitspunkte aus.',
        milestones: [
            {
                id: 'pt_1', labelEn: '5 points spent', labelDE: '5 Punkte ausgegeben',
                check: () => ({ current: _ptCurrentSpentCount(), target: 5 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'pt_2', labelEn: '20 points spent', labelDE: '20 Punkte ausgegeben',
                check: () => ({ current: _ptCurrentSpentCount(), target: 20 }),
                reward: { items: ['rowSolve', 'scoutPrimer'] }
            },
            {
                id: 'pt_3', labelEn: '40 points spent', labelDE: '40 Punkte ausgegeben',
                check: () => ({ current: _ptCurrentSpentCount(), target: 40 }),
                reward: { items: ['rowSolve', 'colSolve', 'grandPearl'] }
            },
        ]
    },

    //  CHOOSE YOUR ESTIMATOR (CLASS SELECTION) 
    //  Theme: every analysis requires choosing an estimator — select your class
    //  Single milestone, instant reward on first class selection.
    {
        id: 'choose_estimator',
        groupId: 'progression',
        icon: '🧮',
        titleEn: 'Choose Your Estimator', titleDE: 'Wähle deinen Schätzer',
        descEn: 'Every analysis requires choosing an estimator. Select your class to begin.',
        descDE: 'Jede Analyse erfordert einen Schätzer. Wähle deine Klasse um zu beginnen.',
        milestones: [
            {
                id: 'class_chosen', labelEn: 'Select a class', labelDE: 'Wähle eine Klasse',
                check: qs => ({ current: qs.classChosen ? 1 : 0, target: 1 }),
                reward: { items: ['reveal4', 'scoutPrimer'] }
            },
        ]
    },

    //  CHOOSE YOUR ASCENDENCY
    //  Theme: specialisation beyond the base class — a single permanent choice
    {
        id: 'choose_ascendency',
        groupId: 'progression',
        icon: '✨',
        titleEn: 'Choose Your Ascendency', titleDE: 'Aufstiegsklasse wählen',
        descEn: 'Every estimator has a hidden specialisation. Max out your base class and ascend.',
        descDE: 'Jeder Schätzer hat eine verborgene Spezialisierung. Maximiere deine Basisklasse und steige auf.',
        milestones: [
            {
                id: 'ascendency_chosen', labelEn: 'Choose an Ascendency', labelDE: 'Wähle eine Aufstiegsklasse',
                check: qs => ({ current: qs.ascendencyChosen ? 1 : 0, target: 1 }),
                reward: { items: ['grandPearl', 'reveal4'] }
            },
        ]
    },

    //  MAXIMUM LIKELIHOOD (CLASS UPGRADES) 
    //  Theme: find the parameters that maximise the likelihood — unlock all upgrades
    {
        id: 'max_likelihood',
        groupId: 'progression',
        icon: '⬆️',
        titleEn: 'Maximum Likelihood', titleDE: 'Maximum-Likelihood',
        descEn: 'Find the parameters that maximise the likelihood. Unlock all class skill upgrades.',
        descDE: 'Finde die Parameter, die die Likelihood maximieren. Schalte alle Klassen-Upgrades frei.',
        milestones: [
            {
                id: 'mle_1', labelEn: '1 class upgrade applied', labelDE: '1 Klassen-Upgrade angewendet',
                check: qs => ({ current: qs.classUpgradesApplied || 0, target: 1 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'mle_2', labelEn: '3 class upgrades applied', labelDE: '3 Klassen-Upgrades angewendet',
                check: qs => ({ current: qs.classUpgradesApplied || 0, target: 3 }),
                reward: { items: ['pearlOfHaste', 'pearlOfSwiftness'] }
            },
            {
                id: 'mle_3', labelEn: 'All 6 upgrades applied', labelDE: 'Alle 6 Upgrades angewendet',
                check: qs => ({ current: qs.classUpgradesApplied || 0, target: 6 }),
                reward: { items: ['grandPearl', 'mistakeEraserAll'] }
            },
        ]
    },



    //  ASCENDENCY MASTERY (ASCENDENCY UPGRADES)
    //  Theme: push past the ceiling — fully upgrade both ascendency skills
    {
        id: 'ascendency_mastery',
        groupId: 'progression',
        icon: '🏆',
        titleEn: 'Ascendency Mastery', titleDE: 'Aufstiegsklassen-Meisterschaft',
        descEn: 'The ascended path has no ceiling. Upgrade both ascendency skills to their maximum rank.',
        descDE: 'Der Aufstiegspfad hat keine Obergrenze. Bringe beide Aufstiegsfähigkeiten auf maximalen Rang.',
        milestones: [
            {
                id: 'asc_upg_1', labelEn: '1 ascendency skill upgraded', labelDE: '1 Aufstiegsfähigkeit verbessert',
                check: qs => ({ current: qs.ascendencyUpgradesApplied || 0, target: 1 }),
                reward: { items: ['grandPearl', 'pearlOfHaste'] }
            },
            {
                id: 'asc_upg_2', labelEn: '3 ascendency skill upgrades applied', labelDE: '3 Aufstiegsfähigkeits-Upgrades angewendet',
                check: qs => ({ current: qs.ascendencyUpgradesApplied || 0, target: 3 }),
                reward: { items: ['grandPearl', 'rowSolve'] }
            },
            {
                id: 'asc_upg_3', labelEn: 'All 4 ascendency upgrades applied', labelDE: 'Alle 4 Aufstiegs-Upgrades angewendet',
                check: qs => ({ current: qs.ascendencyUpgradesApplied || 0, target: 4 }),
                reward: { items: ['grandPearl', 'rowSolve', 'colSolve'] }
            },
        ]
    },


    //  DESCRIPTIVE STATISTICS (ACHIEVEMENTS) 
    //  Theme: achievements are the descriptive statistics of your play
    {
        id: 'descriptive_stats',
        groupId: 'progression',
        icon: '📋',
        titleEn: 'Descriptive Statistics', titleDE: 'Deskriptive Statistik',
        descEn: 'Describe your performance with hard data. Unlock achievements.',
        descDE: 'Beschreibe deine Leistung mit harten Daten. Schalte Erfolge frei.',
        milestones: [
            {
                id: 'ach_1', labelEn: '10 achievements unlocked', labelDE: '10 Erfolge freigeschaltet',
                check: qs => ({ current: qs.achievementsUnlocked || 0, target: 10 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'ach_2', labelEn: '25 achievements unlocked', labelDE: '25 Erfolge freigeschaltet',
                check: qs => ({ current: qs.achievementsUnlocked || 0, target: 25 }),
                reward: { items: ['rowSolve', 'mistakeEraser6'] }
            },
            {
                id: 'ach_3', labelEn: '50 achievements unlocked', labelDE: '50 Erfolge freigeschaltet',
                check: qs => ({ current: qs.achievementsUnlocked || 0, target: 50 }),
                reward: { items: ['rowSolve', 'mistakeEraserAll'] }
            },


            {
                id: 'ach_4', labelEn: '100 achievements unlocked', labelDE: '100 Erfolge freigeschaltet',
                check: qs => ({ current: qs.achievementsUnlocked || 0, target: 100 }),
                reward: { ptPoints: 1, items: ['colSolve', 'mistakeEraserAll'] }
            },
        ]
    },



    //------------------------------------------------------------------------
    //----------------------------GAMEPLAY QUESTS-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------




    // CONFIDENCE INTERVAL 
    // Theme: answering questions correctly = narrowing the interval of uncertainty
    {
        id: 'confidence_interval',
        groupId: 'gameplay',
        icon: '🎯',
        titleEn: 'Confidence Interval', titleDE: 'Konfidenzintervall',
        descEn: 'Each correct answer tightens your confidence interval. Approach certainty.',
        descDE: 'Jede richtige Antwort verengt dein Konfidenzintervall. Nähere dich der Gewissheit.',
        milestones: [
            {
                id: 'ci_1', labelEn: '20 correct answers', labelDE: '20 richtige Antworten',
                check: qs => ({ current: qs.questionsCorrect || 0, target: 20 }),
                reward: { items: ['reveal3'] }
            },
            {
                id: 'ci_2', labelEn: '50 correct answers', labelDE: '50 richtige Antworten',
                check: qs => ({ current: qs.questionsCorrect || 0, target: 50 }),
                reward: { items: ['reveal4', 'markWrong6'] }
            },
            {
                id: 'ci_3', labelEn: '150 correct answers', labelDE: '150 richtige Antworten',
                check: qs => ({ current: qs.questionsCorrect || 0, target: 150 }),
                reward: { items: ['markWrong8', 'scoutPrimer'] }
            },
            {
                id: 'ci_4', labelEn: '300 correct answers', labelDE: '300 richtige Antworten',
                check: qs => ({ current: qs.questionsCorrect || 0, target: 300 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'ci_5', labelEn: '500 correct answers', labelDE: '500 richtige Antworten',
                check: qs => ({ current: qs.questionsCorrect || 0, target: 500 }),
                reward: { items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    //  GUIDED SCHOLARSHIP (tutor answers questions) 
    {
        id: 'guided_scholarship',
        groupId: 'gameplay',
        icon: '🎓',
        titleEn: 'Guided Scholarship', titleDE: 'Geführte Wissenschaft',
        descEn: 'Let the tutor solve questions for you.',
        descDE: 'Lass den Tutor Fragen für dich lösen.',
        milestones: [
            {
                id: 'tutor_ans_1', labelEn: '5 tutor correct answers', labelDE: '5 richtige Tutor-Antworten',
                check: qs => ({ current: qs.tutorQuestCorrect || 0, target: 5 }),
                reward: { items: ['mistakeEraser6', 'scoutPrimer'] }
            },
            {
                id: 'tutor_ans_2', labelEn: '20 tutor correct answers', labelDE: '20 richtige Tutor-Antworten',
                check: qs => ({ current: qs.tutorQuestCorrect || 0, target: 20 }),
                reward: { items: ['mistakeEraserAll', 'scoutPrimer'] }
            },
            {
                id: 'tutor_ans_3', labelEn: '50 tutor correct answers', labelDE: '50 richtige Tutor-Antworten',
                check: qs => ({ current: qs.tutorQuestCorrect || 0, target: 50 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'rowSolve'] }
            },
        ]
    },

    // FULL PRIMER COVERAGE (tutor answers all 5 primer questions) 
    {
        id: 'full_primer_coverage',
        groupId: 'gameplay',
        icon: '📜',
        titleEn: 'Full Primer Coverage', titleDE: 'Vollständige Primer-Abdeckung',
        descEn: 'Have the tutor answer all 5 Scout\'s Primer questions in a chain.',
        descDE: 'Lass den Tutor alle 5 Pfadfinder-Kompass-Fragen in Folge beantworten.',
        milestones: [
            {
                id: 'full_primer_1', labelEn: 'Tutor answers all 5 primer questions once', labelDE: 'Tutor beantwortet einmal alle 5 Primer-Fragen',
                check: qs => ({ current: qs.primerTutorAllFive || 0, target: 1 }),
                reward: { items: ['scoutPrimer', 'scoutPrimer', 'mistakeEraser6'] }
            },
            {
                id: 'full_primer_2', labelEn: '5 full-tutor primer chains', labelDE: '5 vollständige Tutor-Primer-Ketten',
                check: qs => ({ current: qs.primerTutorAllFive || 0, target: 5 }),
                reward: { ptPoints: 1, items: ['scoutPrimer', 'rowSolve', 'colSolve'] }
            },
        ]
    },


    // ELIMINATION EXPERT (MC wrong answers disabled) 
    {
        id: 'elimination_expert',
        groupId: 'gameplay',
        icon: '✂️',
        titleEn: 'Elimination Expert', titleDE: 'Eliminierungsexperte',
        descEn: 'See questions with a wrong answer already removed.',
        descDE: 'Beantworte Fragen, bei denen eine falsche Antwort bereits entfernt wurde.',
        milestones: [
            {
                id: 'elim_1', labelEn: '10 questions with eliminated answers', labelDE: '10 Fragen mit eliminierten Antworten',
                check: qs => ({ current: qs.mcWrongAnswersEliminated || 0, target: 10 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'elim_2', labelEn: '40 questions with eliminated answers', labelDE: '40 Fragen mit eliminierten Antworten',
                check: qs => ({ current: qs.mcWrongAnswersEliminated || 0, target: 40 }),
                reward: { items: ['rowSolve', 'scoutPrimer'] }
            },
            {
                id: 'elim_3', labelEn: '100 questions with eliminated answers', labelDE: '100 Fragen mit eliminierten Antworten',
                check: qs => ({ current: qs.mcWrongAnswersEliminated || 0, target: 100 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    // EXERCISE HINTS (hints appear) 
    {
        id: 'exercise_hints',
        groupId: 'gameplay',
        icon: '💡',
        titleEn: 'Exercise Hints', titleDE: 'Übungsaufgaben-Hinweise',
        descEn: 'Fail enough times to see the hint appear.',
        descDE: 'Scheitere oft genug, damit der Hinweis erscheint.',
        milestones: [
            {
                id: 'hint_1', labelEn: '5 hints shown', labelDE: '5 Hinweise angezeigt',
                check: qs => ({ current: qs.primerHintsTotal || 0, target: 5 }),
                reward: { items: ['reveal4', 'scoutPrimer'] }
            },
            {
                id: 'hint_2', labelEn: '25 hints shown', labelDE: '25 Hinweise angezeigt',
                check: qs => ({ current: qs.primerHintsTotal || 0, target: 25 }),
                reward: { items: ['rowSolve', 'markWrong8'] }
            },
            {
                id: 'hint_3', labelEn: '75 hints shown', labelDE: '75 Hinweise angezeigt',
                check: qs => ({ current: qs.primerHintsTotal || 0, target: 75 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'scoutPrimer'] }
            },
        ]
    },

    //  RARE EVENT PROBABILITY (LUCKY DROPS) 
    //  Theme: lucky drops are low-probability events that do occur
    {
        id: 'lucky_drop_event',
        icon: '🍀',
        groupId: 'gameplay',
        titleEn: 'Rare Event Probability', titleDE: 'Seltene Ereigniswahrscheinlichkeit',
        descEn: 'Rare events do occur. Activate the Lucky Drops node and collect the drops.',
        descDE: 'Seltene Ereignisse treten ein. Aktiviere den Glücksfunde-Knoten und sammle die Drops.',
        milestones: [
            {
                id: 'lucky_1', labelEn: '1 Lucky Drop', labelDE: '1 Glücksfund',
                check: qs => ({ current: qs.luckyDropsClaimed || 0, target: 1 }),
                reward: { items: ['__random__', '__random__'] }
            },
            {
                id: 'lucky_2', labelEn: '10 Lucky Drops', labelDE: '10 Glücksfunde',
                check: qs => ({ current: qs.luckyDropsClaimed || 0, target: 10 }),
                reward: { items: ['__random__', '__random__', '__random__'] }
            },
            {
                id: 'lucky_3', labelEn: '40 Lucky Drops', labelDE: '40 Glücksfunde',
                check: qs => ({ current: qs.luckyDropsClaimed || 0, target: 40 }),
                reward: { items: ['__random__', '__random__', '__random__'] }
            },
            {
                id: 'lucky_4', labelEn: '77 Lucky Drops', labelDE: '77 Glücksfunde',
                check: qs => ({ current: qs.luckyDropsClaimed || 0, target: 77 }),
                reward: { ptPoints: 1, items: ['__random__', '__random__', '__random__'] }
            },
        ]
    },


    // ERROR CORRECTION (remove 50 mistakes in one level) 
    {
        id: 'error_correction',
        groupId: 'gameplay',
        icon: '🩹',
        titleEn: 'Error Correction', titleDE: 'Fehlerkorrektur',
        descEn: 'Mistakes can be undone. Remove enough of them in a single level.',
        descDE: 'Fehler können rückgängig gemacht werden. Entferne genug in einem Level.',
        milestones: [
            {
                id: 'err_corr_1', labelEn: 'Remove 50 mistakes in one level', labelDE: '50 Fehler in einem Level entfernen',
                check: qs => ({ current: qs.levelsRemovedFiftyMistakes || 0, target: 1 }),
                reward: { items: ['mistakeEraserAll', 'mistakeEraser6'] }
            },
            {
                id: 'err_corr_2', labelEn: '5 levels with 50+ mistakes removed', labelDE: '5 Level mit 50+ entfernten Fehlern',
                check: qs => ({ current: qs.levelsRemovedFiftyMistakes || 0, target: 5 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'addTime900'] }
            },
        ]
    },


    // CURSE WARD (block 15 curses in one level) 
    {
        id: 'curse_ward',
        groupId: 'gameplay',
        icon: '🧿',
        titleEn: 'Curse Ward', titleDE: 'Fluchschutz',
        descEn: 'Immunity is power. Block enough cursed downsides in a single level.',
        descDE: 'Immunität ist Macht. Blocke genug verfluchte Nachteile in einem Level.',
        milestones: [
            {
                id: 'ward_1', labelEn: 'Block 15 curses in one level', labelDE: '15 Flüche in einem Level blocken',
                check: qs => ({ current: qs.levelsBlockedFifteenCurses || 0, target: 1 }),
                reward: { items: ['theWitch', 'cursedShield'] }
            },
            {
                id: 'ward_2', labelEn: '10 levels blocking 15 curses', labelDE: '10 Level mit 15 geblockten Flüchen',
                check: qs => ({ current: qs.levelsBlockedFifteenCurses || 0, target: 10 }),
                reward: { ptPoints: 1, items: ['theWitch', 'cursedRowCol'] }
            },
        ]
    },


    // COUNTDOWN CRISIS MASTER 
    {
        id: 'countdown_crisis_master',
        groupId: 'gameplay',
        icon: '💣',
        titleEn: 'Countdown Crisis Master', titleDE: 'Countdown-Krisen-Meister',
        descEn: 'Use 30 timer items and finish the level in the last 30 seconds with Countdown Crisis active.',
        descDE: 'Verwende 30 Timer-Gegenstände und beende das Level in den letzten 30 Sekunden mit aktiver Countdown-Krise.',
        milestones: [
            {
                id: 'cc_master_1', labelEn: 'Master the Countdown Crisis once', labelDE: 'Bewältige die Countdown - Krise einmal.',
                check: qs => ({ current: qs.countdownCrisisFinishes || 0, target: 1 }),
                reward: { items: ['addTime900', 'addTime900'] }
            },
            {
                id: 'cc_master_2', labelEn: 'Master the Countdown Crisis 3 times', labelDE: 'Bewältige die Countdown - Krise 3 mal',
                check: qs => ({ current: qs.countdownCrisisFinishes || 0, target: 3 }),
                reward: { ptPoints: 1, items: ['addTime900', 'addTime900', 'addTime900'] }
            },
        ]
    },


    //  PURE REVELATION (massive grid, no reveals except items)
    {
        id: 'pure_revelation',
        groupId: 'gameplay',
        icon: '🕯️',
        titleEn: 'Pure Revelation', titleDE: 'Reine Enthüllung',
        descEn: 'Solve a massive grid using only reveal items - no manual or ability reveals.',
        descDE: 'Löse ein massives Rätsel nur mit Enthüllungsgegenständen - keine manuellen oder Fähigkeits-Enthüllungen.',
        milestones: [
            {
                id: 'pure_rev_1', labelEn: 'Solve massive grid with item reveals only', labelDE: 'Massives Rätsel nur mit Gegenständen lösen',
                check: qs => ({ current: qs.massiveGridPureItemReveal || 0, target: 1 }),
                reward: { items: ['reveal4', 'reveal4', 'reveal4'] }
            },
            {
                id: 'pure_rev_2', labelEn: '5 pure-item massive solves', labelDE: '5 reine Gegenstandslösungen auf massiven Rätseln',
                check: qs => ({ current: qs.massiveGridPureItemReveal || 0, target: 5 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve', 'reveal4'] }
            },
        ]
    },


    // OVERFITTING GAMBLER (large grid, overfitting, 25+ mistakes) 
    {
        id: 'overfitting_gambler',
        groupId: 'gameplay',
        icon: '📉',
        titleEn: 'Overfitting Gambler', titleDE: 'Überanpassungs-Spieler',
        descEn: 'Exploit the free first half — then survive the triple penalties.',
        descDE: 'Nutze die kostenlose erste Hälfte — dann überlebst du die dreifachen Strafen.',
        milestones: [
            {
                id: 'overfit_1', labelEn: '1 large grid cleared with Overfitting and 25+ mistakes', labelDE: '1 großes Raster mit Überanpassung und 25+ Fehlern',
                check: qs => ({ current: qs.levelsOverfitHighMistakes || 0, target: 1 }),
                reward: { items: ['mistakeEraserAll', 'addTime900'] }
            },
            {
                id: 'overfit_2', labelEn: '5 such levels', labelDE: '5 solche Level',
                check: qs => ({ current: qs.levelsOverfitHighMistakes || 0, target: 5 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'addTime900', 'addTime900'] }
            },
        ]
    },

    // SAMPLE EFFICIENCY MASTER 
    {
        id: 'sample_efficiency_master',
        groupId: 'gameplay',
        icon: '📈',
        titleEn: 'Sample Efficiency Master', titleDE: 'Stichprobeneffizienz-Meister',
        descEn: 'Fill cells in perfect streaks and watch the auto-reveals stack up.',
        descDE: 'Fülle Zellen in perfekten Serien und sieh die automatischen Enthüllungen sich stapeln.',
        milestones: [
            {
                id: 'samp_eff_1', labelEn: '25 cells revealed via Sample Efficiency', labelDE: '25 Zellen via Stichprobeneffizienz enthüllt',
                check: qs => ({ current: qs.sampleEfficiencyRevealsTotal || 0, target: 25 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'samp_eff_2', labelEn: '100 cells revealed via Sample Efficiency', labelDE: '100 Zellen via Stichprobeneffizienz enthüllt',
                check: qs => ({ current: qs.sampleEfficiencyRevealsTotal || 0, target: 100 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'samp_eff_3', labelEn: '300 cells revealed via Sample Efficiency', labelDE: '300 Zellen via Stichprobeneffizienz enthüllt',
                check: qs => ({ current: qs.sampleEfficiencyRevealsTotal || 0, target: 300 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    // FUTURE GLIMPSE (complete levels while text is visible) 
    {
        id: 'future_glimpse',
        groupId: 'gameplay',
        icon: '📋',
        titleEn: 'Future Glimpse', titleDE: 'Zukunftsblick',
        descEn: 'Complete levels while the completion text is still displayed.',
        descDE: 'Beende Level, während der Abschlusstext noch angezeigt wird.',
        milestones: [
            {
                id: 'glimpse_1', labelEn: '5 levels with glimpse active', labelDE: '5 Level mit aktivem Zukunftsblick',
                check: qs => ({ current: qs.levelsWithGlimpseVisible || 0, target: 5 }),
                reward: { items: ['reveal4', 'markWrong6'] }
            },
            {
                id: 'glimpse_2', labelEn: '25 levels with glimpse active', labelDE: '25 Level mit aktivem Zukunftsblick',
                check: qs => ({ current: qs.levelsWithGlimpseVisible || 0, target: 25 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'glimpse_3', labelEn: '75 levels with glimpse active', labelDE: '75 Level mit aktivem Zukunftsblick',
                check: qs => ({ current: qs.levelsWithGlimpseVisible || 0, target: 75 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },


    // SIGNAL TO NOISE MASTER (massive grids with S/N) 
    {
        id: 'signal_noise_master',
        groupId: 'gameplay',
        icon: '📡',
        titleEn: 'Signal to Noise Master', titleDE: 'Signal-Rausch-Meister',
        descEn: 'Solve massive grids despite the noisy clues.',
        descDE: 'Löse massive Raster trotz der verrauschten Hinweise.',
        milestones: [
            {
                id: 'sn_1', labelEn: '3 massive grids with Signal to Noise', labelDE: '3 massive Raster mit Signal-Rausch-Verhältnis',
                check: qs => ({ current: qs.massiveGridsSignalToNoise || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'sn_2', labelEn: '10 massive grids with Signal to Noise', labelDE: '10 massive Raster mit Signal-Rausch-Verhältnis',
                check: qs => ({ current: qs.massiveGridsSignalToNoise || 0, target: 10 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'sn_3', labelEn: '25 massive grids with Signal to Noise', labelDE: '25 massive Raster mit Signal-Rausch-Verhältnis',
                check: qs => ({ current: qs.massiveGridsSignalToNoise || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    // ORACLE VISION (massive grids with The Oracle) 
    {
        id: 'oracle_vision',
        groupId: 'gameplay',
        icon: '👁️',
        titleEn: 'Oracle Vision', titleDE: 'Orakelblick',
        descEn: 'Memorise and execute. Solve massive grids after seeing the solution flash.',
        descDE: 'Merken und ausführen. Löse massive Raster nachdem die Lösung kurz aufgeleuchtet hat.',
        milestones: [
            {
                id: 'oracle_1', labelEn: '3 massive grids with The Oracle', labelDE: '3 massive Raster mit dem Orakel',
                check: qs => ({ current: qs.massiveGridsOracle || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'oracle_2', labelEn: '10 massive grids with The Oracle', labelDE: '10 massive Raster mit dem Orakel',
                check: qs => ({ current: qs.massiveGridsOracle || 0, target: 10 }),
                reward: { items: ['rowSolve', 'scoutPrimer'] }
            },
            {
                id: 'oracle_3', labelEn: '25 massive grids with The Oracle', labelDE: '25 massive Raster mit dem Orakel',
                check: qs => ({ current: qs.massiveGridsOracle || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    // DEGREES OF FREEDOM MASTER (large grids with DoF)
    {
        id: 'degrees_of_freedom_master',
        groupId: 'gameplay',
        icon: '🎛️',
        titleEn: 'Degrees of Freedom Master', titleDE: 'Freiheitsgrade-Meister',
        descEn: 'Solve large grids with half the clues hidden.',
        descDE: 'Löse große Raster mit der Hälfte der versteckten Hinweise.',
        milestones: [
            {
                id: 'dof_1', labelEn: '3 large grids with Degrees of Freedom', labelDE: '3 große Raster mit Freiheitsgraden',
                check: qs => ({ current: qs.largeGridsDegreesOfFreedom || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'dof_2', labelEn: '10 large grids with Degrees of Freedom', labelDE: '10 große Raster mit Freiheitsgraden',
                check: qs => ({ current: qs.largeGridsDegreesOfFreedom || 0, target: 10 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'dof_3', labelEn: '25 large grids with Degrees of Freedom', labelDE: '25 große Raster mit Freiheitsgraden',
                check: qs => ({ current: qs.largeGridsDegreesOfFreedom || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },


    // RANDOM WALK SURVIVOR (large grids with Random Walk)
    {
        id: 'random_walk_survivor',
        groupId: 'gameplay',
        icon: '🚶',
        titleEn: 'Random Walk Survivor', titleDE: 'Zufallswanderer-Überlebender',
        descEn: 'Survive the chaos. Solve large grids with Random Walk active.',
        descDE: 'Überlebe das Chaos. Löse große Raster mit aktivem Zufälligen Wandel.',
        milestones: [
            {
                id: 'rw_1', labelEn: '3 large grids with Random Walk', labelDE: '3 große Raster mit Zufälligem Wandel',
                check: qs => ({ current: qs.largeGridsRandomWalk || 0, target: 3 }),
                reward: { items: ['shield', 'mistakeEraser6'] }
            },
            {
                id: 'rw_2', labelEn: '10 large grids with Random Walk', labelDE: '10 große Raster mit Zufälligem Wandel',
                check: qs => ({ current: qs.largeGridsRandomWalk || 0, target: 10 }),
                reward: { items: ['mistakeEraserAll', 'rowSolve'] }
            },
            {
                id: 'rw_3', labelEn: '25 large grids with Random Walk', labelDE: '25 große Raster mit Zufälligem Wandel',
                check: qs => ({ current: qs.largeGridsRandomWalk || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'rowSolve', 'colSolve'] }
            },
        ]
    },


    //EMERGENCY RESPONSE (emergency scan on massive grid) 
    {
        id: 'emergency_response',
        groupId: 'gameplay',
        icon: '🚨',
        titleEn: 'Emergency Response', titleDE: 'Notfallreaktion',
        descEn: 'Trigger the emergency scan on a massive grid and still complete it.',
        descDE: 'Löse den Notfall-Scan auf einem massiven Raster aus und schließe es dennoch ab.',
        milestones: [
            {
                id: 'emerg_1', labelEn: '3 massive grids with emergency scan', labelDE: '3 massive Raster mit Notfall-Scan',
                check: qs => ({ current: qs.massiveGridsEmergencyScan || 0, target: 3 }),
                reward: { items: ['addTime600', 'reveal4'] }
            },
            {
                id: 'emerg_2', labelEn: '10 massive grids with emergency scan', labelDE: '10 massive Raster mit Notfall-Scan',
                check: qs => ({ current: qs.massiveGridsEmergencyScan || 0, target: 10 }),
                reward: { items: ['addTime900', 'rowSolve'] }
            },
            {
                id: 'emerg_3', labelEn: '25 massive grids with emergency scan', labelDE: '25 massive Raster mit Notfall-Scan',
                check: qs => ({ current: qs.massiveGridsEmergencyScan || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['addTime900', 'rowSolve', 'colSolve'] }
            },
        ]
    },

    // 50. GAMBLER'S FORTUNE (add time via Gambler's Ruin) 
    {
        id: 'gamblers_fortune',
        groupId: 'gameplay',
        icon: '🎰',
        titleEn: "Gambler's Fortune", titleDE: 'Glück des Spielers',
        descEn: 'Each correct fill is worth 3 seconds. Accumulate enough.',
        descDE: 'Jede korrekte Füllung ist 3 Sekunden wert. Häufe genug an.',
        milestones: [
            {
                id: 'gr_1', labelEn: '10 minutes added via Gambler\'s Ruin', labelDE: '10 Minuten durch Spielerruin hinzugefügt',
                check: qs => ({ current: qs.gamblersRuinTotalTimeAdded || 0, target: 600 }),
                reward: { items: ['addTime600', 'reveal4'] }
            },
            {
                id: 'gr_2', labelEn: '30 minutes added via Gambler\'s Ruin', labelDE: '30 Minuten durch Spielerruin hinzugefügt',
                check: qs => ({ current: qs.gamblersRuinTotalTimeAdded || 0, target: 1800 }),
                reward: { items: ['addTime900', 'rowSolve'] }
            },
            {
                id: 'gr_3', labelEn: '60 minutes added via Gambler\'s Ruin', labelDE: '60 Minuten durch Spielerruin hinzugefügt',
                check: qs => ({ current: qs.gamblersRuinTotalTimeAdded || 0, target: 3600 }),
                reward: { ptPoints: 1, items: ['addTime900', 'addTime900', 'rowSolve'] }
            },
        ]
    },


    //  ENTROPY DRAIN MASTER (massive grids with Entropy Drain)
    {
        id: 'entropy_drain_master',
        groupId: 'gameplay',
        icon: '🌡️',
        titleEn: 'Entropy Drain Master', titleDE: 'Entropie-Abbau-Meister',
        descEn: 'Work fast — unfinished lines decay. Complete massive grids despite Entropy Drain.',
        descDE: 'Arbeite schnell — unfertige Linien zerfallen. Beende massive Raster trotz Entropie-Abbau.',
        milestones: [
            {
                id: 'ed_1', labelEn: '3 massive grids with Entropy Drain', labelDE: '3 massive Raster mit Entropie-Abbau',
                check: qs => ({ current: qs.massiveGridsEntropyDrain || 0, target: 3 }),
                reward: { items: ['addTime600', 'reveal4'] }
            },
            {
                id: 'ed_2', labelEn: '10 massive grids with Entropy Drain', labelDE: '10 massive Raster mit Entropie-Abbau',
                check: qs => ({ current: qs.massiveGridsEntropyDrain || 0, target: 10 }),
                reward: { items: ['addTime900', 'rowSolve'] }
            },
            {
                id: 'ed_3', labelEn: '25 massive grids with Entropy Drain', labelDE: '25 massive Raster mit Entropie-Abbau',
                check: qs => ({ current: qs.massiveGridsEntropyDrain || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['addTime900', 'colSolve', 'rowSolve'] }
            },
        ]
    },

    // 52. DEAD RECKONING NAVIGATOR 
    {
        id: 'dead_reckoning_navigator',
        groupId: 'gameplay',
        icon: '🧭',
        titleEn: 'Dead Reckoning Navigator', titleDE: 'Koppelnavigations-Navigator',
        descEn: 'Navigate by sums alone until you earn the real clues.',
        descDE: 'Navigiere nur nach Summen, bis du dir die echten Hinweise verdient hast.',
        milestones: [
            {
                id: 'dr_1', labelEn: '5 levels with Dead Reckoning', labelDE: '5 Level mit Koppelnavigation',
                check: qs => ({ current: qs.levelsDeadReckoning || 0, target: 5 }),
                reward: { items: ['reveal4', 'addTime600'] }
            },
            {
                id: 'dr_2', labelEn: '20 levels with Dead Reckoning', labelDE: '20 Level mit Koppelnavigation',
                check: qs => ({ current: qs.levelsDeadReckoning || 0, target: 20 }),
                reward: { items: ['rowSolve', 'addTime900'] }
            },
            {
                id: 'dr_3', labelEn: '50 levels with Dead Reckoning', labelDE: '50 Level mit Koppelnavigation',
                check: qs => ({ current: qs.levelsDeadReckoning || 0, target: 50 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve', 'addTime900'] }
            },
        ]
    },


    //  FREQUENTIST'S BURDEN MASTER (massive grids)
    {
        id: 'frequentists_burden_master',
        groupId: 'gameplay',
        icon: '📜',
        titleEn: "Frequentist's Burden Master", titleDE: 'Last-des-Frequentisten-Meister',
        descEn: 'Earn each clue one fill at a time on massive grids.',
        descDE: 'Verdiene jeden Hinweis eine Füllung nach der anderen auf massiven Rastern.',
        milestones: [
            {
                id: 'fb_1', labelEn: '3 massive grids with Frequentist\'s Burden', labelDE: '3 massive Raster mit Last des Frequentisten',
                check: qs => ({ current: qs.massiveGridsFrequentistsBurden || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'fb_2', labelEn: '10 massive grids with Frequentist\'s Burden', labelDE: '10 massive Raster mit Last des Frequentisten',
                check: qs => ({ current: qs.massiveGridsFrequentistsBurden || 0, target: 10 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'fb_3', labelEn: '25 massive grids with Frequentist\'s Burden', labelDE: '25 massive Raster mit Last des Frequentisten',
                check: qs => ({ current: qs.massiveGridsFrequentistsBurden || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },

    // FIELD SCAN REVELATION (correct cells revealed by field scans)
    {
        id: 'field_scan_revelation',
        groupId: 'gameplay',
        icon: '🔭',
        titleEn: 'Field Scan Revelation', titleDE: 'Feldscan-Offenbarung',
        descEn: 'The scan flashes. Make every moment count.',
        descDE: 'Der Scan blitzt. Nutze jeden Moment.',
        milestones: [
            {
                id: 'fsr_1', labelEn: '50 cells revealed by field scan', labelDE: '50 Zellen durch Feldscan enthüllt',
                check: qs => ({ current: qs.fieldScanCorrectReveals || 0, target: 50 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'fsr_2', labelEn: '200 cells revealed by field scan', labelDE: '200 Zellen durch Feldscan enthüllt',
                check: qs => ({ current: qs.fieldScanCorrectReveals || 0, target: 200 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'fsr_3', labelEn: '500 cells revealed by field scan', labelDE: '500 Zellen durch Feldscan enthüllt',
                check: qs => ({ current: qs.fieldScanCorrectReveals || 0, target: 500 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },


    // SPARSE PRIOR MASTER 
    {
        id: 'sparse_prior_master',
        groupId: 'gameplay',
        icon: '🫥',
        titleEn: 'Sparse Prior Master', titleDE: 'Schwacher-Prior-Meister',
        descEn: 'Start blind — let completions reveal the path on massive grids.',
        descDE: 'Starte blind — lass Abschlüsse den Weg auf massiven Rastern enthüllen.',
        milestones: [
            {
                id: 'sp_1', labelEn: '3 massive grids with Sparse Prior', labelDE: '3 massive Raster mit Schwachem Prior',
                check: qs => ({ current: qs.massiveGridsSparsePrior || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'sp_2', labelEn: '10 massive grids with Sparse Prior', labelDE: '10 massive Raster mit Schwachem Prior',
                check: qs => ({ current: qs.massiveGridsSparsePrior || 0, target: 10 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'sp_3', labelEn: '25 massive grids with Sparse Prior', labelDE: '25 massive Raster mit Schwachem Prior',
                check: qs => ({ current: qs.massiveGridsSparsePrior || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },



    // CONFIDENCE INTERVAL MASTER 
    {
        id: 'confidence_interval_master',
        groupId: 'gameplay',
        icon: '📐',
        titleEn: 'Confidence Interval Master', titleDE: 'Konfidenzintervall-Meister',
        descEn: 'Let the interval absorb your double-taps.',
        descDE: 'Lass das Intervall deine Doppelklicks absorbieren.',
        milestones: [
            {
                id: 'ci_ign_1', labelEn: '10 mistakes ignored by Confidence Interval', labelDE: '10 Fehler durch Konfidenzintervall ignoriert',
                check: qs => ({ current: qs.confidenceIntervalIgnored || 0, target: 10 }),
                reward: { items: ['shield', 'mistakeEraser4'] }
            },
            {
                id: 'ci_ign_2', labelEn: '50 mistakes ignored by Confidence Interval', labelDE: '50 Fehler durch Konfidenzintervall ignoriert',
                check: qs => ({ current: qs.confidenceIntervalIgnored || 0, target: 50 }),
                reward: { items: ['mistakeEraser6', 'shield'] }
            },
            {
                id: 'ci_ign_3', labelEn: '150 mistakes ignored by Confidence Interval', labelDE: '150 Fehler durch Konfidenzintervall ignoriert',
                check: qs => ({ current: qs.confidenceIntervalIgnored || 0, target: 150 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'shield'] }
            },
        ]
    },

    // ADJACENCY MATRIX MASTER 
    {
        id: 'adjacency_matrix_master',
        groupId: 'gameplay',
        icon: '🔢',
        titleEn: 'Adjacency Matrix Master', titleDE: 'Adjazenzmatrix-Meister',
        descEn: 'Read the numbers. Count the neighbours. Solve without clues.',
        descDE: 'Lies die Zahlen. Zähle die Nachbarn. Löse ohne Hinweise.',
        milestones: [
            {
                id: 'am_1', labelEn: '5 levels with Adjacency Matrix', labelDE: '5 Level mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsAdjacencyMatrix || 0, target: 5 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'am_2', labelEn: '20 levels with Adjacency Matrix', labelDE: '20 Level mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsAdjacencyMatrix || 0, target: 20 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'am_3', labelEn: '50 levels with Adjacency Matrix', labelDE: '50 Level mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsAdjacencyMatrix || 0, target: 50 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },



    //  MINESWEEPER MIND (ADJACENCY MATRIX + LARGE GRIDS) 
    //  Theme: the adjacency matrix turns every cell into a conditional clue —
    //  master it on large grids where every number counts
    {
        id: 'minesweeper_mind',
        groupId: 'gameplay',
        icon: '🧩',
        titleEn: 'Minesweeper Mind', titleDE: 'Minesweeper-Denken',
        descEn: 'The adjacency matrix turns every empty cell into a conditional clue. Solve large puzzles (200+ tiles) with the Adjacency Matrix node active.',
        descDE: 'Die Adjazenzmatrix macht jede leere Zelle zu einem bedingten Hinweis. Löse große Rätsel (200+ Felder) mit aktivem Adjazenzmatrix-Knoten.',
        milestones: [
            {
                id: 'adjmat_large_1', labelEn: '3 large grids with Adjacency Matrix', labelDE: '3 große Rätsel mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsLargeAdjMatrix || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'adjmat_large_2', labelEn: '10 large grids with Adjacency Matrix', labelDE: '10 große Rätsel mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsLargeAdjMatrix || 0, target: 10 }),
                reward: { items: ['rowSolve', 'reveal4'] }
            },
            {
                id: 'adjmat_large_3', labelEn: '25 large grids with Adjacency Matrix', labelDE: '25 große Rätsel mit Adjazenzmatrix',
                check: qs => ({ current: qs.levelsLargeAdjMatrix || 0, target: 25 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve'] }
            },
        ]
    },




    //------------------------------------------------------------------------
    //----------------------ITEMS & CLASS QUESTS------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------


    // Quest: NULL HYPOTHESIS 
    // Theme: "assume nothing helps" - win without using any items
    {
        id: 'null_hypothesis',
        groupId: 'itemsclasses',
        icon: '🔬',
        titleEn: 'Null Hypothesis', titleDE: 'Nullhypothese',
        descEn: 'Test whether items are truly necessary. Reject the null by going without them.',
        descDE: 'Teste, ob Items wirklich notwendig sind. Beweise das Gegenteil, indem du ohne sie spielst.',
        milestones: [
            {
                id: 'null_hyp_1', labelEn: '10 levels without items', labelDE: '10 Level ohne Items',
                check: qs => ({ current: qs.levelsNoitem || 0, target: 10 }),
                reward: { items: ['markWrong6', 'reveal3'] }
            },
            {
                id: 'null_hyp_2', labelEn: '25 levels without items', labelDE: '25 Level ohne Items',
                check: qs => ({ current: qs.levelsNoitem || 0, target: 25 }),
                reward: { items: ['rowSolve', 'markWrong8'] }
            },
            {
                id: 'null_hyp_3', labelEn: '60 levels without items', labelDE: '60 Level ohne Items',
                check: qs => ({ current: qs.levelsNoitem || 0, target: 60 }),
                reward: { items: ['reveal4', 'colSolve'] }
            },
        ]
    },



    //  13. RESOURCE DISTRIBUTION (ITEM USAGE) 
    //  Theme: allocating resources across the probability space — use items
    {
        id: 'item_distribution',
        groupId: 'itemsclasses',
        icon: '🎒',
        titleEn: 'Resource Distribution', titleDE: 'Ressourcenverteilung',
        descEn: 'Allocate your resources wisely across the sample space. Use items.',
        descDE: 'Verteile deine Ressourcen weise über den Stichprobenraum. Setze Items ein.',
        milestones: [
            {
                id: 'item_1', labelEn: '25 items used', labelDE: '25 Items verwendet',
                check: qs => ({ current: qs.itemsUsedTotal || 0, target: 25 }),
                reward: { items: ['reveal4', 'markWrong6'] }
            },
            {
                id: 'item_2', labelEn: '100 items used', labelDE: '100 Items verwendet',
                check: qs => ({ current: qs.itemsUsedTotal || 0, target: 100 }),
                reward: { items: ['rowSolve', 'markWrong8'] }
            },
            {
                id: 'item_3', labelEn: '250 items used', labelDE: '250 Items verwendet',
                check: qs => ({ current: qs.itemsUsedTotal || 0, target: 250 }),
                reward: { items: ['rowSolve', 'colSolve', 'reveal4'] }
            },
            {
                id: 'item_4', labelEn: '500 items used', labelDE: '500 Items verwendet',
                check: qs => ({ current: qs.itemsUsedTotal || 0, target: 500 }),
                reward: { ptPoints: 1, items: ['scoutPrimer', 'rowSolve'] }
            },
        ]
    },


    //  CURSE OF DIMENSIONALITY (CURSED ITEMS) 
    //  Theme: in high dimensions, strange things happen — embrace cursed items
    {
        id: 'curse_dimensionality',
        groupId: 'itemsclasses',
        icon: '☠️',
        titleEn: 'Curse of Dimensionality', titleDE: 'Fluch der Dimensionalität',
        descEn: 'In high dimensions, strange things happen. Embrace cursed items.',
        descDE: 'In hohen Dimensionen passieren seltsame Dinge. Umarme verfluchte Items.',
        milestones: [
            {
                id: 'curse_1', labelEn: '10 cursed items used', labelDE: '10 verfluchte Items verwendet',
                check: qs => ({ current: qs.cursedItemsUsed || 0, target: 10 }),
                reward: { items: ['cursedShield', 'cursedReveal'] }
            },
            {
                id: 'curse_2', labelEn: '25 cursed items used', labelDE: '25 verfluchte Items verwendet',
                check: qs => ({ current: qs.cursedItemsUsed || 0, target: 25 }),
                reward: { items: ['cursedRowSolve', 'cursedColSolve'] }
            },
            {
                id: 'curse_3', labelEn: '75 cursed items used', labelDE: '75 verfluchte Items verwendet',
                check: qs => ({ current: qs.cursedItemsUsed || 0, target: 75 }),
                reward: { items: ['cursedRowCol', 'cursedTime'] }
            },
        ]
    },


    //  PRIOR DISTRIBUTION (SCOUT'S PRIMER)
    //  Theme: Bayesian inference starts with a prior — the Primer is your prior
    {
        id: 'prior_distribution',
        groupId: 'itemsclasses',
        icon: '📜',
        titleEn: "Prior Distribution", titleDE: 'A-priori-Verteilung',
        descEn: "Bayesian inference starts with a prior. The Scout's Primer is your prior.",
        descDE: 'Bayesianische Inferenz beginnt mit einem Prior. Der Pfadfinder-Kompass ist dein Prior.',
        milestones: [
            {
                id: 'prior_1', labelEn: '5 Primer questions correct', labelDE: '5 Kompass-Fragen richtig',
                check: qs => ({ current: qs.primerCorrect || 0, target: 5 }),
                reward: { items: ['reveal4', 'scoutPrimer'] }
            },
            {
                id: 'prior_2', labelEn: '30 Primer questions correct', labelDE: '30 Kompass-Fragen richtig',
                check: qs => ({ current: qs.primerCorrect || 0, target: 30 }),
                reward: { items: ['scoutPrimer', 'scoutPrimer'] }
            },
            {
                id: 'prior_3', labelEn: '75 Primer questions correct', labelDE: '75 Kompass-Fragen richtig',
                check: qs => ({ current: qs.primerCorrect || 0, target: 75 }),
                reward: { items: ['rowSolve', 'scoutPrimer'] }
            },
            {
                id: 'prior_4', labelEn: '1 full-puzzle Primer solve', labelDE: '1 vollständige Primer-Lösung',
                check: qs => ({ current: qs.primerFullSolves || 0, target: 1 }),
                reward: { items: ['scoutPrimer', 'reveal4'] }
            },
            {
                id: 'prior_5', labelEn: '10 full-puzzle Primer solves', labelDE: '5 vollständige Primer-Lösungen',
                check: qs => ({ current: qs.primerFullSolves || 0, target: 10 }),
                reward: { ptPoints: 1, items: ['scoutPrimer', 'rowSolve'] }
            },
        ]
    },


    //  WITCH'S IMMUNITY (CURSED UNDER IMMUNITY) 
    //  Theme: using the Witch's protection to safely harvest cursed item upsides
    {
        id: 'witch_immunity',
        groupId: 'itemsclasses',
        icon: '✂️',
        titleEn: 'Truncated Distribution', titleDE: 'Abgeschnittene Verteilung',
        descEn: 'The Witch cuts away the harmful tail of the distribution. Use cursed items under immunity and keep only the favorable outcomes.',
        descDE: 'Die Hexe schneidet den schädlichen Teil der Verteilung ab. Nutze verfluchte Items unter Immunität und behalte nur die günstigen Ergebnisse.',
        milestones: [
            {
                id: 'witch_imm_1', labelEn: '5 cursed items under immunity (in a won level)', labelDE: '5 verfluchte Items unter Immunität (in einem gewonnenen Level)',
                check: qs => ({ current: qs.cursedUnderImmunityWon || 0, target: 5 }),
                reward: { items: ['cursedShield', 'theWitch'] }
            },
            {
                id: 'witch_imm_2', labelEn: '10 cursed items under immunity (in a won level)', labelDE: '10 verfluchte Items unter Immunität (in einem gewonnenen Level)',
                check: qs => ({ current: qs.cursedUnderImmunityWon || 0, target: 10 }),
                reward: { items: ['theWitch', 'mistakeEraser6'] }
            },
            {
                id: 'witch_imm_3', labelEn: '15 cursed items under immunity (in a won level)', labelDE: '15 verfluchte Items unter Immunität (in einem gewonnenen Level)',
                check: qs => ({ current: qs.cursedUnderImmunityWon || 0, target: 15 }),
                reward: { items: ['theWitch', 'rowSolve'] }
            },
            {
                id: 'witch_imm_4', labelEn: '20 cursed items under immunity (in a won level)', labelDE: '20 verfluchte Items unter Immunität (in einem gewonnenen Level)',
                check: qs => ({ current: qs.cursedUnderImmunityWon || 0, target: 20 }),
                reward: { ptPoints: 1, items: ['theWitch', 'cursedRowCol'] }
            },
        ]
    },

    // ERASURE ENGINE (cursed items erase rows/cols)
    {
        id: 'erasure_engine',
        groupId: 'itemsclasses',
        icon: '🌊',
        titleEn: 'Erasure Engine', titleDE: 'Löschmaschine',
        descEn: 'Cursed items erase what you have built. Let them.',
        descDE: 'Verfluchte Gegenstände löschen, was du aufgebaut hast. Lass sie.',
        milestones: [
            {
                id: 'erase_1', labelEn: '10 rows/cols erased', labelDE: '10 Zeilen/Spalten gelöscht',
                check: qs => ({ current: qs.totalRowsErased || 0, target: 10 }),
                reward: { items: ['cursedRowSolve', 'cursedColSolve'] }
            },
            {
                id: 'erase_2', labelEn: '50 rows/cols erased', labelDE: '50 Zeilen/Spalten gelöscht',
                check: qs => ({ current: qs.totalRowsErased || 0, target: 50 }),
                reward: { items: ['cursedRowCol', 'cursedTime'] }
            },
            {
                id: 'erase_3', labelEn: '150 rows/cols erased', labelDE: '150 Zeilen/Spalten gelöscht',
                check: qs => ({ current: qs.totalRowsErased || 0, target: 150 }),
                reward: { ptPoints: 1, items: ['cursedRowCol', 'cursedRowCol'] }
            },
        ]
    },

    // ── 41. CARTOGRAPHIC MASTERY (primer rows + cols) ─────────────────────────
    {
        id: 'cartographic_mastery',
        groupId: 'itemsclasses',
        icon: '🗺️',
        titleEn: 'Cartographic Mastery', titleDE: 'Kartografische Meisterschaft',
        descEn: 'The Scout\'s Primer maps rows and columns. Reveal enough of each.',
        descDE: 'Der Pfadfinder-Kompass kartografiert Zeilen und Spalten. Enthülle genug von beidem.',
        milestones: [
            {
                id: 'carto_1', labelEn: '20 rows and 20 cols via Primer', labelDE: '20 Zeilen und 20 Spalten via Primer',
                check: qs => ({
                    current: Math.min(qs.primerTotalRowsRevealed || 0, qs.primerTotalColsRevealed || 0),
                    target: 20
                }),
                reward: { items: ['scoutPrimer', 'rowSolve'] }
            },
            {
                id: 'carto_2', labelEn: '60 rows and 60 cols via Primer', labelDE: '60 Zeilen und 60 Spalten via Primer',
                check: qs => ({
                    current: Math.min(qs.primerTotalRowsRevealed || 0, qs.primerTotalColsRevealed || 0),
                    target: 60
                }),
                reward: { items: ['scoutPrimer', 'scoutPrimer', 'rowSolve'] }
            },
            {
                id: 'carto_3', labelEn: '150 rows and 150 cols via Primer', labelDE: '150 Zeilen und 150 Spalten via Primer',
                check: qs => ({
                    current: Math.min(qs.primerTotalRowsRevealed || 0, qs.primerTotalColsRevealed || 0),
                    target: 150
                }),
                reward: { ptPoints: 1, items: ['scoutPrimer', 'rowSolve', 'colSolve'] }
            },
        ]
    },








    //  REGRESSION TO THE MEAN (TUTOR ITEMS) 
    //  Theme: extreme mistakes regress toward the mean — use Tutor items
    {
        id: 'tutor_regression',
        groupId: 'itemsclasses',
        icon: '🎓',
        titleEn: 'Regression to the Mean', titleDE: 'Regression zur Mitte',
        descEn: 'Extreme mistakes regress toward the mean. Use Tutor items to correct your path.',
        descDE: 'Extreme Fehler kehren zur Mitte zurück. Nutze Tutor-Items, um deinen Weg zu korrigieren.',
        milestones: [
            {
                id: 'tutor_1', labelEn: '5 Tutor items used', labelDE: '5 Tutor-Items verwendet',
                check: qs => ({ current: qs.tutorItemsUsed || 0, target: 5 }),
                reward: { items: ['mistakeEraser4', 'mistakeEraser'] }
            },
            {
                id: 'tutor_2', labelEn: '20 Tutor items used', labelDE: '20 Tutor-Items verwendet',
                check: qs => ({ current: qs.tutorItemsUsed || 0, target: 20 }),
                reward: { items: ['mistakeEraser6', 'mistakeEraser4'] }
            },
            {
                id: 'tutor_3', labelEn: '50 Tutor items used', labelDE: '50 Tutor-Items verwendet',
                check: qs => ({ current: qs.tutorItemsUsed || 0, target: 50 }),
                reward: { items: ['mistakeEraserAll', 'mistakeEraser6'] }
            },
        ]
    },




    //  ACTIVE INFERENCE (CLASS ABILITIES) 
    //  Theme: an active agent continuously updates its model — use class abilities
    {
        id: 'active_inference',
        groupId: 'itemsclasses',
        icon: '⚡',
        titleEn: 'Active Inference', titleDE: 'Aktive Inferenz',
        descEn: 'An active agent continuously updates its model. Use class abilities.',
        descDE: 'Ein aktiver Agent aktualisiert kontinuierlich sein Modell. Setze Klassenfähigkeiten ein.',
        milestones: [
            {
                id: 'ai_1', labelEn: '10 abilities used', labelDE: '10 Fähigkeiten verwendet',
                check: qs => ({ current: qs.classAbilitiesUsed || 0, target: 10 }),
                reward: { items: ['markWrong8', 'reveal4'] }
            },
            {
                id: 'ai_2', labelEn: '50 abilities used', labelDE: '50 Fähigkeiten verwendet',
                check: qs => ({ current: qs.classAbilitiesUsed || 0, target: 50 }),
                reward: { items: ['pearlOfHaste', 'reveal4'] }
            },
            {
                id: 'ai_3', labelEn: '150 abilities used', labelDE: '150 Fähigkeiten verwendet',
                check: qs => ({ current: qs.classAbilitiesUsed || 0, target: 150 }),
                reward: { items: ['pearlOfSwiftness', 'rowSolve'] }
            },
            {
                id: 'ai_4', labelEn: '300 abilities used', labelDE: '300 Fähigkeiten verwendet',
                check: qs => ({ current: qs.classAbilitiesUsed || 0, target: 300 }),
                reward: { items: ['grandPearl'] }
            },
        ]
    },

    // ABILITY MARATHON (30 class abilities in one level) 
    {
        id: 'ability_marathon',
        groupId: 'itemsclasses',
        icon: '⚡',
        titleEn: 'Ability Marathon', titleDE: 'Fähigkeitsmarathon',
        descEn: 'Use 30 class abilities in a single level.',
        descDE: 'Setze 30 Klassenfähigkeiten in einem einzigen Level ein.',
        milestones: [
            {
                id: 'ab_mara_1', labelEn: '30 abilities in one level', labelDE: '30 Fähigkeiten in einem Level',
                check: qs => ({ current: qs.levelsThirtyClassAbilities || 0, target: 1 }),
                reward: { items: ['grandPearl', 'pearlOfHaste'] }
            },
            {
                id: 'ab_mara_2', labelEn: '5 levels with 30 abilities each', labelDE: '5 Level mit je 30 Fähigkeiten',
                check: qs => ({ current: qs.levelsThirtyClassAbilities || 0, target: 5 }),
                reward: { ptPoints: 1, items: ['grandPearl', 'grandPearl'] }
            },
        ]
    },

    // ABILITY HARVEST (reveals + marks via class abilities)
    {
        id: 'ability_harvest',
        groupId: 'itemsclasses',
        icon: '⚡',
        titleEn: 'Ability Harvest', titleDE: 'Fähigkeitsernte',
        descEn: 'Use class abilities to reveal correct cells and mark incorrect ones.',
        descDE: 'Nutze Klassenfähigkeiten um korrekte Zellen zu enthüllen und falsche zu markieren.',
        milestones: [
            {
                id: 'ah_1', labelEn: '100 cells revealed via abilities', labelDE: '100 Zellen via Fähigkeiten enthüllt',
                check: qs => ({ current: qs.abilityRevealsTotal || 0, target: 100 }),
                reward: { items: ['pearlOfHaste', 'reveal4'] }
            },
            {
                id: 'ah_2', labelEn: '500 cells revealed via abilities', labelDE: '500 Zellen via Fähigkeiten enthüllt',
                check: qs => ({ current: qs.abilityRevealsTotal || 0, target: 500 }),
                reward: { items: ['pearlOfSwiftness', 'rowSolve'] }
            },
            {
                id: 'ah_3', labelEn: '100 cells marked via abilities', labelDE: '100 Zellen via Fähigkeiten markiert',
                check: qs => ({ current: qs.abilityMarksTotal || 0, target: 100 }),
                reward: { items: ['markWrong8', 'pearlOfHaste'] }
            },
            {
                id: 'ah_4', labelEn: '500 cells marked via abilities', labelDE: '500 Zellen via Fähigkeiten markiert',
                check: qs => ({ current: qs.abilityMarksTotal || 0, target: 500 }),
                reward: { ptPoints: 1, items: ['grandPearl', 'rowSolve'] }
            },
        ]
    },




    // SHADOW SEAL INITIATION (shadow seal within 10s on massive grid)
    {
        id: 'shadow_seal_init',
        groupId: 'itemsclasses',
        icon: '🌑',
        titleEn: 'Shadow Seal Initiation', titleDE: 'Schattensiegeleinweihung',
        descEn: 'Use a Shadow Seal within 10 seconds of level start on a massive grid and complete it.',
        descDE: 'Nutze ein Schattensiegel innerhalb von 10 Sekunden nach Level-Start auf einem massiven Raster und schließe es ab.',
        milestones: [
            {
                id: 'shadow_init_1', labelEn: '1 early shadow seal on massive grid', labelDE: '1 frühes Schattensiegel auf massivem Rätsel',
                check: qs => ({ current: qs.massiveGridShadowSealEarly || 0, target: 1 }),
                reward: { items: ['markWrong8', 'markWrong8'] }
            },
            {
                id: 'shadow_init_2', labelEn: '10 early shadow seals on massive grids', labelDE: '10 frühe Schattensiegel auf massiven Rätsel',
                check: qs => ({ current: qs.massiveGridShadowSealEarly || 0, target: 10 }),
                reward: { ptPoints: 1, items: ['markWrong8', 'colSolve'] }
            },
        ]
    },




    //------------------------------------------------------------------------
    //----------------------CHALLENGES QUESTS---------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    //  SIGNIFICANCE LEVEL α (HARD DIFFICULTY)
    //  Theme: below α, results are statistically significant — and merciless
    {
        id: 'significance_level',
        groupId: 'challenges',
        icon: '🔥',
        titleEn: 'Significance Level α', titleDE: 'Signifikanzniveau α',
        descEn: 'Below α, results are statistically significant - and merciless. Clear Hard levels.',
        descDE: 'Unterhalb von α sind Ergebnisse signifikant - und gnadenlos. Schließe Schwer-Level ab.',
        milestones: [
            {
                id: 'hard_1', labelEn: '10 Hard levels', labelDE: '10 Level auf Schwer',
                check: qs => ({ current: qs.levelsHard || 0, target: 10 }),
                reward: { items: ['shield', 'reveal4'] }
            },
            {
                id: 'hard_2', labelEn: '30 Hard levels', labelDE: '30 Level auf Schwer',
                check: qs => ({ current: qs.levelsHard || 0, target: 30 }),
                reward: { items: ['mistakeEraser6', 'markWrong8'] }
            },
            {
                id: 'hard_3', labelEn: '60 Hard levels', labelDE: '60 Level auf Schwer',
                check: qs => ({ current: qs.levelsHard || 0, target: 60 }),
                reward: { items: ['mistakeEraserAll', 'reveal4'] }
            },
        ]
    },



    //  SAMPLING UNDER TIME PRESSURE (TIME TRIAL)
    //  Theme: real analysts work to deadlines — conquer Time Trial mode
    {
        id: 'time_pressure',
        groupId: 'challenges',
        icon: '⏱️',
        titleEn: 'Sampling Under Pressure', titleDE: 'Stichproben unter Druck',
        descEn: 'Real analysts work to deadlines. Conquer Time Trial mode.',
        descDE: 'Echte Analysten arbeiten unter Zeitdruck. Bewältige den Time Trial-Modus.',
        milestones: [
            {
                id: 'tt_1', labelEn: '5 Time Trial levels', labelDE: '5 Time Trial-Level',
                check: qs => ({ current: qs.levelsTimetrial || 0, target: 5 }),
                reward: { items: ['addTime600', 'addTime300'] }
            },
            {
                id: 'tt_2', labelEn: '20 Time Trial levels', labelDE: '20 Time Trial-Level',
                check: qs => ({ current: qs.levelsTimetrial || 0, target: 20 }),
                reward: { items: ['addTime900', 'addTime600'] }
            },
            {
                id: 'tt_3', labelEn: '50 Time Trial levels', labelDE: '50 Time Trial-Level',
                check: qs => ({ current: qs.levelsTimetrial || 0, target: 50 }),
                reward: { items: ['addTime900', 'addTime900'] }
            },
        ]
    },


    //  OUTLIER RESISTANCE (HARDCORE)
    //  Theme: robust estimators ignore extreme outliers — survive Hardcore mode
    {
        id: 'outlier_resistance',
        groupId: 'challenges',
        icon: '💀',
        titleEn: 'Outlier Resistance', titleDE: 'Ausreißerresistenz',
        descEn: 'Robust estimators ignore extreme outliers. Survive Hardcore mode.',
        descDE: 'Robuste Schätzer ignorieren extreme Ausreißer. Überlebe den Hardcore-Modus.',
        milestones: [
            {
                id: 'hc_1', labelEn: '5 Hardcore levels', labelDE: '5 Hardcore-Level',
                check: qs => ({ current: qs.levelsHardcore || 0, target: 5 }),
                reward: { items: ['mistakeEraser4', 'shield'] }
            },
            {
                id: 'hc_2', labelEn: '20 Hardcore levels', labelDE: '20 Hardcore-Level',
                check: qs => ({ current: qs.levelsHardcore || 0, target: 20 }),
                reward: { items: ['mistakeEraser6', 'mistakeEraser4'] }
            },
            {
                id: 'hc_3', labelEn: '50 Hardcore levels', labelDE: '50 Hardcore-Level',
                check: qs => ({ current: qs.levelsHardcore || 0, target: 50 }),
                reward: { items: ['mistakeEraserAll', 'mistakeEraser6'] }
            },
        ]
    },


    //  FULL DISTRIBUTION (IRONMAN) 
    //  Theme: no buffers — see the full range of outcomes in Ironman mode
    {
        id: 'ironman_dist',
        groupId: 'challenges',
        icon: '⚔️',
        titleEn: 'Full Distribution', titleDE: 'Vollständige Verteilung',
        descEn: 'See the full range of outcomes - Ironman mode, no buffers allowed.',
        descDE: 'Sieh die volle Bandbreite der Ergebnisse - Ironman-Modus, keine Puffer erlaubt.',
        milestones: [
            {
                id: 'iron_1', labelEn: '5 Ironman levels', labelDE: '5 Ironman-Level',
                check: qs => ({ current: qs.levelsIronman || 0, target: 5 }),
                reward: { items: ['mistakeEraser4', 'reveal4'] }
            },
            {
                id: 'iron_2', labelEn: '20 Ironman levels', labelDE: '20 Ironman-Level',
                check: qs => ({ current: qs.levelsIronman || 0, target: 20 }),
                reward: { items: ['mistakeEraser6', 'rowSolve'] }
            },
            {
                id: 'iron_3', labelEn: '50 Ironman levels', labelDE: '50 Ironman-Level',
                check: qs => ({ current: qs.levelsIronman || 0, target: 50 }),
                reward: { items: ['mistakeEraserAll', 'rowSolve'] }
            },
        ]
    },


    //  PRIOR-FREE ESTIMATION (CLASSLESS MODE)
    //  Theme: frequentist statistics makes no class assumptions — play without one
    {
        id: 'prior_free_estimation',
        groupId: 'challenges',
        icon: '🧱',
        titleEn: 'Prior-Free Estimation', titleDE: 'Priori-freie Schätzung',
        descEn: 'No class assumptions. No passive buffs. Frequentist statistics at its purest.',
        descDE: 'Keine Klassenannahmen. Keine passiven Boni. Frequentistische Statistik in ihrer reinsten Form.',
        milestones: [
            {
                id: 'classless_1', labelEn: '5 levels in Classless mode', labelDE: '5 Level im Klassenlosen Modus',
                check: qs => ({ current: qs.levelsClassless || 0, target: 5 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'classless_2', labelEn: '20 levels in Classless mode', labelDE: '20 Level im Klassenlosen Modus',
                check: qs => ({ current: qs.levelsClassless || 0, target: 20 }),
                reward: { items: ['rowSolve', 'mistakeEraser6'] }
            },
            {
                id: 'classless_3', labelEn: '50 levels in Classless mode', labelDE: '50 Level im Klassenlosen Modus',
                check: qs => ({ current: qs.levelsClassless || 0, target: 50 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve', 'mistakeEraserAll'] }
            },
        ]
    },

    //  TABULA RASA (TREELESS MODE)
    //  Theme: no passive nodes, no advantages — a blank slate
    {
        id: 'tabula_rasa',
        groupId: 'challenges',
        icon: '🪨',
        titleEn: 'Tabula Rasa', titleDE: 'Unbeschriebenes Blatt',
        descEn: 'Every node dark, every advantage stripped. Complete levels with no passive tree.',
        descDE: 'Jeder Knoten dunkel, jeder Vorteil entzogen. Schließe Level ohne passiven Baum ab.',
        milestones: [
            {
                id: 'treeless_1', labelEn: '5 levels in Treeless mode', labelDE: '5 Level im Baumlosen Modus',
                check: qs => ({ current: qs.levelsTreeless || 0, target: 5 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'treeless_2', labelEn: '20 levels in Treeless mode', labelDE: '20 Level im Baumlosen Modus',
                check: qs => ({ current: qs.levelsTreeless || 0, target: 20 }),
                reward: { items: ['rowSolve', 'mistakeEraser6'] }
            },
            {
                id: 'treeless_3', labelEn: '50 levels in Treeless mode', labelDE: '50 Level im Baumlosen Modus',
                check: qs => ({ current: qs.levelsTreeless || 0, target: 50 }),
                reward: { ptPoints: 1, items: ['rowSolve', 'colSolve', 'mistakeEraserAll'] }
            },
        ]
    },


    //  MONTE CARLO METHOD (TRIPLE MODIFIER) 
    //  Theme: simulate every worst case at once — Hard + all five modifiers
    {
        id: 'monte_carlo',
        groupId: 'challenges',
        icon: '🎲',
        titleEn: 'Monte Carlo Method', titleDE: 'Monte-Carlo-Methode',
        descEn: 'Simulate every worst case at once. Hard difficulty with all five modifiers active.',
        descDE: 'Simuliere jeden schlimmsten Fall gleichzeitig. Schwer mit allen five Modifikatoren aktiv.',
        milestones: [
            {
                id: 'mc_1', labelEn: '1 Quintuple-Modifier level', labelDE: '1 Fünffach-Modifikator-Level',
                check: qs => ({ current: qs.levelsTripleModifier || 0, target: 1 }),
                reward: { items: ['mistakeEraser6', 'addTime600'] }
            },
            {
                id: 'mc_2', labelEn: '5 Quintuple-Modifier levels', labelDE: '5 Fünffach-Modifikator-Level',
                check: qs => ({ current: qs.levelsTripleModifier || 0, target: 10 }),
                reward: { items: ['mistakeEraserAll', 'addTime900'] }
            },
            {
                id: 'mc_3', labelEn: '15 Quintuple-Modifier levels', labelDE: '15 Fünffach-Modifikator-Level',
                check: qs => ({ current: qs.levelsTripleModifier || 0, target: 30 }),
                reward: { ptPoints: 1, items: ['mistakeEraserAll', 'rowSolve', 'colSolve'] }
            },
        ]
    },



    //  ZERO VARIANCE 
    //  Theme: perfect consistency - no deviation from the correct answer
    {
        id: 'zero_variance',
        groupId: 'challenges',
        icon: '📉',
        titleEn: 'Zero Variance', titleDE: 'Null-Varianz',
        descEn: 'A dataset with zero variance has no error. Solve flawlessly.',
        descDE: 'Ein Datensatz ohne Varianz hat keinen Fehler. Löse makellos.',
        milestones: [
            {
                id: 'zero_var_1', labelEn: '10 flawless levels', labelDE: '10 fehlerfreie Level',
                check: qs => ({ current: qs.levelsNomiss || 0, target: 10 }),
                reward: { items: ['shield', 'mistakeEraser'] }
            },
            {
                id: 'zero_var_2', labelEn: '30 flawless levels', labelDE: '30 fehlerfreie Level',
                check: qs => ({ current: qs.levelsNomiss || 0, target: 30 }),
                reward: { items: ['mistakeEraser6', 'shield'] }
            },
            {
                id: 'zero_var_3', labelEn: '60 flawless levels', labelDE: '60 fehlerfreie Level',
                check: qs => ({ current: qs.levelsNomiss || 0, target: 60 }),
                reward: { items: ['mistakeEraserAll', 'reveal4'] }
            },
            {
                id: 'zero_var_4', labelEn: '100 flawless levels', labelDE: '100 fehlerfreie Level',
                check: qs => ({ current: qs.levelsNomiss || 0, target: 100 }),
                reward: { items: ['mistakeEraserAll'] }
            },
        ]
    },



    // PRECISION UNDER PRESSURE 
    {
        id: 'precision_large',
        groupId: 'challenges',
        icon: '🎯',
        titleEn: 'Precision Under Pressure', titleDE: 'Präzision unter Druck',
        descEn: 'Large grids leave no room for error. Solve them flawlessly.',
        descDE: 'Große Raster lassen keinen Raum für Fehler. Löse sie makellos.',
        milestones: [
            {
                id: 'prec_large_1', labelEn: '3 flawless large grids', labelDE: '3 fehlerfreie große Raster',
                check: qs => ({ current: qs.precisionOnLargeGrids || 0, target: 3 }),
                reward: { items: ['reveal4', 'markWrong8'] }
            },
            {
                id: 'prec_large_2', labelEn: '10 flawless large grids', labelDE: '10 fehlerfreie große Raster',
                check: qs => ({ current: qs.precisionOnLargeGrids || 0, target: 10 }),
                reward: { items: ['rowSolve', 'colSolve'] }
            },
        ]
    },









];


// ─────────────────────────────────────────────────────────────
//  FLAT MILESTONE LOOKUP  —  O(1) access by milestone id
//  Populated once at load time.  { milestoneId → { milestone, category } }
// ─────────────────────────────────────────────────────────────

const _MILESTONE_MAP = {};

(function _buildMilestoneMap() {
    LEDGER_CATEGORIES.forEach(cat => {
        cat.milestones.forEach(ms => {
            _MILESTONE_MAP[ms.id] = { milestone: ms, category: cat };
        });
    });
})();