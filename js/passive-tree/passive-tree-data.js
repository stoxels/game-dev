const TALENT_TREE_DATA = {
    "nodes": [
        {
            "id": 1,
            "x": 1,
            "y": 1,
            "nameEn": "Start",
            "nameDe": "Start",
            "descEn": "Start",
            "descDe": "Start",
            "icon": "",
            "statKey": "start"
        },
        {
            "id": 2,
            "x": 1,
            "y": -400,
            "nameEn": "Tutor",
            "nameDe": "Tutor",
            "descEn": "Tutor Items can now be used during an Excercise or Multiple Choice question. The Tutor has a 10% chance of automatically answering the question for you. Requires a Tutor item to be in the inventory and consumes the item on use.",
            "descDe": "Tutor Gegenstände können nun während Übungsaufgaben und Multiple - Choice Fragen verwendet werden. Der Tutor beantwortet die Frage mit 10% Wahrscheinlichkeit automatisch korrekt. Benötigt einen Tutor Gegenstand im Inventar und entfernt den Gegenstand danach aus dem Inventar.",
            "icon": "🎓",
            "statKey": "tutor_enable"
        },
        {
            "id": 3,
            "x": -500,
            "y": -500,
            "nameEn": "Wisdom Through Failure",
            "nameDe": "Weisheit durch Fehler",
            "descEn": "Excercises will show a hint after 5 unsuccessfull attempts.\n10% probability of receiving an additional Item reward when completing an Excercise.",
            "descDe": "Übungsaufgaben zeigen einen Hinweis nach 5 Fehlversuchen.\n10% Wahrscheinlichkeit einen zusätzlichen Gegenstand als Belohnung für das Absolvieren einer Übungsaufgabe zu erhalten.",
            "icon": "💡",
            "statKey": "wisdom_through_failure"
        },
        {
            "id": 4,
            "x": -800,
            "y": -600,
            "nameEn": "Promising Answers",
            "nameDe": "Vielversprechende Antworten",
            "descEn": "20% probability of receiving an additional item when completing an Excercise.",
            "descDe": "20% Wahrscheinlichkeit einen zusätzlichen Gegenstand als Belohnung für das Lösen einer Übungsaufgabe zu erhalten.",
            "icon": "🎁",
            "statKey": "promising_answers"
        },
        {
            "id": 5,
            "x": -1100,
            "y": -750,
            "nameEn": "Rewarding Insight",
            "nameDe": "Belohnende Einsicht",
            "descEn": "20% probability of receiving an additional item when completing an Excercise.",
            "descDe": "20% Wahrscheinlichkeit einen zusätzlichen Gegenstand als Belohnung für das Lösen einer Übungsaufgabe zu erhalten.",
            "icon": "🎀",
            "statKey": "rewarding_insight"
        },
        {
            "id": 6,
            "x": -1227,
            "y": -1000,
            "nameEn": "Scholar's Fortune",
            "nameDe": "Vermögen des Gelehrten",
            "descEn": "20% probability of receiving an additional item when completing an Excercise.",
            "descDe": "20% Wahrscheinlichkeit einen zusätzlichen Gegenstand als Belohnung für das Lösen einer Übungsaufgabe zu erhalten.",
            "icon": "🪙",
            "statKey": "scholars_fortune"
        },
        {
            "id": 7,
            "x": -1300,
            "y": -1200,
            "nameEn": "Excercise Mastery",
            "nameDe": "Meister der Übungsaufgaben",
            "descEn": "Excercise hints now show up after one less unsuccessfull attempt.\n30% chance of receiving an additional Item reward when completing an Excercise.",
            "descDe": "Hinweise bei Übungsaufgaben erscheinen einen Fehlversuch früher.\n30% Wahrscheinlichkeit einen zusätzlichen Gegenstand als Belohnung für das Lösen einer Übungsaufgabe zu erhalten.",
            "icon": "🏆",
            "statKey": "probability_gate_mastery"
        },
        {
            "id": 8,
            "x": -500,
            "y": -700,
            "nameEn": "Quick Study",
            "nameDe": "Schnelle Studie",
            "descEn": "Excercise hints now show up after one less unsuccessfull attempt.",
            "descDe": "Hinweise bei Übungsaufgaben erscheinen einen Fehlversuch früher.",
            "icon": "💬",
            "statKey": "quick_study"
        },
        {
            "id": 9,
            "x": -800,
            "y": -1000,
            "nameEn": "Accelerated Insight",
            "nameDe": "Beschleunigte Erkenntnis",
            "descEn": "Excercise hints now show up after one less unsuccessfull attempt.",
            "descDe": "Hinweise bei Übungsaufgaben erscheinen einen Fehlversuch früher.",
            "icon": "🧩",
            "statKey": "accelerated_insight"
        },
        {
            "id": 10,
            "x": -1000,
            "y": -1100,
            "nameEn": "Instant Comprehension",
            "nameDe": "Sofortiges Verständnis",
            "descEn": "Excercise hints now show up after one less unsuccessfull attempt.",
            "descDe": "Hinweise bei Übungsaufgaben erscheinen einen Fehlversuch früher.",
            "icon": "⚡",
            "statKey": "instant_comprehension"
        },
        {
            "id": 11,
            "x": 500,
            "y": -500,
            "nameEn": "Predictive Intelligence",
            "nameDe": "Vorhersehende Erkenntnis",
            "descEn": "10% chance to automatically remove one wrong answer from a Multiple Choice question.\n10% chance to receive an additional Item when answering a Multiple Choice question correctly.",
            "descDe": "10% Chance automatisch eine falsche Antwort bei Multiple Choice Fragen zu entfernen.\n10% Chance einen zusätzlichen Gegenstand für die korrekte Beantwortung von Multiple Choice Fragen zu erhalten.",
            "icon": "🧠",
            "statKey": "predictive_intelligence"
        },
        {
            "id": 12,
            "x": 800,
            "y": -600,
            "nameEn": "Bonus Acquisition",
            "nameDe": "Vermehrte Gewinne",
            "descEn": "10% chance to receive an additional Item when answering a Multiple Choice question correctly.",
            "descDe": "10% Chance einen zusätzlichen Gegenstand für die korrekte Beantwortung von Multiple Choice Fragen zu erhalten.",
            "icon": "🎁",
            "statKey": "bonus_acquisition"
        },
        {
            "id": 13,
            "x": 1100,
            "y": -750,
            "nameEn": "Enhanced Rewards",
            "nameDe": "Verbesserte Belohnungen",
            "descEn": "10% chance to receive an additional Item when answering a Multiple Choice question correctly.",
            "descDe": "10% Chance einen zusätzlichen Gegenstand für die korrekte Beantwortung von Multiple Choice Fragen zu erhalten.",
            "icon": "🎀",
            "statKey": "enhanced_rewards"
        },
        {
            "id": 14,
            "x": 1225,
            "y": -1000,
            "nameEn": "Overflowing Spoils",
            "nameDe": "Überfluss an Beute",
            "descEn": "10% chance to receive an additional Item when answering a Multiple Choice question correctly.",
            "descDe": "10% Chance einen zusätzlichen Gegenstand für die korrekte Beantwortung von Multiple Choice Fragen zu erhalten.",
            "icon": "🪙",
            "statKey": "overflowing_spoils"
        },
        {
            "id": 15,
            "x": 500,
            "y": -700,
            "nameEn": "Elimination Clue",
            "nameDe": "Mörderische Eingebung",
            "descEn": "10% chance to automatically remove one wrong answer from a Multiple Choice question.",
            "descDe": "10% Wahrscheinlichkeit, dass eine falsche Antwort bei Multiple - Choice Fragen automatisch entfernt wird.",
            "icon": "✂️",
            "statKey": "elimination_clue"
        },
        {
            "id": 16,
            "x": 800,
            "y": -1000,
            "nameEn": "Narrowed Options",
            "nameDe": "Eingeschränkte Optionen",
            "descEn": "20% chance to automatically remove one wrong answer from a Multiple Choice question.",
            "descDe": "20% Wahrscheinlichkeit, dass eine falsche Antwort bei Multiple - Choice Fragen automatisch entfernt wird.",
            "icon": "🗑️",
            "statKey": "narrowed_options"
        },
        {
            "id": 17,
            "x": 1000,
            "y": -1100,
            "nameEn": "Logical Deductions",
            "nameDe": "Logische Schlussfolgerungen",
            "descEn": "20% chance to automatically remove one wrong answer from a Multiple Choice question.",
            "descDe": "20% Wahrscheinlichkeit, dass eine falsche Antwort bei Multiple - Choice Fragen automatisch entfernt wird.",
            "icon": "🔬",
            "statKey": "logical_deductions"
        },
        {
            "id": 18,
            "x": 1300,
            "y": -1200,
            "nameEn": "Multiple Choice Mastery",
            "nameDe": "Multiple Choice Beherrschung",
            "descEn": "40% chance to automatically remove one wrong answer from a Multiple Choice question.\n10% chance to receive an additional Item when answering a Multiple Choice question correctly.",
            "descDe": "40% Chance, dass eine falsche Antwort bei Multiple - Choice Fragen automatisch entfernt wird.\n10% Chance einen zusätzlichen Gegenstand nach der Beantwortung einer Multiple Choice Frage zu erhalten.",
            "icon": "🔱",
            "statKey": "multiple_choice_mastery"
        },
        {
            "id": 19,
            "x": -150,
            "y": -750,
            "nameEn": "Careful Study",
            "nameDe": "Vorsichtige Studie",
            "descEn": "10% chance of not spending the Tutor item when using a Tutor to answer a question.",
            "descDe": "10% Chance, dass der Tutor Gegenstand beim Beantworten einer Frage nicht verbraucht wird.",
            "icon": "📖",
            "statKey": "careful_study"
        },
        {
            "id": 20,
            "x": 150,
            "y": -750,
            "nameEn": "Stochastics Tutor",
            "nameDe": "Stochastik Tutor",
            "descEn": "Increases the chance that the tutor can solve the question by an additional 10%.",
            "descDe": "Erhöht die Chance, dass der Tutor die Frage beantworten kann, um weitere 10%.",
            "icon": "📐",
            "statKey": "stochastics_tutor"
        },
        {
            "id": 21,
            "x": -150,
            "y": -900,
            "nameEn": "Efficient Tutoring",
            "nameDe": "Effiziente Betreuung",
            "descEn": "15% chance of not spending the Tutor item when using a Tutor to answer a question.",
            "descDe": "15% Chance, dass der Tutor Gegenstand beim Beantworten einer Frage nicht verbraucht wird.",
            "icon": "📗",
            "statKey": "efficient_tutoring"
        },
        {
            "id": 22,
            "x": 150,
            "y": -900,
            "nameEn": "Statistics Tutor",
            "nameDe": "Statistik Tutor",
            "descEn": "Increases the chance that the tutor can solve the question by an additional 10%.",
            "descDe": "Erhöht die Chance, dass der Tutor die Frage beantworten kann, um weitere 10%.",
            "icon": "📏",
            "statKey": "statistics_tutor"
        },
        {
            "id": 23,
            "x": -150,
            "y": -1050,
            "nameEn": "Endless Instructions",
            "nameDe": "Endlose Anweisungen",
            "descEn": "20% chance of not spending the Tutor item when using a Tutor to answer a question.",
            "descDe": "20% Chance, dass der Tutor Gegenstand beim Beantworten einer Frage nicht verbraucht wird.",
            "icon": "📘",
            "statKey": "endless_instructions"
        },
        {
            "id": 24,
            "x": 150,
            "y": -1050,
            "nameEn": "Maths Tutor",
            "nameDe": "Mathe Tutor",
            "descEn": "Increases the chance that the tutor can solve the question by an additional 10%.",
            "descDe": "Erhöht die Chance, dass der Tutor die Frage beantworten kann, um weitere 10%.",
            "icon": "🔢",
            "statKey": "maths_tutor"
        },
        {
            "id": 25,
            "x": 1,
            "y": -1250,
            "nameEn": "Professor Tutor",
            "nameDe": "Professor Tutor",
            "descEn": "Increases the chance that the tutor can solve the question by an additional 20%.\n20% chance of not spending the Tutor item when using a Tutor to answer a question.",
            "descDe": "Erhöht die Chance, dass der Tutor die Frage beantworten kann, um weitere 20%.\n20% Chance, dass der Tutor Gegenstand beim Beantworten einer Frage nicht verbraucht wird.",
            "icon": "🎩",
            "statKey": "professor_tutor"
        },
        {
            "id": 26,
            "x": -500,
            "y": -900,
            "nameEn": "Expanding Front",
            "nameDe": "Erweiterte Front",
            "descEn": "Scout's Primer have a 50% chance of revealing an additional row. This rolls independently from other row bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 50% Chance eine weitere Zeile aufzudecken. Dies wird unabhängig von anderen Zeilenboni gewürfelt.",
            "icon": "📜",
            "statKey": "expanding_front"
        },
        {
            "id": 27,
            "x": -500,
            "y": -1102,
            "nameEn": "Widened Formation",
            "nameDe": "Erweiterte Formation",
            "descEn": "Scout's Primer have a 25% chance of revealing two additional rows. This rolls independently from other row bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 25% Chance zwei weitere Zeilen aufzudecken. Dies wird unabhängig von anderen Zeilenboni gewürfelt.",
            "icon": "🗺️",
            "statKey": "widened_formation"
        },
        {
            "id": 28,
            "x": -500,
            "y": -1300,
            "nameEn": "Extended Horizon",
            "nameDe": "Erweiterter Horizont",
            "descEn": "Scout's Primer have a 12.5% chance of revealing three additional rows. This rolls independently from other row bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 12.5% Chance drei weitere Zeilen aufzudecken. Dies wird unabhängig von anderen Zeilenboni gewürfelt.",
            "icon": "🌅",
            "statKey": "extended_horizon"
        },
        {
            "id": 29,
            "x": -200,
            "y": -1350,
            "nameEn": "Total Coverage",
            "nameDe": "Maximale Abdeckung",
            "descEn": "Scout's Primer have a 5% chance of revealing four additional rows. This rolls independently from other row bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 5% Chance vier weitere Zeilen aufzudecken. Dies wird unabhängig von anderen Zeilenboni gewürfelt.",
            "icon": "🌐",
            "statKey": "total_coverage"
        },
        {
            "id": 30,
            "x": 500,
            "y": -900,
            "nameEn": "Vertical Insight",
            "nameDe": "Vertikale Einsicht",
            "descEn": "Scout's Primer have a 50% chance of revealing an additional column. This rolls independently from other column bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 50% Chance eine weitere Spalte aufzudecken. Dies wird unabhängig von anderen Spaltenboni gewürfelt.",
            "icon": "📜",
            "statKey": "vertical_insight"
        },
        {
            "id": 31,
            "x": 500,
            "y": -1100,
            "nameEn": "Rising Structure",
            "nameDe": "Aufsteigende Struktur",
            "descEn": "Scout's Primer have a 25% chance of revealing two additional columns. This rolls independently from other column bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 25% Chance zwei weitere Spalten aufzudecken. Dies wird unabhängig von anderen Spaltenboni gewürfelt.",
            "icon": "🗺️",
            "statKey": "rising_structure"
        },
        {
            "id": 32,
            "x": 500,
            "y": -1300,
            "nameEn": "Elevated Scope",
            "nameDe": "Erhöhte Reichweite",
            "descEn": "Scout's Primer have a 12.5% chance of revealing three additional columns. This rolls independently from other column bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 12.5% Chance drei weitere Spalten aufzudecken. Dies wird unabhängig von anderen Spaltenboni gewürfelt.",
            "icon": "🏗️",
            "statKey": "elevated_scope"
        },
        {
            "id": 33,
            "x": 200,
            "y": -1350,
            "nameEn": "Total Survey",
            "nameDe": "Vollständige Erkundung",
            "descEn": "Scout's Primer have a 5% chance of revealing four additional columns. This rolls independently from other column bonuses.",
            "descDe": "Pfadfinder Kompasse haben eine 5% Chance vier weitere Spalten aufzudecken. Dies wird unabhängig von anderen Spaltenboni gewürfelt.",
            "icon": "🔭",
            "statKey": "total_survey"
        },
        {
            "id": 34,
            "x": 1,
            "y": -1500,
            "nameEn": "Primed Scout",
            "nameDe": "Vorbereiteter Pfadfinder",
            "descEn": "Doubles the amount of rows and columns Scout's Primer reveal.",
            "descDe": "Verdoppelt die Anzahl der Zeilen und Spalten, die vom Pfadfinder Kompass aufgedeckt werden.",
            "icon": "⭐",
            "statKey": "primed_scout"
        },
        {
            "id": 35,
            "x": -400,
            "y": 1,
            "nameEn": "Celerity",
            "nameDe": "Gewandtheit",
            "descEn": "All active class abilities have their cooldowns reduced by 30 seconds.",
            "descDe": "Alle aktiven Klassenfähigkeiten haben 30 Sekunden weniger Abklingzeit.",
            "icon": "💫",
            "statKey": "celerity"
        },
        {
            "id": 36,
            "x": -750,
            "y": -200,
            "nameEn": "Gear of the Statistician",
            "nameDe": "Ausrüstung des Statistikers",
            "descEn": "Statisticians have a 33% chance to receive an additional Magnifier after completing a level.",
            "descDe": "Statistiker haben eine 33% Chance eine Lupe nach dem Abschluss eines Levels zu erhalten.",
            "icon": "📊",
            "statKey": "gear_of_the_statistician"
        },
        {
            "id": 37,
            "x": -750,
            "y": 1,
            "nameEn": "Gear of the Mathmagician",
            "nameDe": "Ausrüstung des Mathemagiers",
            "descEn": "Mathmagicians have a 25% chance to receive an additional Professor after completing a level.",
            "descDe": "Mathemagier haben eine 25% Chance einen Professor nach dem Abschluss eines Levels zu erhalten.",
            "icon": "🧮",
            "statKey": "gear_of_the_mathmagician"
        },
        {
            "id": 38,
            "x": -750,
            "y": 200,
            "nameEn": "Gear of the Probabilist",
            "nameDe": "Ausrüstung des Probabilisten",
            "descEn": "Probabilists have a 25% chance to receive an additional Sweeper after completing a level.",
            "descDe": "Probabilisten haben eine 25% Chance einen Besen nach dem Abschluss eines Levels zu erhalten.",
            "icon": "🎲",
            "statKey": "gear_of_the_probabilist"
        },
        {
            "id": 39,
            "x": -1200,
            "y": -500,
            "nameEn": "Improved Gear of the Statistician",
            "nameDe": "Verbesserte Ausrüstung des Statistikers",
            "descEn": "Statisticians have a 33% chance to receive an additional Error Gem after completing a level.",
            "descDe": "Statistiker haben eine 33% Chance einen Fehlerstein nach dem Abschluss eines Levels zu erhalten.",
            "icon": "📈",
            "statKey": "improved_gear_of_the_statistician"
        },
        {
            "id": 40,
            "x": -1500,
            "y": -500,
            "nameEn": "Chain Reaction",
            "nameDe": "Kettenreaktion",
            "descEn": "Gain +1 second whenever Momentum triggers. Stacks with other effects that increase Momentum time.",
            "descDe": "Erhalte +1 Sekunde wenn Momentum ausgelöst wird. Wirkt zusammen mit anderen Effekten, die die Momentumzeit erhöhen.",
            "icon": "⛓️",
            "statKey": "chain_reaction"
        },
        {
            "id": 41,
            "x": -1800,
            "y": -500,
            "nameEn": "Precise Momentum",
            "nameDe": "Präziser Schwung",
            "descEn": "Gain +2 seconds whenever Momentum triggers. Stacks with other effects that increase Momentum time.",
            "descDe": "Erhalte +2 Sekunden wenn Momentum ausgelöst wird. Wirkt zusammen mit anderen Effekten, die die Momentumzeit erhöhen.",
            "icon": "🏹",
            "statKey": "precise_momentum"
        },
        {
            "id": 42,
            "x": -2100,
            "y": -500,
            "nameEn": "Exponential Growth",
            "nameDe": "Exponentielles Wachstum",
            "descEn": "Each Momentum activation increases future Momentums by +1 seconds. Stacks with other effects that increase Momentum time.",
            "descDe": "Jede Momentum - Aktivierung erhöht zukünftige Schwünge um 1 Sekunde. Wirkt zusammen mit anderen Effekten, die die Momentumzeit erhöhen.",
            "icon": "🚀",
            "statKey": "exponential_growth"
        },
        {
            "id": 43,
            "x": -2400,
            "y": -500,
            "nameEn": "Learning from Mistakes",
            "nameDe": "Lernen aus Fehlern",
            "descEn": "Mistakes reduce the Momentum Streak by 12 instead of fully resetting it. Combines with Mistakes no Matter for a reduced penalty of 10.",
            "descDe": "Fehler verringern den Momentum-Zähler um 12 statt ihn vollständig zurückzusetzen. Kombiniert mit 'Fehler zählen nicht' für eine reduzierte Strafe von 10.",
            "icon": "🩹",
            "statKey": "learning_from_mistakes"
        },
        {
            "id": 44,
            "x": -2700,
            "y": -500,
            "nameEn": "Mistakes no Matter",
            "nameDe": "Fehler zählen nicht",
            "descEn": "Mistakes reduce the Momentum Streak by 12 instead of fully resetting it. Combines with Learning from Mistakes for a reduced penalty of 10.",
            "descDe": "Fehler verringern den Momentum-Zähler um 12 statt ihn vollständig zurückzusetzen. Kombiniert mit 'Lernen aus Fehlern' für eine reduzierte Strafe von 10.",
            "icon": "💪",
            "statKey": "mistakes_no_matter"
        },
        {
            "id": 45,
            "x": -1500,
            "y": -650,
            "nameEn": "Monte Carlo",
            "nameDe": "Monte Carlo Simulation",
            "descEn": "Data Strike reveal cap increased by 1. Stacks with Correlation Matrix.",
            "descDe": "Datenhieb löst eine weitere ungelöste Zelle. Wirkt zusammen mit Korrelationsmatrix.",
            "icon": "🎰",
            "statKey": "monte_carlo"
        },
        {
            "id": 46,
            "x": -1800,
            "y": -651,
            "nameEn": "Correlation Matrix",
            "nameDe": "Korrelationsmatrix",
            "descEn": "Data Strike reveal cap increased by 1. Stacks with Monte Carlo.",
            "descDe": "Datenhieb löst eine weitere ungelöste Zelle. Wirkt zusammen mit Monte Carlo.",
            "icon": "🔗",
            "statKey": "correlation_matrix"
        },
        {
            "id": 47,
            "x": -2100,
            "y": -650,
            "nameEn": "Advanced Data Strike",
            "nameDe": "Verbesserter Datenhieb",
            "descEn": "Data Strike has a 25% chance of revealing cells in an additional random row or column. This rolls independently from God of Statistics. \nReduces the cooldown of Data Strike by 30 seconds.",
            "descDe": "Datenhieb hat eine 25% Chance Zellen in einer weiteren zufälligen Zeile oder Spalte aufzudecken. Dies wird unabhängig von Gott der Statistik gewürfelt.\nReduziert die Abklingzeit von Datenhieb um 30 Sekunden.",
            "icon": "⚙️",
            "statKey": "advanced_data_strike"
        },
        {
            "id": 48,
            "x": -2400,
            "y": -650,
            "nameEn": "Swift Strike",
            "nameDe": "Schneller Hieb",
            "descEn": "Reduces the cooldown of Data Strike by 15 seconds. Stacks with Accelerated Computation.",
            "descDe": "Reduziert die Abklingzeit von Datenhieb um 15 Sekunden. Wirkt zusammen mit Beschleunigte Berechnung.",
            "icon": "⚡",
            "statKey": "swift_strike"
        },
        {
            "id": 49,
            "x": -2700,
            "y": -650,
            "nameEn": "Accelerated Computation",
            "nameDe": "Beschleunigte Berechnung",
            "descEn": "Reduces the cooldown of Data Strike by 15 seconds. Stacks with Swift Strike.",
            "descDe": "Reduziert die Abklingzeit von Datenhieb um 15 Sekunden. Wirkt zusammen mit Schneller Hieb.",
            "icon": "🖥️",
            "statKey": "accelerated_computation"
        },
        {
            "id": 50,
            "x": -1500,
            "y": -350,
            "nameEn": "Diagonal Extension",
            "nameDe": "Diagonale Erweiterung",
            "descEn": "Diagonal Strike can reveal 1 additional cell. Stacks with Diagonal Witch.",
            "descDe": "Diagonalschlag kann 1 zusätzliche Zelle enthüllen. Wirkt zusammen mit Diagonale Hexe.",
            "icon": "↗️",
            "statKey": "random_diagonal"
        },
        {
            "id": 51,
            "x": -1800,
            "y": -350,
            "nameEn": "Diagonal Witch",
            "nameDe": "Diagonale Hexe",
            "descEn": "Diagonal Strike can reveal 1 additional cell. Stacks with Diagonal Extension.",
            "descDe": "Diagonalschlag kann 1 zusätzliche Zelle enthüllen. Wirkt zusammen mit Diagonale Erweiterung.",
            "icon": "🔀",
            "statKey": "diagonal_witch"
        },
        {
            "id": 52,
            "x": -2100,
            "y": -350,
            "nameEn": "Diagonally Wrong",
            "nameDe": "Diagonal Falsch",
            "descEn": "Diagonal Strike now also marks incorrect cells as incorrect.",
            "descDe": "Diagonalschlag markiert nun auch falsche Zellen als falsch.",
            "icon": "✖️",
            "statKey": "diagonally_wrong"
        },
        {
            "id": 53,
            "x": -2400,
            "y": -350,
            "nameEn": "Quick Strike",
            "nameDe": "Schneller Schlag",
            "descEn": "Reduces the cooldown of Diagonal Strike by 15 seconds. Stacks with Accelerated Striking.",
            "descDe": "Reduziert die Abklingzeit von Diagonalschlag um 15 Sekunden. Wirkt zusammen mit Verschnellertes Schlagen.",
            "icon": "🏃",
            "statKey": "quick_strike"
        },
        {
            "id": 54,
            "x": -2700,
            "y": -350,
            "nameEn": "Accelerated Striking",
            "nameDe": "Verschnellertes Schlagen",
            "descEn": "Reduces the cooldown of Diagonal Strike by 15 seconds. Stacks with Quick Strike.",
            "descDe": "Reduziert die Abklingzeit von Diagonalschlag um 15 Sekunden. Wirkt zusammen mit Schneller Schlag.",
            "icon": "💨",
            "statKey": "accelerated_striking"
        },
        {
            "id": 55,
            "x": -3000,
            "y": -502,
            "nameEn": "God of Statistics",
            "nameDe": "Gott der Statistik",
            "descEn": "Data Strike has a 25% chance of revealing cells in an additional random row or column. This rolls twice and independently from Advanced Data Strike.\nDoubles the Momentum Bonus. Stacks with other effects that increase Momentum time.\nDiagonal Strike has a 50% chance to be repeated on another random cell.",
            "descDe": "Datenhieb hat eine 25% Chance Zellen in einer weiteren zufälligen Zeile oder Spalte aufzudecken. Dies wird zweimal und unabhängig von Verbesserter Datenhieb gewürfelt.\nVerdoppelt den Momentum - Bonus. Wirkt zusammen mit anderen Effekten, die die Momentumzeit erhöhen.\nDiagonalschlag hat eine Chance von 50% zusätzlich auf eine andere zufällige Zelle angewendet zu werden.",
            "icon": "✨",
            "statKey": "god_of_statistics"
        },
        {
            "id": 56,
            "x": -1200,
            "y": 1,
            "nameEn": "Improved Gear of the Mathmatigican",
            "nameDe": "Verbesserte Ausrüstung des Mathemagiers",
            "descEn": "Mathmagicians have a 15% chance to receive an additional Chronobolt after completing a level.",
            "descDe": "Mathemagier haben eine 15% Chance einen Chronoblitz nach dem Abschluss eines Levels zu erhalten.",
            "icon": "⚡",
            "statKey": "improved_gear_of_the_mathmagician"
        },
        {
            "id": 57,
            "x": -1500,
            "y": -150,
            "nameEn": "Arcane Echo",
            "nameDe": "Arkanes Echo",
            "descEn": "Arcane Reveal can reveal 1 additional cell. Stacks with Resonant Reveal.",
            "descDe": "Arkane Enthüllung kann 1 zusätzliche Zelle enthüllen. Wirkt zusammen mit Resonante Enthüllung.",
            "icon": "🔮",
            "statKey": "arcane_echo"
        },
        {
            "id": 58,
            "x": -1800,
            "y": -150,
            "nameEn": "Resonant Reveal",
            "nameDe": "Resonante Enthüllung",
            "descEn": "Arcane Reveal can reveal 1 additional cell. Stacks with Arcane Echo.",
            "descDe": "Arkane Enthüllung kann 1 zusätzliche Zelle enthüllen. Wirkt zusammen mit Arkanes Echo.",
            "icon": "🌀",
            "statKey": "resonant_reveal"
        },
        {
            "id": 59,
            "x": -2100,
            "y": -150,
            "nameEn": "Arcane Exposure",
            "nameDe": "Arkane Bloßstellung",
            "descEn": "Arcane Reveal now also marks all empty cells in the affected area as incorrect.",
            "descDe": "Arkane Enthüllung markiert nun auch alle leeren Zellen im betroffenen Bereich als falsch.",
            "icon": "💥",
            "statKey": "arcane_exposure"
        },
        {
            "id": 60,
            "x": -2400,
            "y": -150,
            "nameEn": "Rapid Revelation",
            "nameDe": "Schnelle Offenbarung",
            "descEn": "Reduces the cooldown of Arcane Reveal by 15 seconds. Stacks with Accelerated Revelation.",
            "descDe": "Reduziert die Abklingzeit von Arkaner Enthüllung um 15 Sekunden. Wirkt zusammen mit Beschleunigter Offenbarung.",
            "icon": "🔵",
            "statKey": "rapid_revelation"
        },
        {
            "id": 61,
            "x": -2700,
            "y": -150,
            "nameEn": "Accelerated Revelation",
            "nameDe": "Beschleunigte Offenbarung",
            "descEn": "Reduces the cooldown of Arcane Reveal by 15 seconds. Stacks with Rapid Revelation.",
            "descDe": "Reduziert die Abklingzeit von Arkaner Enthüllung um 15 Sekunden. Wirkt zusammen mit Schneller Offenbarung.",
            "icon": "🔷",
            "statKey": "accelerated_revelation"
        },
        {
            "id": 62,
            "x": -1500,
            "y": 1,
            "nameEn": "Reinforced Shield",
            "nameDe": "Verstärkter Schild",
            "descEn": "Variance Shield absorbs 1 additional mistake per level. Stacks with Fortified Shield.",
            "descDe": "Varianzschild absorbiert 1 weiteren Fehler pro Level. Wirkt zusammen mit Gefestigtem Schild.",
            "icon": "🛡️",
            "statKey": "reinforced_shield"
        },
        {
            "id": 63,
            "x": -1800,
            "y": 1,
            "nameEn": "Fortified Shield",
            "nameDe": "Gefestigter Schild",
            "descEn": "Variance Shield absorbs 1 additional mistake per level. Stacks with Reinforced Shield.",
            "descDe": "Varianzschild absorbiert 1 weiteren Fehler pro Level. Wirkt zusammen mit Verstärktem Schild.",
            "icon": "🪖",
            "statKey": "fortified_shield"
        },
        {
            "id": 64,
            "x": -2100,
            "y": 1,
            "nameEn": "Calculated Error",
            "nameDe": "Kalkulierter Fehler",
            "descEn": "Absorbed mistakes have a 50% chance to add 2 minutes to the timer. Works independently from Error Dividend and Lucky Lapse.",
            "descDe": "Absorbierte Fehler haben eine 50% Chance, 2 Minuten zum Timer hinzuzufügen. Wirkt unabhängig von Fehler-Dividende und Glücklicher Lapsus.",
            "icon": "⏳",
            "statKey": "calculated_error"
        },
        {
            "id": 65,
            "x": -2400,
            "y": 1,
            "nameEn": "Error Dividend",
            "nameDe": "Fehler-Dividende",
            "descEn": "Absorbed mistakes have a 25% chance of adding 30 seconds to the timer. Works independently from Calculated Error and Lucky Lapse.",
            "descDe": "Absorbierte Fehler haben eine 25% Chance, 30 Sekunden zum Timer hinzuzufügen. Wirkt unabhängig von Kalkulierter Fehler und Glücklicher Lapsus.",
            "icon": "💰",
            "statKey": "error_dividend"
        },
        {
            "id": 66,
            "x": -2700,
            "y": 1,
            "nameEn": "Lucky Lapse",
            "nameDe": "Glücklicher Lapsus",
            "descEn": "Absorbed mistakes have a 25% chance of adding 30 seconds to the timer. Works independently from Calculated Error and Error Dividend.",
            "descDe": "Absorbierte Fehler haben eine 25% Chance, 30 Sekunden zum Timer hinzuzufügen. Wirkt unabhängig von Kalkulierter Fehler und Fehler-Dividende.",
            "icon": "🍀",
            "statKey": "lucky_lapse"
        },
        {
            "id": 67,
            "x": -1500,
            "y": 150,
            "nameEn": "Prolonged Frost",
            "nameDe": "Verlängerter Frost",
            "descEn": "Absolute Zero lasts 0.5 seconds longer. Stacks with Deep Freeze.",
            "descDe": "Absoluter Nullpunkt hält 0,5 Sekunden länger an. Wirkt zusammen mit Tiefgefroren.",
            "icon": "❄️",
            "statKey": "prolonged_frost"
        },
        {
            "id": 68,
            "x": -1800,
            "y": 150,
            "nameEn": "Deep Freeze",
            "nameDe": "Tiefgefroren",
            "descEn": "Absolute Zero lasts 0.5 seconds longer. Stacks with Prolonged Frost.",
            "descDe": "Absoluter Nullpunkt hält 0,5 Sekunden länger an. Wirkt zusammen mit Verlängerter Frost.",
            "icon": "🧊",
            "statKey": "deep_freeze"
        },
        {
            "id": 69,
            "x": -2100,
            "y": 150,
            "nameEn": "Frozen Resilience",
            "nameDe": "Gefrorene Widerstandskraft",
            "descEn": "Every 5 correct cell fills during Absolute Zero allows the Variance Shield to absorb 1 additional mistake.",
            "descDe": "Alle 5 korrekt ausgefüllten Zellen während des Absoluten Nullpunkts laden den Varianzschild um 1 absorbierten Fehler auf.",
            "icon": "🛡️",
            "statKey": "frozen_resilience"
        },
        {
            "id": 70,
            "x": -2400,
            "y": 150,
            "nameEn": "Hastened Zero",
            "nameDe": "Beschleunigter Nullpunkt",
            "descEn": "Reduces the cooldown of Absolute Zero by 15 seconds. Stacks with Accelerated Zero.",
            "descDe": "Reduziert die Abklingzeit von Absolutem Nullpunkt um 15 Sekunden. Wirkt zusammen mit Beschleunigter Nullpunkt.",
            "icon": "🔵",
            "statKey": "hastened_zero"
        },
        {
            "id": 71,
            "x": -2700,
            "y": 150,
            "nameEn": "Accelerated Zero",
            "nameDe": "Beschleunigter Nullpunkt",
            "descEn": "Reduces the cooldown of Absolute Zero by 15 seconds. Stacks with Hastened Zero.",
            "descDe": "Reduziert die Abklingzeit von Absolutem Nullpunkt um 15 Sekunden. Wirkt zusammen mit Beschleunigter Nullpunkt.",
            "icon": "🔷",
            "statKey": "accelerated_zero"
        },
        {
            "id": 72,
            "x": -3000,
            "y": 1,
            "nameEn": "God of Math",
            "nameDe": "Gott der Mathematik",
            "descEn": "Arcane Reveal's radius is increased by 1.\nDoubles the amount of seconds absorbed mistakes add to the timer.\nEach correct cell fill during Absolute Zero reduces the remaining cooldown of Arcane Reveal by 1 second.",
            "descDe": "Der Radius von Arkaner Enthüllung wird um 1 erhöht.\nVerdoppelt die Sekunden, die absorbierte Fehler zum Timer hinzufügen.\nJedes korrekt ausgefüllte Feld während des Absoluten Nullpunkts reduziert die verbleibende Abklingzeit von Arkaner Enthüllung um 1 Sekunde.",
            "icon": "✨",
            "statKey": "god_of_math"
        },
        {
            "id": 73,
            "x": -1500,
            "y": 350,
            "nameEn": "Probabilistic Sweep",
            "nameDe": "Probabilistischer Schwung",
            "descEn": "Precision Shot can mark one additional incorrect cell. Stacks with Expanded Inference.",
            "descDe": "Präzisionsschuss kann eine zusätzliche falsche Zelle markieren. Wirkt zusammen mit Erweiterte Schlussfolgerung.",
            "icon": "🖊️",
            "statKey": "probabilistic_sweep"
        },
        {
            "id": 74,
            "x": -1800,
            "y": 346,
            "nameEn": "Expanded Inference",
            "nameDe": "Erweiterte Schlussfolgerung",
            "descEn": "Precision Shot can mark one additional incorrect cell. Stacks with Probabilistic Sweep.",
            "descDe": "Präzisionsschuss kann eine zusätzliche falsche Zelle markieren. Wirkt zusammen mit Probabilistischer Schwung.",
            "icon": "📝",
            "statKey": "expanded_inference"
        },
        {
            "id": 75,
            "x": -2100,
            "y": 345,
            "nameEn": "Momentum of Certainty",
            "nameDe": "Schwung der Gewissheit",
            "descEn": "After Precision Shot resolves, correctly filling a cell in the affected rows or columns within 5 seconds grants 20 seconds added to the timer.",
            "descDe": "Nach dem Präzisionsschuss gibt das korrekte Ausfüllen einer Zelle in den betroffenen Zeilen oder Spalten innerhalb von 5 Sekunden +20 Sekunden Zeit.",
            "icon": "⚡",
            "statKey": "momentum_of_certainty"
        },
        {
            "id": 76,
            "x": -2400,
            "y": 343,
            "nameEn": "Swift Marking",
            "nameDe": "Schnelle Markierung",
            "descEn": "Reduces the cooldown of Precision Shot by 15 seconds. Stacks with Accelerated Marking.",
            "descDe": "Reduziert die Abklingzeit von Präzisionsschuss um 15 Sekunden. Wirkt zusammen mit Beschleunigter Markierung.",
            "icon": "🔵",
            "statKey": "swift_marking"
        },
        {
            "id": 77,
            "x": -2700,
            "y": 349,
            "nameEn": "Accelerated Marking",
            "nameDe": "Beschleunigte Markierung",
            "descEn": "Reduces the cooldown of Precision Shot by 15 seconds. Stacks with Swift Marking.",
            "descDe": "Reduziert die Abklingzeit von Präzisionsschuss um 15 Sekunden. Wirkt zusammen mit Schnelle Markierung.",
            "icon": "🔷",
            "statKey": "accelerated_marking"
        },
        {
            "id": 78,
            "x": -1500,
            "y": 500,
            "nameEn": "Prior Knowledge",
            "nameDe": "Vorwissen",
            "descEn": "Bayesian Insight auto-marks an additional random wrong tile at the start of each level. Stacks with Updated Beliefs, Posterior Insight and Convergent Evidence.",
            "descDe": "Bayesianische Intuition markiert zu Beginn jedes Levels eine zusätzliche zufällige falsche Zelle automatisch. Wirkt zusammen mit Aktualisierten Überzeugungen, Nachträgliche Erkenntnis und Konvergente Beweise.",
            "icon": "🧪",
            "statKey": "prior_knowledge"
        },
        {
            "id": 79,
            "x": -1800,
            "y": 500,
            "nameEn": "Updated Beliefs",
            "nameDe": "Aktualisierte Überzeugungen",
            "descEn": "Bayesian Insight auto-marks an additional random wrong tile at the start of each level. Stacks with Prior Knowledge, Posterior Insight and Convergent Evidence.",
            "descDe": "Bayesianische Intuition markiert zu Beginn jedes Levels eine zusätzliche zufällige falsche Zelle automatisch. Wirkt zusammen mit Vorwissen, Nachträgliche Erkenntnis und Konvergente Beweise.",
            "icon": "🔬",
            "statKey": "updated_beliefs"
        },
        {
            "id": 80,
            "x": -2100,
            "y": 500,
            "nameEn": "Confirmed Hypothesis",
            "nameDe": "Bestätigte Hypothese",
            "descEn": "Bayesian Insight also reveals 1 random correct filled cell at the start of each level.",
            "descDe": "Bayesianische Intuition enthüllt zu Beginn jedes Levels auch 1 zufällige korrekte gefüllte Zelle.",
            "icon": "💡",
            "statKey": "confirmed_hypothesis"
        },
        {
            "id": 81,
            "x": -2400,
            "y": 500,
            "nameEn": "Posterior Insight",
            "nameDe": "Nachträgliche Erkenntnis",
            "descEn": "Bayesian Insight auto-marks an additional random wrong tile at the start of each level. Stacks with Prior Knowledge, Updated Beliefs and Convergent Evidence.",
            "descDe": "Bayesianische Intuition markiert zu Beginn jedes Levels 2 zusätzliche zufällige falsche Zellen automatisch. Wirkt zusammen mit Vorwissen, Aktualisierte Überzeugung und Konvergente Beweise.",
            "icon": "📋",
            "statKey": "posterior_insight"
        },
        {
            "id": 82,
            "x": -2700,
            "y": 500,
            "nameEn": "Convergent Evidence",
            "nameDe": "Konvergente Beweise",
            "descEn": "Bayesian Insight auto-marks an additional random wrong tile at the start of each level. Stacks with Prior Knowledge, Updated Beliefs and Posterior Knowledge.",
            "descDe": "Bayesianische Intuition markiert zu Beginn jedes Levels eine zusätzliche zufällige falsche Zelle automatisch. Wirkt zusammen mit Vorwissen, Aktualisierte Überzeugung und Nachträgliche Erkenntnis. ",
            "icon": "🗂️",
            "statKey": "convergent_evidence"
        },
        {
            "id": 83,
            "x": -1500,
            "y": 650,
            "nameEn": "Wider Lens",
            "nameDe": "Weiteres Sichtfeld",
            "descEn": "Rain of Arrows region is increased by 1 in both width and height. Stacks with Panoramic View.",
            "descDe": "Der Bereich des Pfeilregens wird um 1 in Breite und Höhe vergrößert. Wirkt zusammen mit Panoramablick.",
            "icon": "🔍",
            "statKey": "wider_lens"
        },
        {
            "id": 84,
            "x": -1800,
            "y": 650,
            "nameEn": "Panoramic View",
            "nameDe": "Panoramablick",
            "descEn": "Rain of Arrows region is increased by 1 in both width and height. Stacks with Wider Lens.",
            "descDe": "Der Bereich des Pfeilregens wird um 1 in Breite und Höhe vergrößert. Wirkt zusammen mit Weiteres Sichtfeld.",
            "icon": "🌄",
            "statKey": "panoramic_view"
        },
        {
            "id": 85,
            "x": -2100,
            "y": 650,
            "nameEn": "Photographic Memory",
            "nameDe": "Fotografisches Gedächtnis",
            "descEn": "Rain of Arrows scan effect lasts 1 second longer.",
            "descDe": "Der Scan - Effekt von Pfeilregen hält 1 Sekunde länger an.",
            "icon": "📸",
            "statKey": "photographic_memory"
        },
        {
            "id": 86,
            "x": -2400,
            "y": 650,
            "nameEn": "Swift Scan",
            "nameDe": "Schneller Scan",
            "descEn": "Reduces the cooldown of Rain of Arrows by 15 seconds. Stacks with Accelerated Scan.",
            "descDe": "Reduziert die Abklingzeit von Pfeilregen um 15 Sekunden. Wirkt zusammen mit Beschleunigter Scan.",
            "icon": "🔵",
            "statKey": "swift_scan"
        },
        {
            "id": 87,
            "x": -2700,
            "y": 650,
            "nameEn": "Accelerated Scan",
            "nameDe": "Beschleunigter Scan",
            "descEn": "Reduces the cooldown of Rain of Arrows by 15 seconds. Stacks with Swift Scan.",
            "descDe": "Reduziert die Abklingzeit von Pfeilregen um 15 Sekunden. Wirkt zusammen mit Schneller Scan.",
            "icon": "🔷",
            "statKey": "accelerated_scan"
        },
        {
            "id": 88,
            "x": -3000,
            "y": 504,
            "nameEn": "God of Probabilities",
            "nameDe": "Gott der Wahrscheinlichkeiten",
            "descEn": "Precision Shot can mark two additional incorrect cells.\nBayesian Insight reveals 1 additional random correct filled cell at the start of each level.\n3 filled cells during a field scan from Rain of Arrows are still filled after the field scan.",
            "descDe": "Präzisionsschuss kann zwei weitere falsche Zellen markieren.\nBayesianische Intuition enthüllt zu Beginn jedes Levels eine weitere zufällige korrekte gefüllte Zelle.\n3 ausgefüllte Zellen, die durch den Feldscan von Pfeilregen aufgedeckt werden, sind auch nach dem Feldscan ausgefüllt.",
            "icon": "✨",
            "statKey": "god_of_probabilities"
        },
        {
            "id": 89,
            "x": -1200,
            "y": 500,
            "nameEn": "Improved Gear of the Probabilist",
            "nameDe": "Verbesserte Ausrüstung des Probabilisten",
            "descEn": "Probabilists have a 15% chance to receive an additional Error Magnet after completing a level.",
            "descDe": "Probabilisten haben eine 15% Chance einen Fehler-Magneten nach dem Abschluss eines Levels zu erhalten.",
            "icon": "🎯",
            "statKey": "improved_gear_of_the_probabilist"
        },
        {
            "id": 90,
            "x": -1,
            "y": 400,
            "nameEn": "Lucky Drops",
            "nameDe": "Glücksfunde",
            "descEn": "Completing an already completed level has a 25% chance of granting an item.",
            "descDe": "Das erneute Abschließen eines bereits abgeschlossenen Levels gewährt mit 25 % Wahrscheinlichkeit einen Gegenstand.",
            "icon": "🍀",
            "statKey": "lucky_drops"
        },
        {
            "id": 91,
            "x": 260,
            "y": 443,
            "nameEn": "Fortune Cascade",
            "nameDe": "Kaskade des Glücks",
            "descEn": "10% increased chance of obtaining two instead of one additional items when Lucky Drops triggers. Stacks with Jackpot Echo and Overflowing Fortune.",
            "descDe": "10% erhöhte Chance zwei anstatt einem weiteren Gegenstand zu erhalten wenn Glücksfunde aktiviert werden. Wirkt zusammen mit Jackpot-Echo und Überströmendes Glück.",
            "icon": "🎲",
            "statKey": "lucky_replay_1"
        },
        {
            "id": 92,
            "x": 491,
            "y": 569,
            "nameEn": "Jackpot Echo",
            "nameDe": "Jackpot-Echo",
            "descEn": "15% increased chance of obtaining two instead of one additional items when Lucky Drops triggers. Stacks with Fortune Cascade and Overflowing Fortune.",
            "descDe": "15% erhöhte Chance zwei anstatt einem weiteren Gegenstand zu erhalten wenn Glücksfunde aktiviert werden. Wirkt zusammen mit Kaskade des Glücks und Überströmendes Glück.",
            "icon": "🎲",
            "statKey": "lucky_replay_2"
        },
        {
            "id": 93,
            "x": 670,
            "y": 762,
            "nameEn": "Overflowing Fortune",
            "nameDe": "Überströmendes Glück",
            "descEn": "20% increased chance of obtaining two instead of one additional items when Lucky Drops triggers. Stacks with Fortune Cascade and Jackpot Echo.",
            "descDe": "20% erhöhte Chance zwei anstatt einem weiteren Gegenstand zu erhalten wenn Glücksfunde aktiviert werden. Wirkt zusammen mit Kaskade des Glücks und Jackpot-Echo.",
            "icon": "🎲",
            "statKey": "lucky_replay_3"
        },
        {
            "id": 94,
            "x": -260,
            "y": 443,
            "nameEn": "Fortune Echo",
            "nameDe": "Echos des Glücks",
            "descEn": "10% increased chance of Lucky Drops happening. Stacks with Treasure Resonance and Golden Recurrence.",
            "descDe": "10% erhöhte Chance dass Glücksfunde aktiviert werden. Wirkt zusammen mit Schatzresonanz und Goldene Wiederkehr.",
            "icon": "🎁",
            "statKey": "bonus_replay_1"
        },
        {
            "id": 95,
            "x": -491,
            "y": 569,
            "nameEn": "Treasure Resonance",
            "nameDe": "Schatzresonanz",
            "descEn": "15% increased chance of Lucky Drops happening. Stacks with Fortune Echo and Golden Recurrence.",
            "descDe": "15% erhöhte Chance dass Glücksfunde aktiviert werden. Wirkt zusammen mit Echos des Glücks und Goldene Wiederkehr.",
            "icon": "🎁",
            "statKey": "bonus_replay_2"
        },
        {
            "id": 96,
            "x": -670,
            "y": 762,
            "nameEn": "Golden Recurrence",
            "nameDe": "Goldene Wiederkehr",
            "descEn": "20% increased chance of Lucky Drops happening. Stacks with Fortune Echo and Treasure Resonance.",
            "descDe": "20% erhöhte Chance dass Glücksfunde aktiviert werden. Wirkt zusammen mit Echos des Glücks und Schatzresonanz.",
            "icon": "🎁",
            "statKey": "bonus_replay_3"
        },
        {
            "id": 97,
            "x": -100,
            "y": 1200,
            "nameEn": "Jeweled Fortune",
            "nameDe": "Juwelen des Glücks",
            "descEn": "10% increased chance of receiving Epic, or Legendary items. Stacks with Mythic Spoils and Legend's Hoard.",
            "descDe": "10% erhöhte Chance auf Epische oder Legendäre Gegenstände. Wirkt zusammen mit Mythische Beute und Hort der Legenden.",
            "icon": "💎",
            "statKey": "quality_loot_1"
        },
        {
            "id": 98,
            "x": 100,
            "y": 1200,
            "nameEn": "Mythic Spoils",
            "nameDe": "Mythische Beute",
            "descEn": "10% increased chance of receiving Epic, or Legendary items. Stacks with Jeweled Fortune and Legend's Hoard.",
            "descDe": "10% erhöhte Chance auf Epische oder Legendäre Gegenstände. Wirkt zusammen mit Juwelen des Glücks und Hort der Legenden.",
            "icon": "💎",
            "statKey": "quality_loot_2"
        },
        {
            "id": 99,
            "x": -1,
            "y": 1100,
            "nameEn": "Legend's Hoard",
            "nameDe": "Hort der Legenden",
            "descEn": "10% increased chance of receiving Epic, or Legendary items. Stacks with Jeweled Fortune and Mythic Spoils.",
            "descDe": "10% erhöhte Chance auf Epische oder Legendäre Gegenstände. Wirkt zusammen mit Juwelen des Glücks und Mythische Beute.",
            "icon": "💎",
            "statKey": "quality_loot_3"
        },
        {
            "id": 100,
            "x": 350,
            "y": 1830,
            "nameEn": "Hexbound Desire",
            "nameDe": "Hexengebundene Gier",
            "descEn": "5% increased chance of receiving Cursed items. Stacks with Dark Temptation.",
            "descDe": "5% erhöhte Chance auf verfluchte Gegenstände. Wirkt zusammen mit Dunkle Versuchung und Fluchrufer.",
            "icon": "☠️",
            "statKey": "cursed_attraction_1"
        },
        {
            "id": 101,
            "x": 320,
            "y": 1725,
            "nameEn": "Dark Temptation",
            "nameDe": "Dunkle Versuchung",
            "descEn": "5% increased chance of receiving Cursed items. Stacks with Hexbound Desire and Cursecaller.",
            "descDe": "5% erhöhte Chance auf verfluchte Gegenstände. Wirkt zusammen mit Hexengebundene Gier und Fluchrufer.",
            "icon": "☠️",
            "statKey": "cursed_attraction_2"
        },
        {
            "id": 102,
            "x": 300,
            "y": 1620,
            "nameEn": "Cursecaller",
            "nameDe": "Fluchrufer",
            "descEn": "10% increased chance of receiving Cursed items. Stacks with Hexbound Desire and Dark Temptation.",
            "descDe": "10% erhöhte Chance auf verfluchte Gegenstände. Wirkt zusammen mit Hexengebundene Gier und Dunkle Versuchung.",
            "icon": "☠️",
            "statKey": "cursed_attraction_3"
        },
        {
            "id": 103,
            "x": -350,
            "y": 1830,
            "nameEn": "Enduring Supplies",
            "nameDe": "Beständige Vorräte",
            "descEn": "5% chance that an item is not consumed when used. Stacks with Resource Preservation and Unending Utility.",
            "descDe": "5% Chance, dass ein Gegenstand beim Benutzen nicht verbraucht wird. Wirkt zusammen mit Ressourcenschonung und Unendlicher Nutzen.",
            "icon": "♻️",
            "statKey": "frugal_use_1"
        },
        {
            "id": 104,
            "x": -320,
            "y": 1725,
            "nameEn": "Resource Preservation",
            "nameDe": "Ressourcenschonung",
            "descEn": "5% chance that an item is not consumed when used. Stacks with Enduring Supplies and Unending Utility.",
            "descDe": "5% Chance, dass ein Gegenstand beim Benutzen nicht verbraucht wird. Wirkt zusammen mit Beständige Vorräte und Unendlicher Nutzen.",
            "icon": "♻️",
            "statKey": "frugal_use_2"
        },
        {
            "id": 105,
            "x": -300,
            "y": 1620,
            "nameEn": "Unending Utility",
            "nameDe": "Unendlicher Nutzen",
            "descEn": "7% chance that an item is not consumed when used. Stacks with Enduring Supplies and Resource Preservation.",
            "descDe": "7% Chance, dass ein Gegenstand beim Benutzen nicht verbraucht wird. Wirkt zusammen mit Beständige Vorräte und Ressourcenschonung.",
            "icon": "♻️",
            "statKey": "frugal_use_3"
        },
        {
            "id": 106,
            "x": -776,
            "y": 1004,
            "nameEn": "Beacon of Clarity",
            "nameDe": "Leuchtfeuer der Klarheit",
            "descEn": "Reveal items reveal 1 additional cell. Stacks with Lantern Expansion and Radiant Sight.",
            "descDe": "Enthüllungsgegenstände enthüllen 1 zusätzliche Zelle. Wirkt zusammen mit Laternenausweitung und Strahlende Sicht.",
            "icon": "🕯️",
            "statKey": "stronger_light_1"
        },
        {
            "id": 107,
            "x": -797,
            "y": 1266,
            "nameEn": "Lantern Expansion",
            "nameDe": "Laternenausweitung",
            "descEn": "Reveal items reveal 1 additional cell. Stacks with Beacon of Clarity and Radiant Sight.",
            "descDe": "Enthüllungsgegenstände enthüllen 1 zusätzliche Zelle. Wirkt zusammen mit Leuchtfeuer der Klarheit und Strahlende Sicht.",
            "icon": "🕯️",
            "statKey": "stronger_light_2"
        },
        {
            "id": 108,
            "x": -733,
            "y": 1521,
            "nameEn": "Radiant Sight",
            "nameDe": "Strahlende Sicht",
            "descEn": "Reveal items reveal 1 additional cell. Stacks with Beacon of Clarity and Lantern Expansion.",
            "descDe": "Enthüllungsgegenstände enthüllen 1 zusätzliche Zelle. Wirkt zusammen mit Leuchtfeuer der Klarheit und Laternenausweitung.",
            "icon": "🕯️",
            "statKey": "stronger_light_3"
        },
        {
            "id": 109,
            "x": 700,
            "y": 1200,
            "nameEn": "Insightful Trace",
            "nameDe": "Einsichtsvolle Spur",
            "descEn": "Mark-wrong items mark 1 additional cell. Stacks with Judgment Sigil and Clarity Mark.",
            "descDe": "Markierungsgegenstände markieren 1 zusätzliche Zelle. Wirkt zusammen mit Urteils-Siegel und Klarheitsmarke.",
            "icon": "✏️",
            "statKey": "stronger_marks_1"
        },
        {
            "id": 110,
            "x": 600,
            "y": 1200,
            "nameEn": "Judgment Sigil",
            "nameDe": "Urteils-Siegel",
            "descEn": "Mark-wrong items mark 1 additional cell. Stacks with Insightful Trace and Clarity Mark.",
            "descDe": "Markierungsgegenstände markieren 1 zusätzliche Zelle. Wirkt zusammen mit Einsichtsvolle Spur und Klarheitsmarke.",
            "icon": "✏️",
            "statKey": "stronger_marks_2"
        },
        {
            "id": 111,
            "x": 500,
            "y": 1200,
            "nameEn": "Clarity Mark",
            "nameDe": "Klarheitsmarke",
            "descEn": "Mark-wrong items mark 1 additional cell. Stacks with Insightful Trace and Judgment Sigil.",
            "descDe": "Markierungsgegenstände markieren 1 zusätzliche Zelle. Wirkt zusammen mit Einsichtsvolle Spur und Urteils-Siegel.",
            "icon": "✏️",
            "statKey": "stronger_marks_3"
        },
        {
            "id": 112,
            "x": 776,
            "y": 1004,
            "nameEn": "Academy Intervention",
            "nameDe": "Akademische Intervention",
            "descEn": "Tutor items reduce an additional mistake when used. Stacks with Mentor's Insight and Codex Assistance.",
            "descDe": "Tutor-Gegenstände reduzieren beim Benutzen einen zusätzlichen Fehler. Wirkt zusammen mit Einsicht des Mentors und Kodex-Unterstützung.",
            "icon": "🎓",
            "statKey": "scholarly_aid_1"
        },
        {
            "id": 113,
            "x": 797,
            "y": 1266,
            "nameEn": "Mentor's Insight",
            "nameDe": "Einsicht des Mentors",
            "descEn": "Tutor items reduce an additional mistake when used. Stacks with Academy Intervention and Codex Assistance.",
            "descDe": "Tutor-Gegenstände reduzieren beim Benutzen einen zusätzlichen Fehler. Wirkt zusammen mit Akademische Intervention und Kodex-Unterstützung.",
            "icon": "🎓",
            "statKey": "scholarly_aid_2"
        },
        {
            "id": 114,
            "x": 733,
            "y": 1521,
            "nameEn": "Codex Assistance",
            "nameDe": "Kodex-Unterstützung",
            "descEn": "Tutor items reduce an additional mistake when used. Stacks with Academy Intervention and Mentor's Insight.",
            "descDe": "Tutor-Gegenstände reduzieren beim Benutzen einen zusätzlichen Fehler. Wirkt zusammen mit Akademische Intervention und Einsicht des Mentors.",
            "icon": "🎓",
            "statKey": "scholarly_aid_3"
        },
        {
            "id": 115,
            "x": -589,
            "y": 1742,
            "nameEn": "Aegis Fortification",
            "nameDe": "Ägis-Verstärkung",
            "descEn": "Shield items absorb 1 additional mistake. Stacks with Bulwark of Resolve and Guardian's Bastion.",
            "descDe": "Schild-Gegenstände absorbieren 1 zusätzlichen Fehler. Wirkt zusammen mit Bollwerk der Entschlossenheit und Bastion des Wächters.",
            "icon": "🛡️",
            "statKey": "reinforced_ward_1"
        },
        {
            "id": 116,
            "x": -381,
            "y": 1904,
            "nameEn": "Bulwark of Resolve",
            "nameDe": "Bollwerk der Entschlossenheit",
            "descEn": "Shield items absorb 1 additional mistake. Stacks with Aegis Fortification and Guardian's Bastion.",
            "descDe": "Schild-Gegenstände absorbieren 1 zusätzlichen Fehler. Wirkt zusammen mit Ägis-Verstärkung und Bastion des Wächters.",
            "icon": "🛡️",
            "statKey": "reinforced_ward_2"
        },
        {
            "id": 117,
            "x": -132,
            "y": 1989,
            "nameEn": "Guardian's Bastion",
            "nameDe": "Bastion des Wächters",
            "descEn": "Shield items absorb 1 additional mistake. Stacks with Aegis Fortification and Bulwark of Resolve.",
            "descDe": "Schild-Gegenstände absorbieren 1 zusätzlichen Fehler. Wirkt zusammen mit Ägis-Verstärkung und Bollwerk der Entschlossenheit.",
            "icon": "🛡️",
            "statKey": "reinforced_ward_3"
        },
        {
            "id": 118,
            "x": 132,
            "y": 1989,
            "nameEn": "Time Weavers",
            "nameDe": "Zeitweber",
            "descEn": "Timer items grant 10% more time. Stacks with Chrono Extension and Moment Reserves.",
            "descDe": "Timer-Gegenstände gewähren 10% mehr Zeit. Wirkt zusammen mit Chrono-Verlängerung und Zeitreserven.",
            "icon": "⏳",
            "statKey": "extended_hour_1"
        },
        {
            "id": 119,
            "x": 381,
            "y": 1904,
            "nameEn": "Chrono Extension",
            "nameDe": "Chrono-Verlängerung",
            "descEn": "Timer items grant 15% more time. Stacks with Time Weavers and Moment Reserves.",
            "descDe": "Timer-Gegenstände gewähren 15% mehr Zeit. Wirkt zusammen mit Zeitwebern und Zeitreserven.",
            "icon": "⏳",
            "statKey": "extended_hour_2"
        },
        {
            "id": 120,
            "x": 589,
            "y": 1742,
            "nameEn": "Moment Reserves",
            "nameDe": "Zeitreserven",
            "descEn": "Timer items grant 10% more time. Stacks with Time Weavers and Chrono Extension.",
            "descDe": "Timer-Gegenstände gewähren 10% mehr Zeit. Wirkt zusammen mit Zeitwebern und Chrono-Verlängerung.",
            "icon": "⏳",
            "statKey": "extended_hour_3"
        },
        {
            "id": 121,
            "x": -700,
            "y": 1200,
            "nameEn": "Mist of Mercy",
            "nameDe": "Nebel der Gnade",
            "descEn": "Cursed item downsides are 10% less severe. Stacks with Hexsoftening and Veil of Relief.",
            "descDe": "Negative Effekte von verfluchten Gegenständen sind 10% schwächer. Wirkt zusammen mit Fluchmilderung und Schleier der Erleichterung.",
            "icon": "🌫️",
            "statKey": "dampened_curse_1"
        },
        {
            "id": 122,
            "x": -600,
            "y": 1200,
            "nameEn": "Hexsoftening",
            "nameDe": "Fluchmilderung",
            "descEn": "Cursed item downsides are 10% less severe. Stacks with Mist of Mercy and Veil of Relief.",
            "descDe": "Negative Effekte von verfluchten Gegenständen sind 10% schwächer. Wirkt zusammen mit Nebel der Gnade und Schleier der Erleichterung.",
            "icon": "🌫️",
            "statKey": "dampened_curse_2"
        },
        {
            "id": 123,
            "x": -500,
            "y": 1200,
            "nameEn": "Veil of Relief",
            "nameDe": "Schleier der Erleichterung",
            "descEn": "Cursed item downsides are 15% less severe. Stacks with Mist of Mercy and Hexsoftening.",
            "descDe": "Negative Effekte von verfluchten Gegenständen sind 15% schwächer (kürzere Dauer, weniger betroffene Felder). Wirkt zusammen mit Nebel der Gnade und Fluchmilderung.",
            "icon": "🌫️",
            "statKey": "dampened_curse_3"
        },
        {
            "id": 124,
            "x": -1,
            "y": 500,
            "nameEn": "Rarity Spark",
            "nameDe": "Seltenheitsfunke",
            "descEn": "Common items have a 5% chance to be upgraded to Uncommon when granted as a reward. Stacks with Uncommon Shift and Ascending Quality.",
            "descDe": "Gewöhnliche Gegenstände haben beim Erhalt als Belohnung eine 5% Chance, auf Ungewöhnlich aufgewertet zu werden. Wirkt zusammen mit Ungewöhnliche Wandlung und Aufsteigende Qualität.",
            "icon": "⬆️",
            "statKey": "common_refinement_1"
        },
        {
            "id": 125,
            "x": -1,
            "y": 600,
            "nameEn": "Uncommon Shift",
            "nameDe": "Ungewöhnliche Wandlung",
            "descEn": "Common items have a 5% chance to be upgraded to Uncommon when granted as a reward. Stacks with Rarity Spark and Ascending Quality.",
            "descDe": "Gewöhnliche Gegenstände haben beim Erhalt als Belohnung eine 5% Chance, auf Ungewöhnlich aufgewertet zu werden. Wirkt zusammen mit Seltenheitsfunke und Aufsteigende Qualität.",
            "icon": "⬆️",
            "statKey": "common_refinement_2"
        },
        {
            "id": 126,
            "x": -1,
            "y": 700,
            "nameEn": "Ascending Quality",
            "nameDe": "Aufsteigende Qualität",
            "descEn": "Common items have a 10% chance to be upgraded to Uncommon when granted as a reward. Stacks with Rarity Spark and Uncommon Shift.",
            "descDe": "Gewöhnliche Gegenstände haben beim Erhalt als Belohnung eine 10% Chance, auf Ungewöhnlich aufgewertet zu werden. Wirkt zusammen mit Seltenheitsfunke und Ungewöhnliche Wandlung.",
            "icon": "⬆️",
            "statKey": "common_refinement_3"
        },
        {
            "id": 127,
            "x": 400,
            "y": 1200,
            "nameEn": "Pattern Whisper",
            "nameDe": "Musterflüstern",
            "descEn": "Reveal items have a 20% chance to prioritize cells in the unsolved row or column with the fewest filled cells. Stacks with Selective Insight and Horizon Tracker.",
            "descDe": "Enthüllungsgegenstände haben eine 20% Chance, Zellen in der ungelösten Zeile oder Spalte mit den wenigsten gefüllten Zellen zu priorisieren. Wirkt zusammen mit Selektive Einsicht und Horizontverfolger.",
            "icon": "🕯️",
            "statKey": "targeted_reveal_1"
        },
        {
            "id": 128,
            "x": 300,
            "y": 1200,
            "nameEn": "Selective Insight",
            "nameDe": "Selektive Einsicht",
            "descEn": "Reveal items have a 20% chance to prioritize cells in the unsolved row or column with the fewest filled cells. Stacks with Pattern Whisper and Horizon Tracker.",
            "descDe": "Enthüllungsgegenstände haben eine 20% Chance, Zellen in der ungelösten Zeile oder Spalte mit den wenigsten gefüllten Zellen zu priorisieren. Wirkt zusammen mit Musterflüstern und Horizontverfolger.",
            "icon": "🔍",
            "statKey": "targeted_reveal_2"
        },
        {
            "id": 129,
            "x": 200,
            "y": 1112,
            "nameEn": "Horizon Tracker",
            "nameDe": "Horizontverfolger",
            "descEn": "Reveal items have a 30% chance to prioritize cells in the unsolved row or column with the fewest filled cells. Stacks with Pattern Whisper and Selective Insight.",
            "descDe": "Enthüllungsgegenstände haben eine 30% Chance, Zellen in der ungelösten Zeile oder Spalte mit den wenigsten gefüllten Zellen zu priorisieren. Wirkt zusammen mit Musterflüstern und Selektive Einsicht.",
            "icon": "🔭",
            "statKey": "targeted_reveal_3"
        },
        {
            "id": 130,
            "x": -800,
            "y": 700,
            "nameEn": "Clustering Signal",
            "nameDe": "Cluster-Signal",
            "descEn": "Mark-wrong items have a 20% chance to prioritize cells in rows or columns that already have many filled cells (but are not yet complete). Stacks with Crowded Insight and Density Focus.",
            "descDe": "Markierungsgegenstände haben eine 20% Chance, Zellen in Zeilen oder Spalten mit vielen bereits gefüllten Zellen zu priorisieren (sofern diese noch nicht vollständig sind). Wirkt zusammen mit Gedrängte Einsicht und Dichtefokus.",
            "icon": "✏️",
            "statKey": "dense_marker_1"
        },
        {
            "id": 131,
            "x": -950,
            "y": 700,
            "nameEn": "Crowded Insight",
            "nameDe": "Gedrängte Einsicht",
            "descEn": "Mark-wrong items have a 20% chance to prioritize cells in rows or columns that already have many filled cells (but are not yet complete). Stacks with Clustering Signal and Density Focus.",
            "descDe": "Markierungsgegenstände haben eine 20% Chance, Zellen in Zeilen oder Spalten mit vielen bereits gefüllten Zellen zu priorisieren (sofern diese noch nicht vollständig sind). Wirkt zusammen mit Cluster-Signal und Dichtefokus.",
            "icon": "🧹",
            "statKey": "dense_marker_2"
        },
        {
            "id": 132,
            "x": -850,
            "y": 600,
            "nameEn": "Density Focus",
            "nameDe": "Dichtefokus",
            "descEn": "Mark-wrong items have a 30% chance to prioritize cells in rows or columns that already have many filled cells (but are not yet complete). Stacks with Clustering Signal and Crowded Insight.",
            "descDe": "Markierungsgegenstände haben eine 30% Chance, Zellen in Zeilen oder Spalten mit vielen bereits gefüllten Zellen zu priorisieren (sofern diese noch nicht vollständig sind). Wirkt zusammen mit Cluster-Signal und Gedrängte Einsicht.",
            "icon": "🧲",
            "statKey": "dense_marker_3"
        },
        {
            "id": 133,
            "x": 800,
            "y": 700,
            "nameEn": "Lumina Aspirant",
            "nameDe": "Lichtaspirant",
            "descEn": "15% increased chance of obtaining Reveal items as rewards. Stacks with Radiant Hunter and Beacon Pursuit.",
            "descDe": "15% erhöhte Chance, Enthüllungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Strahlender Jäger und Leuchtfeuerjagd.",
            "icon": "🕯️",
            "statKey": "seeker_of_light_1"
        },
        {
            "id": 134,
            "x": 950,
            "y": 700,
            "nameEn": "Radiant Hunter",
            "nameDe": "Strahlender Jäger",
            "descEn": "15% increased chance of obtaining Reveal items as rewards. Stacks with Lumina Aspirant and Beacon Pursuit.",
            "descDe": "15% erhöhte Chance, Enthüllungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Lichtaspirant und Leuchtfeuerjagd.",
            "icon": "🔍",
            "statKey": "seeker_of_light_2"
        },
        {
            "id": 135,
            "x": 850,
            "y": 600,
            "nameEn": "Beacon Pursuit",
            "nameDe": "Leuchtfeuerjagd",
            "descEn": "20% increased chance of obtaining Reveal items as rewards. Stacks with Lumina Aspirant and Radiant Hunter.",
            "descDe": "20% erhöhte Chance, Enthüllungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Lichtaspirant und Strahlender Jäger.",
            "icon": "🔭",
            "statKey": "seeker_of_light_3"
        },
        {
            "id": 136,
            "x": -250,
            "y": 1500,
            "nameEn": "Mistake Harvester",
            "nameDe": "Fehlerernter",
            "descEn": "15% increased chance of obtaining Mark-wrong items as rewards. Stacks with Fault Acquisition and Error Magnetism.",
            "descDe": "15% erhöhte Chance, Markierungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Fehleraneignung und Fehlermagnetismus.",
            "icon": "✏️",
            "statKey": "error_collector_1"
        },
        {
            "id": 137,
            "x": -200,
            "y": 1350,
            "nameEn": "Fault Acquisition",
            "nameDe": "Fehleraneignung",
            "descEn": "15% increased chance of obtaining Mark-wrong items as rewards. Stacks with Mistake Harvester and Error Magnetism.",
            "descDe": "15% erhöhte Chance, Markierungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Fehlerernter und Fehlermagnetismus.",
            "icon": "🧹",
            "statKey": "error_collector_2"
        },
        {
            "id": 138,
            "x": -300,
            "y": 1300,
            "nameEn": "Error Magnetism",
            "nameDe": "Fehlermagnetismus",
            "descEn": "20% increased chance of obtaining Mark-wrong items as rewards. Stacks with Mistake Harvester and Fault Acquisition.",
            "descDe": "20% erhöhte Chance, Markierungsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Fehlerernter und Fehleraneignung.",
            "icon": "🧲",
            "statKey": "error_collector_3"
        },
        {
            "id": 139,
            "x": 250,
            "y": 1500,
            "nameEn": "Scholar's Path",
            "nameDe": "Pfad des Gelehrten",
            "descEn": "15% increased chance of obtaining Tutor items as rewards. Stacks with Disciple's Growth and Academy Legacy.",
            "descDe": "15% erhöhte Chance, Tutor-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Wachstum des Schülers und Erbe der Akademie.",
            "icon": "🎓",
            "statKey": "mentors_following_1"
        },
        {
            "id": 140,
            "x": 200,
            "y": 1350,
            "nameEn": "Disciple's Growth",
            "nameDe": "Wachstum des Schülers",
            "descEn": "15% increased chance of obtaining Tutor items as rewards. Stacks with Scholar's Path and Academy Legacy.",
            "descDe": "15% erhöhte Chance, Tutor-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Pfad des Gelehrten und Erbe der Akademie.",
            "icon": "📚",
            "statKey": "mentors_following_2"
        },
        {
            "id": 141,
            "x": 300,
            "y": 1300,
            "nameEn": "Academy Legacy",
            "nameDe": "Erbe der Akademie",
            "descEn": "20% increased chance of obtaining Tutor items as rewards. Stacks with Scholar's Path and Disciple's Growth.",
            "descDe": "20% erhöhte Chance, Tutor-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Pfad des Gelehrten und Wachstum des Schülers.",
            "icon": "🏛️",
            "statKey": "mentors_following_3"
        },
        {
            "id": 142,
            "x": 800,
            "y": 1800,
            "nameEn": "Aegis Reserve",
            "nameDe": "Ägis-Reserve",
            "descEn": "15% increased chance of obtaining Shield items as rewards. Stacks with Guardian Hoard and Bulwark Treasury.",
            "descDe": "15% erhöhte Chance, Schild-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Wächterhort und Bollwerkschatzkammer.",
            "icon": "🛡️",
            "statKey": "wardens_stockpile_1"
        },
        {
            "id": 143,
            "x": 700,
            "y": 1900,
            "nameEn": "Guardian Hoard",
            "nameDe": "Wächterhort",
            "descEn": "15% increased chance of obtaining Shield items as rewards. Stacks with Aegis Reserve and Bulwark Treasury.",
            "descDe": "15% erhöhte Chance, Schild-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Ägis-Reserve und Bollwerkschatzkammer.",
            "icon": "🛡️",
            "statKey": "wardens_stockpile_2"
        },
        {
            "id": 144,
            "x": 850,
            "y": 1900,
            "nameEn": "Bulwark Treasury",
            "nameDe": "Bollwerkschatzkammer",
            "descEn": "20% increased chance of obtaining Shield items as rewards. Stacks with Aegis Reserve and Guardian Hoard.",
            "descDe": "20% erhöhte Chance, Schild-Gegenstände als Belohnung zu erhalten. Wirkt zusammen mit Ägis-Reserve und Wächterhort.",
            "icon": "🛡️",
            "statKey": "wardens_stockpile_3"
        },
        {
            "id": 145,
            "x": -800,
            "y": 1800,
            "nameEn": "Toolbelt Greed",
            "nameDe": "Werkzeuggier",
            "descEn": "15% increased chance of obtaining Utility items as rewards. Stacks with Practical Accumulation and Inventor's Cache.",
            "descDe": "15% erhöhte Chance, Nützlichkeitsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Praktische Anhäufung und Erfinderversteck.",
            "icon": "🔧",
            "statKey": "utility_hoarder_1"
        },
        {
            "id": 146,
            "x": -700,
            "y": 1900,
            "nameEn": "Practical Accumulation",
            "nameDe": "Praktische Anhäufung",
            "descEn": "15% increased chance of obtaining Utility items as rewards. Stacks with Toolbelt Greed and Inventor's Cache.",
            "descDe": "15% erhöhte Chance, Nützlichkeitsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Werkzeuggier und Erfinderversteck.",
            "icon": "🔧",
            "statKey": "utility_hoarder_2"
        },
        {
            "id": 147,
            "x": -850,
            "y": 1900,
            "nameEn": "Inventor's Cache",
            "nameDe": "Erfinderversteck",
            "descEn": "20% increased chance of obtaining Utility items as rewards. Stacks with Toolbelt Greed and Practical Accumulation.",
            "descDe": "20% erhöhte Chance, Nützlichkeitsgegenstände als Belohnung zu erhalten. Wirkt zusammen mit Werkzeuggier und Praktische Anhäufung.",
            "icon": "🔧",
            "statKey": "utility_hoarder_3"
        },
        {
            "id": 148,
            "x": -400,
            "y": 1200,
            "nameEn": "Second Wind Study",
            "nameDe": "Zweiter Lernatem",
            "descEn": "Using a Tutor item to remove a mistake also adds 30 seconds to the timer. Stacks with Temporal Recovery and Chrono Benefit.",
            "descDe": "Das Benutzen eines Tutor-Gegenstands zum Entfernen eines Fehlers fügt dem Timer zusätzlich 30 Sekunden hinzu. Wirkt zusammen mit Zeitlicher Erholung und Chrono-Vorteil.",
            "icon": "⏱️",
            "statKey": "time_well_spent_1"
        },
        {
            "id": 149,
            "x": -300,
            "y": 1200,
            "nameEn": "Temporal Recovery",
            "nameDe": "Zeitliche Erholung",
            "descEn": "Using a Tutor item to remove a mistake also adds 60 seconds to the timer. Stacks with Second Wind Study and Chrono Benefit.",
            "descDe": "Das Benutzen eines Tutor-Gegenstands zum Entfernen eines Fehlers fügt dem Timer zusätzlich 60 Sekunden hinzu. Wirkt zusammen mit Zweiter Lernatem und Chrono-Vorteil.",
            "icon": "⏱️",
            "statKey": "time_well_spent_2"
        },
        {
            "id": 150,
            "x": -200,
            "y": 1100,
            "nameEn": "Chrono Benefit",
            "nameDe": "Chrono-Vorteil",
            "descEn": "Using a Tutor item to remove a mistake also adds 90 seconds to the timer. Stacks with Second Wind Study and Temporal Recovery.",
            "descDe": "Das Benutzen eines Tutor-Gegenstands zum Entfernen eines Fehlers fügt dem Timer zusätzlich 90 Sekunden hinzu. Wirkt zusammen mit Zweiter Lernatem und Zeitlicher Erholung.",
            "icon": "⏱️",
            "statKey": "time_well_spent_3"
        },
        {
            "id": 151,
            "x": -1,
            "y": 800,
            "nameEn": "Hexguard Veil",
            "nameDe": "Hexenschutzschleier",
            "descEn": "Using a Shield item also protects you from cursed item downsides for 5 seconds. Stacks with Aegis of Silence and Null Curse Barrier.",
            "descDe": "Das Benutzen eines Schild-Gegenstands schützt dich außerdem für 5 Sekunden vor negativen Effekten verfluchter Gegenstände. Wirkt zusammen mit Ägis der Stille und Fluch-Null-Barriere.",
            "icon": "🛡️",
            "statKey": "cursed_ward_1"
        },
        {
            "id": 152,
            "x": -1,
            "y": 900,
            "nameEn": "Aegis of Silence",
            "nameDe": "Ägis der Stille",
            "descEn": "Using a Shield item also protects you from cursed item downsides for 5 seconds. Stacks with Hexguard Veil and Null Curse Barrier.",
            "descDe": "Das Benutzen eines Schild-Gegenstands schützt dich außerdem für 5 Sekunden vor negativen Effekten verfluchter Gegenstände. Wirkt zusammen mit Hexenschutzschleier und Fluch-Null-Barriere.",
            "icon": "🛡️",
            "statKey": "cursed_ward_2"
        },
        {
            "id": 153,
            "x": 100,
            "y": 1000,
            "nameEn": "Null Curse Barrier",
            "nameDe": "Fluch-Null-Barriere",
            "descEn": "Using a Shield item also protects you from cursed item downsides for 5 seconds. Stacks with Hexguard Veil and Aegis of Silence.",
            "descDe": "Das Benutzen eines Schild-Gegenstands schützt dich außerdem für 5 Sekunden vor negativen Effekten verfluchter Gegenstände. Wirkt zusammen mit Hexenschutzschleier und Ägis der Stille.",
            "icon": "🛡️",
            "statKey": "cursed_ward_3"
        },
        {
            "id": 154,
            "x": 180,
            "y": 900,
            "nameEn": "Keystone: Veil of Purity",
            "nameDe": "Schlüsselfertigkeit: Schleier der Reinheit",
            "descEn": "The first cursed item used each level has no downside. Any further use of a cursed item has double the downside.",
            "descDe": "Der erste verfluchte Gegenstand pro Level hat keine negativen Effekte. Jeder weitere verfluchte Gegenstand hat doppelt so starke negative Effekte.",
            "icon": "✨",
            "statKey": "keystone_veil_of_purity"
        },
        {
            "id": 155,
            "x": 750,
            "y": 600,
            "nameEn": "Keystone: Blinding Truth",
            "nameDe": "Schlüsselfertigkeit: Blendende Wahrheit",
            "descEn": "Reveal items are 50% more effective. Mark-wrong items cannot be used.",
            "descDe": "Enthüllungsgegenstände sind 50% effektiver. Markierungsgegenstände können nicht benutzt werden.",
            "icon": "💡",
            "statKey": "keystone_blinding_truth"
        },
        {
            "id": 156,
            "x": -100,
            "y": 1000,
            "nameEn": "Keystone: Apex Collector",
            "nameDe": "Schlüsselfertigkeit: Spitzenwert-Sammler",
            "descEn": "Codex of Completion can now be obtained as a bonus reward with a drop rate of 3%. Items below Epic grade cannot be obtained as rewards.",
            "descDe": "Kodex der Fertigstellung kann nun als Bonusbelohnung erhalten werden mit einer Chance von 3%. Gegenstände unterhalb der Epischen Qualitätsstufe können nicht als Belohnungen erhalten werden.",
            "icon": "🌟",
            "statKey": "keystone_apex_collector"
        },
        {
            "id": 157,
            "x": 420,
            "y": 2000,
            "nameEn": "Keystone: Countdown Crisis",
            "nameDe": "Schlüsselfertigkeit: Countdown-Krise",
            "descEn": "Timer items reduce the timer instead of increasing it. Reveal items are 5 times as strong while the timer is below 3 minutes.",
            "descDe": "Timer-Gegenstände reduzieren den Timer anstatt ihn zu erhöhen. Enthüllungsgegenstände sind 5-mal so stark, während der Timer unter 3 Minuten liegt.",
            "icon": "⚡",
            "statKey": "keystone_countdown_crisis"
        },
        {
            "id": 158,
            "x": 420,
            "y": 1300,
            "nameEn": "Keystone: Iron Doctrine",
            "nameDe": "Schlüsselfertigkeit: Eiserne Doktrin",
            "descEn": "Shield items cannot be used. Each mistake costs 60 extra seconds. Tutor and Timer items have 300% increased effectiveness.",
            "descDe": "Schild-Gegenstände können nicht benutzt werden. Jeder Fehler kostet 60 zusätzliche Sekunden. Tutor- und Timer-Gegenstände haben 300% erhöhte Effektivität.",
            "icon": "⚔️",
            "statKey": "keystone_iron_doctrine"
        },
        {
            "id": 159,
            "x": 180,
            "y": 1650,
            "nameEn": "Keystone: Curse Embrace",
            "nameDe": "Schlüsselfertigkeit: Fluchsumarmung",
            "descEn": "You are immune to cursed item downsides. All non-cursed items are 50% weaker.",
            "descDe": "Du bist immun gegen negative Effekte verfluchter Gegenstände. Alle nicht-verfluchten Gegenstände sind 50% schwächer.",
            "icon": "👁️",
            "statKey": "keystone_curse_embrace"
        },
        {
            "id": 160,
            "x": 400,
            "y": 1650,
            "nameEn": "Keystone: The Witch",
            "nameDe": "Schlüsselfertigkeit: Die Hexe",
            "descEn": "Enables The Witch as an item reward. Using The Witch grants immunity to all cursed item downsides for 60 seconds, but reduces the timer by 10 minutes.",
            "descDe": "Ermöglicht Die Hexe als Gegenstandsbelohnung. Das Benutzen der Hexe gewährt 60 Sekunden Immunität gegen alle negativen Effekte verfluchter Gegenstände, reduziert aber den Timer um 10 Minuten.",
            "icon": "🧙",
            "statKey": "keystone_the_witch"
        },
        {
            "id": 161,
            "x": 1,
            "y": 1400,
            "nameEn": "Keystone: Golden Clock",
            "nameDe": "Schlüsselfertigkeit: Goldene Uhr",
            "descEn": "Enables the Golden Clock as an item reward. The Golden Clock stops the timer — it can no longer decrease, only increase. Timer items are 100% more effective for the remainder of the level. However, the player may only make 3 more mistakes before the level fails.",
            "descDe": "Ermöglicht die Goldene Uhr als Gegenstandsbelohnung. Die Goldene Uhr stoppt den Timer — er kann nicht mehr sinken, nur noch steigen. Timer-Gegenstände sind für den Rest des Levels 100% effektiver. Allerdings darf der Spieler nur noch 3 weitere Fehler machen, bevor das Level fehlschlägt.",
            "icon": "🕰️",
            "statKey": "keystone_golden_clock"
        },
        {
            "id": 162,
            "x": 280,
            "y": 1050,
            "nameEn": "Keystone: Shadow Seal",
            "nameDe": "Schlüsselfertigkeit: Schattensiegel",
            "descEn": "Enables the Shadow Seal as an item reward. Using the Shadow Seal permanently hides all row and column clues for the rest of the level, but instantly marks 75% of all wrong empty tiles on the entire board. Lowers the timer to 5 minutes.",
            "descDe": "Ermöglicht das Schattensiegel als Gegenstandsbelohnung. Das Benutzen des Schattensiegels versteckt dauerhaft alle Zeilen- und Spaltenhinweise für den Rest des Levels, markiert aber sofort 75% aller falschen leeren Felder auf dem gesamten Spielfeld. Reduziert die verbleibende Zeit auf 5 Minuten.",
            "icon": "🌑",
            "statKey": "keystone_shadow_seal"
        },
        {
            "id": 164,
            "x": -400,
            "y": 850,
            "nameEn": "Pearl of Haste",
            "nameDe": "Perle der Schnelligkeit",
            "descEn": "Enables the Pearl of Haste as an item reward. Using a Pearl of Haste reduces the cooldown of your first active class skill to 1 second.",
            "descDe": "Ermöglicht die Perle der Schnelligkeit als Gegenstandsbelohnung. Das Benutzen einer Perle der Schnelligkeit reduziert die Abklingzeit deiner ersten aktiven Klassenfähigkeit auf 1 Sekunde.",
            "icon": "🔵",
            "statKey": "pearl_of_haste"
        },
        {
            "id": 165,
            "x": 400,
            "y": 850,
            "nameEn": "Pearl of Swiftness",
            "nameDe": "Perle der Gewandheit",
            "descEn": "Enables the Pearl of Swiftness as an item reward. Using a Pearl of Swiftness reduces the cooldown of your second active class skill to 1 second.",
            "descDe": "Ermöglicht die Perle der Gewandtheit als Gegenstandsbelohnung. Das Benutzen einer Perle der Gewandtheit setzt die Abklingzeit deiner zweiten aktiven Klassenfähigkeit auf 1 Sekunde.",
            "icon": "🟣",
            "statKey": "pearl_of_swiftness"
        },
        {
            "id": 166,
            "x": 1,
            "y": 1800,
            "nameEn": "Grand Pearl",
            "nameDe": "Große Perle",
            "descEn": "Enables the Grand Pearl as an item reward. Using a Grand Pearl reduces the cooldowns of both active class skills to 1 second.",
            "descDe": "Ermöglicht die Große Perle als Gegenstandsbelohnung. Das Benutzen einer Großen Perle setzt die Abklingzeit beider aktiver Klassenfähigkeiten auf 1 Sekunde.",
            "icon": "⚪",
            "statKey": "grand_pearl"
        },
        {
            "id": 167,
            "x": 400,
            "y": 1,
            "nameEn": "Grid Awareness",
            "nameDe": "Gitterbewusstsein",
            "descEn": "Grids are now categorized based on their sizes:\nSmall: Less than 100 cells.\nMedium: 100 to 199 cells.\nLarge: 200 to 399 cells.\nMassive: 400 or more cells.\n\nIn large and massive grids one random incorrect cell is now a Lucky Tile. Correctly marking it as incorrect grants a random item.",
            "descDe": "Gitter werden jetzt auf Basis ihrer Größe kategorisiert:\nKlein: Weniger als 100 Zellen.\nMittel: 100 bis 199 Zellen.\nGroß: 200 bis 399 Zellen.\nMassiv: 400 oder mehr Zellen\n\nIn großen und massiven Gittern ist eine zufällige falsche Zelle ein Glücksfeld. Wer es korrekt als falsch markiert, erhält einen zufälligen Gegenstand.",
            "icon": "🎯",
            "statKey": "grid_awareness"
        },
        {
            "id": 168,
            "x": 1100,
            "y": -400,
            "nameEn": "Probabilistic Start",
            "nameDe": "Probabilistischer Start",
            "descEn": "10% chance to reveal 1 correct filled cell at the start of each level. Rolls independently from Stochastic Awakening and Calculated Genesis.",
            "descDe": "10% Chance, zu Beginn jedes Levels 1 korrekte gefüllte Zelle aufzudecken. Wirkt unabhängig von Stochastisches Erwachen und Berechneter Ursprung.",
            "icon": "🎲",
            "statKey": "probabilistic_start_1"
        },
        {
            "id": 169,
            "x": 1800,
            "y": -800,
            "nameEn": "Stochastic Awakening",
            "nameDe": "Stochastisches Erwachen",
            "descEn": "15% chance to reveal 1 correct filled cell at the start of each level. Rolls independently from Probabilistic Start and Calculated Genesis.",
            "descDe": "15% Chance, zu Beginn jedes Levels 1 korrekte gefüllte Zelle aufzudecken. Wirkt unabhängig von Probabilistischer Start und Berechneter Ursprung.",
            "icon": "🎲",
            "statKey": "probabilistic_start_2"
        },
        {
            "id": 170,
            "x": 2500,
            "y": -1200,
            "nameEn": "Calculated Genesis",
            "nameDe": "Berechneter Ursprung",
            "descEn": "20% chance to reveal 1 correct filled cell at the start of each level. Rolls independently from Probabilistic Start and Stochastic Awakening.",
            "descDe": "20% Chance, zu Beginn jedes Levels 1 korrekte gefüllte Zelle aufzudecken. Wirkt unabhängig von Probabilistischer Start und Stochastisches Erwachen.",
            "icon": "🎲",
            "statKey": "probabilistic_start_3"
        },
        {
            "id": 171,
            "x": 1100,
            "y": 400,
            "nameEn": "Fault Sensing",
            "nameDe": "Fehlersinn",
            "descEn": "10% chance to mark 1 incorrect empty cell at the start of each level. Rolls independently from Error Guidance and Precision Insight.",
            "descDe": "10% Chance, zu Beginn jedes Levels 1 falsche leere Zelle zu markieren. Wirkt unabhängig von Fehlerführung und Präzisionsblick.",
            "icon": "❌",
            "statKey": "error_elimination_1"
        },
        {
            "id": 172,
            "x": 1800,
            "y": 800,
            "nameEn": "Error Guidance",
            "nameDe": "Fehlerführung",
            "descEn": "15% chance to mark 1 incorrect empty cell at the start of each level. Rolls independently from Fault Sensing and Precision Insight.",
            "descDe": "15% Chance, zu Beginn jedes Levels 1 falsche leere Zelle zu markieren. Wirkt unabhängig von Fehlersinn und Präzisionsblick.",
            "icon": "❌",
            "statKey": "error_elimination_2"
        },
        {
            "id": 173,
            "x": 2500,
            "y": 1200,
            "nameEn": "Precision Insight",
            "nameDe": "Präzisionsblick",
            "descEn": "20% chance to mark 1 incorrect empty cell at the start of each level. Rolls independently from Fault Sensing and Error Guidance.",
            "descDe": "20% Chance, zu Beginn jedes Levels 1 falsche leere Zelle zu markieren. Wirkt unabhängig von Fehlersinn und Fehlerführung.",
            "icon": "❌",
            "statKey": "error_elimination_3"
        },
        {
            "id": 174,
            "x": 1200,
            "y": 1,
            "nameEn": "Time Reprieve",
            "nameDe": "Zeitaufschub",
            "descEn": "Gain 60 additional seconds at the start of each level. Stacks with other time extension bonuses.",
            "descDe": "Erhalte zu Beginn jedes Levels 60 zusätzliche Sekunden. Summiert sich mit anderen Zeitverlängerungsboni.",
            "icon": "⏰",
            "statKey": "extended_session_1"
        },
        {
            "id": 175,
            "x": 2000,
            "y": -1,
            "nameEn": "Temporal Extension",
            "nameDe": "Zeitverlängerung",
            "descEn": "Gain 2 additional minutes at the start of each level. Stacks with other time extension bonuses.",
            "descDe": "Erhalte zu Beginn jedes Levels 2 zusätzliche Minuten. Summiert sich mit anderen Zeitverlängerungsboni.",
            "icon": "⏰",
            "statKey": "extended_session_2"
        },
        {
            "id": 176,
            "x": 2800,
            "y": 1,
            "nameEn": "Chrono Surplus",
            "nameDe": "Chrono-Überschuss",
            "descEn": "Gain 3 additional minutes at the start of each level. Stacks with other time extension bonuses.",
            "descDe": "Erhalte zu Beginn jedes Levels 3 zusätzliche Minuten. Summiert sich mit anderen Zeitverlängerungsboni.",
            "icon": "⏰",
            "statKey": "extended_session_3"
        },
        {
            "id": 189,
            "x": 400,
            "y": -100,
            "nameEn": "Lucky Foundations",
            "nameDe": "Glücksgrundlage",
            "descEn": "Large and massive grids have a 10% chance of having an additional Lucky Tile. This stacks additively with other Lucky Tile bonuses.",
            "descDe": "Große und massive Gitter haben eine 10% Chance ein weiteres Glücksfeld zu haben. Dies summiert sich mit anderen Glücksfeld-Boni.",
            "icon": "🍀",
            "statKey": "fortunes_tile_1"
        },
        {
            "id": 190,
            "x": 350,
            "y": -200,
            "nameEn": "Fortune's Growth",
            "nameDe": "Wachsendes Glück",
            "descEn": "Large and massive grids have a 15% chance of having an additional Lucky Tile. This stacks additively with other Lucky Tile bonuses.",
            "descDe": "Große und massive Gitter haben eine 15% Chance ein weiteres Glücksfeld zu haben. Dies summiert sich mit anderen Glücksfeld-Boni.",
            "icon": "🍀",
            "statKey": "fortunes_tile_2"
        },
        {
            "id": 191,
            "x": 300,
            "y": -100,
            "nameEn": "Blessing of Fortune",
            "nameDe": "Segen des Glücks",
            "descEn": "Large and massive grids have a 25% chance of having an additional Lucky Tile. This stacks additively with other Lucky Tile bonuses.",
            "descDe": "Große und massive Gitter haben eine 25% Chance ein weiteres Glücksfeld zu haben. Dies summiert sich mit anderen Glücksfeld-Boni.",
            "icon": "🍀",
            "statKey": "fortunes_tile_3"
        },
        {
            "id": 192,
            "x": 400,
            "y": 100,
            "nameEn": "Lucky Offering",
            "nameDe": "Glücksangebot",
            "descEn": "Revealing a Lucky Tile has 10% chance of granting an additional item. This stacks additively with other Lucky Tile reward bonuses.",
            "descDe": "Das Enthüllen eines Glücksfelds hat eine 10% Chance einen weiteren Gegenstand zu gewähren. Dies summiert sich mit anderen Glücksfeld-Belohnungsboni.",
            "icon": "🎁",
            "statKey": "generous_fortune_1"
        },
        {
            "id": 193,
            "x": 350,
            "y": 200,
            "nameEn": "Fortune’s Bounty",
            "nameDe": "Glücksfund",
            "descEn": "Revealing a Lucky Tile has 15% chance of granting an additional item. This stacks additively with other Lucky Tile reward bonuses.",
            "descDe": "Das Enthüllen eines Glücksfelds hat eine 15% Chance einen weiteren Gegenstand zu gewähren. Dies summiert sich mit anderen Glücksfeld-Belohnungsboni.",
            "icon": "🎁",
            "statKey": "generous_fortune_2"
        },
        {
            "id": 194,
            "x": 300,
            "y": 100,
            "nameEn": "Overflowing Fortune",
            "nameDe": "Überfließendes Glück",
            "descEn": "Revealing a Lucky Tile has 25% chance of granting an additional item. This stacks additively with other Lucky Tile reward bonuses.",
            "descDe": "Das Enthüllen eines Glücksfelds hat eine 25% Chance einen weiteren Gegenstand zu gewähren. Dies summiert sich mit anderen Glücksfeld-Belohnungsboni.",
            "icon": "🎁",
            "statKey": "generous_fortune_3"
        },
        {
            "id": 195,
            "x": 3700,
            "y": 100,
            "nameEn": "Timed Stasis",
            "nameDe": "Zeitstase",
            "descEn": "Every 10 minutes the level freezes for 1 seconds.",
            "descDe": "Alle 10 Minuten friert das Level für 1 Sekunde ein.",
            "icon": "⏸️",
            "statKey": "timed_stasis_1"
        },
        {
            "id": 196,
            "x": 3575,
            "y": 125,
            "nameEn": "Temporal Suspension",
            "nameDe": "Zeitliche Aussetzung",
            "descEn": "Increases the freeze duration by 0.5 seconds.",
            "descDe": "Erhöt die Einfrier - Zeit um 0.5 Sekunden.",
            "icon": "⏸️",
            "statKey": "timed_stasis_2"
        },
        {
            "id": 197,
            "x": 3650,
            "y": 200,
            "nameEn": "Chrono Freeze",
            "nameDe": "Chronofrost",
            "descEn": "Increases the freeze duration by 0.5 seconds.",
            "descDe": "Erhöt die Einfrier - Zeit um 0.5 Sekunden.",
            "icon": "⏸️",
            "statKey": "timed_stasis_3"
        },
        {
            "id": 201,
            "x": 2900,
            "y": -100,
            "nameEn": "Emergency Scan",
            "nameDe": "Notfall-Scan",
            "descEn": "When the timer drops to 5 minutes or below for the first time in a level, a Field Scan of the entire grid is triggered, lasting 2 seconds.",
            "descDe": "Wenn der Timer zum ersten Mal auf 5 Minuten oder darunter fällt, wird ein Feldscan des gesamten Gitters ausgelöst, der 2 Sekunden anhält.",
            "icon": "🚨",
            "statKey": "emergency_scan_1"
        },
        {
            "id": 202,
            "x": 2800,
            "y": -200,
            "nameEn": "Critical Scan Extension",
            "nameDe": "Kritische Scan-Verlängerung",
            "descEn": "Increases the Emergency Scan duration by 1 second. Stacks with Overload Scan.",
            "descDe": "Erhöht die Dauer des Notfall-Scans um 1 Sekunde. Wirkt zusammen mit Überlastungs-Scan.",
            "icon": "🚨",
            "statKey": "emergency_scan_2"
        },
        {
            "id": 203,
            "x": 2700,
            "y": -100,
            "nameEn": "Overload Scan",
            "nameDe": "Überlastungs-Scan",
            "descEn": "Increases the Emergency Scan duration by 2 seconds. Stacks with Critical Scan Extension.",
            "descDe": "Erhöht die Dauer des Notfall-Scans um 2 Sekunden. Wirkt zusammen mit Kritische Scan-Verlängerung.",
            "icon": "🚨",
            "statKey": "emergency_scan_3"
        },
        {
            "id": 210,
            "x": 2900,
            "y": -600,
            "nameEn": "Blackout Ward",
            "nameDe": "Verdunklungsschutz",
            "descEn": "30% chance to be protected against row and column blackout effects from cursed items.",
            "descDe": "30% Chance, gegen Effekte verfluchter Gegenstände geschützt zu sein, die Zeilen- oder Spaltenhinweise verstecken.",
            "icon": "🌑",
            "statKey": "blackout_ward_1"
        },
        {
            "id": 211,
            "x": 2800,
            "y": -650,
            "nameEn": "Shadow Resistance",
            "nameDe": "Schattenresistenz",
            "descEn": "Increases the Blackout Ward protection chance by 10%. Stacks with Curse Immunity.",
            "descDe": "Erhöht die Schutzchance des Verdunklungsschutzes um 10%. Wirkt zusammen mit Fluchimmunität.",
            "icon": "🌑",
            "statKey": "blackout_ward_2"
        },
        {
            "id": 212,
            "x": 2700,
            "y": -600,
            "nameEn": "Curse Immunity",
            "nameDe": "Fluchimmunität",
            "descEn": "Increases the Blackout Ward protection by 20%. Stacks with Shadow Resistance.",
            "descDe": "Erhöht die Schutzchance des Verdunklungsschutzes um 20%. Wirkt zusammen mit Schattenresistenz.",
            "icon": "🌑",
            "statKey": "blackout_ward_3"
        },
        {
            "id": 213,
            "x": 2900,
            "y": 600,
            "nameEn": "Integrity Shield",
            "nameDe": "Integritätsschild",
            "descEn": "30% chance to be protected from filled row or column removal effects from cursed items.",
            "descDe": "30% Chance, gegen Effekte verfluchter Gegenstände geschützt zu sein, die gefüllte Zeilen oder Spalten entfernen.",
            "icon": "🔒",
            "statKey": "removal_ward_1"
        },
        {
            "id": 214,
            "x": 2800,
            "y": 550,
            "nameEn": "Structural Safeguard",
            "nameDe": "Strukturschutz",
            "descEn": "Integrity Shield has 10% increased chance.",
            "descDe": "Integritätsschild hat eine um 10% erhöhte Chance.",
            "icon": "🔒",
            "statKey": "removal_ward_2"
        },
        {
            "id": 215,
            "x": 2900,
            "y": 500,
            "nameEn": "Removal Ward",
            "nameDe": "Entfernungsschutz",
            "descEn": "Integrity Shield has 10% increased chance.",
            "descDe": "Integritätsschild hat eine um 20% erhöhte Chance.",
            "icon": "🔒",
            "statKey": "removal_ward_3"
        },
        {
            "id": 216,
            "x": 1300,
            "y": 100,
            "nameEn": "Future Glimpse",
            "nameDe": "Zukunftsblick",
            "descEn": "For the first 30 seconds of a level the level completion text is already shown.",
            "descDe": "Der Abschlusstext wird schon während des Levels für die ersten 30 Sekunden angezeigt.",
            "icon": "📋",
            "statKey": "completion_glimpse_1"
        },
        {
            "id": 217,
            "x": 1400,
            "y": 100,
            "nameEn": "Foreseen Outcome",
            "nameDe": "Vorhergesehenes Ergebnis",
            "descEn": "Increases the time that the completion text is shown by 30 seconds. Stacks with Vision of Completion.",
            "descDe": "Erhöht die Dauer, die der Abschlusstext bereits während des Levels angezeigt wird, um 30 Sekunden. Wirkt zusammen mit Vision des Abschlusses.",
            "icon": "📋",
            "statKey": "completion_glimpse_2"
        },
        {
            "id": 218,
            "x": 1350,
            "y": 200,
            "nameEn": "Vision of Completion",
            "nameDe": "Vision des Abschlusses",
            "descEn": "Increases the time that the completion text is shown by 30 seconds. Stacks with Foreseen Outcome.",
            "descDe": "Erhöht die Dauer, die der Abschlusstext bereits während des Levels angezeigt wird, um 30 Sekunden. Wirkt zusammen mit Vorhergesehenes Ergebnis.",
            "icon": "📋",
            "statKey": "completion_glimpse_3"
        },
        {
            "id": 219,
            "x": 2100,
            "y": 100,
            "nameEn": "Keystone: Law of Large Numbers",
            "nameDe": "Schlüsselfertigkeit: Gesetz der Großen Zahlen",
            "descEn": "Every 5 minutes, automatically reveal one row and column with fewer than 2 correct filled cells. This effect does not trigger in the last 15 minutes of a level.",
            "descDe": "Alle 5 Minuten wird automatisch eine Zeile oder Spalte mit weniger als 2 korrekt gefüllten Zellen aufgedeckt. Dieser Effekt löst in den letzten 15 Minuten eines Levels nicht aus.",
            "icon": "📉",
            "statKey": "keystone_law_of_large_numbers"
        },
        {
            "id": 220,
            "x": 800,
            "y": 300,
            "nameEn": "Keystone: Null Hypothesis",
            "nameDe": "Schlüsselfertigkeit: Nullhypothese",
            "descEn": "At the start of each level, all incorrect empty cells in the row and column with the fewest filled cells are automatically marked. You cannot gain mistake shields of any kind.",
            "descDe": "Zu Beginn jedes Levels werden alle falschen leeren Zellen in der Zeile und Spalte mit den wenigsten gefüllten Zellen automatisch markiert. Du kannst keine Fehlerschilde jeglicher Art erhalten.",
            "icon": "🔬",
            "statKey": "keystone_null_hypothesis"
        },
        {
            "id": 221,
            "x": 1350,
            "y": -300,
            "nameEn": "Keystone: Variance Collapse",
            "nameDe": "Schlüsselfertigkeit: Varianzkollaps",
            "descEn": "Lucky Tiles appear in all grids regardless of size. Revealing a Lucky Tile reduces the Timer by 10 minutes.",
            "descDe": "Glücksfelder erscheinen in allen Gittern unabhängig von der Größe. Das Enthüllen eines Glücksfelds reduziert den Timer um 10 Minuten.",
            "icon": "💥",
            "statKey": "keystone_variance_collapse"
        },
        {
            "id": 222,
            "x": 2550,
            "y": -1050,
            "nameEn": "Sample Efficiency",
            "nameDe": "Stichprobeneffizienz",
            "descEn": "Correctly filling 20 cells in a row without a mistake reveals 1 random correctly filled cell.",
            "descDe": "20 korrekt ausgefüllte Zellen in Folge ohne Fehler decken 1 zufällige korrekte gefüllte Zelle auf.",
            "icon": "📈",
            "statKey": "sample_efficiency_1"
        },
        {
            "id": 223,
            "x": 2600,
            "y": -900,
            "nameEn": "Improved Sample Efficiency",
            "nameDe": "Verbesserte Stichprobeneffizienz",
            "descEn": "Reduces the amount of required correctly filled cells for Sample Efficiency without mistakes by 2. Stacks with Advanced Sample Efficiency.",
            "descDe": "Reduziert die Anzahl der benötigten in Folge richtig ausgefüllten Zellen für Stichprobeneffizienz ohne Fehler um 2. Summiert sich mit Erweiterte Stichprobeneffizienz.",
            "icon": "📈",
            "statKey": "sample_efficiency_2"
        },
        {
            "id": 224,
            "x": 2650,
            "y": -796,
            "nameEn": "Advanced Sample Efficiency",
            "nameDe": "Erweiterte Stichprobeneffizienz",
            "descEn": "Reduces the amount of required correctly filled cells for Sample Efficiency without mistakes by 3. Stacks with Improved Sample Efficiency.",
            "descDe": "Reduziert die Anzahl der benötigten in Folge richtig ausgefüllten Zellen für Stichprobeneffizienz ohne Fehler um 3. Summiert sich mit Verbesserte Stichprobeneffizienz.",
            "icon": "📈",
            "statKey": "sample_efficiency_3"
        },
        {
            "id": 225,
            "x": 2900,
            "y": -500,
            "nameEn": "Pattern Momentum",
            "nameDe": "Musterdynamik",
            "descEn": "Each time you complete a full row or column, gain 5 seconds.",
            "descDe": "Jedes Mal, wenn du eine vollständige Zeile oder Spalte abschließt, erhältst du 5 Sekunden.",
            "icon": "📉",
            "statKey": "regression_reward_1"
        },
        {
            "id": 226,
            "x": 2800,
            "y": -450,
            "nameEn": "Structural Rhythm",
            "nameDe": "Strukturrhythmus",
            "descEn": "Increases the time gained from completing a full row or column by 5 seconds.",
            "descDe": "Erhöht die Zeit, die du beim Abschließen einer vollständigen Zeile oder Spalte erhältst, um 5 Sekunden.",
            "icon": "📉",
            "statKey": "regression_reward_2"
        },
        {
            "id": 227,
            "x": 2700,
            "y": -500,
            "nameEn": "Completion Surge",
            "nameDe": "Abschlussschub",
            "descEn": "Increases the time gained from completing a full row or column by 5 seconds.",
            "descDe": "Erhöht die Zeit, die du beim Abschließen einer vollständigen Zeile oder Spalte erhältst, um 5 Sekunden.",    
            "icon": "📉",
            "statKey": "regression_reward_3"
        },
        {
            "id": 228,
            "x": 250,
            "y": -200,
            "nameEn": "Fate's Whisper",
            "nameDe": "Flüstern des Schicksals",
            "descEn": "One Lucky Tile is highlighted until revealed. This stacks additively with Guided Serendipity.",
            "descDe": "Ein Glücksfeld wird markiert bis es aufgedeckt wird. Dies summiert sich mit Gelenkter Zufall.",
            "icon": "🔎",
            "statKey": "outlier_detection_1"
        },
        {
            "id": 229,
            "x": 250,
            "y": 200,
            "nameEn": "Guided Serendipity",
            "nameDe": "Gelenkter Zufall",
            "descEn": "One Lucky Tile is highlighted until revealed. This stacks additively with Fate's Whisper.",
            "descDe": "Ein Glücksfeld wird markiert bis es aufgedeckt wird. Dies summiert sich mit Flüstern des Schicksals.",
            "icon": "🔎",
            "statKey": "outlier_detection_2"
        },
        {
            "id": 231,
            "x": 3800,
            "y": 1,
            "nameEn": "Confidence Interval",
            "nameDe": "Konfidenzintervall",
            "descEn": "After making a mistake, gain a 1-second window during which your next mistake is ignored. This cannot occur twice in a row.",
            "descDe": "Nach einem Fehler hast du ein 1-Sekunden-Fenster, in dem dein nächster Fehler ignoriert wird. Dies kann nicht zweimal hintereinander auftreten.",
            "icon": "📐",
            "statKey": "confidence_interval_1"
        },
        {
            "id": 232,
            "x": 3900,
            "y": -100,
            "nameEn": "Recovery Window",
            "nameDe": "Erholungsfenster",
            "descEn": "The duration, during which your next mistake is ignored, is increased by 1 second.",
            "descDe": "Die Dauer, in dem dein nächster Fehler ignoriert wird, wird um 1 Sekunde erhöht.",
            "icon": "📐",
            "statKey": "confidence_interval_2"
        },
        {
            "id": 233,
            "x": 4000,
            "y": 1,
            "nameEn": "Forgiveness Threshold",
            "nameDe": "Fehlertoleranz",
            "descEn": "The duration, during which your next mistake is ignored, is increased by 1 second.",
            "descDe": "Die Dauer, in dem dein nächster Fehler ignoriert wird, wird um 1 Sekunde erhöht.",
            "icon": "📐",
            "statKey": "confidence_interval_3"
        },
        {
            "id": 234,
            "x": 1800,
            "y": -700,
            "nameEn": "Core Insight",
            "nameDe": "Kernblick",
            "descEn": "At the start of each level, the correct filled cell closest to the centre of the grid is revealed.",
            "descDe": "Zu Beginn jedes Levels wird die korrekte gefüllte Zelle aufgedeckt, die der Gittermitte am nächsten liegt.",
            "icon": "🎯",
            "statKey": "central_tendency_1"
        },
        {
            "id": 235,
            "x": 1700,
            "y": -700,
            "nameEn": "Centered Vision",
            "nameDe": "Zentrierte Sicht",
            "descEn": "At the start of each level, 1 more correct filled cell near the centre of the grid is revealed (stacks with Core Insight and Heart of the Grid).",
            "descDe": "Zu Beginn jedes Levels wird 1 weitere korrekte gefüllte Zelle nahe der Gittermitte aufgedeckt (stapelt sich mit Kernblick und Herz des Gitters).",
            "icon": "🎯",
            "statKey": "central_tendency_2"
        },
        {
            "id": 236,
            "x": 1750,
            "y": -600,
            "nameEn": "Heart of the Grid",
            "nameDe": "Herz des Gitters",
            "descEn": "At the start of each level, 1 more correct filled cell near the centre of the grid is revealed (stacks with Core Insight and Centered Vision).",
            "descDe": "Zu Beginn jedes Levels wird 1 weitere korrekte gefüllte Zelle nahe der Gittermitte aufgedeckt (wirkt zusammen mit Kernblick und Zentrierte Sicht).",
            "icon": "🎯",
            "statKey": "central_tendency_3"
        },
        {
            "id": 237,
            "x": 1102,
            "y": 300,
            "nameEn": "Pattern Analysis",
            "nameDe": "Musteranalyse",
            "descEn": "At the start of each level, the row and column with the most filled cells each have 1 incorrect empty cell marked.",
            "descDe": "Zu Beginn jedes Levels wird in der Zeile und Spalte mit den meisten gefüllten Zellen je 1 falsche leere Zelle markiert.",
            "icon": "🗃️",
            "statKey": "density_mapping_1"
        },
        {
            "id": 238,
            "x": 1000,
            "y": 230,
            "nameEn": "Cluster Detection",
            "nameDe": "Clustererkennung",
            "descEn": "Pattern Analysis marks one additional incorrect empty cell in the row or column with the most filled cells. Stacks with Density Mapping.",
            "descDe": "Musteranalyse markiert eine zusätzliche falsche leere Zelle in der Zeile oder Spalte mit den meisten gefüllten Zellen. Wirkt zusammen mit Dichtekartierung.",
            "icon": "🗃️",
            "statKey": "density_mapping_2"
        },
        {
            "id": 239,
            "x": 1160,
            "y": 230,
            "nameEn": "Density Mapping",
            "nameDe": "Dichtekartierung",
            "descEn": "Pattern Analysis marks one additional incorrect empty cell in the two rows and two columns with the most filled cells. Stacks with Cluster Detection.",
            "descDe": "Musteranalyse markiert eine zusätzliche falsche leere Zelle in den zwei Zeilen und zwei Spalten mit den meisten gefüllten Zellen. Wirkt zusammen mit Clustererkennung.",
            "icon": "🗃️",
            "statKey": "density_mapping_3"
        },
        {
            "id": 240,
            "x": 900,
            "y": 400,
            "nameEn": "Low Information Zone",
            "nameDe": "Informationsarme Zone",
            "descEn": "At the start of each level, automatically mark 1 incorrect empty cell in the row or column with the fewest filled cells.",
            "descDe": "Zu Beginn jedes Levels werden automatisch 1 falsche leeren Zellen in der Zeile oder Spalte mit den wenigsten gefüllten Zellen markiert.",
            "icon": "🏜️",
            "statKey": "sparse_region_1"
        },
        {
            "id": 241,
            "x": 1000,
            "y": 500,
            "nameEn": "Weak Signal Exploit",
            "nameDe": "Schwaches Signal",
            "descEn": "Low Information Zone marks 1 additional incorrect empty cell in the row or column with the fewest filled cells. Stacks with Sparse Region.",
            "descDe": "Informationsarme Zone markiert 1 zusätzliche falsche leere Zelle in der Zeile oder Spalte mit den wenigsten gefüllten Zellen. Wirkt zusammen mit Dünnbesiedelte Region.",
            "icon": "🏜️",
            "statKey": "sparse_region_2"
        },
        {
            "id": 242,
            "x": 800,
            "y": 500,
            "nameEn": "Sparse Region",
            "nameDe": "Dünnbesiedelte Region",
            "descEn": "Low Information Zone marks 1 additional incorrect empty cell in the row or column with the fewest filled cells. Stacks with Weak Signal Exploit.",
            "descDe": "Informationsarme Zone markiert 1 zusätzliche falsche leere Zelle in der Zeile oder Spalte mit den wenigsten gefüllten Zellen. Wirkt zusammen mit Schwaches Signal.",
            "icon": "🏜️",
            "statKey": "sparse_region_3"
        },
        {
            "id": 243,
            "x": 1900,
            "y": 100,
            "nameEn": "Focused Momentum",
            "nameDe": "Fokussierter Schwung",
            "descEn": "After correctly filling 15 cells in a row without a mistake, gain 15 seconds.",
            "descDe": "Nach 15 korrekt ausgefüllten Zellen in Folge ohne Fehler erhältst du 15 Sekunden.",
            "icon": "🔥",
            "statKey": "streak_bonus_1"
        },
        {
            "id": 244,
            "x": 1950,
            "y": 200,
            "nameEn": "Flawless Rhythm",
            "nameDe": "Makelloser Rhythmus",
            "descEn": "Increases the Time gained from Focused Momentum by 5 seconds. Stacks with Perfect Flow.",
            "descDe": "Erhöht die Zeit, die durch Fokussierter Schwung gewonnen wird, um 5 Sekunden. Wirkt zusammen mit Perfekter Fluss.",
            "icon": "🔥",
            "statKey": "streak_bonus_2"
        },
        {
            "id": 245,
            "x": 2050,
            "y": 200,
            "nameEn": "Perfect Flow",
            "nameDe": "Perfekter Fluss",
            "descEn": "Increases the Time gained from Focused Momentum by 10 seconds. Stacks with Flawless Rhythm.",
            "descDe": "Erhöht die Zeit, die durch Fokussierter Schwung gewonnen wird, um 10 Sekunden. Wirkt zusammen mit Makelloser Rhythmus.",
            "icon": "🔥",
            "statKey": "streak_bonus_3"
        },
        {
            "id": 246,
            "x": 2450,
            "y": -1050,
            "nameEn": "Edge Discovery",
            "nameDe": "Randentdeckung",
            "descEn": "At the start of each level, a correct cell in the outermost row or the outermost column is revealed as either filled or empty.",
            "descDe": "Zu Beginn jedes Levels wird eine richtige Zelle in der äußersten Zeile oder der äußersten Spalte als gefüllt oder leer enthüllt.",
            "icon": "📦",
            "statKey": "marginal_distribution_1"
        },
        {
            "id": 247,
            "x": 2400,
            "y": -900,
            "nameEn": "Perimeter Insight",
            "nameDe": "Randblick",
            "descEn": "An additional correct cell is revealed in the outermost row or column at the start of each level.",
            "descDe": "Eine weitere richtige Zelle wird zu Beginn des Levels in der äußersten Zeile oder Spalte enthüllt.",
            "icon": "📦",
            "statKey": "marginal_distribution_2"
        },
        {
            "id": 248,
            "x": 2350,
            "y": -762,
            "nameEn": "Marginal Distribution",
            "nameDe": "Randverteilung",
            "descEn": "An additional correct cell is revealed in the outermost row or column at the start of each level.",
            "descDe": "Eine weitere richtige Zelle wird zu Beginn des Levels in der äußersten Zeile oder Spalte enthüllt.",
            "icon": "📦",
            "statKey": "marginal_distribution_3"
        },
        {
            "id": 249,
            "x": 1900,
            "y": 750,
            "nameEn": "Residual Analysis",
            "nameDe": "Residualanalyse",
            "descEn": "Whenever you complete a row or column you have a 10% chance of automatically marking a random incorrect empty cell in an adjacent row or column.",
            "descDe": "Immer wenn du eine Zeile oder Spalte abschließt hast du eine 10% Chance eine zufällige falsche leere Zelle in einer benachbarten Zeile oder Spalte automatisch zu markieren.",
            "icon": "🔄",
            "statKey": "residual_analysis_1"
        },
        {
            "id": 250,
            "x": 2000,
            "y": 675,
            "nameEn": "Inference Spillover",
            "nameDe": "Inferenz-Überlauf",
            "descEn": "Residual Analysis chance increased by 5%. Stacks with Residual Propagation.",
            "descDe": "Residualanalyse Chance erhöht um 5%. Wirkt zusammen mit Residuen-Propagation.",
            "icon": "🔄",
            "statKey": "residual_analysis_2"
        },
        {
            "id": 251,
            "x": 2075,
            "y": 600,
            "nameEn": "Residual Propagation",
            "nameDe": "Residuen-Propagation",
            "descEn": "Residual Analysis chance increased by 10%. Stacks with Residual Propagation.",
            "descDe": "Residualanalyse Chance erhöht um 10%. Wirkt zusammen mit Residuen-Propagation.",
            "icon": "🔄",
            "statKey": "residual_analysis_3"
        },
        {
            "id": 252,
            "x": 1900,
            "y": -100,
            "nameEn": "Expected Value",
            "nameDe": "Erwartungswert",
            "descEn": "At the start of each level, gain bonus seconds equal to 5 seconds per 10 cells in the grid.",
            "descDe": "Zu Beginn jedes Levels erhältst du Bonussekunden in Höhe von 5 Sekunden pro 10 Zellen im Gitter.",
            "icon": "🧮",
            "statKey": "expected_value_1"
        },
        {
            "id": 253,
            "x": 1950,
            "y": -200,
            "nameEn": "Structured Advantage",
            "nameDe": "Strukturierter Vorteil",
            "descEn": "At the start of each level, gain bonus seconds equal to 2 second per 10 cells in the grid.",
            "descDe": "Zu Beginn jedes Levels erhältst du Bonussekunden in Höhe von 2 Sekunde pro 10 Zellen im Gitter.",
            "icon": "🧮",
            "statKey": "expected_value_2"
        },
        {
            "id": 254,
            "x": 2050,
            "y": -200,
            "nameEn": "Optimized Outcome",
            "nameDe": "Optimiertes Ergebnis",
            "descEn": "At the start of each level, gain bonus seconds equal to 3 seconds per 10 cells in the grid.",
            "descDe": "Zu Beginn jedes Levels erhältst du Bonussekunden in Höhe von 3 Sekunden pro 10 Zellen im Gitter.",
            "icon": "🧮",
            "statKey": "expected_value_3"
        },
        {
            "id": 255,
            "x": 1100,
            "y": -500,
            "nameEn": "Error Feedback",
            "nameDe": "Fehler-Feedback",
            "descEn": "For every 3 mistakes made during a level, 1 random correct filled cell is revealed.",
            "descDe": "Für je 3 Fehler während eines Levels wird 1 zufällige korrekte gefüllte Zelle aufgedeckt.",
            "icon": "📏",
            "statKey": "standard_deviation_1"
        },
        {
            "id": 256,
            "x": 1000,
            "y": -500,
            "nameEn": "Adaptive Correction",
            "nameDe": "Adaptive Korrektur",
            "descEn": "Reduces the mistake threshold of Error Feedback to every 2 mistakes instead of 3.",
            "descDe": "Reduziert den Fehlerschwellenwert von Fehler-Feedback auf je 2 Fehler statt 3.",
            "icon": "📏",
            "statKey": "standard_deviation_2"
        },
        {
            "id": 257,
            "x": 900,
            "y": -500,
            "nameEn": "Instability Compensation",
            "nameDe": "Instabilitätskompensation",
            "descEn": "Each mistake threshold of Error Feedback now reveals 2 correct cells instead of 1.",
            "descDe": "Jeder Fehlerschwellenwert von Fehler-Feedback enthüllt nun 2 korrekte Zellen statt 1.",
            "icon": "📏",
            "statKey": "standard_deviation_3"
        },
        {
            "id": 258,
            "x": 3700,
            "y": -100,
            "nameEn": "Interquartile Vision",
            "nameDe": "Interquartil-Vision",
            "descEn": "When a large grid level starts a Field Scan is applied to the center of the grid for 2 seconds.",
            "descDe": "Wenn ein Level mit großem Gitter startet wird ein Feldscan für 2 Sekunden in der Mitte des Gitters ausgeführt.",
            "icon": "📊",
            "statKey": "interquartile_vision_1"
        },
        {
            "id": 259,
            "x": 3575,
            "y": -125,
            "nameEn": "Central Scan",
            "nameDe": "Zentraler Scan",
            "descEn": "Extends the Interquartile-Vision Fieldscan duration by 1 second.",
            "descDe": "Verlängert die Interquartil-Vision Feldscan Dauer um 1 Sekunde.",
            "icon": "📊",
            "statKey": "interquartile_vision_2"
        },
        {
            "id": 261,
            "x": 1300,
            "y": -100,
            "nameEn": "Covariance Shift",
            "nameDe": "Kovarianz-Verschiebung",
            "descEn": "Whenever a Lucky Tile is revealed a random correctly filled cell in the same row or column is also revealed.",
            "descDe": "Wenn ein Glücksfeld enthüllt wird, wird auch eine zufällige korrekte gefüllte Zelle in derselben Zeile oder Spalte aufgedeckt.",
            "icon": "↔️",
            "statKey": "covariance_shift_1"
        },
        {
            "id": 262,
            "x": 1400,
            "y": -100,
            "nameEn": "Lucky Echo",
            "nameDe": "Glücksecho",
            "descEn": "Covariance Shift can now reveal one more random correctly filled cell in the same row or column. Stacks with Chain Revelation.",
            "descDe": "Kovarianz-Verschiebung kann nun eine weitere zufällige korrekt gefüllte Zelle in derselben Zeile oder Spalte aufdecken. Wirkt zusammen mit Kettenenthüllung.",
            "icon": "↔️",
            "statKey": "covariance_shift_2"
        },
        {
            "id": 263,
            "x": 1350,
            "y": -200,
            "nameEn": "Chain Revelation",
            "nameDe": "Kettenenthüllung",
            "descEn": "Covariance Shift now reveals one more random correctly filled cell in the same row or column. Stacks with Lucky Echo.",
            "descDe": "Kovarianz-Verschiebung kann nun eine weitere zufällige korrekt gefüllte Zelle in derselben Zeile oder Spalte aufdecken. Wirkt zusammen mit Glücksecho.",
            "icon": "↔️",
            "statKey": "covariance_shift_3"
        },
        {
            "id": 264,
            "x": 2800,
            "y": 100,
            "nameEn": "Keystone: Dead Reckoning",
            "nameDe": "Schlüsselfertigkeit: Koppelnavigation",
            "descEn": "At the start of each level, every row and column clue is shown as the sum of the amount of filled cells in this row and column instead of the exact value. Completing 25% of the grid reveals all exact clues. Increases the Timer by 10 minutes.",
            "descDe": "Zu Beginn jedes Levels wird jeder Zeilen- und Spaltenhinweis als Summe statt als genauen Wert angezeigt. Das Abschließen von 25% des Gitters enthüllt alle genauen Hinweise. Erhöht den Timer um 10 Minuten.",
            "icon": "🧭",
            "statKey": "keystone_dead_reckoning"
        },
        {
            "id": 265,
            "x": 2500,
            "y": -700,
            "nameEn": "Keystone: Stochastic Resonance",
            "nameDe": "Schlüsselfertigkeit: Stochastische Resonanz",
            "descEn": "Every mistake has a 25% chance to instead reveal 1 random correct filled cell rather than counting as a mistake. This effect cannot trigger twice in a row.",
            "descDe": "Jeder Fehler hat eine 25% Chance, stattdessen 1 zufällige korrekte gefüllte Zelle aufzudecken, anstatt als Fehler gezählt zu werden. Dieser Effekt kann nicht zweimal in Folge ausgelöst werden.",
            "icon": "〰️",
            "statKey": "keystone_stochastic_resonance"
        },
        {
            "id": 266,
            "x": 2100,
            "y": -100,
            "nameEn": "Keystone: Asymptotic Mastery",
            "nameDe": "Schlüsselfertigkeit: Asymptotische Meisterschaft",
            "descEn": "Each completed row or column permanently reduces the time cost of all future mistakes in this level by 5 seconds. Shields of all kinds are disabled.",
            "descDe": "Schlüsselfertigkeit: Jede abgeschlossene Zeile oder Spalte reduziert die Zeitkosten aller zukünftigen Fehler in diesem Level dauerhaft um 5 Sekunden. Schilde jeder Art sind deaktiviert.",
            "icon": "♾️",
            "statKey": "keystone_asymptotic_mastery"
        },
        {
            "id": 270,
            "x": 2450,
            "y": 1050,
            "nameEn": "Poisson Process",
            "nameDe": "Poisson-Prozess",
            "descEn": "Every 2 minutes a random incorrect empty cell is automatically marked.",
            "descDe": "Alle 2 Minuten wird eine zufällige falsche leere Zelle automatisch markiert.",
            "icon": "⚗️",
            "statKey": "poisson_process_1"
        },
        {
            "id": 271,
            "x": 2450,
            "y": 900,
            "nameEn": "Poisson Drift",
            "nameDe": "Poisson-Drift",
            "descEn": "The Poisson Process effect now occurs every 90 seconds.",
            "descDe": "Der Poisson - Prozess Effekt wird nun alle 90 Sekunden ausgeführt.",
            "icon": "⚗️",
            "statKey": "poisson_process_2"
        },
        {
            "id": 272,
            "x": 2450,
            "y": 750,
            "nameEn": "Stochastic Pulse",
            "nameDe": "Stochastischer Impuls",
            "descEn": "The Poisson Process effect now occurs every 60 seconds.",
            "descDe": "Der Poisson - Prozess Effekt wird nun alle 60 Sekunden ausgeführt.",
            "icon": "⚗️",
            "statKey": "poisson_process_3"
        },
        {
            "id": 282,
            "x": 1750,
            "y": 700,
            "nameEn": "Binomial Burst",
            "nameDe": "Binomialer Ausbruch",
            "descEn": "Each time you fill 10 cells correctly in a single level, there is a 20% chance to instantly mark 1 random incorrect empty cell.",
            "descDe": "Jedes Mal, wenn du 10 Zellen korrekt in einem Level ausfüllst, besteht eine 20% Chance, sofort 1 zufällige falsche leere Zelle zu markieren.",
            "icon": "💢",
            "statKey": "binomial_burst_1"
        },
        {
            "id": 283,
            "x": 1700,
            "y": 600,
            "nameEn": "Combo Trigger",
            "nameDe": "Kombinationsauslöser",
            "descEn": "Binomial Burst chance increased by 10%. Stacks with Probability Spike.",
            "descDe": "Binomialer Ausbruch hat 10% erhöhte Chance. Wirkt zusammen mit Wahrscheinlichkeitsspitze.",
            "icon": "💢",
            "statKey": "binomial_burst_2"
        },
        {
            "id": 284,
            "x": 1650,
            "y": 500,
            "nameEn": "Probability Spike",
            "nameDe": "Wahrscheinlichkeitsspitze",
            "descEn": "Binomial Burst chance increased by 20%. Stacks with Combo Trigger.",
            "descDe": "Binomialer Ausbruch hat 20% erhöhte Chance. Wirkt zusammen mit Kombinationsauslöser.",
            "icon": "💢",
            "statKey": "binomial_burst_3"
        },
        {
            "id": 285,
            "x": 3050,
            "y": -600,
            "nameEn": "Bayesian Adjustment",
            "nameDe": "Bayessche Anpassung",
            "descEn": "Each mistake you make during a level permanently increases the chance of the next automatic cell mark or reveal triggering by 5%, resetting after it triggers. Stacks with Adaptive Inference and Recursive Belief Update.",
            "descDe": "Jeder Fehler während eines Levels erhöht dauerhaft die Chance des nächsten automatischen Markierens oder Aufdeckens um 5% und setzt sich danach zurück. Wirkt zusammen mit Adaptiver Inferenz und Rekursiver Glaubensaktualisierung.",
            "icon": "🔃",
            "statKey": "bayesian_update_1"
        },
        {
            "id": 286,
            "x": 3600,
            "y": 1,
            "nameEn": "Adaptive Inference",
            "nameDe": "Adaptive Inferenz",
            "descEn": "Each mistake you make during a level permanently increases the chance of the next automatic cell mark or reveal triggering by 5%, resetting after it triggers. Stacks with Bayesian Adjustment and Recursive Belief Update.",
            "descDe": "Jeder Fehler während eines Levels erhöht dauerhaft die Chance des nächsten automatischen Markierens oder Aufdeckens um 5% und setzt sich danach zurück. Wirkt zusammen mit Bayesscher Anpassung und Rekursiver Glaubensaktualisierung.",
            "icon": "🔃",
            "statKey": "bayesian_update_2"
        },
        {
            "id": 287,
            "x": 3050,
            "y": 600,
            "nameEn": "Recursive Belief Update",
            "nameDe": "Rekursive Glaubensaktualisierung",
            "descEn": "Each mistake you make during a level permanently increases the chance of the next automatic cell mark or reveal triggering by 5%, resetting after it triggers. Stacks with Bayesian Adjustment and Adaptive Inference.",
            "descDe": "Jeder Fehler während eines Levels erhöht dauerhaft die Chance des nächsten automatischen Markierens oder Aufdeckens um 5% und setzt sich danach zurück. Wirkt zusammen mit Bayesscher Anpassung und Adaptiver Inferenz.",
            "icon": "🔃",
            "statKey": "bayesian_update_3"
        },
        {
            "id": 288,
            "x": 1250,
            "y": 300,
            "nameEn": "Keystone: Maximum Likelihood",
            "nameDe": "Schlüsselfertigkeit: Maximale Wahrscheinlichkeit",
            "descEn": "At the start of each level, the single row and single column with the most filled cells are fully solved automatically. You start the level with 15 minutes less on the timer.",
            "descDe": "Zu Beginn jedes Levels werden die Zeile und die Spalte mit den meisten gefüllten Zellen automatisch vollständig gelöst. Du startest das Level mit 15 Minuten weniger auf dem Timer.",
            "icon": "🏔️",
            "statKey": "keystone_maximum_likelihood"
        },
        {
            "id": 289,
            "x": 3050,
            "y": -700,
            "nameEn": "Keystone: Gambler's Ruin",
            "nameDe": "Schlüsselfertigkeit: Ruin des Spielers",
            "descEn": "Each correct cell fill adds 3 seconds to the timer. Each mistake removes 60 additional seconds from the timer. Bonus time from all other sources is disabled.",
            "descDe": "Jede korrekt ausgefüllte Zelle fügt dem Timer 3 Sekunden hinzu. Jeder Fehler entfernt 60 zusätzliche Sekunden vom Timer. Bonuszeit aus allen anderen Quellen ist deaktiviert.",
            "icon": "🎰",
            "statKey": "keystone_gamblers_ruin"
        },
        {
            "id": 290,
            "x": 3750,
            "y": -250,
            "nameEn": "Keystone: Sparse Prior",
            "nameDe": "Schlüsselfertigkeit: Schwacher Prior",
            "descEn": "All row and column clues are hidden at the start of the level. Each completed row or column reveals the clues of all adjacent rows and columns.",
            "descDe": "Alle Zeilen- und Spaltenhinweise sind zu Beginn des Levels verborgen. Jede abgeschlossene Zeile oder Spalte enthüllt die Hinweise aller benachbarten Zeilen und Spalten.",
            "icon": "🫥",
            "statKey": "keystone_sparse_prior"
        },
        {
            "id": 291,
            "x": 3422,
            "y": -78,
            "nameEn": "Keystone: Ergodic Field",
            "nameDe": "Schlüsselfertigkeit: Ergodisches Feld",
            "descEn": "All automatic cell reveals, marks and field scans are disabled. Instead, every 3 minutes the entire grid briefly flashes, showing the complete solution for 1 second.",
            "descDe": "Alle automatischen Zellen-Enthüllungen, Markierungen und Feld-Scans sind deaktiviert. Stattdessen zeigt das gesamte Gitter alle 3 Minuten kurz die vollständige Lösung für 1 Sekunde.",
            "icon": "🌊",
            "statKey": "keystone_ergodic_field"
        },
        {
            "id": 293,
            "x": 3150,
            "y": -600,
            "nameEn": "Keystone: Entropy Drain",
            "nameDe": "Schlüsselfertigkeit: Entropie-Abbau",
            "descEn": "Whenever you leave a row or column unfinished for more than 3 minutes, all revealed correct cells and all marked incorrect cells in this row and column are reverted back to the blank state . Class Ability Cooldowns are reduced by 30 seconds.",
            "descDe": "Wenn du eine Zeile oder Spalte länger als 2 Minuten unfertig lässt, werden alle Enthüllungen und Markierungen in dieser Zeile und Spalte zurückgesetzt.  Klassenfähigkeiten haben 30 Sekunden weniger Abklingzeit.",
            "icon": "🌡️",
            "statKey": "keystone_entropy_drain"
        },
        {
            "id": 294,
            "x": 2450,
            "y": 600,
            "nameEn": "Keystone: Random Walk",
            "nameDe": "Schlüsselfertigkeit: Zufällige Wanderung",
            "descEn": "Every 30 seconds, 1 random unfilled cell on the board is either automatically correctly filled or marked as incorrect. Fail the level on 2 mistakes.",
            "descDe": "Alle 30 Sekunden wird eine zufällige nicht ausgefüllte Zelle auf dem Spielfeld automatisch korrekt ausgefüllt oder als falsch markiert. Verliere das Level nach 2 Fehlern.",
            "icon": "🚶",
            "statKey": "keystone_random_walk"
        },
        {
            "id": 295,
            "x": 3549,
            "y": -250,
            "nameEn": "Keystone: Frequentist's Burden",
            "nameDe": "Schlüsselfertigkeit: Last des Frequentisten",
            "descEn": "Hides all row and column clues. Every 5 correct cell fills 1 random clue gets revealed. Reduces all Class Ability cooldowns by 15 seconds.",
            "descDe": "Versteckt alle Zeilen - und Spaltenhinweise. Alle 5 korrekt ausgefüllten Zellen wird ein Hinweis wieder angezeigt. Reduziert die Abklingzeit aller Klassenfähigkeiten um 15 Sekunden.",
            "icon": "📜",
            "statKey": "keystone_frequentists_burden"
        },
        {
            "id": 296,
            "x": 1100,
            "y": -100,
            "nameEn": "Keystone: Signal to Noise",
            "nameDe": "Schlüsselfertigkeit: Signal-Rausch-Verhältnis",
            "descEn": "15% of all row and column clues are randomized to incorrect values at the start of each level. Completing 75% of the grid resets all clues to their true values. All Class Ability Cooldowns lowered by 15 seconds.",
            "descDe": "15% aller Zeilen- und Spaltenhinweise werden zu Beginn jedes Levels auf falsche Werte gesetzt. Das Abschließen von 75% des Gitters setzt alle Hinweise auf ihre wahren Werte zurück. Alle Klassenfähigkeiten haben 15 Sekunden weniger Abklingzeit.",
            "icon": "📡",
            "statKey": "keystone_signal_to_noise"
        },
        {
            "id": 298,
            "x": 3200,
            "y": 600,
            "nameEn": "Keystone: Degrees of Freedom",
            "nameDe": "Schlüsselfertigkeit: Freiheitsgrade",
            "descEn": "At the start of each level, choose to hide either all row clues or all column clues. The hidden clues are briefly revealed for 5 seconds every 30 seconds. Class Ability cooldowns are reduced by 30 seconds.",
            "descDe": "Zu Beginn jedes Levels wählhst du, ob alle Zeilen- oder alle Spaltenhinweise verborgen werden. Die verborgenen Hinweise werden alle 30 Sekunden für 5 Sekunden sichtbar gemacht. Klassenfähigkeiten haben 30 Sekunden weniger Abklingzeit.",
            "icon": "🎛️",
            "statKey": "keystone_degrees_of_freedom"
        },
        {
            "id": 299,
            "x": 950,
            "y": -400,
            "nameEn": "Keystone: Overfitting",
            "nameDe": "Schlüsselfertigkeit: Überanpassung",
            "descEn": "The first 15% of cells you fill are filled for free — mistakes in this phase cost no time. After 50% completion, each mistake costs triple the normal time.",
            "descDe": "Die ersten 15% der Zellen, die du ausfüllst, sind kostenlos — Fehler in dieser Phase kosten keine Zeit. Nach 50% Abschluss kostet jeder Fehler dreimal so viel Zeit wie normal.",
            "icon": "📉",
            "statKey": "keystone_overfitting"
        },
        {
            "id": 300,
            "x": 1100,
            "y": 100,
            "nameEn": "Keystone:The Oracle",
            "nameDe": "Schlüsselfertigkeit: Das Orakel",
            "descEn": "At the start of each level, the entire solution is revealed for 5 seconds, then hidden. All row and column clue numbers are hidden. All automatic cell reveals and marks are disabled except for class abilities. Only works on large and massive grids. All Class Ability Cooldowns are reduced by 30 seconds. ",
            "descDe": "Zu Beginn jedes Levels wird die gesamte Lösung 5 Sekunden lang enthüllt und dann verborgen. Alle Zeilen- und Spaltenhinweise werden verborgen. Alle automatischen Enthüllungen, Markierungen und Hinweise sind deaktiviert, außer für Klassenfähigkeiten. Nur auf großen und massiven Gittern wirksam. Alle Klassenfähigkeiten haben 30 Sekunden weniger Abklingzeit.",
            "icon": "👁️",
            "statKey": "keystone_the_oracle"
        },
        {
            "id": 301,
            "x": 3650,
            "y": -200,
            "nameEn": "Focused Analysis",
            "nameDe": "Fokussierte Analyse",
            "descEn": "Extends the Interquartile-Vision Fieldscan duration by 1 second.",
            "descDe": "Verlängert die Interquartil-Vision Feldscan Dauer um 1 Sekunde.",
            "icon": "📊",
            "statKey": "interquartile_vision_3"
        },
        {
            "id": 302,
            "x": 3900,
            "y": 100,
            "nameEn": "Keystone: Adjacency Matrix",
            "nameDe": "Schlüsselfertigkeit: Adjazenzmatrix",
            "descEn": "Hides row and column clues. Each empty cell instead shows how many of its 8 neighbours are solution cells.",
            "descDe": "Blendet Zeilen- und Spaltenhinweise aus. Jede leere Zelle zeigt stattdessen, wie viele ihrer 8 Nachbarn Lösungszellen sind.",
            "icon": "🔢",
            "statKey": "adjacency_matrix"
        }
    ],
    "connections": [
        {
            "id": 10,
            "from": 1,
            "to": 2,
            "dotted": false
        },
        {
            "id": 11,
            "from": 2,
            "to": 3,
            "dotted": false
        },
        {
            "id": 12,
            "from": 3,
            "to": 4,
            "dotted": false
        },
        {
            "id": 13,
            "from": 4,
            "to": 5,
            "dotted": false
        },
        {
            "id": 14,
            "from": 5,
            "to": 6,
            "dotted": false
        },
        {
            "id": 15,
            "from": 6,
            "to": 7,
            "dotted": false
        },
        {
            "id": 16,
            "from": 3,
            "to": 8,
            "dotted": false
        },
        {
            "id": 17,
            "from": 8,
            "to": 9,
            "dotted": false
        },
        {
            "id": 18,
            "from": 9,
            "to": 10,
            "dotted": false
        },
        {
            "id": 19,
            "from": 10,
            "to": 7,
            "dotted": false
        },
        {
            "id": 20,
            "from": 2,
            "to": 11,
            "dotted": false
        },
        {
            "id": 21,
            "from": 11,
            "to": 12,
            "dotted": false
        },
        {
            "id": 22,
            "from": 12,
            "to": 13,
            "dotted": false
        },
        {
            "id": 23,
            "from": 13,
            "to": 14,
            "dotted": false
        },
        {
            "id": 24,
            "from": 14,
            "to": 18,
            "dotted": false
        },
        {
            "id": 25,
            "from": 11,
            "to": 15,
            "dotted": false
        },
        {
            "id": 26,
            "from": 15,
            "to": 16,
            "dotted": false
        },
        {
            "id": 27,
            "from": 16,
            "to": 17,
            "dotted": false
        },
        {
            "id": 28,
            "from": 17,
            "to": 18,
            "dotted": false
        },
        {
            "id": 29,
            "from": 8,
            "to": 26,
            "dotted": false
        },
        {
            "id": 30,
            "from": 26,
            "to": 27,
            "dotted": false
        },
        {
            "id": 31,
            "from": 27,
            "to": 28,
            "dotted": false
        },
        {
            "id": 32,
            "from": 28,
            "to": 29,
            "dotted": false
        },
        {
            "id": 33,
            "from": 29,
            "to": 34,
            "dotted": false
        },
        {
            "id": 34,
            "from": 15,
            "to": 30,
            "dotted": false
        },
        {
            "id": 35,
            "from": 30,
            "to": 31,
            "dotted": false
        },
        {
            "id": 36,
            "from": 31,
            "to": 32,
            "dotted": false
        },
        {
            "id": 37,
            "from": 32,
            "to": 33,
            "dotted": false
        },
        {
            "id": 38,
            "from": 33,
            "to": 34,
            "dotted": false
        },
        {
            "id": 39,
            "from": 2,
            "to": 19,
            "dotted": false
        },
        {
            "id": 40,
            "from": 2,
            "to": 20,
            "dotted": false
        },
        {
            "id": 41,
            "from": 20,
            "to": 22,
            "dotted": false
        },
        {
            "id": 42,
            "from": 22,
            "to": 24,
            "dotted": false
        },
        {
            "id": 43,
            "from": 24,
            "to": 25,
            "dotted": false
        },
        {
            "id": 44,
            "from": 19,
            "to": 21,
            "dotted": false
        },
        {
            "id": 45,
            "from": 21,
            "to": 23,
            "dotted": false
        },
        {
            "id": 46,
            "from": 23,
            "to": 25,
            "dotted": false
        },
        {
            "id": 47,
            "from": 1,
            "to": 35,
            "dotted": false
        },
        {
            "id": 48,
            "from": 35,
            "to": 36,
            "dotted": false
        },
        {
            "id": 49,
            "from": 35,
            "to": 37,
            "dotted": false
        },
        {
            "id": 50,
            "from": 35,
            "to": 38,
            "dotted": false
        },
        {
            "id": 51,
            "from": 36,
            "to": 39,
            "dotted": false
        },
        {
            "id": 52,
            "from": 39,
            "to": 40,
            "dotted": false
        },
        {
            "id": 53,
            "from": 40,
            "to": 41,
            "dotted": false
        },
        {
            "id": 54,
            "from": 41,
            "to": 42,
            "dotted": false
        },
        {
            "id": 55,
            "from": 42,
            "to": 43,
            "dotted": false
        },
        {
            "id": 56,
            "from": 43,
            "to": 44,
            "dotted": false
        },
        {
            "id": 57,
            "from": 39,
            "to": 45,
            "dotted": false
        },
        {
            "id": 58,
            "from": 45,
            "to": 46,
            "dotted": false
        },
        {
            "id": 59,
            "from": 46,
            "to": 47,
            "dotted": false
        },
        {
            "id": 60,
            "from": 47,
            "to": 48,
            "dotted": false
        },
        {
            "id": 61,
            "from": 48,
            "to": 49,
            "dotted": false
        },
        {
            "id": 62,
            "from": 39,
            "to": 50,
            "dotted": false
        },
        {
            "id": 63,
            "from": 50,
            "to": 51,
            "dotted": false
        },
        {
            "id": 64,
            "from": 51,
            "to": 52,
            "dotted": false
        },
        {
            "id": 65,
            "from": 52,
            "to": 53,
            "dotted": false
        },
        {
            "id": 66,
            "from": 53,
            "to": 54,
            "dotted": false
        },
        {
            "id": 67,
            "from": 49,
            "to": 55,
            "dotted": false
        },
        {
            "id": 68,
            "from": 44,
            "to": 55,
            "dotted": false
        },
        {
            "id": 69,
            "from": 54,
            "to": 55,
            "dotted": false
        },
        {
            "id": 70,
            "from": 37,
            "to": 56,
            "dotted": false
        },
        {
            "id": 71,
            "from": 56,
            "to": 57,
            "dotted": false
        },
        {
            "id": 72,
            "from": 57,
            "to": 58,
            "dotted": false
        },
        {
            "id": 73,
            "from": 58,
            "to": 59,
            "dotted": false
        },
        {
            "id": 74,
            "from": 59,
            "to": 60,
            "dotted": false
        },
        {
            "id": 75,
            "from": 60,
            "to": 61,
            "dotted": false
        },
        {
            "id": 76,
            "from": 61,
            "to": 72,
            "dotted": false
        },
        {
            "id": 77,
            "from": 56,
            "to": 62,
            "dotted": false
        },
        {
            "id": 78,
            "from": 62,
            "to": 63,
            "dotted": false
        },
        {
            "id": 79,
            "from": 63,
            "to": 64,
            "dotted": false
        },
        {
            "id": 80,
            "from": 64,
            "to": 65,
            "dotted": false
        },
        {
            "id": 81,
            "from": 65,
            "to": 66,
            "dotted": false
        },
        {
            "id": 82,
            "from": 66,
            "to": 72,
            "dotted": false
        },
        {
            "id": 83,
            "from": 56,
            "to": 67,
            "dotted": false
        },
        {
            "id": 84,
            "from": 67,
            "to": 68,
            "dotted": false
        },
        {
            "id": 85,
            "from": 68,
            "to": 69,
            "dotted": false
        },
        {
            "id": 86,
            "from": 69,
            "to": 70,
            "dotted": false
        },
        {
            "id": 87,
            "from": 70,
            "to": 71,
            "dotted": false
        },
        {
            "id": 88,
            "from": 71,
            "to": 72,
            "dotted": false
        },
        {
            "id": 90,
            "from": 73,
            "to": 74,
            "dotted": false
        },
        {
            "id": 91,
            "from": 74,
            "to": 75,
            "dotted": false
        },
        {
            "id": 92,
            "from": 75,
            "to": 76,
            "dotted": false
        },
        {
            "id": 93,
            "from": 76,
            "to": 77,
            "dotted": false
        },
        {
            "id": 95,
            "from": 78,
            "to": 79,
            "dotted": false
        },
        {
            "id": 96,
            "from": 79,
            "to": 80,
            "dotted": false
        },
        {
            "id": 97,
            "from": 80,
            "to": 81,
            "dotted": false
        },
        {
            "id": 98,
            "from": 81,
            "to": 82,
            "dotted": false
        },
        {
            "id": 99,
            "from": 82,
            "to": 88,
            "dotted": false
        },
        {
            "id": 100,
            "from": 77,
            "to": 88,
            "dotted": false
        },
        {
            "id": 102,
            "from": 83,
            "to": 84,
            "dotted": false
        },
        {
            "id": 103,
            "from": 84,
            "to": 85,
            "dotted": false
        },
        {
            "id": 104,
            "from": 85,
            "to": 86,
            "dotted": false
        },
        {
            "id": 105,
            "from": 86,
            "to": 87,
            "dotted": false
        },
        {
            "id": 106,
            "from": 87,
            "to": 88,
            "dotted": false
        },
        {
            "id": 107,
            "from": 38,
            "to": 89,
            "dotted": false
        },
        {
            "id": 108,
            "from": 89,
            "to": 73,
            "dotted": false
        },
        {
            "id": 109,
            "from": 89,
            "to": 78,
            "dotted": false
        },
        {
            "id": 110,
            "from": 89,
            "to": 83,
            "dotted": false
        },
        {
            "id": 111,
            "from": 5,
            "to": 9,
            "dotted": false
        },
        {
            "id": 112,
            "from": 21,
            "to": 22,
            "dotted": false
        },
        {
            "id": 113,
            "from": 17,
            "to": 13,
            "dotted": false
        },
        {
            "id": 114,
            "from": 45,
            "to": 41,
            "dotted": false
        },
        {
            "id": 115,
            "from": 50,
            "to": 41,
            "dotted": false
        },
        {
            "id": 116,
            "from": 46,
            "to": 42,
            "dotted": false
        },
        {
            "id": 117,
            "from": 41,
            "to": 52,
            "dotted": false
        },
        {
            "id": 118,
            "from": 47,
            "to": 43,
            "dotted": false
        },
        {
            "id": 119,
            "from": 42,
            "to": 53,
            "dotted": false
        },
        {
            "id": 120,
            "from": 48,
            "to": 44,
            "dotted": false
        },
        {
            "id": 121,
            "from": 43,
            "to": 54,
            "dotted": false
        },
        {
            "id": 122,
            "from": 57,
            "to": 63,
            "dotted": false
        },
        {
            "id": 123,
            "from": 62,
            "to": 68,
            "dotted": false
        },
        {
            "id": 124,
            "from": 58,
            "to": 64,
            "dotted": false
        },
        {
            "id": 125,
            "from": 59,
            "to": 65,
            "dotted": false
        },
        {
            "id": 126,
            "from": 64,
            "to": 70,
            "dotted": false
        },
        {
            "id": 127,
            "from": 60,
            "to": 66,
            "dotted": false
        },
        {
            "id": 128,
            "from": 65,
            "to": 71,
            "dotted": false
        },
        {
            "id": 129,
            "from": 73,
            "to": 79,
            "dotted": false
        },
        {
            "id": 130,
            "from": 78,
            "to": 84,
            "dotted": false
        },
        {
            "id": 131,
            "from": 74,
            "to": 80,
            "dotted": false
        },
        {
            "id": 132,
            "from": 75,
            "to": 81,
            "dotted": false
        },
        {
            "id": 133,
            "from": 80,
            "to": 86,
            "dotted": false
        },
        {
            "id": 134,
            "from": 79,
            "to": 85,
            "dotted": false
        },
        {
            "id": 135,
            "from": 63,
            "to": 69,
            "dotted": false
        },
        {
            "id": 136,
            "from": 76,
            "to": 82,
            "dotted": false
        },
        {
            "id": 137,
            "from": 81,
            "to": 87,
            "dotted": false
        },
        {
            "id": 138,
            "from": 1,
            "to": 90,
            "dotted": false
        },
        {
            "id": 139,
            "from": 90,
            "to": 94,
            "dotted": false
        },
        {
            "id": 140,
            "from": 94,
            "to": 95,
            "dotted": false
        },
        {
            "id": 141,
            "from": 95,
            "to": 96,
            "dotted": false
        },
        {
            "id": 142,
            "from": 90,
            "to": 91,
            "dotted": false
        },
        {
            "id": 143,
            "from": 91,
            "to": 92,
            "dotted": false
        },
        {
            "id": 144,
            "from": 92,
            "to": 93,
            "dotted": false
        },
        {
            "id": 145,
            "from": 96,
            "to": 106,
            "dotted": false
        },
        {
            "id": 146,
            "from": 106,
            "to": 107,
            "dotted": false
        },
        {
            "id": 147,
            "from": 107,
            "to": 108,
            "dotted": false
        },
        {
            "id": 151,
            "from": 108,
            "to": 115,
            "dotted": false
        },
        {
            "id": 152,
            "from": 115,
            "to": 116,
            "dotted": false
        },
        {
            "id": 153,
            "from": 116,
            "to": 117,
            "dotted": false
        },
        {
            "id": 155,
            "from": 112,
            "to": 113,
            "dotted": false
        },
        {
            "id": 156,
            "from": 113,
            "to": 114,
            "dotted": false
        },
        {
            "id": 166,
            "from": 97,
            "to": 99,
            "dotted": false
        },
        {
            "id": 167,
            "from": 97,
            "to": 98,
            "dotted": false
        },
        {
            "id": 168,
            "from": 98,
            "to": 99,
            "dotted": false
        },
        {
            "id": 169,
            "from": 149,
            "to": 97,
            "dotted": false
        },
        {
            "id": 170,
            "from": 149,
            "to": 150,
            "dotted": false
        },
        {
            "id": 171,
            "from": 148,
            "to": 149,
            "dotted": false
        },
        {
            "id": 172,
            "from": 127,
            "to": 128,
            "dotted": false
        },
        {
            "id": 173,
            "from": 128,
            "to": 129,
            "dotted": false
        },
        {
            "id": 174,
            "from": 128,
            "to": 98,
            "dotted": false
        },
        {
            "id": 175,
            "from": 151,
            "to": 152,
            "dotted": false
        },
        {
            "id": 176,
            "from": 152,
            "to": 153,
            "dotted": false
        },
        {
            "id": 177,
            "from": 152,
            "to": 99,
            "dotted": false
        },
        {
            "id": 178,
            "from": 136,
            "to": 137,
            "dotted": false
        },
        {
            "id": 179,
            "from": 137,
            "to": 138,
            "dotted": false
        },
        {
            "id": 180,
            "from": 137,
            "to": 97,
            "dotted": false
        },
        {
            "id": 181,
            "from": 139,
            "to": 140,
            "dotted": false
        },
        {
            "id": 182,
            "from": 140,
            "to": 141,
            "dotted": false
        },
        {
            "id": 183,
            "from": 140,
            "to": 98,
            "dotted": false
        },
        {
            "id": 186,
            "from": 118,
            "to": 119,
            "dotted": false
        },
        {
            "id": 195,
            "from": 90,
            "to": 124,
            "dotted": false
        },
        {
            "id": 196,
            "from": 124,
            "to": 125,
            "dotted": false
        },
        {
            "id": 197,
            "from": 125,
            "to": 126,
            "dotted": false
        },
        {
            "id": 198,
            "from": 126,
            "to": 151,
            "dotted": false
        },
        {
            "id": 199,
            "from": 103,
            "to": 104,
            "dotted": false
        },
        {
            "id": 200,
            "from": 104,
            "to": 105,
            "dotted": false
        },
        {
            "id": 201,
            "from": 105,
            "to": 136,
            "dotted": false
        },
        {
            "id": 203,
            "from": 121,
            "to": 122,
            "dotted": false
        },
        {
            "id": 204,
            "from": 122,
            "to": 123,
            "dotted": false
        },
        {
            "id": 205,
            "from": 123,
            "to": 148,
            "dotted": false
        },
        {
            "id": 206,
            "from": 114,
            "to": 120,
            "dotted": false
        },
        {
            "id": 208,
            "from": 100,
            "to": 101,
            "dotted": false
        },
        {
            "id": 209,
            "from": 101,
            "to": 102,
            "dotted": false
        },
        {
            "id": 210,
            "from": 102,
            "to": 139,
            "dotted": false
        },
        {
            "id": 211,
            "from": 109,
            "to": 110,
            "dotted": false
        },
        {
            "id": 212,
            "from": 110,
            "to": 111,
            "dotted": false
        },
        {
            "id": 213,
            "from": 111,
            "to": 127,
            "dotted": false
        },
        {
            "id": 214,
            "from": 120,
            "to": 119,
            "dotted": false
        },
        {
            "id": 215,
            "from": 93,
            "to": 112,
            "dotted": false
        },
        {
            "id": 216,
            "from": 117,
            "to": 118,
            "dotted": false
        },
        {
            "id": 220,
            "from": 107,
            "to": 121,
            "dotted": false
        },
        {
            "id": 221,
            "from": 113,
            "to": 109,
            "dotted": false
        },
        {
            "id": 222,
            "from": 103,
            "to": 116,
            "dotted": false
        },
        {
            "id": 223,
            "from": 100,
            "to": 119,
            "dotted": false
        },
        {
            "id": 224,
            "from": 130,
            "to": 131,
            "dotted": false
        },
        {
            "id": 225,
            "from": 131,
            "to": 132,
            "dotted": false
        },
        {
            "id": 226,
            "from": 96,
            "to": 130,
            "dotted": false
        },
        {
            "id": 227,
            "from": 93,
            "to": 133,
            "dotted": false
        },
        {
            "id": 228,
            "from": 133,
            "to": 134,
            "dotted": false
        },
        {
            "id": 229,
            "from": 134,
            "to": 135,
            "dotted": false
        },
        {
            "id": 230,
            "from": 115,
            "to": 145,
            "dotted": false
        },
        {
            "id": 231,
            "from": 145,
            "to": 146,
            "dotted": false
        },
        {
            "id": 232,
            "from": 146,
            "to": 147,
            "dotted": false
        },
        {
            "id": 233,
            "from": 120,
            "to": 142,
            "dotted": false
        },
        {
            "id": 234,
            "from": 142,
            "to": 143,
            "dotted": false
        },
        {
            "id": 235,
            "from": 143,
            "to": 144,
            "dotted": false
        },
        {
            "id": 237,
            "from": 101,
            "to": 160,
            "dotted": false
        },
        {
            "id": 238,
            "from": 141,
            "to": 158,
            "dotted": false
        },
        {
            "id": 239,
            "from": 162,
            "to": 129,
            "dotted": false
        },
        {
            "id": 240,
            "from": 153,
            "to": 154,
            "dotted": false
        },
        {
            "id": 241,
            "from": 135,
            "to": 155,
            "dotted": false
        },
        {
            "id": 242,
            "from": 99,
            "to": 156,
            "dotted": false
        },
        {
            "id": 243,
            "from": 119,
            "to": 157,
            "dotted": false
        },
        {
            "id": 244,
            "from": 101,
            "to": 159,
            "dotted": false
        },
        {
            "id": 248,
            "from": 97,
            "to": 161,
            "dotted": false
        },
        {
            "id": 249,
            "from": 96,
            "to": 164,
            "dotted": false
        },
        {
            "id": 250,
            "from": 93,
            "to": 165,
            "dotted": false
        },
        {
            "id": 251,
            "from": 166,
            "to": 117,
            "dotted": false
        },
        {
            "id": 252,
            "from": 118,
            "to": 166,
            "dotted": false
        },
        {
            "id": 253,
            "from": 1,
            "to": 167,
            "dotted": false
        },
        {
            "id": 260,
            "from": 167,
            "to": 189,
            "dotted": false
        },
        {
            "id": 261,
            "from": 189,
            "to": 190,
            "dotted": false
        },
        {
            "id": 262,
            "from": 190,
            "to": 191,
            "dotted": false
        },
        {
            "id": 263,
            "from": 167,
            "to": 192,
            "dotted": false
        },
        {
            "id": 264,
            "from": 192,
            "to": 193,
            "dotted": false
        },
        {
            "id": 265,
            "from": 193,
            "to": 194,
            "dotted": false
        },
        {
            "id": 266,
            "from": 167,
            "to": 168,
            "dotted": false
        },
        {
            "id": 267,
            "from": 167,
            "to": 171,
            "dotted": false
        },
        {
            "id": 268,
            "from": 168,
            "to": 169,
            "dotted": false
        },
        {
            "id": 269,
            "from": 169,
            "to": 170,
            "dotted": false
        },
        {
            "id": 270,
            "from": 171,
            "to": 172,
            "dotted": false
        },
        {
            "id": 271,
            "from": 172,
            "to": 173,
            "dotted": false
        },
        {
            "id": 274,
            "from": 167,
            "to": 174,
            "dotted": false
        },
        {
            "id": 275,
            "from": 175,
            "to": 174,
            "dotted": false
        },
        {
            "id": 276,
            "from": 176,
            "to": 175,
            "dotted": false
        },
        {
            "id": 277,
            "from": 191,
            "to": 228,
            "dotted": false
        },
        {
            "id": 278,
            "from": 194,
            "to": 229,
            "dotted": false
        },
        {
            "id": 279,
            "from": 173,
            "to": 287,
            "dotted": false
        },
        {
            "id": 280,
            "from": 287,
            "to": 286,
            "dotted": false
        },
        {
            "id": 281,
            "from": 176,
            "to": 286,
            "dotted": false
        },
        {
            "id": 282,
            "from": 170,
            "to": 285,
            "dotted": false
        },
        {
            "id": 283,
            "from": 285,
            "to": 286,
            "dotted": false
        },
        {
            "id": 284,
            "from": 174,
            "to": 261,
            "dotted": false
        },
        {
            "id": 285,
            "from": 261,
            "to": 262,
            "dotted": false
        },
        {
            "id": 286,
            "from": 262,
            "to": 263,
            "dotted": false
        },
        {
            "id": 287,
            "from": 263,
            "to": 221,
            "dotted": false
        },
        {
            "id": 288,
            "from": 168,
            "to": 255,
            "dotted": false
        },
        {
            "id": 289,
            "from": 255,
            "to": 256,
            "dotted": false
        },
        {
            "id": 290,
            "from": 256,
            "to": 257,
            "dotted": false
        },
        {
            "id": 291,
            "from": 170,
            "to": 246,
            "dotted": false
        },
        {
            "id": 292,
            "from": 246,
            "to": 247,
            "dotted": false
        },
        {
            "id": 293,
            "from": 247,
            "to": 248,
            "dotted": false
        },
        {
            "id": 294,
            "from": 169,
            "to": 234,
            "dotted": false
        },
        {
            "id": 295,
            "from": 234,
            "to": 235,
            "dotted": false
        },
        {
            "id": 296,
            "from": 235,
            "to": 236,
            "dotted": false
        },
        {
            "id": 297,
            "from": 170,
            "to": 222,
            "dotted": false
        },
        {
            "id": 298,
            "from": 222,
            "to": 223,
            "dotted": false
        },
        {
            "id": 299,
            "from": 223,
            "to": 224,
            "dotted": false
        },
        {
            "id": 300,
            "from": 171,
            "to": 240,
            "dotted": false
        },
        {
            "id": 301,
            "from": 240,
            "to": 241,
            "dotted": false
        },
        {
            "id": 302,
            "from": 241,
            "to": 242,
            "dotted": false
        },
        {
            "id": 303,
            "from": 171,
            "to": 237,
            "dotted": false
        },
        {
            "id": 304,
            "from": 237,
            "to": 238,
            "dotted": false
        },
        {
            "id": 305,
            "from": 238,
            "to": 239,
            "dotted": false
        },
        {
            "id": 306,
            "from": 173,
            "to": 270,
            "dotted": false
        },
        {
            "id": 307,
            "from": 270,
            "to": 271,
            "dotted": false
        },
        {
            "id": 308,
            "from": 271,
            "to": 272,
            "dotted": false
        },
        {
            "id": 309,
            "from": 172,
            "to": 282,
            "dotted": false
        },
        {
            "id": 310,
            "from": 282,
            "to": 283,
            "dotted": false
        },
        {
            "id": 311,
            "from": 283,
            "to": 284,
            "dotted": false
        },
        {
            "id": 312,
            "from": 172,
            "to": 249,
            "dotted": false
        },
        {
            "id": 313,
            "from": 249,
            "to": 250,
            "dotted": false
        },
        {
            "id": 314,
            "from": 250,
            "to": 251,
            "dotted": false
        },
        {
            "id": 315,
            "from": 285,
            "to": 210,
            "dotted": false
        },
        {
            "id": 316,
            "from": 210,
            "to": 211,
            "dotted": false
        },
        {
            "id": 317,
            "from": 211,
            "to": 212,
            "dotted": false
        },
        {
            "id": 318,
            "from": 287,
            "to": 213,
            "dotted": false
        },
        {
            "id": 319,
            "from": 213,
            "to": 214,
            "dotted": false
        },
        {
            "id": 320,
            "from": 214,
            "to": 215,
            "dotted": false
        },
        {
            "id": 321,
            "from": 285,
            "to": 225,
            "dotted": false
        },
        {
            "id": 322,
            "from": 225,
            "to": 226,
            "dotted": false
        },
        {
            "id": 323,
            "from": 226,
            "to": 227,
            "dotted": false
        },
        {
            "id": 324,
            "from": 286,
            "to": 258,
            "dotted": false
        },
        {
            "id": 325,
            "from": 258,
            "to": 259,
            "dotted": false
        },
        {
            "id": 326,
            "from": 259,
            "to": 301,
            "dotted": false
        },
        {
            "id": 327,
            "from": 286,
            "to": 195,
            "dotted": false
        },
        {
            "id": 328,
            "from": 195,
            "to": 196,
            "dotted": false
        },
        {
            "id": 329,
            "from": 196,
            "to": 197,
            "dotted": false
        },
        {
            "id": 333,
            "from": 174,
            "to": 216,
            "dotted": false
        },
        {
            "id": 334,
            "from": 216,
            "to": 217,
            "dotted": false
        },
        {
            "id": 335,
            "from": 217,
            "to": 218,
            "dotted": false
        },
        {
            "id": 336,
            "from": 286,
            "to": 231,
            "dotted": false
        },
        {
            "id": 337,
            "from": 231,
            "to": 232,
            "dotted": false
        },
        {
            "id": 338,
            "from": 232,
            "to": 233,
            "dotted": false
        },
        {
            "id": 339,
            "from": 175,
            "to": 252,
            "dotted": false
        },
        {
            "id": 340,
            "from": 252,
            "to": 253,
            "dotted": false
        },
        {
            "id": 341,
            "from": 253,
            "to": 254,
            "dotted": false
        },
        {
            "id": 342,
            "from": 175,
            "to": 243,
            "dotted": false
        },
        {
            "id": 343,
            "from": 243,
            "to": 244,
            "dotted": false
        },
        {
            "id": 344,
            "from": 244,
            "to": 245,
            "dotted": false
        },
        {
            "id": 345,
            "from": 176,
            "to": 201,
            "dotted": false
        },
        {
            "id": 346,
            "from": 201,
            "to": 202,
            "dotted": false
        },
        {
            "id": 347,
            "from": 202,
            "to": 203,
            "dotted": false
        },
        {
            "id": 348,
            "from": 174,
            "to": 296,
            "dotted": false
        },
        {
            "id": 349,
            "from": 176,
            "to": 264,
            "dotted": false
        },
        {
            "id": 350,
            "from": 257,
            "to": 299,
            "dotted": false
        },
        {
            "id": 351,
            "from": 272,
            "to": 294,
            "dotted": false
        },
        {
            "id": 352,
            "from": 174,
            "to": 300,
            "dotted": false
        },
        {
            "id": 353,
            "from": 285,
            "to": 293,
            "dotted": false
        },
        {
            "id": 354,
            "from": 175,
            "to": 266,
            "dotted": false
        },
        {
            "id": 356,
            "from": 298,
            "to": 287,
            "dotted": false
        },
        {
            "id": 357,
            "from": 224,
            "to": 265,
            "dotted": false
        },
        {
            "id": 358,
            "from": 301,
            "to": 295,
            "dotted": false
        },
        {
            "id": 359,
            "from": 301,
            "to": 290,
            "dotted": false
        },
        {
            "id": 360,
            "from": 245,
            "to": 219,
            "dotted": false
        },
        {
            "id": 361,
            "from": 286,
            "to": 291,
            "dotted": false
        },
        {
            "id": 362,
            "from": 242,
            "to": 220,
            "dotted": false
        },
        {
            "id": 363,
            "from": 285,
            "to": 289,
            "dotted": false
        },
        {
            "id": 364,
            "from": 239,
            "to": 288,
            "dotted": false
        },
        {
            "id": 365,
            "from": 131,
            "to": 89,
            "dotted": false
        },
        {
            "id": 366,
            "from": 39,
            "to": 5,
            "dotted": false
        },
        {
            "id": 367,
            "from": 12,
            "to": 257,
            "dotted": false
        },
        {
            "id": 368,
            "from": 242,
            "to": 135,
            "dotted": false
        },
        {
            "id": 369,
            "from": 248,
            "to": 265,
            "dotted": false
        },
        {
            "id": 371,
            "from": 302,
            "to": 233,
            "dotted": false
        }
    ]
};