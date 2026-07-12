//------------------------------------------------------------------------
//-----WORLD-SPECIFIC MULTIPLE-CHOICE BONUS QUIZ POOLS--------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

const BONUS_QUIZ_POOLS = {

    // ── WORLD 1 — Basic Probability ───────────────────────────────────────
    // Topics: sample spaces, events, power sets, mutually exclusive events,
    //         complement, De Morgan, intersection/union, probability measure

    1: [
        {
            q: "What does the sample space Ω represent?",
            qDE: "Was repräsentiert die Ergebnismenge Ω?",
            opts: ["All possible outcomes of an experiment", "Only the likely outcomes", "The set of impossible events", "A single random outcome"],
            optsDE: ["Alle möglichen Ergebnisse eines Experiments", "Nur die wahrscheinlichen Ergebnisse", "Die Menge der unmöglichen Ereignisse", "Ein einzelnes zufälliges Ergebnis"],
            correct: 0
        },
        {
            q: "The complement of event A (written Aᶜ) contains:",
            qDE: "Das Komplement des Ereignisses A (Aᶜ) enthält:",
            opts: ["All outcomes NOT in A", "All outcomes in A", "Only impossible outcomes", "The intersection of A with Ω"],
            optsDE: ["Alle Ergebnisse, die NICHT in A liegen", "Alle Ergebnisse in A", "Nur unmögliche Ergebnisse", "Den Schnitt von A mit Ω"],
            correct: 0
        },
        {
            q: "If A and B are disjoint, then P(A ∩ B) equals:",
            qDE: "Wenn A und B disjunkt sind, gilt P(A ∩ B) =",
            opts: ["0", "P(A) + P(B)", "P(A) · P(B)", "1"],
            optsDE: ["0", "P(A) + P(B)", "P(A) · P(B)", "1"],
            correct: 0
        },
        {
            q: "De Morgan's law states that (A ∪ B)ᶜ equals:",
            qDE: "Die Regel von De Morgan besagt, dass (A ∪ B)ᶜ gleich ist mit:",
            opts: ["Aᶜ ∩ Bᶜ", "Aᶜ ∪ Bᶜ", "A ∩ B", "A ∪ B"],
            optsDE: ["Aᶜ ∩ Bᶜ", "Aᶜ ∪ Bᶜ", "A ∩ B", "A ∪ B"],
            correct: 0
        },
        {
            q: "A probability measure P must satisfy P(Ω) = ?",
            qDE: "Ein Wahrscheinlichkeitsmaß P muss P(Ω) = ? erfüllen:",
            opts: ["1", "0", "0.5", "Any positive number"],
            optsDE: ["1", "0", "0.5", "Eine beliebige positive Zahl"],
            correct: 0
        },
        {
            q: "Which of these CANNOT be a valid probability?",
            qDE: "Welcher dieser Werte kann KEINE gültige Wahrscheinlichkeit sein?",
            opts: ["−0.1", "0", "0.5", "1"],
            optsDE: ["−0,1", "0", "0,5", "1"],
            correct: 0
        },
        {
            q: "The smallest possible σ-algebra on any non-empty Ω is:",
            qDE: "Die kleinste mögliche σ-Algebra auf einem nicht-leeren Ω ist:",
            opts: ["{∅, Ω}", "The power set of Ω", "{Ω}", "{∅}"],
            optsDE: ["{∅, Ω}", "Die Potenzmenge von Ω", "{Ω}", "{∅}"],
            correct: 0
        },
        {
            q: "The inclusion-exclusion formula for P(A ∪ B) is:",
            qDE: "Die Siebformel für P(A ∪ B) lautet:",
            opts: ["P(A) + P(B) − P(A ∩ B)", "P(A) + P(B) + P(A ∩ B)", "P(A) · P(B)", "P(A) − P(B)"],
            optsDE: ["P(A) + P(B) − P(A ∩ B)", "P(A) + P(B) + P(A ∩ B)", "P(A) · P(B)", "P(A) − P(B)"],
            correct: 0
        },

        {
            q: "Two fair dice are rolled. How many outcomes are in the sample space Ω?",
            qDE: "Zwei faire Würfel werden geworfen. Wie viele Ergebnisse hat die Ergebnismenge Ω?",
            opts: ["36", "12", "6", "18"],
            optsDE: ["36", "12", "6", "18"],
            correct: 0
        },
        {
            q: "A set Ω has 4 elements. How many subsets does its power set Pot(Ω) contain?",
            qDE: "Eine Menge Ω hat 4 Elemente. Wie viele Teilmengen enthält die Potenzmenge Pot(Ω)?",
            opts: ["16", "8", "4", "12"],
            optsDE: ["16", "8", "4", "12"],
            correct: 0
        },
        {
            q: "Which of the following is always true for any event A?",
            qDE: "Welche Aussage gilt immer für ein beliebiges Ereignis A?",
            opts: ["P(A) + P(Aᶜ) = 1", "P(A) = P(Aᶜ)", "P(A) · P(Aᶜ) = 1", "P(A) − P(Aᶜ) = 0"],
            optsDE: ["P(A) + P(Aᶜ) = 1", "P(A) = P(Aᶜ)", "P(A) · P(Aᶜ) = 1", "P(A) − P(Aᶜ) = 0"],
            correct: 0
        },
        {
            q: "De Morgan's law states that (A ∩ B)ᶜ equals:",
            qDE: "Die Regel von De-Morgan besagt, dass (A ∩ B)ᶜ gleich ist mit:",
            opts: ["Aᶜ ∪ Bᶜ", "Aᶜ ∩ Bᶜ", "A ∪ B", "A ∩ B"],
            optsDE: ["Aᶜ ∪ Bᶜ", "Aᶜ ∩ Bᶜ", "A ∪ B", "A ∩ B"],
            correct: 0
        },
        {
            q: "In a Laplace experiment, all elementary events have:",
            qDE: "In einem Laplace-Experiment haben alle Elementarereignisse:",
            opts: ["Equal probability", "Probability 0", "Probability 1", "Different probabilities"],
            optsDE: ["Gleiche Wahrscheinlichkeit", "Wahrscheinlichkeit 0", "Wahrscheinlichkeit 1", "Unterschiedliche Wahrscheinlichkeiten"],
            correct: 0
        },
        {
            q: "Events A and B are mutually exclusive. P(A) = 0.3. What can you say about P(A ∪ B)?",
            qDE: "Die Ereignisse A und B sind disjunkt. P(A) = 0,3. Was gilt für P(A ∪ B)?",
            opts: ["P(A ∪ B) = P(A) + P(B)", "P(A ∪ B) = P(A) · P(B)", "P(A ∪ B) = P(A) − P(B)", "P(A ∪ B) = P(A ∩ B)"],
            optsDE: ["P(A ∪ B) = P(A) + P(B)", "P(A ∪ B) = P(A) · P(B)", "P(A ∪ B) = P(A) − P(B)", "P(A ∪ B) = P(A ∩ B)"],
            correct: 0
        },
        {
            q: "The impossible event ∅ has probability:",
            qDE: "Das unmögliche Ereignis ∅ hat die Wahrscheinlichkeit:",
            opts: ["0", "1", "0.5", "Undefined"],
            optsDE: ["0", "1", "0,5", "Undefiniert"],
            correct: 0
        },
        {
            q: "A coin is flipped twice. How many elementary events are in the sample space?",
            qDE: "Eine Münze wird zweimal geworfen. Wie viele Elementarereignisse hat die Ergebnismenge?",
            opts: ["4", "2", "8", "6"],
            optsDE: ["4", "2", "8", "6"],
            correct: 0
        },
        {
            q: "P(A) = 0.4, P(B) = 0.5, P(A ∩ B) = 0.2. What is P(A ∪ B)?",
            qDE: "P(A) = 0,4, P(B) = 0,5, P(A ∩ B) = 0,2. Was ist P(A ∪ B)?",
            opts: ["0.7", "0.9", "0.2", "0.45"],
            optsDE: ["0,7", "0,9", "0,2", "0,45"],
            correct: 0
        },






    ],

    // ── WORLD 2 — Combinatorics & Distributions ───────────────────────────
    // Topics: Laplace probability, combinatorics (ordered/unordered, with/without
    //         replacement), inclusion-exclusion for 3 sets, σ-algebra, binomial coefficient

    2: [
        {
            q: "In a Laplace space with |Ω| equally likely outcomes, P(A) equals:",
            qDE: "In einem Laplace-Raum mit |Ω| gleich wahrscheinlichen Ergebnissen gilt P(A) =",
            opts: ["|A| / |Ω|", "|Ω| / |A|", "|A| · |Ω|", "1 / |A|"],
            optsDE: ["|A| / |Ω|", "|Ω| / |A|", "|A| · |Ω|", "1 / |A|"],
            correct: 0
        },
        {
            q: "Drawing WITHOUT replacement means:",
            qDE: "Ziehen OHNE Zurücklegen bedeutet:",
            opts: ["Each element can only be drawn once", "Elements can be drawn multiple times", "The order does not matter", "The sample space is infinite"],
            optsDE: ["Jedes Element kann nur einmal gezogen werden", "Elemente können mehrfach gezogen werden", "Die Reihenfolge spielt keine Rolle", "Die Ergebnismenge ist unendlich groß"],
            correct: 0
        },
        {
            q: "The union bound (Boolean Inequality) states P(A ∪ B) ≤",
            qDE: "Die Boolesche Ungleichung besagt P(A ∪ B) ≤",
            opts: ["P(A) + P(B)", "P(A) · P(B)", "P(A) − P(B)", "min(P(A), P(B))"],
            optsDE: ["P(A) + P(B)", "P(A) · P(B)", "P(A) − P(B)", "min(P(A), P(B))"],
            correct: 0
        },
        {
            q: "The number of ordered draws of k items from n WITHOUT replacement is:",
            qDE: "Die Anzahl geordneter Züge von k Elementen aus n OHNE Zurücklegen ist:",
            opts: ["n! / (n−k)!", "n! / k!", "nᵏ", "C(n,k)"],
            optsDE: ["n! / (n−k)!", "n! / k!", "nᵏ", "C(n,k)"],
            correct: 0
        },
        {
            q: "The odds in favour of event A with P(A) = p are defined as:",
            qDE: "Die Chance (Odds) für Ereignis A mit P(A) = p sind definiert als:",
            opts: ["p / (1−p)", "(1−p) / p", "p · (1−p)", "1 / p"],
            optsDE: ["p / (1−p)", "(1−p) / p", "p · (1−p)", "1 / p"],
            correct: 0
        },
        {
            q: "In a Laplace space, if every elementary event has probability 1/8, how many outcomes does Ω contain?",
            qDE: "In einem Laplace-Raum hat jedes Elementarereignis die Wahrscheinlichkeit 1/8. Wie viele Ergebnisse enthält Ω?",
            opts: ["8", "4", "16", "2"],
            optsDE: ["8", "4", "16", "2"],
            correct: 0
        },
        {
            q: "With replacement, order matters: drawing k items from n gives how many outcomes? (B(n,k) is the binomial coefficient)",
            qDE: "Mit Zurücklegen, Reihenfolge zählt: k Züge aus n ergeben wie viele Ergebnisse? (B(n,k) ist der Binomialkoeffizient)",
            opts: ["nᵏ", "n! / (n−k)!", "B(n,k)", "k!"],
            optsDE: ["nᵏ", "n! / (n−k)!", "B(n,k)", "k!"],
            correct: 0
        },
        {
            q: "A σ-algebra must be closed under which operations?",
            qDE: "Eine σ-Algebra muss abgeschlossen sein unter welchen Operationen?",
            opts: ["Complement and countable union", "Only intersection", "Only complement", "Complement and finite intersection"],
            optsDE: ["Komplement und abzählbare Vereinigung", "Nur Schnitt", "Nur Komplement", "Komplement und endlichem Schnitt"],
            correct: 0
        },

        {
            q: "The binomial coefficient B(n, k) counts the number of ways to choose k items from n where:",
            qDE: "Der Binomialkoeffizient B(n, k) zählt die Möglichkeiten, k Elemente aus n zu wählen, wobei:",
            opts: ["Order does NOT matter and draws are without replacement", "Order matters and draws are with replacement", "Order matters and draws are without replacement", "Order does NOT matter and draws are with replacement"],
            optsDE: ["Reihenfolge KEINE Rolle spielt und ohne Zurücklegen gezogen wird", "Reihenfolge zählt und mit Zurücklegen gezogen wird", "Reihenfolge zählt und ohne Zurücklegen gezogen wird", "Reihenfolge KEINE Rolle spielt und mit Zurücklegen gezogen wird"],
            correct: 0
        },
        {
            q: "How many ways are there to arrange all 5 elements of a set in a row?",
            qDE: "Auf wie viele Arten lassen sich alle 5 Elemente einer Menge in einer Reihe anordnen?",
            opts: ["120", "25", "5", "60"],
            optsDE: ["120", "25", "5", "60"],
            correct: 0
        },
        {
            q: "Boole's inequality (union bound) states that for any events A₁, …, Aₙ:",
            qDE: "Die Boolesche Ungleichung besagt, dass für beliebige Ereignisse A₁, …, Aₙ gilt:",
            opts: ["P(A₁ ∪ … ∪ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) = P(A₁) + … + P(Aₙ)", "P(A₁ ∩ … ∩ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) ≥ P(A₁) + … + P(Aₙ)"],
            optsDE: ["P(A₁ ∪ … ∪ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) = P(A₁) + … + P(Aₙ)", "P(A₁ ∩ … ∩ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) ≥ P(A₁) + … + P(Aₙ)"],
            correct: 0
        },
        {
            q: "For the inclusion-exclusion principle applied to three sets, you add P(A), P(B), P(C), then subtract the pairwise intersections, then:",
            qDE: "Bei der Siebformel für drei Mengen addiert man P(A), P(B), P(C), subtrahiert die paarweisen Schnitte und dann:",
            opts: ["Add back P(A ∩ B ∩ C)", "Subtract P(A ∩ B ∩ C) again", "Do nothing further", "Subtract P(A ∪ B ∪ C)"],
            optsDE: ["Addiert P(A ∩ B ∩ C) wieder", "Subtrahiert P(A ∩ B ∩ C) erneut", "Tut nichts weiteres", "Subtrahiert P(A ∪ B ∪ C)"],
            correct: 0
        },
        {
            q: "The binomial coefficient B(6, 2) equals:",
            qDE: "Der Binomialkoeffizient B(6, 2) ergibt:",
            opts: ["15", "12", "30", "6"],
            optsDE: ["15", "12", "30", "6"],
            correct: 0
        },
        {
            q: "In a Laplace space, a bag holds 3 red and 7 blue balls. What is P(drawing a red ball)?",
            qDE: "Im Laplace-Raum enthält ein Beutel 3 rote und 7 blaue Bälle. Was ist P(rote Kugel ziehen)?",
            opts: ["3/10", "7/10", "3/7", "1/3"],
            optsDE: ["3/10", "7/10", "3/7", "1/3"],
            correct: 0
        },
        {
            q: "Drawing k items from n WITH replacement and order matters gives how many outcomes? (B(n,k) is the binomial coefficient)",
            qDE: "k Elemente aus n MIT Zurücklegen ziehen, Reihenfolge zählt. Wie viele Ergebnisse gibt es? (B(n,k) ist der Binomialkoeffizient)",
            opts: ["nᵏ", "B(n,k)", "n! / (n−k)!", "k!"],
            optsDE: ["nᵏ", "B(n,k)", "n! / (n−k)!", "k!"],
            correct: 0
        },
        {
            q: "A valid σ-algebra on Ω must contain:",
            qDE: "Eine gültige σ-Algebra auf Ω muss enthalten:",
            opts: ["∅ and Ω", "Only Ω", "Only ∅", "All non-empty subsets of Ω"],
            optsDE: ["∅ und Ω", "Nur Ω", "Nur ∅", "Alle nicht-leeren Teilmengen von Ω"],
            correct: 0
        },
        {
            q: "The odds in favour of an event with probability p = 0.25 are:",
            qDE: "Die Chance (Odds) für ein Ereignis mit Wahrscheinlichkeit p = 0,25 betragen:",
            opts: ["1/3", "1/4", "3/4", "4"],
            optsDE: ["1/3", "1/4", "3/4", "4"],
            correct: 0
        },
        {
            q: "How many unordered selections of 3 items from 10 (without replacement) are there?",
            qDE: "Wie viele ungeordnete Auswahlen von 3 aus 10 Elementen (ohne Zurücklegen) gibt es?",
            opts: ["120", "720", "30", "1000"],
            optsDE: ["120", "720", "30", "1000"],
            correct: 0
        },
    ],

    

    // ── WORLD 3 — Random Variables & Distributions ────────────────────────
    // Topics: conditional probability, law of total probability, Bayes' theorem,
    //         multi-stage probability trees, independence, random variables,
    //         distributions, CDF, quantile function, continuous RV/PDF, exponential distribution

    3: [
        {
            q: "The conditional probability P(A|B) is defined as:",
            qDE: "Die bedingte Wahrscheinlichkeit P(A|B) ist definiert als:",
            opts: ["P(A ∩ B) / P(B)", "P(A) · P(B)", "P(B) / P(A)", "P(A) + P(B)"],
            optsDE: ["P(A ∩ B) / P(B)", "P(A) · P(B)", "P(B) / P(A)", "P(A) + P(B)"],
            correct: 0
        },
        {
            q: "Events A and B are independent if and only if:",
            qDE: "Ereignisse A und B sind unabhängig genau dann, wenn:",
            opts: ["P(A ∩ B) = P(A) · P(B)", "P(A ∩ B) = 0", "P(A|B) = P(B)", "P(A ∪ B) = 1"],
            optsDE: ["P(A ∩ B) = P(A) · P(B)", "P(A ∩ B) = 0", "P(A|B) = P(B)", "P(A ∪ B) = 1"],
            correct: 0
        },
        {
            q: "The law of total probability states that P(A) equals:",
            qDE: "Der Satz der totalen Wahrscheinlichkeit besagt, dass P(A) gleich ist:",
            opts: ["Σ P(A|Bᵢ)·P(Bᵢ) over a partition {Bᵢ}", "P(A|B) · P(B)", "P(A) · P(B)", "P(A ∩ B) / P(B)"],
            optsDE: ["Σ P(A|Bᵢ)·P(Bᵢ) über eine Partition {Bᵢ}", "P(A|B) · P(B)", "P(A) · P(B)", "P(A ∩ B) / P(B)"],
            correct: 0
        },
        {
            q: "Bayes' theorem gives P(B|A) in terms of P(A|B) as:",
            qDE: "Der Satz von Bayes gibt P(B|A) in Abhängigkeit von P(A|B) als:",
            opts: ["P(A|B)·P(B) / P(A)", "P(A|B) / P(B)", "P(A|B) + P(B)", "P(B) / P(A)"],
            optsDE: ["P(A|B)·P(B) / P(A)", "P(A|B) / P(B)", "P(A|B) + P(B)", "P(B) / P(A)"],
            correct: 0
        },
        {
            q: "For a continuous random variable X, P(X = c) for any single value c equals:",
            qDE: "Für eine stetige Zufallsvariable X gilt P(X = c) für jeden einzelnen Wert c:",
            opts: ["0", "f(c) where f is the PDF", "F(c) where F is the CDF", "1 / range"],
            optsDE: ["0", "f(c), wobei f die Dichte ist", "F(c), wobei F die VKF ist", "1 / Bereich"],
            correct: 0
        },
        {
            q: "The distribution function F(x) of a random variable X is defined as:",
            qDE: "Die Verteilungsfunktion F(x) einer Zufallsvariable X ist definiert als:",
            opts: ["P(X ≤ x)", "P(X = x)", "P(X > x)", "d/dx P(X ≤ x)"],
            optsDE: ["P(X ≤ x)", "P(X = x)", "P(X > x)", "d/dx P(X ≤ x)"],
            correct: 0
        },
        {
            q: "The quantile function Q(p) is the smallest x such that:",
            qDE: "Die Quantilfunktion Q(p) ist das kleinste x, sodass:",
            opts: ["F(x) ≥ p", "F(x) ≤ p", "f(x) = p", "P(X > x) = p"],
            optsDE: ["F(x) ≥ p", "F(x) ≤ p", "f(x) = p", "P(X > x) = p"],
            correct: 0
        },
        {
            q: "For an exponential distribution with rate λ, the distribution function for x ≥ 0 is:",
            qDE: "Für eine Exponentialverteilung mit Rate λ lautet die Verteilungsfunktion für x ≥ 0:",
            opts: ["1 − e^(−λx)", "e^(−λx)", "λ·e^(−λx)", "1 − λ·e^(−x)"],
            optsDE: ["1 − e^(−λx)", "e^(−λx)", "λ·e^(−λx)", "1 − λ·e^(−x)"],
            correct: 0
        },


        {
            q: "The multiplication rule for conditional probability states that P(A ∩ B) equals:",
            qDE: "Die Multiplikationsregel für bedingte Wahrscheinlichkeiten besagt, dass P(A ∩ B) gleich ist:",
            opts: ["P(A|B) · P(B)", "P(A) + P(B)", "P(A) / P(B)", "P(A|B) + P(B)"],
            optsDE: ["P(A|B) · P(B)", "P(A) + P(B)", "P(A) / P(B)", "P(A|B) + P(B)"],
            correct: 0
        },
        {
            q: "In a two-stage probability tree, the probability of a path equals:",
            qDE: "In einem zweistufigen Wahrscheinlichkeitsbaum ist die Wahrscheinlichkeit eines Pfades gleich:",
            opts: ["The product of the probabilities along the path", "The sum of the probabilities along the path", "The probability of the final branch only", "1 divided by the number of paths"],
            optsDE: ["Das Produkt der Wahrscheinlichkeiten entlang des Pfades", "Die Summe der Wahrscheinlichkeiten entlang des Pfades", "Nur die Wahrscheinlichkeit des letzten Asts", "1 geteilt durch die Anzahl der Pfade"],
            correct: 0
        },
        {
            q: "Which statement about independent events A and B is correct?",
            qDE: "Welche Aussage über unabhängige Ereignisse A und B ist korrekt?",
            opts: ["P(A|B) = P(A)", "P(A|B) = P(B)", "P(A ∩ B) = 0", "P(A ∪ B) = 1"],
            optsDE: ["P(A|B) = P(A)", "P(A|B) = P(B)", "P(A ∩ B) = 0", "P(A ∪ B) = 1"],
            correct: 0
        },
        {
            q: "Bayes' theorem is used to:",
            qDE: "Der Satz von Bayes wird verwendet, um:",
            opts: ["Update a prior probability given new evidence", "Add two probabilities together", "Calculate the probability of the complement", "Find the expected value of a random variable"],
            optsDE: ["Eine A-priori-Wahrscheinlichkeit angesichts neuer Evidenz zu aktualisieren", "Zwei Wahrscheinlichkeiten zu addieren", "Die Wahrscheinlichkeit des Komplements zu berechnen", "Den Erwartungswert einer Zufallsvariable zu finden"],
            correct: 0
        },
        {
            q: "A discrete random variable X assigns:",
            qDE: "Eine diskrete Zufallsvariable X ordnet zu:",
            opts: ["A real number to each outcome in Ω", "A probability to each event", "A set to each outcome", "An interval to each outcome"],
            optsDE: ["Jedem Ergebnis in Ω eine reelle Zahl", "Jedem Ereignis eine Wahrscheinlichkeit", "Jedem Ergebnis eine Menge", "Jedem Ergebnis ein Intervall"],
            correct: 0
        },
        {
            q: "For the exponential distribution Exp(λ), the mean (expected value) is:",
            qDE: "Für die Exponentialverteilung Exp(λ) gilt als Erwartungswert:",
            opts: ["1/λ", "λ", "λ²", "1/λ²"],
            optsDE: ["1/λ", "λ", "λ²", "1/λ²"],
            correct: 0
        },
        {
            q: "The density p(x) of a discrete random variable must satisfy:",
            qDE: "Die Zähldichte p(x) einer diskreten Zufallsvariablen muss erfüllen:",
            opts: ["Σ p(x) = 1 and p(x) ≥ 0 for all x", "Σ p(x) = 0", "p(x) = 1 for all x", "∫ p(x) dx = 1"],
            optsDE: ["Σ p(x) = 1 und p(x) ≥ 0 für alle x", "Σ p(x) = 0", "p(x) = 1 für alle x", "∫ p(x) dx = 1"],
            correct: 0
        },

        {
            q: "The density function f(x) of a continuous random variable satisfies:",
            qDE: "Die Dichtefunktion f(x) einer stetigen Zufallsvariable erfüllt:",
            opts: ["∫ f(x) dx = 1 over ℝ, and f(x) ≥ 0", "f(x) = P(X = x)", "Σ f(x) = 1", "f(x) > 1 is not allowed"],
            optsDE: ["∫ f(x) dx = 1 über ℝ, und f(x) ≥ 0", "f(x) = P(X = x)", "Σ f(x) = 1", "f(x) > 1 ist nicht erlaubt"],
            correct: 0
        },
        {
            q: "The quantile Q(0.5) of a distribution is called the:",
            qDE: "Das Quantil Q(0,5) einer Verteilung heißt:",
            opts: ["Median", "Mean", "Mode", "Variance"],
            optsDE: ["Median", "Erwartungswert", "Modus", "Varianz"],
            correct: 0
        },
    ],

    // ── WORLD 4
    // Topics: density transformation, independence of RVs, contingency tables,
    //         standard normal distribution, expected value (discrete + continuous),
    //         Bernoulli distribution, linearity of E, variance rules, covariance,

    4: [
        {
            q: "The expected value of a discrete random variable X is:",
            qDE: "Der Erwartungswert einer diskreten Zufallsvariable X ist:",
            opts: ["Σ x · P(X = x)", "Σ P(X = x)", "max P(X = x)", "Σ x² · P(X = x)"],
            optsDE: ["Σ x · P(X = x)", "Σ P(X = x)", "max P(X = x)", "Σ x² · P(X = x)"],
            correct: 0
        },

        {
            q: "For independent X and Y, E[X·Y] equals:",
            qDE: "Für unabhängige X und Y gilt E[X·Y] =",
            opts: ["E[X] · E[Y]", "E[X] + E[Y]", "E[X²] · E[Y²]", "Cov(X,Y)"],
            optsDE: ["E[X] · E[Y]", "E[X] + E[Y]", "E[X²] · E[Y²]", "Cov(X,Y)"],
            correct: 0
        },
        {
            q: "For a Ber(p) distributed random variable, E[X] equals:",
            qDE: "Für eine Ber(p)-verteilte Zufallsvariable gilt E[X] =",
            opts: ["p", "p(1−p)", "p²", "1−p"],
            optsDE: ["p", "p(1−p)", "p²", "1−p"],
            correct: 0
        },






        {
            q: "For Y = aX + b with constants a and b, E[Y] equals:",
            qDE: "Für Y = aX + b mit Konstanten a und b gilt E[Y] =",
            opts: ["a·E[X] + b", "a·E[X]", "E[X] + b", "a + b"],
            optsDE: ["a·E[X] + b", "a·E[X]", "E[X] + b", "a + b"],
            correct: 0
        },
        {
            q: "The covariance Cov(X, Y) is defined as:",
            qDE: "Die Kovarianz Cov(X, Y) ist definiert als:",
            opts: ["E[(X−E[X])(Y−E[Y])]", "E[X] · E[Y]", "E[X + Y]", "Var(X) + Var(Y)"],
            optsDE: ["E[(X−E[X])(Y−E[Y])]", "E[X] · E[Y]", "E[X + Y]", "Var(X) + Var(Y)"],
            correct: 0
        },
        {
            q: "The correlation coefficient r between X and Y lies in the range:",
            qDE: "Der Korrelationskoeffizient r zwischen X und Y liegt im Bereich:",
            opts: ["[−1, 1]", "[0, 1]", "[0, ∞)", "(−∞, ∞)"],
            optsDE: ["[−1, 1]", "[0, 1]", "[0, ∞)", "(−∞, ∞)"],
            correct: 0
        },
        {
            q: "If X and Y are independent, their covariance Cov(X, Y) equals:",
            qDE: "Wenn X und Y unabhängig sind, gilt für ihre Kovarianz Cov(X, Y):",
            opts: ["0", "1", "Var(X) · Var(Y)", "E[X] · E[Y]"],
            optsDE: ["0", "1", "Var(X) · Var(Y)", "E[X] · E[Y]"],
            correct: 0
        },
        {
            q: "For X ~ N(μ, σ²), the standardised variable Z = (X − μ)/σ follows:",
            qDE: "Für X ~ N(μ, σ²) folgt die standardisierte Variable Z = (X − μ)/σ der:",
            opts: ["Standard normal distribution N(0,1)", "Normal distribution N(μ, σ²)", "Uniform distribution on [0,1]", "Exponential distribution Exp(1)"],
            optsDE: ["Standardnormalverteilung N(0,1)", "Normalverteilung N(μ, σ²)", "Gleichverteilung auf [0,1]", "Exponentialverteilung Exp(1)"],
            correct: 0
        },
        {
            q: "The standard normal distribution N(0,1) is symmetric around:",
            qDE: "Die Standardnormalverteilung N(0,1) ist symmetrisch um:",
            opts: ["0", "1", "0.5", "−1"],
            optsDE: ["0", "1", "0,5", "−1"],
            correct: 0
        },
        {
            q: "Var(X + Y) when X and Y are NOT independent equals:",
            qDE: "Var(X + Y) wenn X und Y NICHT unabhängig sind, lautet:",
            opts: ["Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) − Var(Y)"],
            optsDE: ["Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) − Var(Y)"],
            correct: 0
        },

        {
            q: "Jensen's inequality for a convex function f states that:",
            qDE: "Die Jensensche Ungleichung für eine konvexe Funktion f besagt:",
            opts: ["E[f(X)] ≥ f(E[X])", "E[f(X)] ≤ f(E[X])", "E[f(X)] = f(E[X])", "E[f(X)] = 0"],
            optsDE: ["E[f(X)] ≥ f(E[X])", "E[f(X)] ≤ f(E[X])", "E[f(X)] = f(E[X])", "E[f(X)] = 0"],
            correct: 0
        },
        {
            q: "The density transformation theorem is used when:",
            qDE: "Der Dichtetransformationssatz wird verwendet, wenn:",
            opts: ["You know the density of X and want the density of Y = g(X)", "You need to compute E[X]", "You want to standardise a normal variable", "You need to find the distribution function from a density function"],
            optsDE: ["Man die Dichte von X kennt und die Dichte von Y = g(X) sucht", "Man E[X] berechnen möchte", "Man eine Normalvariable standardisieren möchte", "Man die Verteilungsfunktion aus einer Zähldichte bestimmen möchte"],
            correct: 0
        },


        // ── DENSITY TRANSFORMATION ────────────────────────────────────────────

        {
            q: 'For Y = aX + b with a > 0 and X having density function f_X, the density function f_Y(y) equals:',
            qDE: 'Für Y = aX + b mit a > 0 und X mit Dichte f_X gilt für f_Y(y):',
            opts: ['f_X((y−b)/a) · (1/a)', 'f_X(ay + b)', 'a · f_X(y)', 'f_X(y − b)'],
            optsDE: ['f_X((y−b)/a) · (1/a)', 'f_X(ay + b)', 'a · f_X(y)', 'f_X(y − b)'],
            correct: 0
        },
        {
            q: 'X ~ U[0,1] and Y = 2X. What distribution does Y follow?',
            qDE: 'X ~ U[0,1] und Y = 2X. Welcher Verteilung folgt Y?',
            opts: ['U[0,2]', 'U[0,1]', 'N(0,1)', 'Exp(1)'],
            optsDE: ['U[0,2]', 'U[0,1]', 'N(0,1)', 'Exp(1)'],
            correct: 0
        },

        // ── INDEPENDENCE OF RANDOM VARIABLES ──────────────────────────────────
        {
            q: 'Two random variables X and Y are independent if and only if:',
            qDE: 'Zwei Zufallsvariablen X und Y sind unabhängig genau dann, wenn:',
            opts: ['Their joint density equals the product of the marginals', 'E[X] = E[Y]', 'Var(X) = Var(Y)', 'They take the same values'],
            optsDE: ['Ihre gemeinsame Zähldichte/Dichte dem Produkt der Randdichten entspricht', 'E[X] = E[Y]', 'Var(X) = Var(Y)', 'Sie dieselben Werte annehmen'],
            correct: 0
        },
        {
            q: 'If X and Y are independent, which formula holds?',
            qDE: 'Wenn X und Y unabhängig sind, welche Formel gilt dann?',
            opts: ['E[X·Y] = E[X]·E[Y]', 'E[X+Y] = E[X]·E[Y]', 'Var(X+Y) = Var(X)·Var(Y)', 'E[X·Y] = 0'],
            optsDE: ['E[X·Y] = E[X]·E[Y]', 'E[X+Y] = E[X]·E[Y]', 'Var(X+Y) = Var(X)·Var(Y)', 'E[X·Y] = 0'],
            correct: 0
        },
        {
            q: 'If X and Y are independent with continuous distributions, their joint density function f_{X,Y}(x,y) equals:',
            qDE: 'Wenn X und Y unabhängig mit stetiger Verteilung sind, gilt für die gemeinsame Dichte f_{X,Y}(x,y):',
            opts: ['f_X(x) · f_Y(y)', 'f_X(x) + f_Y(y)', 'f_X(x) / f_Y(y)', 'f_X(x·y)'],
            optsDE: ['f_X(x) · f_Y(y)', 'f_X(x) + f_Y(y)', 'f_X(x) / f_Y(y)', 'f_X(x·y)'],
            correct: 0
        },

        // ── I.I.D. RANDOM VARIABLES ───────────────────────────────────────────
        {
            q: '"i.i.d." stands for:',
            qDE: '"i.i.d." steht für:',
            opts: ['Independent and identically distributed', 'Independent and identically defined', 'Identically integrated and distributed', 'Independent and increasing data'],
            optsDE: ['Unabhängig und identisch verteilt', 'Unabhängig und identisch definiert', 'Identisch integriert und verteilt', 'Unabhängig und zunehmende Daten'],
            correct: 0
        },
        {
            q: 'For n i.i.d. random variables X₁,…,Xₙ with E[Xᵢ]=μ and Var(Xᵢ)=σ², what is Var((1/n)∑Xᵢ) where (1/n)∑Xᵢ = (1/n)ΣXᵢ?',
            qDE: 'Für n i.i.d. Zufallsvariablen X₁,…,Xₙ mit E[Xᵢ]=μ und Var(Xᵢ)=σ²: Was ist Var((1/n)∑Xᵢ) mit (1/n)∑Xᵢ = (1/n)ΣXᵢ?',
            opts: ['σ²/n', 'σ²·n', 'σ²', 'σ/n'],
            optsDE: ['σ²/n', 'σ²·n', 'σ²', 'σ/n'],
            correct: 0
        },

        // ── EXPECTED VALUE ────────────────────────────────────────────────────
        {
            q: 'The expected value of a continuous random variable X with density function f is:',
            qDE: 'Der Erwartungswert einer stetigen Zufallsvariable X mit Dichte f ist:',
            opts: ['∫ x·f(x) dx over ℝ', 'Σ x·P(X=x)', 'f(0)', '∫ f(x) dx'],
            optsDE: ['∫ x·f(x) dx über ℝ', 'Σ x·P(X=x)', 'f(0)', '∫ f(x) dx'],
            correct: 0
        },
        {
            q: 'The expected value of a discrete random variable X with density p is:',
            qDE: 'Der Erwartungswert einer diskreten Zufallsvariable X mit Zähldichte p ist:',
            opts: ['Σ x·p(x)', '∫ x·p(x) dx', 'max p(x)', 'Σ p(x)'],
            optsDE: ['Σ x·p(x)', '∫ x·p(x) dx', 'max p(x)', 'Σ p(x)'],
            correct: 0
        },

        // ── BERNOULLI DISTRIBUTION ────────────────────────────────────────────
        {
            q: 'For X ~ Ber(p), what is E[X]?',
            qDE: 'Für X ~ Ber(p), was ist E[X]?',
            opts: ['p', 'p(1−p)', '1−p', 'p²'],
            optsDE: ['p', 'p(1−p)', '1−p', 'p²'],
            correct: 0
        },
        {
            q: 'For X ~ Ber(p), what is Var(X)?',
            qDE: 'Für X ~ Ber(p), wie groß ist Var(X)?',
            opts: ['p(1−p)', 'p', 'p²', '(1−p)²'],
            optsDE: ['p(1−p)', 'p', 'p²', '(1−p)²'],
            correct: 0
        },
        {
            q: 'A Ber(p) random variable takes the value 1 with probability p and 0 with probability:',
            qDE: 'Eine Ber(p)-Zufallsvariable nimmt den Wert 1 mit Wahrscheinlichkeit p und 0 mit Wahrscheinlichkeit:',
            opts: ['1−p', 'p', 'p(1−p)', '1/p'],
            optsDE: ['1−p', 'p', 'p(1−p)', '1/p'],
            correct: 0
        },
        {
            q: 'For which value of p is Var(X) = p(1−p) maximised for X ~ Ber(p)?',
            qDE: 'Bei welchem Wert von p ist Var(X) = p(1−p) für X ~ Ber(p) maximal?',
            opts: ['p = 0.5', 'p = 0', 'p = 1', 'p = 0.25'],
            optsDE: ['p = 0,5', 'p = 0', 'p = 1', 'p = 0,25'],
            correct: 0
        },

        // ── PROPERTIES OF EXPECTATION ─────────────────────────────────────────
        {
            q: 'Linearity of expectation states that E[aX + bY] equals:',
            qDE: 'Die Linearität des Erwartungswertes besagt, dass E[aX + bY] gleich ist:',
            opts: ['a·E[X] + b·E[Y]', 'E[aX]·E[bY]', 'a·b·E[X+Y]', 'E[X+Y]'],
            optsDE: ['a·E[X] + b·E[Y]', 'E[aX]·E[bY]', 'a·b·E[X+Y]', 'E[X+Y]'],
            correct: 0
        },

        {
            q: 'The triangle inequality for expectations states that |E[X + Y]| ≤',
            qDE: 'Die Dreiecksungleichung für Erwartungswerte besagt |E[X + Y]| ≤',
            opts: ['E[|X|] + E[|Y|]', 'E[X] + E[Y]', '|E[X]| · |E[Y]|', 'E[X·Y]'],
            optsDE: ['E[|X|] + E[|Y|]', 'E[X] + E[Y]', '|E[X]| · |E[Y]|', 'E[X·Y]'],
            correct: 0
        },

        // ── VARIANCE RULES ────────────────────────────────────────────────────
        {
            q: 'Var(aX) for a constant a equals:',
            qDE: 'Var(aX) für eine Konstante a ergibt:',
            opts: ['a²·Var(X)', 'a·Var(X)', 'Var(X)', 'a²+Var(X)'],
            optsDE: ['a²·Var(X)', 'a·Var(X)', 'Var(X)', 'a²+Var(X)'],
            correct: 0
        },
        {
            q: 'Adding a constant c to X: what happens to Var(X+c)?',
            qDE: 'Addiert man eine Konstante c zu X: Was gilt für Var(X+c)?',
            opts: ['Var(X+c) = Var(X)', 'Var(X+c) = Var(X) + c', 'Var(X+c) = Var(X) + c²', 'Var(X+c) = c·Var(X)'],
            optsDE: ['Var(X+c) = Var(X)', 'Var(X+c) = Var(X) + c', 'Var(X+c) = Var(X) + c²', 'Var(X+c) = c·Var(X)'],
            correct: 0
        },
        {
            q: 'The Shift-Theorem states:',
            qDE: 'Der Verschiebungssatz lautet:',
            opts: ['Var(X) = E[X²] − (E[X])²', 'Var(X) = E[X²] + (E[X])²', 'Var(X) = (E[X])² − E[X²]', 'Var(X) = E[(X−1)²]'],
            optsDE: ['Var(X) = E[X²] − (E[X])²', 'Var(X) = E[X²] + (E[X])²', 'Var(X) = (E[X])² − E[X²]', 'Var(X) = E[(X−1)²]'],
            correct: 0
        },
        {
            q: 'For independent X and Y, Var(X + Y) equals:',
            qDE: 'Für unabhängige X und Y gilt Var(X + Y) =',
            opts: ['Var(X) + Var(Y)', 'Var(X)·Var(Y)', 'Var(X) − Var(Y)', 'Var(X) + Var(Y) + 2·Cov(X,Y)'],
            optsDE: ['Var(X) + Var(Y)', 'Var(X)·Var(Y)', 'Var(X) − Var(Y)', 'Var(X) + Var(Y) + 2·Cov(X,Y)'],
            correct: 0
        },
        {
            q: 'The standard deviation σ(X) is related to the variance Var(X) by:',
            qDE: 'Die Standardabweichung σ(X) hängt mit der Varianz Var(X) zusammen durch:',
            opts: ['σ(X) = √Var(X)', 'σ(X) = Var(X)²', 'σ(X) = Var(X)/2', 'σ(X) = E[X]'],
            optsDE: ['σ(X) = √Var(X)', 'σ(X) = Var(X)²', 'σ(X) = Var(X)/2', 'σ(X) = E[X]'],
            correct: 0
        },

        // ── TRANSFORMATION THEOREM FOR E[g(X)] ───────────────────────────────
        {
            q: 'The transformation theorem for discrete X states E[g(X)] equals:',
            qDE: 'Der Transformationssatz für diskrete X besagt E[g(X)] =',
            opts: ['Σ g(x)·p(x)', 'g(E[X])', '∫ g(x) dx', 'Σ g(x)'],
            optsDE: ['Σ g(x)·p(x)', 'g(E[X])', '∫ g(x) dx', 'Σ g(x)'],
            correct: 0
        },
        {
            q: 'For continuous X with density function f, E[g(X)] equals:',
            qDE: 'Für stetige X mit Dichte f gilt E[g(X)] =',
            opts: ['∫ g(x)·f(x) dx', 'g(E[X])', 'Σ g(x)·f(x)', '∫ g(x) dx'],
            optsDE: ['∫ g(x)·f(x) dx', 'g(E[X])', 'Σ g(x)·f(x)', '∫ g(x) dx'],
            correct: 0
        },

        // ── BINOMIAL DISTRIBUTION ─────────────────────────────────────────────
        {
            q: 'For X ~ Bin(n, p), what is E[X]?',
            qDE: 'Für X ~ Bin(n, p), was ist E[X]?',
            opts: ['n·p', 'n·p·(1−p)', 'p/n', 'n/p'],
            optsDE: ['n·p', 'n·p·(1−p)', 'p/n', 'n/p'],
            correct: 0
        },
        {
            q: 'For X ~ Bin(n, p), what is Var(X)?',
            qDE: 'Für X ~ Bin(n, p), was ist Var(X)?',
            opts: ['n·p·(1−p)', 'n·p', 'p·(1−p)', 'n²·p'],
            optsDE: ['n·p·(1−p)', 'n·p', 'p·(1−p)', 'n²·p'],
            correct: 0
        },
        {
            q: 'X ~ Bin(n, p) counts the number of successes in:',
            qDE: 'X ~ Bin(n, p) zählt die Anzahl der Erfolge in:',
            opts: ['n independent Ber(p) trials', 'n dependent trials', 'n draws without replacement', 'a single Bernoulli trial repeated n²  times'],
            optsDE: ['n unabhängigen Ber(p)-Versuchen', 'n abhängigen Versuchen', 'n Zügen ohne Zurücklegen', 'einem einzelnen Bernoulli-Versuch n²-mal wiederholt'],
            correct: 0
        },
        {
            q: 'The density of X ~ Bin(n,p) for X = k is given by: (C denotes the binomial coefficient)',
            qDE: 'Die Zähldichte von X ~ Bin(n,p) für X = k lautet: (C stellt den Binomialkoeffizienten dar)',
            opts: ['C(n,k)·pᵏ·(1−p)^(n−k)', 'pᵏ·(1−p)^(n−k)', 'C(n,k)·pᵏ', 'n!·pᵏ'],
            optsDE: ['C(n,k)·pᵏ·(1−p)^(n−k)', 'pᵏ·(1−p)^(n−k)', 'C(n,k)·pᵏ', 'n!·pᵏ'],
            correct: 0
        },

        // ── BINOMIAL COEFFICIENT ──────────────────────────────────────────────
        {
            q: 'The binomial coefficient C(n,k) counts the number of ways to choose k items from n where:',
            qDE: 'Der Binomialkoeffizient C(n,k) zählt die Möglichkeiten, k Elemente aus n zu wählen, wobei:',
            opts: ['Order does NOT matter, no replacement', 'Order matters, no replacement', 'Order matters, with replacement', 'Order does NOT matter, with replacement'],
            optsDE: ['Reihenfolge KEINE Rolle spielt, ohne Zurücklegen', 'Reihenfolge zählt, ohne Zurücklegen', 'Reihenfolge zählt, mit Zurücklegen', 'Reihenfolge KEINE Rolle spielt, mit Zurücklegen'],
            correct: 0
        },
        {
            q: 'The binomial coefficient C(n, 0) equals:',
            qDE: 'Der Binomialkoeffizient C(n, 0) ist gleich:',
            opts: ['1 for any n ≥ 0', 'n', '0', 'n!'],
            optsDE: ['1 für beliebiges n ≥ 0', 'n', '0', 'n!'],
            correct: 0
        },
        {
            q: 'For the binomial coefficient we have C(n, k) = C(n, n−k). This symmetry means:',
            qDE: 'Für den Binomialkoeffizit gilt C(n, k) = C(n, n−k). Diese Symmetrie bedeutet:',
            opts: ['Choosing k items is equivalent to leaving out n−k items', 'C(n,k) is always even', 'k must equal n−k', 'The formula only works for k < n/2'],
            optsDE: ['k Elemente wählen ist gleichwertig dazu, n−k Elemente wegzulassen', 'C(n,k) ist immer gerade', 'k muss gleich n−k sein', 'Die Formel gilt nur für k < n/2'],
            correct: 0
        },

        // ── CONVOLUTION OF BINOMIAL DISTRIBUTIONS ────────────────────────────
        {
            q: 'If X ~ Bin(m, p) and Y ~ Bin(n, p) are independent, then X+Y follows:',
            qDE: 'Wenn X ~ Bin(m, p) und Y ~ Bin(n, p) unabhängig sind, folgt X+Y der Verteilung:',
            opts: ['Bin(m+n, p)', 'Bin(m·n, p)', 'Bin(m+n, 2p)', 'Bin(m+n, p²)'],
            optsDE: ['Bin(m+n, p)', 'Bin(m·n, p)', 'Bin(m+n, 2p)', 'Bin(m+n, p²)'],
            correct: 0
        },
        {
            q: 'The convolution property of the binomial distribution requires that both distributions have:',
            qDE: 'Die Faltungseigenschaft der Binomialverteilung erfordert, dass beide Verteilungen:',
            opts: ['The same success probability p', 'The same parameter n', 'Both n and p equal', 'Any parameters'],
            optsDE: ['Dieselbe Erfolgswahrscheinlichkeit p', 'Denselben Parameter n', 'Sowohl n als auch p gleich', 'Beliebige Parameter'],
            correct: 0
        },
        {
            q: 'X ~ Bin(3, 0.5) and Y ~ Bin(7, 0.5) are independent. What distribution does X+Y follow?',
            qDE: 'X ~ Bin(3; 0,5) und Y ~ Bin(7; 0,5) sind unabhängig. Welcher Verteilung folgt X+Y?',
            opts: ['Bin(10, 0.5)', 'Bin(21, 0.5)', 'Bin(10, 1)', 'Bin(4, 0.5)'],
            optsDE: ['Bin(10; 0,5)', 'Bin(21; 0,5)', 'Bin(10; 1)', 'Bin(4; 0,5)'],
            correct: 0
        },

        // ── DRAWING WITHOUT ORDER ─────────────────────────────────────────────
        {
            q: 'Drawing k items from n without replacement and ignoring order: the number of outcomes is:',
            qDE: 'k Elemente aus n ohne Zurücklegen ziehen, Reihenfolge egal: Anzahl der Ergebnisse ist:',
            opts: ['C(n,k)', 'nᵏ', 'n!/(n−k)!', 'k!'],
            optsDE: ['C(n,k)', 'nᵏ', 'n!/(n−k)!', 'k!'],
            correct: 0
        },
        {
            q: 'Drawing k items from n WITH replacement and ignoring order: the number of outcomes is:',
            qDE: 'k Elemente aus n MIT Zurücklegen, Reihenfolge egal: Anzahl der Ergebnisse ist:',
            opts: ['C(n+k−1, k)', 'C(n, k)', 'nᵏ', 'n!/(n−k)!'],
            optsDE: ['C(n+k−1, k)', 'C(n, k)', 'nᵏ', 'n!/(n−k)!'],
            correct: 0
        },
        {
            q: 'Which combinatorial model is used in the binomial distribution density?',
            qDE: 'Welches kombinatorische Modell wird in der Zähldichte der Binomialverteilung verwendet?',
            opts: ['Drawing without replacement, no order (binomial coefficient)', 'Drawing with replacement, with order', 'Drawing without replacement, with order', 'Drawing with replacement, no order'],
            optsDE: ['Ziehen ohne Zurücklegen, ohne Reihenfolge (Binomialkoeffizient)', 'Ziehen mit Zurücklegen, mit Reihenfolge', 'Ziehen ohne Zurücklegen, mit Reihenfolge', 'Ziehen mit Zurücklegen, ohne Reihenfolge'],
            correct: 0
        },




    ],

    5: [

        // --- Hypergeometrische Verteilung ---
        {
            q: 'A box contains 10 items, 4 of which are defective. You draw 3 without replacement. What distribution models the number of defective items drawn?',
            qDE: 'Eine Kiste enthält 10 Teile, davon 4 defekt. Man zieht 3 ohne Zurücklegen. Welche Verteilung modelliert die Anzahl defekter Teile?',
            opts: ['Hypergeometric', 'Binomial', 'Poisson', 'Geometric'],
            optsDE: ['Hypergeometrisch', 'Binomial', 'Poisson', 'Geometrisch'],
            correct: 0,
        },
        {
            q: 'For a hypergeometric distribution with N=20, K=8, n=5, what is the expected value E[X]?',
            qDE: 'Für eine hypergeometrische Verteilung mit N=20, K=8, n=5: Wie lautet der Erwartungswert E[X]?',
            opts: ['2', '2.5', '1.6', '4'],
            optsDE: ['2', '2.5', '1.6', '4'],
            correct: 0,
        },
        {
            q: 'The hypergeometric distribution differs from the binomial distribution primarily because:',
            qDE: 'Die hypergeometrische Verteilung unterscheidet sich von der Binomialverteilung hauptsächlich, weil:',
            opts: ['Draws are made without replacement', 'The number of trials is unlimited', 'Success probability changes each trial independently', 'It models continuous outcomes'],
            optsDE: ['Ziehungen ohne Zurücklegen erfolgen', 'Die Anzahl der Versuche unbegrenzt ist', 'Die Erfolgswahrscheinlichkeit unabhängig variiert', 'Stetige Ergebnisse modelliert werden'],
            correct: 0,
        },

        // --- Geometrische Verteilung ---
        {
            q: 'The geometric distribution models the number of trials until the first success. If p=0.25, what is E[X]?',
            qDE: 'Die geometrische Verteilung modelliert Versuche bis zum ersten Erfolg. Bei p=0.25: Was ist E[X]?',
            opts: ['4', '0.25', '3', '2'],
            optsDE: ['4', '0.25', '3', '2'],
            correct: 0,
        },
        {
            q: 'What is the variance of a geometrically distributed random variable X with success probability p?',
            qDE: 'Wie lautet die Varianz einer geometrisch verteilten Zufallsvariablen X mit Erfolgswahrscheinlichkeit p?',
            opts: ['(1−p)/p²', 'p/(1−p)', '1/p', 'p·(1−p)'],
            optsDE: ['(1−p)/p²', 'p/(1−p)', '1/p', 'p·(1−p)'],
            correct: 0,
        },
        {
            q: 'Which key property does the geometric distribution share with the exponential distribution?',
            qDE: 'Welche wichtige Eigenschaft teilt die geometrische Verteilung mit der Exponentialverteilung?',
            opts: ['Memorylessness', 'Symmetry', 'Finite support', 'Unimodality only at 0'],
            optsDE: ['Gedächtnislosigkeit', 'Symmetrie', 'Endlicher Träger', 'Unimodalität nur bei 0'],
            correct: 0,
        },

        // --- Bernoulli-Folge ---
        {
            q: 'A Bernoulli sequence consists of:',
            qDE: 'Eine Bernoulli-Folge besteht aus:',
            opts: ['Independent, identically distributed Bernoulli trials', 'Dependent trials with varying probabilities', 'Normally distributed random variables', 'Trials without a fixed success probability'],
            optsDE: ['Unabhängigen, gleichverteilten Bernoulli-Versuchen', 'Abhängigen Versuchen mit wechselnden Wahrscheinlichkeiten', 'Normalverteilten Zufallsvariablen', 'Versuchen ohne feste Erfolgswahrscheinlichkeit'],
            correct: 0,
        },
        {
            q: 'In a Bernoulli sequence with n=10 and p=0.3, X counts the successes. What is Var(X)?',
            qDE: 'In einer Bernoulli-Folge mit n=10 und p=0.3 zählt X die Erfolge. Was ist Var(X)?',
            opts: ['2.1', '3', '0.3', '0.9'],
            optsDE: ['2.1', '3', '0.3', '0.9'],
            correct: 0,
        },
        {
            q: 'A Bernoulli sequence with fixed p underlies which distribution for the total number of successes in n trials?',
            qDE: 'Eine Bernoulli-Folge mit festem p liegt welcher Verteilung der Gesamtzahl an Erfolgen in n Versuchen zugrunde?',
            opts: ['Binomial distribution', 'Poisson distribution', 'Exponential distribution', 'Uniform distribution'],
            optsDE: ['Binomialverteilung', 'Poisson-Verteilung', 'Exponentialverteilung', 'Gleichverteilung'],
            correct: 0,
        },

        // --- Negative Binomialverteilung ---
        {
            q: 'The negative binomial distribution models:',
            qDE: 'Die negative Binomialverteilung modelliert:',
            opts: ['The number of trials until the r-th success', 'The number of successes in n trials', 'The waiting time to any event', 'The spread of a continuous variable'],
            optsDE: ['Die Anzahl der Versuche bis zum r-ten Erfolg', 'Die Anzahl der Erfolge in n Versuchen', 'Die Wartezeit bis zu einem beliebigen Ereignis', 'Die Streuung einer stetigen Variable'],
            correct: 0,
        },
        {
            q: 'For a negative binomial distribution with r=3 and p=0.5, what is E[X] (number of trials until r-th success)?',
            qDE: 'Für eine negative Binomialverteilung mit r=3 und p=0.5: Was ist E[X] (Versuche bis zum r-ten Erfolg)?',
            opts: ['6', '3', '1.5', '9'],
            optsDE: ['6', '3', '1.5', '9'],
            correct: 0,
        },
        {
            q: 'The geometric distribution is a special case of the negative binomial distribution with:',
            qDE: 'Die geometrische Verteilung ist ein Spezialfall der negativen Binomialverteilung mit:',
            opts: ['r = 1', 'r = 0', 'p = 0.5', 'n = 1'],
            optsDE: ['r = 1', 'r = 0', 'p = 0.5', 'n = 1'],
            correct: 0,
        },

        // --- Poisson-Verteilung ---
        {
            q: 'A Poisson-distributed random variable X with parameter λ has E[X] = ?',
            qDE: 'Eine Poisson-verteilte Zufallsvariable X mit Parameter λ hat E[X] = ?',
            opts: ['λ', 'λ²', '1/λ', '√λ'],
            optsDE: ['λ', 'λ²', '1/λ', '√λ'],
            correct: 0,
        },
        {
            q: 'For the Poisson distribution, which statement is true about mean and variance?',
            qDE: 'Welche Aussage gilt für Erwartungswert und Varianz der Poisson-Verteilung?',
            opts: ['E[X] = Var(X) = λ', 'E[X] = λ, Var(X) = λ²', 'E[X] = 1/λ, Var(X) = λ', 'E[X] = λ², Var(X) = λ'],
            optsDE: ['E[X] = Var(X) = λ', 'E[X] = λ, Var(X) = λ²', 'E[X] = 1/λ, Var(X) = λ', 'E[X] = λ², Var(X) = λ'],
            correct: 0,
        },
        {
            q: 'The Poisson distribution is appropriate to model:',
            qDE: 'Die Poisson-Verteilung eignet sich zur Modellierung von:',
            opts: ['Rare events occurring at a constant average rate', 'Outcomes of a fair coin flip', 'Continuous measurements like height', 'Exactly two possible outcomes per trial'],
            optsDE: ['Seltenen Ereignissen mit konstanter Durchschnittsrate', 'Ergebnissen eines fairen Münzwurfs', 'Stetigen Messungen wie Körpergröße', 'Genau zwei möglichen Ausgängen je Versuch'],
            correct: 0,
        },

        // --- Poisson-Grenzwertsatz (Binomial → Poisson) ---
        {
            q: 'The Poisson limit theorem states that as n → ∞ and p → 0, the binomial distribution converges to Poisson with parameter:',
            qDE: 'Der Poisson-Grenzwertsatz besagt: Für n→∞ und p→0 konvergiert die Binomialverteilung gegen Poisson mit Parameter:',
            opts: ['λ = n·p', 'λ = n/p', 'λ = p/n', 'λ = n+p'],
            optsDE: ['λ = n·p', 'λ = n/p', 'λ = p/n', 'λ = n+p'],
            correct: 0,
        },
        {
            q: 'Which rule of thumb justifies approximating Bin(n,p) by Poisson(λ)?',
            qDE: 'Welche Faustregel rechtfertigt die Annäherung von Bin(n,p) durch Poisson(λ)?',
            opts: ['n large and p small, so that n·p stays moderate', 'n small and p close to 0.5', 'n and p both large', 'p > 0.1 always'],
            optsDE: ['n groß und p klein, sodass n·p moderat bleibt', 'n klein und p nahe 0.5', 'n und p beide groß', 'p > 0.1 immer'],
            correct: 0,
        },
        {
            q: 'In n=500 trials each with p=0.004, we approximate X ~ Bin(500, 0.004) by a Poisson. What is λ?',
            qDE: 'Bei n=500 Versuchen mit p=0.004 nähern wir X ~ Bin(500, 0.004) durch eine Poissonverteilung an. Was ist λ?',
            opts: ['2', '0.004', '500', '0.5'],
            optsDE: ['2', '0.004', '500', '0.5'],
            correct: 0,
        },

        // --- Stetige Gleichverteilung ---
        {
            q: 'For X ~ U(a, b), what is the expected value E[X]?',
            qDE: 'Für X ~ U(a, b): Wie lautet der Erwartungswert E[X]?',
            opts: ['(a+b)/2', '(b−a)/2', 'a·b', '1/(b−a)'],
            optsDE: ['(a+b)/2', '(b−a)/2', 'a·b', '1/(b−a)'],
            correct: 0,
        },
        {
            q: 'For X ~ U(0, 6), what is Var(X)?',
            qDE: 'Für X ~ U(0, 6): Wie groß ist Var(X)?',
            opts: ['3', '6', '36', '1'],
            optsDE: ['3', '6', '36', '1'],
            correct: 0,
        },
        {
            q: 'The PDF of the continuous uniform distribution on [a, b] is:',
            qDE: 'Die Dichtefunktion der stetigen Gleichverteilung auf [a, b] lautet:',
            opts: ['1/(b−a) for x∈[a,b], else 0', '1/(b+a) for x∈[a,b], else 0', 'b−a for x∈[a,b], else 0', '2/(b−a) for x∈[a,b], else 0'],
            optsDE: ['1/(b−a) für x∈[a,b], sonst 0', '1/(b+a) für x∈[a,b], sonst 0', 'b−a für x∈[a,b], sonst 0', '2/(b−a) für x∈[a,b], sonst 0'],
            correct: 0,
        },

        // --- Exponentialverteilung ---
        {
            q: 'For X ~ Exp(λ), what is the expected value E[X]?',
            qDE: 'Für X ~ Exp(λ): Wie lautet der Erwartungswert E[X]?',
            opts: ['1/λ', 'λ', 'λ²', '1/λ²'],
            optsDE: ['1/λ', 'λ', 'λ²', '1/λ²'],
            correct: 0,
        },
        {
            q: 'The exponential distribution is memoryless. This means:',
            qDE: 'Die Exponentialverteilung ist gedächtnislos. Das bedeutet:',
            opts: ['P(X > s+t | X > s) = P(X > t)', 'P(X > s+t) = P(X > s) + P(X > t)', 'Past waiting time increases future probability', 'The distribution resets only at integer times'],
            optsDE: ['P(X > s+t | X > s) = P(X > t)', 'P(X > s+t) = P(X > s) + P(X > t)', 'Vergangene Wartezeit erhöht künftige Wahrscheinlichkeit', 'Die Verteilung setzt nur zu ganzzahligen Zeiten zurück'],
            correct: 0,
        },
        {
            q: 'For X ~ Exp(2), what is Var(X)?',
            qDE: 'Für X ~ Exp(2): Was ist Var(X)?',
            opts: ['0.25', '0.5', '2', '4'],
            optsDE: ['0.25', '0.5', '2', '4'],
            correct: 0,
        },

        // --- Normalverteilung ---
        {
            q: 'The standard normal distribution N(0,1) has mean and variance:',
            qDE: 'Die Standardnormalverteilung N(0,1) hat Erwartungswert und Varianz:',
            opts: ['μ=0, σ²=1', 'μ=1, σ²=0', 'μ=0, σ²=0', 'μ=1, σ²=1'],
            optsDE: ['μ=0, σ²=1', 'μ=1, σ²=0', 'μ=0, σ²=0', 'μ=1, σ²=1'],
            correct: 0,
        },
        {
            q: 'The normal distribution is symmetric around its mean. What fraction of values lies within μ ± σ (approximately)?',
            qDE: 'Die Normalverteilung ist symmetrisch um ihren Erwartungswert. Welcher Anteil liegt in μ ± σ (ca.)?',
            opts: ['68%', '95%', '99.7%', '50%'],
            optsDE: ['68%', '95%', '99.7%', '50%'],
            correct: 0,
        },
        {
            q: 'To standardize X ~ N(μ, σ²), you compute Z = ?',
            qDE: 'Um X ~ N(μ, σ²) zu standardisieren, berechnet man Z = ?',
            opts: ['(X − μ) / σ', '(X + μ) / σ', 'X / μ', '(X − σ) / μ'],
            optsDE: ['(X − μ) / σ', '(X + μ) / σ', 'X / μ', '(X − σ) / μ'],
            correct: 0,
        },

        // --- Rechnen mit normalverteilten Zufallsvariablen ---
        {
            q: 'If X ~ N(μ₁, σ₁²) and Y ~ N(μ₂, σ₂²) are independent, what is the distribution of X + Y?',
            qDE: 'Wenn X ~ N(μ₁, σ₁²) und Y ~ N(μ₂, σ₂²) unabhängig sind, welche Verteilung hat X + Y?',
            opts: ['N(μ₁+μ₂, σ₁²+σ₂²)', 'N(μ₁·μ₂, σ₁²·σ₂²)', 'N(μ₁−μ₂, σ₁²−σ₂²)', 'Not normally distributed'],
            optsDE: ['N(μ₁+μ₂, σ₁²+σ₂²)', 'N(μ₁·μ₂, σ₁²·σ₂²)', 'N(μ₁−μ₂, σ₁²−σ₂²)', 'Nicht normalverteilt'],
            correct: 0,
        },
        {
            q: 'If X ~ N(3, 4) and a = 2, b = 1, what is the distribution of a·X + b?',
            qDE: 'Wenn X ~ N(3, 4), a = 2, b = 1: Welche Verteilung hat a·X + b?',
            opts: ['N(7, 16)', 'N(6, 8)', 'N(7, 8)', 'N(6, 16)'],
            optsDE: ['N(7, 16)', 'N(6, 8)', 'N(7, 8)', 'N(6, 16)'],
            correct: 0,
        },
        {
            q: 'P(X ≤ μ) for X ~ N(μ, σ²) equals:',
            qDE: 'P(X ≤ μ) für X ~ N(μ, σ²) beträgt:',
            opts: ['0.5', '0', '1', 'Depends on σ'],
            optsDE: ['0.5', '0', '1', 'Hängt von σ ab'],
            correct: 0,
        },

        // --- Zufallsvektoren ---
        {
            q: 'A random vector (X, Y) is characterized by its:',
            qDE: 'Ein Zufallsvektor (X, Y) wird beschrieben durch seine:',
            opts: ['Joint distribution', 'Marginal distribution of X only', 'Sum X + Y', 'Individual variances only'],
            optsDE: ['Gemeinsame Verteilung', 'Nur Randverteilung von X', 'Summe X + Y', 'Nur die einzelnen Varianzen'],
            correct: 0,
        },
        {
            q: 'The covariance Cov(X, Y) = 0 implies:',
            qDE: 'Die Kovarianz Cov(X, Y) = 0 impliziert:',
            opts: ['X and Y are uncorrelated (but not necessarily independent)', 'X and Y are independent', 'X and Y are identical', 'Var(X+Y) = 0'],
            optsDE: ['X und Y sind unkorreliert (aber nicht unbedingt unabhängig)', 'X und Y sind unabhängig', 'X und Y sind identisch', 'Var(X+Y) = 0'],
            correct: 0,
        },
        {
            q: 'For a random vector (X, Y), the covariance matrix is:',
            qDE: 'Für einen Zufallsvektor (X, Y) ist die Kovarianzmatrix:',
            opts: ['Always symmetric and positive semi-definite', 'Always diagonal', 'Always invertible', 'Defined only for independent components'],
            optsDE: ['Stets symmetrisch und positiv semidefinit', 'Stets diagonal', 'Stets invertierbar', 'Nur für unabhängige Komponenten definiert'],
            correct: 0,
        },

        // --- Verteilung von Zufallsvektoren ---
        {
            q: 'The marginal distribution of X is obtained from the joint density f(x,y) by:',
            qDE: 'Die Randverteilung von X erhält man aus der gemeinsamen Dichte f(x,y) durch:',
            opts: ['Integrating (or summing) over all values of y', 'Dividing by f(y)', 'Multiplying f(x) · f(y)', 'Setting y = 0'],
            optsDE: ['Integration (bzw. Summation) über alle y-Werte', 'Division durch f(y)', 'Multiplikation f(x) · f(y)', 'Setzen von y = 0'],
            correct: 0,
        },
        {
            q: 'If (X, Y) is jointly normal with zero means, the joint density depends on:',
            qDE: 'Wenn (X, Y) gemeinsam normalverteilt ist mit Nullmittelwerten, hängt die gemeinsame Dichte ab von:',
            opts: ['σ_X, σ_Y, and the correlation ρ', 'Only σ_X and σ_Y', 'Only the means', 'The sum X+Y only'],
            optsDE: ['σ_X, σ_Y und der Korrelation ρ', 'Nur σ_X und σ_Y', 'Nur den Erwartungswerten', 'Nur der Summe X+Y'],
            correct: 0,
        },
        {
            q: 'For a discrete random vector (X, Y), the joint probability mass function satisfies:',
            qDE: 'Für einen diskreten Zufallsvektor (X, Y) gilt für die gemeinsame Zähldichte:',
            opts: ['∑_x ∑_y P(X=x, Y=y) = 1', '∑_x P(X=x, Y=y) = P(Y=y) only if X ⊥ Y', 'P(X=x, Y=y) ≥ 1 for all x,y', 'It equals the product of CDFs'],
            optsDE: ['∑_x ∑_y P(X=x, Y=y) = 1', '∑_x P(X=x, Y=y) = P(Y=y) nur bei X ⊥ Y', 'P(X=x, Y=y) ≥ 1 für alle x,y', 'Sie entspricht dem Produkt der Verteilungsfunktionen'],
            correct: 0,
        },

        // --- Produktverteilung bei Unabhängigkeit ---
        {
            q: 'X and Y are independent if and only if their joint density satisfies:',
            qDE: 'X und Y sind unabhängig genau dann, wenn ihre gemeinsame Dichte gilt:',
            opts: ['f(x,y) = f_X(x) · f_Y(y)', 'f(x,y) = f_X(x) + f_Y(y)', 'f(x,y) = f_X(x) / f_Y(y)', 'f(x,y) = f_X(y) · f_Y(x)'],
            optsDE: ['f(x,y) = f_X(x) · f_Y(y)', 'f(x,y) = f_X(x) + f_Y(y)', 'f(x,y) = f_X(x) / f_Y(y)', 'f(x,y) = f_X(y) · f_Y(x)'],
            correct: 0,
        },
        {
            q: 'If X and Y are independent, then Cov(X, Y) = ?',
            qDE: 'Wenn X und Y unabhängig sind, dann gilt Cov(X, Y) = ?',
            opts: ['0', '1', 'E[X]·E[Y]', 'Var(X)·Var(Y)'],
            optsDE: ['0', '1', 'E[X]·E[Y]', 'Var(X)·Var(Y)'],
            correct: 0,
        },
        {
            q: 'If X ~ Exp(2) and Y ~ Exp(3) are independent, which statement is true?',
            qDE: 'Wenn X ~ Exp(2) und Y ~ Exp(3) unabhängig sind, welche Aussage stimmt?',
            opts: ['f(x,y) = 6·e^(−2x)·e^(−3y) for x,y ≥ 0', 'f(x,y) = e^(−2x−3y)/(2+3)', 'f(x,y) = f_X(x+y)', 'f(x,y) = 5·e^(−5(x+y))'],
            optsDE: ['f(x,y) = 6·e^(−2x)·e^(−3y) für x,y ≥ 0', 'f(x,y) = e^(−2x−3y)/(2+3)', 'f(x,y) = f_X(x+y)', 'f(x,y) = 5·e^(−5(x+y))'],
            correct: 0,
        },

        // --- Bedingte Zähldichte ---
        {
            q: 'The conditional probability mass function of X given Y=y is defined as:',
            qDE: 'Die bedingte Zähldichte von X gegeben Y=y ist definiert als:',
            opts: ['P(X=x | Y=y) = P(X=x, Y=y) / P(Y=y)', 'P(X=x | Y=y) = P(X=x) · P(Y=y)', 'P(X=x | Y=y) = P(Y=y) / P(X=x)', 'P(X=x | Y=y) = P(X=x) + P(Y=y)'],
            optsDE: ['P(X=x | Y=y) = P(X=x, Y=y) / P(Y=y)', 'P(X=x | Y=y) = P(X=x) · P(Y=y)', 'P(X=x | Y=y) = P(Y=y) / P(X=x)', 'P(X=x | Y=y) = P(X=x) + P(Y=y)'],
            correct: 0,
        },
        {
            q: 'If X and Y are independent, then the conditional PMF of X given Y=y equals:',
            qDE: 'Wenn X und Y unabhängig sind, gilt für die bedingte Zähldichte von X gegeben Y=y:',
            opts: ['P(X=x)', 'P(Y=y)', 'P(X=x)·P(Y=y)', '1'],
            optsDE: ['P(X=x)', 'P(Y=y)', 'P(X=x)·P(Y=y)', '1'],
            correct: 0,
        },
        {
            q: 'The law of total probability for the marginal PMF of Y uses the conditional PMF how?',
            qDE: 'Das Gesetz der totalen Wahrscheinlichkeit für die Randverteilung von Y nutzt die bedingte Zähldichte wie?',
            opts: ['P(Y=y) = ∑_x P(Y=y | X=x)·P(X=x)', 'P(Y=y) = P(Y=y | X=x) for any x', 'P(Y=y) = ∏_x P(Y=y | X=x)', 'P(Y=y) = P(Y=y | X=x) / P(X=x)'],
            optsDE: ['P(Y=y) = ∑_x P(Y=y | X=x)·P(X=x)', 'P(Y=y) = P(Y=y | X=x) für ein beliebiges x', 'P(Y=y) = ∏_x P(Y=y | X=x)', 'P(Y=y) = P(Y=y | X=x) / P(X=x)'],
            correct: 0,
        },


    ],


    6: [


        // --- Simpsons Paradoxon ---
        {
            q: "Simpson's paradox occurs when a trend appears in grouped data but:",
            qDE: "Das Simpsons Paradoxon tritt auf, wenn ein Trend in gruppierten Daten erscheint, aber:",
            opts: ["Disappears or reverses when the groups are combined", "Strengthens when the groups are combined", "Only appears in continuous data", "Only affects the median, not the mean"],
            optsDE: ["Verschwindet oder umgekehrt wird, wenn die Gruppen zusammengefasst werden", "Sich verstärkt, wenn die Gruppen zusammengefasst werden", "Nur bei stetigen Daten auftritt", "Nur den Median, nicht den Erwartungswert betrifft"],
            correct: 0,
        },
        {
            q: "The main cause of Simpson's paradox is typically:",
            qDE: "Die Hauptursache des Simpsons Paradoxons ist typischerweise:",
            opts: ["A lurking (confounding) variable that is not accounted for", "A calculation error in the marginal probabilities", "Too small a sample size in each group", "Non-normal distribution of the data"],
            optsDE: ["Eine verborgene (konfundierende) Variable, die nicht berücksichtigt wird", "Ein Rechenfehler bei den Randwahrscheinlichkeiten", "Zu kleiner Stichprobenumfang in jeder Gruppe", "Nicht-normale Verteilung der Daten"],
            correct: 0,
        },
        {
            q: "Simpson's paradox is most relevant as a warning against:",
            qDE: "Das Simpsons Paradoxon ist vor allem eine Warnung vor:",
            opts: ["Naively aggregating data without controlling for confounders", "Using conditional probabilities", "Computing marginal distributions", "Applying the law of total expectation"],
            optsDE: ["Naiver Datenaggregation ohne Kontrolle von Störvariablen", "Der Verwendung bedingter Wahrscheinlichkeiten", "Der Berechnung von Randverteilungen", "Der Anwendung des Gesetzes der totalen Erwartung"],
            correct: 0,
        },

        // --- Bedingte Dichte ---
        {
            q: "The conditional density of X given Y=y is defined as:",
            qDE: "Die bedingte Dichte von X gegeben Y=y ist definiert als:",
            opts: ["f_{X|Y}(x|y) = f(x,y) / f_Y(y)", "f_{X|Y}(x|y) = f_X(x) · f_Y(y)", "f_{X|Y}(x|y) = f_Y(y) / f(x,y)", "f_{X|Y}(x|y) = f(x,y) − f_Y(y)"],
            optsDE: ["f_{X|Y}(x|y) = f(x,y) / f_Y(y)", "f_{X|Y}(x|y) = f_X(x) · f_Y(y)", "f_{X|Y}(x|y) = f_Y(y) / f(x,y)", "f_{X|Y}(x|y) = f(x,y) − f_Y(y)"],
            correct: 0,
        },
        {
            q: "For the conditional density f_{X|Y}(x|y) to be valid, it must satisfy:",
            qDE: "Damit die bedingte Dichte f_{X|Y}(x|y) gültig ist, muss gelten:",
            opts: ["∫ f_{X|Y}(x|y) dx = 1 for each fixed y", "∫∫ f_{X|Y}(x|y) dx dy = 1", "f_{X|Y}(x|y) = f_{Y|X}(y|x)", "f_{X|Y}(x|y) ≥ f_X(x) for all x"],
            optsDE: ["∫ f_{X|Y}(x|y) dx = 1 für jedes feste y", "∫∫ f_{X|Y}(x|y) dx dy = 1", "f_{X|Y}(x|y) = f_{Y|X}(y|x)", "f_{X|Y}(x|y) ≥ f_X(x) für alle x"],
            correct: 0,
        },
        {
            q: "The joint density f(x,y) can be recovered from the conditional density via:",
            qDE: "Die gemeinsame Dichte f(x,y) lässt sich aus der bedingten Dichte zurückgewinnen durch:",
            opts: ["f(x,y) = f_{X|Y}(x|y) · f_Y(y)", "f(x,y) = f_{X|Y}(x|y) + f_Y(y)", "f(x,y) = f_{X|Y}(x|y) / f_Y(y)", "f(x,y) = f_{X|Y}(x|y) · f_X(x)"],
            optsDE: ["f(x,y) = f_{X|Y}(x|y) · f_Y(y)", "f(x,y) = f_{X|Y}(x|y) + f_Y(y)", "f(x,y) = f_{X|Y}(x|y) / f_Y(y)", "f(x,y) = f_{X|Y}(x|y) · f_X(x)"],
            correct: 0,
        },

        // --- Kriterium für Unabhängigkeit über bedingte Dichten ---
        {
            q: "In the continuous case, X and Y are independent if and only if:",
            qDE: "Im stetigen Fall sind X und Y unabhängig genau dann, wenn:",
            opts: ["f_{X|Y}(x|y) = f_X(x) for all x, y", "f_{X|Y}(x|y) = f_Y(y) for all x, y", "f_{X|Y}(x|y) = f(x,y) for all x, y", "f_{X|Y}(x|y) = 0 for all x ≠ y"],
            optsDE: ["f_{X|Y}(x|y) = f_X(x) für alle x, y", "f_{X|Y}(x|y) = f_Y(y) für alle x, y", "f_{X|Y}(x|y) = f(x,y) für alle x, y", "f_{X|Y}(x|y) = 0 für alle x ≠ y"],
            correct: 0,
        },
        {
            q: "In the discrete case, X ⊥ Y if and only if for all x, y:",
            qDE: "Im diskreten Fall gilt X ⊥ Y genau dann, wenn für alle x, y:",
            opts: ["P(X=x, Y=y) = P(X=x) · P(Y=y)", "P(X=x | Y=y) = P(Y=y)", "P(X=x, Y=y) = P(X=x) + P(Y=y)", "P(X=x | Y=y) = 0"],
            optsDE: ["P(X=x, Y=y) = P(X=x) · P(Y=y)", "P(X=x | Y=y) = P(Y=y)", "P(X=x, Y=y) = P(X=x) + P(Y=y)", "P(X=x | Y=y) = 0"],
            correct: 0,
        },
        {
            q: "If the joint density factors as f(x,y) = g(x) · h(y), then X and Y are:",
            qDE: "Wenn die gemeinsame Dichte faktorisiert als f(x,y) = g(x) · h(y), dann sind X und Y:",
            opts: ["Independent", "Uncorrelated but not necessarily independent", "Identically distributed", "Jointly normally distributed"],
            optsDE: ["Unabhängig", "Unkorreliert, aber nicht notwendig unabhängig", "Identisch verteilt", "Gemeinsam normalverteilt"],
            correct: 0,
        },

        // --- Bedingter Erwartungswert (diskret und stetig) ---
        {
            q: "The conditional expectation E[X | Y=y] in the continuous case is computed as:",
            qDE: "Der bedingte Erwartungswert E[X | Y=y] im stetigen Fall wird berechnet als:",
            opts: ["∫ x · f_{X|Y}(x|y) dx", "∫ x · f_X(x) dx", "∫ x · f(x,y) dx", "∫ x · f_Y(y) dx"],
            optsDE: ["∫ x · f_{X|Y}(x|y) dx", "∫ x · f_X(x) dx", "∫ x · f(x,y) dx", "∫ x · f_Y(y) dx"],
            correct: 0,
        },
        {
            q: "The tower property (law of total expectation) states:",
            qDE: "Die Turmregel (Gesetz der totalen Erwartung) besagt:",
            opts: ["E[X] = E[E[X | Y]]", "E[X | Y] = E[X] · E[Y]", "E[X] = E[X | Y] + E[Y]", "E[X | Y] = E[Y | X]"],
            optsDE: ["E[X] = E[E[X | Y]]", "E[X | Y] = E[X] · E[Y]", "E[X] = E[X | Y] + E[Y]", "E[X | Y] = E[Y | X]"],
            correct: 0,
        },
        {
            q: "If X and Y are independent, then E[X | Y=y] equals:",
            qDE: "Wenn X und Y unabhängig sind, dann gilt E[X | Y=y] =",
            opts: ["E[X]", "E[Y]", "E[X] · E[Y]", "E[X + Y]"],
            optsDE: ["E[X]", "E[Y]", "E[X] · E[Y]", "E[X + Y]"],
            correct: 0,
        },

        // --- Zufallszahlen mit Box-Muller-Methode ---
        {
            q: "The Box–Muller transform converts which input into standard normal random numbers?",
            qDE: "Die Box-Muller-Methode wandelt welche Eingabe in standardnormalverteilte Zufallszahlen um?",
            opts: ["Two independent uniform random numbers on (0,1)", "One exponentially distributed random number", "Two standard normal random numbers", "One uniform and one exponential random number"],
            optsDE: ["Zwei unabhängige gleichverteilte Zufallszahlen auf (0,1)", "Eine exponentialverteilte Zufallszahl", "Zwei standardnormalverteilte Zufallszahlen", "Eine gleichverteilte und eine exponentialverteilte Zufallszahl"],
            correct: 0,
        },
        {
            q: "In the Box–Muller method with U₁, U₂ ~ Uniform(0,1), the formula Z₁ = √(−2 ln U₁) · cos(2πU₂) produces:",
            qDE: "Bei der Box-Muller-Methode mit U₁, U₂ ~ Gleichverteilung(0,1) erzeugt Z₁ = √(−2 ln U₁) · cos(2πU₂):",
            opts: ["A standard normal N(0,1) random variable", "A uniform random variable", "An exponential random variable", "A chi-squared random variable"],
            optsDE: ["Eine standardnormalverteilte N(0,1) Zufallsvariable", "Eine gleichverteilte Zufallsvariable", "Eine exponentialverteilte Zufallsvariable", "Eine chi-quadrat-verteilte Zufallsvariable"],
            correct: 0,
        },
        {
            q: "A key advantage of the Box–Muller method is that it produces normal random variables:",
            qDE: "Ein wesentlicher Vorteil der Box-Muller-Methode ist, dass sie Normalzufallszahlen erzeugt:",
            opts: ["Exactly, not just approximately", "Only approximately via the CLT", "Using only one uniform input", "Without any trigonometric functions"],
            optsDE: ["Exakt, nicht nur näherungsweise", "Nur näherungsweise über den ZGS", "Mit nur einer gleichverteilten Eingabe", "Ohne trigonometrische Funktionen"],
            correct: 0,
        },

        // --- Erwartungswertvektor ---
        {
            q: "The expected value vector (mean vector) of a random vector (X₁, …, Xₙ) is:",
            qDE: "Der Erwartungswertvektor eines Zufallsvektors (X₁, …, Xₙ) ist:",
            opts: ["The vector (E[X₁], …, E[Xₙ])", "The vector of variances (Var(X₁), …, Var(Xₙ))", "The covariance matrix diagonal", "E[X₁ + … + Xₙ] as a scalar"],
            optsDE: ["Der Vektor (E[X₁], …, E[Xₙ])", "Der Varianzvektor (Var(X₁), …, Var(Xₙ))", "Die Diagonale der Kovarianzmatrix", "E[X₁ + … + Xₙ] als Skalar"],
            correct: 0,
        },
        {
            q: "For a linear transformation Y = AX + b, the expected value vector E[Y] equals:",
            qDE: "Für eine lineare Transformation Y = AX + b gilt für den Erwartungswertvektor E[Y]:",
            opts: ["A·E[X] + b", "E[X] + b", "A·E[X]", "A·b + E[X]"],
            optsDE: ["A·E[X] + b", "E[X] + b", "A·E[X]", "A·b + E[X]"],
            correct: 0,
        },
        {
            q: "The mean vector of a sum X + Y of two random vectors equals:",
            qDE: "Der Erwartungswertvektor einer Summe X + Y zweier Zufallsvektoren ist:",
            opts: ["E[X] + E[Y] (always, regardless of dependence)", "E[X] + E[Y] only if X and Y are independent", "E[X] · E[Y]", "E[X] only if X and Y are identically distributed"],
            optsDE: ["E[X] + E[Y] (stets, unabhängig von Abhängigkeit)", "E[X] + E[Y] nur bei Unabhängigkeit", "E[X] · E[Y]", "E[X], nur wenn X und Y identisch verteilt sind"],
            correct: 0,
        },

        // --- Kovarianz ---
        {
            q: "The covariance of X and Y is defined as:",
            qDE: "Die Kovarianz von X und Y ist definiert als:",
            opts: ["Cov(X,Y) = E[(X − E[X])(Y − E[Y])]", "Cov(X,Y) = E[X] · E[Y]", "Cov(X,Y) = E[X²] − E[Y²]", "Cov(X,Y) = Var(X) + Var(Y)"],
            optsDE: ["Cov(X,Y) = E[(X − E[X])(Y − E[Y])]", "Cov(X,Y) = E[X] · E[Y]", "Cov(X,Y) = E[X²] − E[Y²]", "Cov(X,Y) = Var(X) + Var(Y)"],
            correct: 0,
        },
        {
            q: "The computational shortcut for covariance is:",
            qDE: "Die Verschiebungsformel für die Kovarianz lautet:",
            opts: ["Cov(X,Y) = E[XY] − E[X]·E[Y]", "Cov(X,Y) = E[XY] + E[X]·E[Y]", "Cov(X,Y) = E[X²Y²] − E[XY]", "Cov(X,Y) = E[XY] / (E[X]·E[Y])"],
            optsDE: ["Cov(X,Y) = E[XY] − E[X]·E[Y]", "Cov(X,Y) = E[XY] + E[X]·E[Y]", "Cov(X,Y) = E[X²Y²] − E[XY]", "Cov(X,Y) = E[XY] / (E[X]·E[Y])"],
            correct: 0,
        },
        {
            q: "Cov(X, X) equals:",
            qDE: "Cov(X, X) ist gleich:",
            opts: ["Var(X)", "E[X]²", "0", "E[X²]"],
            optsDE: ["Var(X)", "E[X]²", "0", "E[X²]"],
            correct: 0,
        },

        // --- Kovarianzmatrix ---
        {
            q: "The covariance matrix Σ of a random vector X has entries Σ_{ij} =",
            qDE: "Die Kovarianzmatrix Σ eines Zufallsvektors X hat Einträge Σ_{ij} =",
            opts: ["Cov(Xᵢ, Xⱼ)", "E[Xᵢ] · E[Xⱼ]", "Var(Xᵢ) + Var(Xⱼ)", "Corr(Xᵢ, Xⱼ)"],
            optsDE: ["Cov(Xᵢ, Xⱼ)", "E[Xᵢ] · E[Xⱼ]", "Var(Xᵢ) + Var(Xⱼ)", "Corr(Xᵢ, Xⱼ)"],
            correct: 0,
        },
        {
            q: "For a linear transformation Y = AX, the covariance matrix of Y is:",
            qDE: "Für eine lineare Transformation Y = AX ist die Kovarianzmatrix von Y:",
            opts: ["A · Σ_X · Aᵀ", "A · Σ_X", "Σ_X · Aᵀ", "Aᵀ · Σ_X · A"],
            optsDE: ["A · Σ_X · Aᵀ", "A · Σ_X", "Σ_X · Aᵀ", "Aᵀ · Σ_X · A"],
            correct: 0,
        },
        {
            q: "The covariance matrix is always:",
            qDE: "Die Kovarianzmatrix ist stets:",
            opts: ["Symmetric and positive semi-definite", "Diagonal", "Invertible", "An identity matrix scaled by σ²"],
            optsDE: ["Symmetrisch und positiv semidefinit", "Diagonal", "Invertierbar", "Eine mit σ² skalierte Einheitsmatrix"],
            correct: 0,
        },

        // --- Unkorreliert ---
        {
            q: "Two random variables X and Y are uncorrelated if:",
            qDE: "Zwei Zufallsvariablen X und Y sind unkorreliert, wenn:",
            opts: ["Cov(X,Y) = 0", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 0"],
            optsDE: ["Cov(X,Y) = 0", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 0"],
            correct: 0,
        },
        {
            q: "Independence implies uncorrelatedness, but not vice versa. A counterexample is:",
            qDE: "Unabhängigkeit impliziert Unkorreliertheit, aber nicht umgekehrt. Ein Gegenbeispiel ist:",
            opts: ["X ~ Uniform(−1,1) and Y = X²", "X and Y both standard normal and independent", "X and Y with the same distribution", "X and Y both Ber(0.5)"],
            optsDE: ["X ~ Gleichverteilung(−1,1) und Y = X²", "X und Y beide standardnormalverteilt und unabhängig", "X und Y mit gleicher Verteilung", "X und Y beide Ber(0.5)"],
            correct: 0,
        },
        {
            q: "For jointly normal X and Y, uncorrelatedness implies:",
            qDE: "Für gemeinsam normalverteilte X und Y impliziert Unkorreliertheit:",
            opts: ["Independence", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 1"],
            optsDE: ["Unabhängigkeit", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 1"],
            correct: 0,
        },

        // --- Korrelation ---
        {
            q: "The correlation coefficient of X and Y is defined as:",
            qDE: "Der Korrelationskoeffizient von X und Y ist definiert als:",
            opts: ["Corr(X,Y) = Cov(X,Y) / (σ_X · σ_Y)", "Corr(X,Y) = Cov(X,Y) · σ_X · σ_Y", "Corr(X,Y) = Cov(X,Y) / Var(X)", "Corr(X,Y) = E[XY] / E[X+Y]"],
            optsDE: ["Corr(X,Y) = Cov(X,Y) / (σ_X · σ_Y)", "Corr(X,Y) = Cov(X,Y) · σ_X · σ_Y", "Corr(X,Y) = Cov(X,Y) / Var(X)", "Corr(X,Y) = E[XY] / E[X+Y]"],
            correct: 0,
        },
        {
            q: "The correlation coefficient always lies in the range:",
            qDE: "Der Korrelationskoeffizient liegt stets im Bereich:",
            opts: ["[−1, 1]", "[0, 1]", "[−∞, ∞]", "[0, ∞)"],
            optsDE: ["[−1, 1]", "[0, 1]", "[−∞, ∞]", "[0, ∞)"],
            correct: 0,
        },
        {
            q: "Corr(X,Y) = 1 means:",
            qDE: "Corr(X,Y) = 1 bedeutet:",
            opts: ["X and Y are perfectly linearly related with positive slope", "X and Y are independent", "Var(X) = Var(Y)", "E[X] = E[Y]"],
            optsDE: ["X und Y sind perfekt linear abhängig mit positiver Steigung", "X und Y sind unabhängig", "Var(X) = Var(Y)", "E[X] = E[Y]"],
            correct: 0,
        },

        // --- Rechenregel für Kovarianz inkl. Cauchy-Schwarz ---
        {
            q: "The bilinearity rule for covariance gives Cov(aX + b, Y) =",
            qDE: "Die Bilinearitätsregel für die Kovarianz ergibt Cov(aX + b, Y) =",
            opts: ["a · Cov(X,Y)", "a · Cov(X,Y) + b", "Cov(X,Y) + b · Cov(1,Y)", "a · Var(X)"],
            optsDE: ["a · Cov(X,Y)", "a · Cov(X,Y) + b", "Cov(X,Y) + b · Cov(1,Y)", "a · Var(X)"],
            correct: 0,
        },
        {
            q: "The Cauchy–Schwarz inequality for random variables states:",
            qDE: "Die Cauchy-Schwarz-Ungleichung für Zufallsvariablen besagt:",
            opts: ["|Cov(X,Y)|² ≤ Var(X) · Var(Y)", "Cov(X,Y) ≤ E[X] · E[Y]", "|E[XY]| ≤ E[X] + E[Y]", "Var(X+Y) ≤ Var(X) · Var(Y)"],
            optsDE: ["|Cov(X,Y)|² ≤ Var(X) · Var(Y)", "Cov(X,Y) ≤ E[X] · E[Y]", "|E[XY]| ≤ E[X] + E[Y]", "Var(X+Y) ≤ Var(X) · Var(Y)"],
            correct: 0,
        },
        {
            q: "For independent X and Y, Var(X + Y) equals:",
            qDE: "Für unabhängige X und Y gilt Var(X + Y) =",
            opts: ["Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) − Var(Y)"],
            optsDE: ["Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) − Var(Y)"],
            correct: 0,
        },

        // --- Multivariate Normalverteilung ---
        {
            q: "A multivariate normal distribution is fully characterized by:",
            qDE: "Eine multivariate Normalverteilung ist vollständig bestimmt durch:",
            opts: ["The mean vector μ and the covariance matrix Σ", "Only the mean vector μ", "Only the covariance matrix Σ", "The marginal distributions alone"],
            optsDE: ["Den Erwartungswertvektor μ und die Kovarianzmatrix Σ", "Nur den Erwartungswertvektor μ", "Nur die Kovarianzmatrix Σ", "Nur die Randverteilungen"],
            correct: 0,
        },
        {
            q: "If X ~ N(μ, Σ) and Y = AX + b, then Y follows:",
            qDE: "Wenn X ~ N(μ, Σ) und Y = AX + b, dann folgt Y:",
            opts: ["N(Aμ + b, AΣAᵀ)", "N(Aμ, Σ)", "N(μ + b, AΣ)", "N(Aμ + b, Σ)"],
            optsDE: ["N(Aμ + b, AΣAᵀ)", "N(Aμ, Σ)", "N(μ + b, AΣ)", "N(Aμ + b, Σ)"],
            correct: 0,
        },
        {
            q: "For a multivariate normal vector, all marginal distributions are:",
            qDE: "Bei einem multivariaten Normalverteilungsvektor sind alle Randverteilungen:",
            opts: ["Univariate normal distributions", "Uniform distributions", "Exponential distributions", "Possibly non-normal"],
            optsDE: ["Univariate Normalverteilungen", "Gleichverteilungen", "Exponentialverteilungen", "Möglicherweise nicht normalverteilt"],
            correct: 0,
        },


    ],


    // ── WORLD 7 — Convergence & Limit Theorems ────────────────────────────
    // Topics: arithmetisches Mittel, schwaches GGZ, Tschebyscheff-Ungleichung,
    //         stochastische Konvergenz, starkes GGZ, Hauptsatz der Statistik,
    //         fast sichere Konvergenz, Zentraler Grenzwertsatz
    7: [

        // --- Arithmetisches Mittel ---
        {
            q: "The sample mean of n observations x₁, …, xₙ is defined as:",
            qDE: "Das arithmetische Mittel von n Beobachtungen x₁, …, xₙ ist definiert als:",
            opts: ["(x₁ + … + xₙ) / n", "(x₁ + … + xₙ) · n", "√(x₁ · … · xₙ)", "max(x₁, …, xₙ) / n"],
            optsDE: ["(x₁ + … + xₙ) / n", "(x₁ + … + xₙ) · n", "√(x₁ · … · xₙ)", "max(x₁, …, xₙ) / n"],
            correct: 0
        },
        {
            q: "For i.i.d. random variables X₁, …, Xₙ with E[Xᵢ] = μ, what is E[X̄ₙ]?",
            qDE: "Für i.i.d. Zufallsvariablen X₁, …, Xₙ mit E[Xᵢ] = μ, was ist E[X̄ₙ]?",
            opts: ["μ", "μ / n", "n · μ", "0"],
            optsDE: ["μ", "μ / n", "n · μ", "0"],
            correct: 0
        },
        {
            q: "For i.i.d. random variables with variance σ², what is Var(X̄ₙ)?",
            qDE: "Für i.i.d. Zufallsvariablen mit Varianz σ², was ist Var(X̄ₙ)?",
            opts: ["σ² / n", "σ²", "σ² · n", "σ / n"],
            optsDE: ["σ² / n", "σ²", "σ² · n", "σ / n"],
            correct: 0
        },

        // --- Tschebyscheff-Ungleichung ---
        {
            q: "Chebyshev's inequality states that for any ε > 0:",
            qDE: "Die Tschebyscheff-Ungleichung besagt für beliebiges ε > 0:",
            opts: ["P(|X − μ| ≥ ε) ≤ Var(X) / ε²", "P(|X − μ| ≥ ε) ≤ E[X] / ε", "P(|X − μ| ≥ ε) ≥ Var(X) / ε²", "P(|X − μ| ≥ ε) = 1 / ε"],
            optsDE: ["P(|X − μ| ≥ ε) ≤ Var(X) / ε²", "P(|X − μ| ≥ ε) ≤ E[X] / ε", "P(|X − μ| ≥ ε) ≥ Var(X) / ε²", "P(|X − μ| ≥ ε) = 1 / ε"],
            correct: 0
        },
        {
            q: "Chebyshev's inequality requires knowledge of which quantity to bound P(|X − μ| ≥ ε)?",
            qDE: "Die Tschebyscheff-Ungleichung benötigt welche Größe, um P(|X − μ| ≥ ε) zu beschränken?",
            opts: ["The variance Var(X)", "The full distribution of X", "The median of X", "The moment generating function"],
            optsDE: ["Die Varianz Var(X)", "Die vollständige Verteilung von X", "Den Median von X", "Die momenterzeugende Funktion"],
            correct: 0
        },

        // --- Stochastische Konvergenz ---
        {
            q: "A sequence Xₙ converges in probability to X if:",
            qDE: "Eine Folge Xₙ konvergiert stochastisch gegen X, wenn:",
            opts: ["P(|Xₙ − X| ≥ ε) → 0 as n → ∞ for all ε > 0", "P(Xₙ = X) = 1 for all n", "E[Xₙ] → 0 for all n", "Var(Xₙ) → ∞"],
            optsDE: ["P(|Xₙ − X| ≥ ε) → 0 für n → ∞ für alle ε > 0", "P(Xₙ = X) = 1 für alle n", "E[Xₙ] → 0 für alle n", "Var(Xₙ) → ∞"],
            correct: 0
        },
        {
            q: "The notation Xₙ →ᵖ X means:",
            qDE: "Die Schreibweise Xₙ →ᵖ X bedeutet:",
            opts: ["Convergence in probability", "Almost sure convergence", "Convergence in distribution", "Convergence in mean square"],
            optsDE: ["Konvergenz in Wahrscheinlichkeit (stochastische Konvergenz)", "Fast sichere Konvergenz", "Konvergenz in Verteilung", "Konvergenz im quadratischen Mittel"],
            correct: 0
        },
        {
            q: "Which type of convergence is implied by almost sure convergence?",
            qDE: "Welche Konvergenzart wird durch fast sichere Konvergenz impliziert?",
            opts: ["Convergence in probability", "Convergence in distribution only", "No other type", "Mean square convergence"],
            optsDE: ["Stochastische Konvergenz", "Nur Konvergenz in Verteilung", "Keine andere Konvergenzart", "Konvergenz im quadratischen Mittel"],
            correct: 0
        },

        // --- Schwaches Gesetz der großen Zahlen ---
        {
            q: "The Weak Law of Large Numbers states that for i.i.d. variables with mean μ:",
            qDE: "Das schwache Gesetz der großen Zahlen besagt für i.i.d. Variablen mit Erwartungswert μ:",
            opts: ["X̄ₙ →ᵖ μ as n → ∞", "X̄ₙ → 0 as n → ∞", "X̄ₙ = μ for all n", "X̄ₙ →ᵃ·ˢ· μ"],
            optsDE: ["X̄ₙ →ᵖ μ für n → ∞", "X̄ₙ → 0 für n → ∞", "X̄ₙ = μ für alle n", "X̄ₙ →ᵃ·ˢ· μ"],
            correct: 0
        },
        {
            q: "The Weak Law of Large Numbers guarantees convergence in which sense?",
            qDE: "Das schwache Gesetz der großen Zahlen garantiert Konvergenz in welchem Sinne?",
            opts: ["In probability", "Almost surely", "In distribution only", "In the L² sense only"],
            optsDE: ["In Wahrscheinlichkeit (stochastisch)", "Fast sicher", "Nur in Verteilung", "Nur im L²-Sinne"],
            correct: 0
        },
        {
            q: "Which condition is sufficient to prove the Weak Law via Chebyshev's inequality?",
            qDE: "Welche Bedingung reicht aus, um das schwache Gesetz mittels Tschebyscheff zu beweisen?",
            opts: ["Finite variance σ² < ∞", "The distribution must be normal", "The variables must be bounded", "The mean must be zero"],
            optsDE: ["Endliche Varianz σ² < ∞", "Die Verteilung muss normal sein", "Die Variablen müssen beschränkt sein", "Der Erwartungswert muss null sein"],
            correct: 0
        },

        // --- Starkes Gesetz der großen Zahlen ---
        {
            q: "The Strong Law of Large Numbers states that X̄ₙ converges to μ:",
            qDE: "Das starke Gesetz der großen Zahlen besagt, dass X̄ₙ gegen μ konvergiert:",
            opts: ["Almost surely (with probability 1)", "In probability only", "In distribution only", "For finitely many n"],
            optsDE: ["Fast sicher (mit Wahrscheinlichkeit 1)", "Nur in Wahrscheinlichkeit", "Nur in Verteilung", "Für endlich viele n"],
            correct: 0
        },
        {
            q: "The Strong Law is a stronger statement than the Weak Law because:",
            qDE: "Das starke Gesetz ist eine stärkere Aussage als das schwache, weil:",
            opts: ["Almost sure convergence implies convergence in probability, but not vice versa", "It requires fewer assumptions", "It applies to dependent variables", "It only works for symmetric distributions"],
            optsDE: ["Fast sichere Konvergenz impliziert stochastische Konvergenz, aber nicht umgekehrt", "Es weniger Voraussetzungen braucht", "Es für abhängige Variablen gilt", "Es nur für symmetrische Verteilungen gilt"],
            correct: 0
        },
        {
            q: "Almost sure convergence Xₙ →ᵃ·ˢ· X means:",
            qDE: "Fast sichere Konvergenz Xₙ →ᵃ·ˢ· X bedeutet:",
            opts: ["P(lim_{n→∞} Xₙ = X) = 1", "P(|Xₙ − X| ≥ ε) → 0 for all ε > 0", "E[Xₙ] → E[X]", "Xₙ = X for all large n with high probability"],
            optsDE: ["P(lim_{n→∞} Xₙ = X) = 1", "P(|Xₙ − X| ≥ ε) → 0 für alle ε > 0", "E[Xₙ] → E[X]", "Xₙ = X für alle großen n mit hoher Wahrscheinlichkeit"],
            correct: 0
        },

        // --- Fast sichere Konvergenz ---
        {
            q: "Almost sure convergence is also called:",
            qDE: "Fast sichere Konvergenz wird auch genannt:",
            opts: ["Convergence with probability 1", "Weak convergence", "Convergence in measure", "L¹ convergence"],
            optsDE: ["Konvergenz mit Wahrscheinlichkeit 1", "Schwache Konvergenz", "Konvergenz im Maß", "L¹-Konvergenz"],
            correct: 0
        },
        {
            q: "Which convergence concept is used in the Strong Law of Large Numbers?",
            qDE: "Welcher Konvergenzbegriff wird im starken Gesetz der großen Zahlen verwendet?",
            opts: ["Almost sure convergence", "Convergence in probability", "Convergence in distribution", "Convergence in L²"],
            optsDE: ["Fast sichere Konvergenz", "Stochastische Konvergenz", "Konvergenz in Verteilung", "Konvergenz in L²"],
            correct: 0
        },
        {
            q: "If Xₙ → X almost surely, which of the following is guaranteed?",
            qDE: "Wenn Xₙ → X fast sicher gilt, was ist dann garantiert?",
            opts: ["Xₙ →ᵖ X (convergence in probability)", "Xₙ = X for all n ≥ 1", "E[Xₙ] → E[X] in all cases", "Var(Xₙ) → 0"],
            optsDE: ["Xₙ →ᵖ X (stochastische Konvergenz)", "Xₙ = X für alle n ≥ 1", "E[Xₙ] → E[X] in allen Fällen", "Var(Xₙ) → 0"],
            correct: 0
        },

        // --- Hauptsatz der Statistik (Glivenko-Cantelli) ---
        {
            q: "The Fundamental Theorem of Statistics states that the empirical distribution function F̂ₙ(x):",
            qDE: "Der Hauptsatz der Statistik besagt, dass die empirische Verteilungsfunktion F̂ₙ(x):",
            opts: ["Converges almost surely to the true distribution function F(x) uniformly in x", "Converges to 0 for all x", "Equals F(x) for all n", "Only converges at the median"],
            optsDE: ["Fast sicher gleichmäßig in x gegen die wahre Verteilungsfunktion F(x) konvergiert", "Für alle x gegen 0 konvergiert", "Für alle n gleich F(x) ist", "Nur am Median konvergiert"],
            correct: 0
        },
        {
            q: "The empirical distribution function F̂ₙ(x) based on n i.i.d. observations is defined as:",
            qDE: "Die empirische Verteilungsfunktion F̂ₙ(x) basierend auf n i.i.d. Beobachtungen ist definiert als:",
            opts: ["(number of observations ≤ x) / n", "P(X ≤ x)", "The density evaluated at x", "(number of observations = x) / n"],
            optsDE: ["(Anzahl der Beobachtungen ≤ x) / n", "P(X ≤ x)", "Die Dichte ausgewertet an der Stelle x", "(Anzahl der Beobachtungen = x) / n"],
            correct: 0
        },
        {
            q: "The Fundamental Theorem of Statistics implies that sup_x |F̂ₙ(x) − F(x)| converges:",
            qDE: "Der Hauptsatz der Statistik impliziert, dass sup_x |F̂ₙ(x) − F(x)| konvergiert:",
            opts: ["To 0 almost surely as n → ∞", "To 1 as n → ∞", "To σ² as n → ∞", "To a normal distribution"],
            optsDE: ["Fast sicher gegen 0 für n → ∞", "Gegen 1 für n → ∞", "Gegen σ² für n → ∞", "Gegen eine Normalverteilung"],
            correct: 0
        },

        // --- Zentraler Grenzwertsatz ---
        {
            q: "The Central Limit Theorem states that (X̄ₙ − μ) / (σ/√n) converges in distribution to:",
            qDE: "Der Zentrale Grenzwertsatz besagt, dass (X̄ₙ − μ) / (σ/√n) in Verteilung konvergiert gegen:",
            opts: ["N(0, 1)", "N(μ, σ²)", "Exp(1)", "U(0, 1)"],
            optsDE: ["N(0, 1)", "N(μ, σ²)", "Exp(1)", "U(0, 1)"],
            correct: 0
        },
        {
            q: "The Central Limit Theorem applies regardless of the underlying distribution, provided that:",
            qDE: "Der Zentrale Grenzwertsatz gilt unabhängig von der Verteilung der Xᵢ, sofern:",
            opts: ["The variables are i.i.d. with finite variance", "The variables follow a normal distribution", "The sample size n is exactly 30", "The variables are discrete"],
            optsDE: ["Die Variablen i.i.d. mit endlicher Varianz sind", "Die Variablen normalverteilt sind", "Der Stichprobenumfang n genau 30 beträgt", "Die Variablen diskret sind"],
            correct: 0
        },
        {
            q: "The Central Limit Theorem is used to approximate probabilities about X̄ₙ. Which distribution is used?",
            qDE: "Der Zentrale Grenzwertsatz wird zur Approximation von Wahrscheinlichkeiten über X̄ₙ genutzt. Welche Verteilung wird verwendet?",
            opts: ["Normal distribution N(μ, σ²/n)", "Poisson distribution with λ = μ", "Exponential distribution Exp(μ)", "Uniform distribution U(0, μ)"],
            optsDE: ["Normalverteilung N(μ, σ²/n)", "Poisson-Verteilung mit λ = μ", "Exponentialverteilung Exp(μ)", "Gleichverteilung U(0, μ)"],
            correct: 0
        },

    ],

    8: [

        // ── 1. ALLGEMEINE IDEE DER SCHLIEßENDEN STATISTIK ────────────────────────

        {
            q: "What is the core goal of inferential statistics?",
            qDE: "Was ist das Kernziel der schließenden Statistik?",
            opts: [
                "Draw conclusions about a population based on a sample",
                "Describe the data we have collected exactly",
                "Compute the mean and variance of a dataset",
                "Visualise data using charts and plots"
            ],
            optsDE: [
                "Rückschlüsse auf eine Grundgesamtheit anhand einer Stichprobe ziehen",
                "Die vorliegenden Daten exakt beschreiben",
                "Mittelwert und Varianz eines Datensatzes berechnen",
                "Daten mit Diagrammen und Grafiken visualisieren"
            ],
            correct: 0
        },
        {
            q: "Which of the four tasks of inferential statistics involves choosing which family of distributions could have generated the data?",
            qDE: "Welche der vier Aufgaben der schließenden Statistik beinhaltet die Wahl, welche Verteilungsfamilie die Daten erzeugt haben könnte?",
            opts: [
                "Modelling",
                "Estimation",
                "Testing",
                "Model validation"
            ],
            optsDE: [
                "Modellierung",
                "Schätzen",
                "Testen",
                "Modellvalidierung"
            ],
            correct: 0
        },
        {
            q: "A researcher computes a numerical value from data to approximate an unknown quantity. Which task is this?",
            qDE: "Ein Forscher berechnet aus Daten einen numerischen Wert, um eine unbekannte Größe anzunähern. Um welche Aufgabe handelt es sich?",
            opts: [
                "Estimation",
                "Modelling",
                "Testing",
                "Model validation"
            ],
            optsDE: [
                "Schätzen",
                "Modellierung",
                "Testen",
                "Modellvalidierung"
            ],
            correct: 0
        },
        {
            q: "After fitting a model, a statistician asks: 'Does this model make sense for the data at all?' Which task is this?",
            qDE: "Nach dem Anpassen eines Modells fragt ein Statistiker: 'Ist dieses Modell überhaupt sinnvoll für die Daten?' Welche Aufgabe ist das?",
            opts: [
                "Model validation",
                "Estimation",
                "Modelling",
                "Testing"
            ],
            optsDE: [
                "Modellvalidierung",
                "Schätzen",
                "Modellierung",
                "Testen"
            ],
            correct: 0
        },
        {
            q: "Which statement best describes the difference between descriptive and inferential statistics?",
            qDE: "Welche Aussage beschreibt den Unterschied zwischen beschreibender und schließender Statistik am besten?",
            opts: [
                "Descriptive statistics summarises the observed data; inferential statistics draws conclusions beyond it",
                "Descriptive statistics uses probability; inferential statistics does not",
                "Inferential statistics only works with large datasets",
                "Descriptive statistics requires a model; inferential statistics does not"
            ],
            optsDE: [
                "Beschreibende Statistik fasst die beobachteten Daten zusammen; schließende Statistik zieht Rückschlüsse darüber hinaus",
                "Beschreibende Statistik verwendet Wahrscheinlichkeit; schließende Statistik nicht",
                "Schließende Statistik funktioniert nur mit großen Datensätzen",
                "Beschreibende Statistik erfordert ein Modell; schließende Statistik nicht"
            ],
            correct: 0
        },

        // ── 2. STICHPROBENUMFANG UND STICHPROBENRAUM ─────────────────────────────

        {
            q: "What does the sample size n refer to?",
            qDE: "Worauf bezieht sich der Stichprobenumfang n?",
            opts: [
                "The number of individual observations collected",
                "The number of unknown parameters in the model",
                "The total size of the population",
                "The number of possible outcomes per observation"
            ],
            optsDE: [
                "Die Anzahl der erhobenen Einzelbeobachtungen",
                "Die Anzahl der unbekannten Parameter im Modell",
                "Die Gesamtgröße der Grundgesamtheit",
                "Die Anzahl möglicher Ergebnisse pro Beobachtung"
            ],
            correct: 0
        },
        {
            q: "The sample space of a statistical model is:",
            qDE: "Der Stichprobenraum eines statistischen Modells ist:",
            opts: [
                "The set of all possible values a single observation can take",
                "The set of all possible parameter values",
                "The collection of all samples we have drawn",
                "The set of all estimators for the unknown parameter"
            ],
            optsDE: [
                "Die Menge aller möglichen Werte, die eine einzelne Beobachtung annehmen kann",
                "Die Menge aller möglichen Parameterwerte",
                "Die Sammlung aller gezogenen Stichproben",
                "Die Menge aller Schätzer für den unbekannten Parameter"
            ],
            correct: 0
        },
        {
            q: "We record whether each of 50 patients recovers (yes/no). What is the sample space for a single observation?",
            qDE: "Wir erfassen, ob jeder der 50 Patienten genest (ja/nein). Was ist der Stichprobenraum für eine einzelne Beobachtung?",
            opts: [
                "{yes, no}",
                "{0, 1, 2, …, 50}",
                "All real numbers",
                "{yes, no, maybe}"
            ],
            optsDE: [
                "{ja, nein}",
                "{0, 1, 2, …, 50}",
                "Alle reellen Zahlen",
                "{ja, nein, vielleicht}"
            ],
            correct: 0
        },
        {
            q: "We model a sample of size n as n random variables X₁, X₂, …, Xₙ. What assumption do we usually make about these variables?",
            qDE: "Wir modellieren eine Stichprobe vom Umfang n als n Zufallsvariablen X₁, X₂, …, Xₙ. Welche Annahme treffen wir üblicherweise über diese Variablen?",
            opts: [
                "They are independent and all follow the same distribution",
                "They are all equal to their expected value",
                "They are dependent and differently distributed",
                "They must all be discrete"
            ],
            optsDE: [
                "Sie sind unabhängig und folgen alle derselben Verteilung",
                "Sie sind alle gleich ihrem Erwartungswert",
                "Sie sind abhängig und unterschiedlich verteilt",
                "Sie müssen alle diskret sein"
            ],
            correct: 0
        },

        // ── 3. PARAMETRISCHES VERTEILUNGSMODELL UND PARAMETERRAUM ────────────────

        {
            q: "What is a parametric statistical model?",
            qDE: "Was ist ein parametrisches statistisches Modell?",
            opts: [
                "A family of distributions indexed by one or more unknown parameters",
                "A single fixed distribution with no unknowns",
                "A model that does not use probability distributions",
                "A model where all parameters are known in advance"
            ],
            optsDE: [
                "Eine Verteilungsfamilie, die durch einen oder mehrere unbekannte Parameter beschrieben wird",
                "Eine einzelne feste Verteilung ohne Unbekannte",
                "Ein Modell, das keine Wahrscheinlichkeitsverteilungen verwendet",
                "Ein Modell, bei dem alle Parameter im Voraus bekannt sind"
            ],
            correct: 0
        },
        {
            q: "The parameter space is:",
            qDE: "Der Parameterraum ist:",
            opts: [
                "The set of all values the unknown parameter is allowed to take",
                "The set of all observed data values",
                "The set of all possible estimators",
                "The range of the distribution function"
            ],
            optsDE: [
                "Die Menge aller Werte, die der unbekannte Parameter annehmen darf",
                "Die Menge aller beobachteten Datenwerte",
                "Die Menge aller möglichen Schätzer",
                "Der Wertebereich der Verteilungsfunktion"
            ],
            correct: 0
        },
        {
            q: "We model exam scores as normally distributed with unknown mean μ and known variance 1. The parameter space for μ is:",
            qDE: "Wir modellieren Prüfungsergebnisse als normalverteilt mit unbekanntem Mittelwert μ und bekannter Varianz 1. Der Parameterraum für μ ist:",
            opts: [
                "All real numbers",
                "Only positive real numbers",
                "The interval [0, 1]",
                "Only whole numbers"
            ],
            optsDE: [
                "Alle reellen Zahlen",
                "Nur positive reelle Zahlen",
                "Das Intervall [0, 1]",
                "Nur ganze Zahlen"
            ],
            correct: 0
        },
        {
            q: "Two researchers study the same coin-flip data. One assumes a Bernoulli model, the other a Normal model. They get different conclusions. What does this illustrate?",
            qDE: "Zwei Forscher untersuchen dieselben Münzwurfdaten. Einer nimmt ein Bernoulli-Modell an, der andere ein Normalmodell. Sie kommen zu unterschiedlichen Schlüssen. Was verdeutlicht das?",
            opts: [
                "The choice of model family affects the conclusions of the analysis",
                "The data must be wrong",
                "Inferential statistics always gives the same answer regardless of model",
                "Parameters are the same across all model families"
            ],
            optsDE: [
                "Die Wahl der Modellfamilie beeinflusst die Schlussfolgerungen der Analyse",
                "Die Daten müssen falsch sein",
                "Schließende Statistik liefert unabhängig vom Modell immer dieselbe Antwort",
                "Parameter sind über alle Modellfamilien hinweg gleich"
            ],
            correct: 0
        },

        // ── 4. STATISTIK UND SCHÄTZER ─────────────────────────────────────────────

        {
            q: "In the context of inferential statistics, what is a 'statistic'?",
            qDE: "Was ist in der schließenden Statistik eine 'Statistik'?",
            opts: [
                "A function of the observed data that does not depend on any unknown parameter",
                "The true value of an unknown parameter",
                "Any function that includes the unknown parameter",
                "A fixed constant chosen by the researcher"
            ],
            optsDE: [
                "Eine Funktion der beobachteten Daten, die von keinem unbekannten Parameter abhängt",
                "Der wahre Wert eines unbekannten Parameters",
                "Eine beliebige Funktion, die den unbekannten Parameter enthält",
                "Eine vom Forscher gewählte feste Konstante"
            ],
            correct: 0
        },
        {
            q: "Why is an estimator considered a random variable?",
            qDE: "Warum gilt ein Schätzer als Zufallsvariable?",
            opts: [
                "Because it depends on the random sample, which changes each time we collect data",
                "Because it always equals the true parameter",
                "Because it has infinite variance",
                "Because it is only defined for continuous distributions"
            ],
            optsDE: [
                "Weil er von der zufälligen Stichprobe abhängt, die sich bei jeder Datenerhebung ändert",
                "Weil er immer dem wahren Parameter entspricht",
                "Weil er unendliche Varianz hat",
                "Weil er nur für stetige Verteilungen definiert ist"
            ],
            correct: 0
        },
        {
            q: "What does it mean for an estimator to be unbiased?",
            qDE: "Was bedeutet es, dass ein Schätzer erwartungstreu ist?",
            opts: [
                "Its expected value equals the true parameter value",
                "It always produces the exact true parameter value",
                "Its variance is zero",
                "It is always larger than the true parameter"
            ],
            optsDE: [
                "Sein Erwartungswert entspricht dem wahren Parameterwert",
                "Er liefert immer genau den wahren Parameterwert",
                "Seine Varianz ist null",
                "Er ist immer größer als der wahre Parameter"
            ],
            correct: 0
        },
        {
            q: "What is the difference between an estimator and an estimate?",
            qDE: "Was ist der Unterschied zwischen einem Schätzer und einem Schätzwert?",
            opts: [
                "An estimator is the general rule; an estimate is the specific number obtained after inserting the data",
                "An estimator is always correct; an estimate may be wrong",
                "An estimate is a random variable; an estimator is a fixed number",
                "There is no difference — the terms are interchangeable"
            ],
            optsDE: [
                "Ein Schätzer ist die allgemeine Regel; ein Schätzwert ist die konkrete Zahl nach Einsetzen der Daten",
                "Ein Schätzer ist immer korrekt; ein Schätzwert kann falsch sein",
                "Ein Schätzwert ist eine Zufallsvariable; ein Schätzer ist eine feste Zahl",
                "Es gibt keinen Unterschied — die Begriffe sind austauschbar"
            ],
            correct: 0
        },

        // ── 5. EMPIRISCHE VERTEILUNGSFUNKTION ─────────────────────────────────────

        {
            q: "The empirical distribution function assigns to each value x:",
            qDE: "Die empirische Verteilungsfunktion weist jedem Wert x zu:",
            opts: [
                "The fraction of observations that are less than or equal to x",
                "The probability density at x",
                "The number of observations greater than x",
                "The expected value of the distribution at x"
            ],
            optsDE: [
                "Den Anteil der Beobachtungen, die kleiner oder gleich x sind",
                "Die Wahrscheinlichkeitsdichte bei x",
                "Die Anzahl der Beobachtungen größer als x",
                "Den Erwartungswert der Verteilung bei x"
            ],
            correct: 0
        },
        {
            q: "We observe: 2, 4, 6, 8. What is the value of the empirical distribution function at x = 4?",
            qDE: "Wir beobachten: 2, 4, 6, 8. Was ist der Wert der empirischen Verteilungsfunktion bei x = 4?",
            opts: [
                "0.5",
                "0.25",
                "0.75",
                "1.0"
            ],
            optsDE: [
                "0,5",
                "0,25",
                "0,75",
                "1,0"
            ],
            correct: 0
        },
        {
            q: "What is the empirical distribution function used for in inferential statistics?",
            qDE: "Wofür wird die empirische Verteilungsfunktion in der schließenden Statistik verwendet?",
            opts: [
                "As an estimator for the true (unknown) distribution function",
                "To compute the maximum likelihood estimate",
                "To define the parameter space",
                "To generate new random samples"
            ],
            optsDE: [
                "Als Schätzer für die wahre (unbekannte) Verteilungsfunktion",
                "Zur Berechnung des Maximum-Likelihood-Schätzers",
                "Zur Definition des Parameterraums",
                "Zur Erzeugung neuer Zufallsstichproben"
            ],
            correct: 0
        },
        {
            q: "As the sample size n grows, the empirical distribution function:",
            qDE: "Mit wachsendem Stichprobenumfang n nähert sich die empirische Verteilungsfunktion:",
            opts: [
                "Gets closer and closer to the true distribution function",
                "Converges to the uniform distribution",
                "Stays the same regardless of n",
                "Becomes equal to the density function"
            ],
            optsDE: [
                "Immer mehr der wahren Verteilungsfunktion an",
                "Konvergiert gegen die Gleichverteilung",
                "Bleibt unabhängig von n gleich",
                "Wird gleich der Dichtefunktion"
            ],
            correct: 0
        },

        // ── 6. LIKELIHOOD-PRINZIP UND MAXIMUM-LIKELIHOOD-SCHÄTZER ────────────────

        {
            q: "The likelihood function L(θ) for observed data x is interpreted as:",
            qDE: "Die Likelihood-Funktion L(θ) für beobachtete Daten x wird interpretiert als:",
            opts: [
                "How probable the observed data is, viewed as a function of the parameter θ",
                "The probability that θ equals a specific value",
                "The distribution of θ across the parameter space",
                "The variance of the estimator for θ"
            ],
            optsDE: [
                "Wie wahrscheinlich die beobachteten Daten sind, betrachtet als Funktion des Parameters θ",
                "Die Wahrscheinlichkeit, dass θ einen bestimmten Wert annimmt",
                "Die Verteilung von θ über den Parameterraum",
                "Die Varianz des Schätzers für θ"
            ],
            correct: 0
        },
        {
            q: "The maximum likelihood estimator chooses the parameter value that:",
            qDE: "Der Maximum-Likelihood-Schätzer wählt den Parameterwert, der:",
            opts: [
                "Maximises the probability of observing the data we actually saw",
                "Minimises the variance of the estimator",
                "Equals the sample mean in all cases",
                "Lies in the middle of the parameter space"
            ],
            optsDE: [
                "Die Wahrscheinlichkeit maximiert, die tatsächlich beobachteten Daten zu sehen",
                "Die Varianz des Schätzers minimiert",
                "In allen Fällen dem Stichprobenmittelwert entspricht",
                "In der Mitte des Parameterraums liegt"
            ],
            correct: 0
        },
        {
            q: "We observe 7 heads in 10 coin flips and use a Bernoulli model. What is the maximum likelihood estimate for the probability of heads p?",
            qDE: "Wir beobachten 7 Kopf in 10 Münzwürfen und verwenden ein Bernoulli-Modell. Was ist der Maximum-Likelihood-Schätzwert für die Kopfwahrscheinlichkeit p?",
            opts: [
                "0.7",
                "0.5",
                "0.3",
                "7"
            ],
            optsDE: [
                "0,7",
                "0,5",
                "0,3",
                "7"
            ],
            correct: 0
        },
        {
            q: "The likelihood principle states that:",
            qDE: "Das Likelihood-Prinzip besagt, dass:",
            opts: [
                "All information about the parameter contained in the data is captured by the likelihood function",
                "The parameter with the highest prior probability should always be chosen",
                "The likelihood function must always be maximised numerically",
                "Two datasets with different sizes always lead to different conclusions"
            ],
            optsDE: [
                "Alle Information über den Parameter, die in den Daten steckt, durch die Likelihood-Funktion erfasst wird",
                "Immer der Parameter mit der höchsten a-priori-Wahrscheinlichkeit gewählt werden soll",
                "Die Likelihood-Funktion immer numerisch maximiert werden muss",
                "Zwei Datensätze unterschiedlicher Größe immer zu unterschiedlichen Schlüssen führen"
            ],
            correct: 0
        },
        {
            q: "Which of the following best describes why the log-likelihood is often used instead of the likelihood?",
            qDE: "Welche Aussage beschreibt am besten, warum oft die Log-Likelihood statt der Likelihood verwendet wird?",
            opts: [
                "Taking the logarithm turns products into sums, which is easier to maximise",
                "The log-likelihood always gives a larger value than the likelihood",
                "The logarithm changes the location of the maximum",
                "The log-likelihood is defined only for discrete distributions"
            ],
            optsDE: [
                "Der Logarithmus verwandelt Produkte in Summen, was die Maximierung erleichtert",
                "Die Log-Likelihood liefert immer einen größeren Wert als die Likelihood",
                "Der Logarithmus verschiebt die Lage des Maximums",
                "Die Log-Likelihood ist nur für diskrete Verteilungen definiert"
            ],
            correct: 0
        },

    ],



    // WORLD 9
    9: [

        // --- Erwartungstreue Schätzer / Bias ---
        {
            q: "An estimator θ̂ for a parameter θ is called unbiased if:",
            qDE: "Ein Schätzer θ̂ für einen Parameter θ heißt erwartungstreu, wenn:",
            opts: ["E[θ̂] = θ for all θ in the parameter space", "θ̂ = θ with probability 1", "Var(θ̂) = 0", "E[θ̂] = 0"],
            optsDE: ["E[θ̂] = θ für alle θ im Parameterraum", "θ̂ = θ mit Wahrscheinlichkeit 1", "Var(θ̂) = 0", "E[θ̂] = 0"],
            correct: 0
        },
        {
            q: "The bias of an estimator θ̂ for θ is defined as:",
            qDE: "Der Bias eines Schätzers θ̂ für θ ist definiert als:",
            opts: ["Bias(θ̂) = E[θ̂] − θ", "Bias(θ̂) = θ − θ̂", "Bias(θ̂) = Var(θ̂)", "Bias(θ̂) = E[θ̂²] − θ²"],
            optsDE: ["Bias(θ̂) = E[θ̂] − θ", "Bias(θ̂) = θ − θ̂", "Bias(θ̂) = Var(θ̂)", "Bias(θ̂) = E[θ̂²] − θ²"],
            correct: 0
        },
        {
            q: "If g(θ) is a function of the parameter θ, an estimator T for g(θ) is unbiased if:",
            qDE: "Wenn g(θ) eine Funktion des Parameters θ ist, heißt ein Schätzer T für g(θ) erwartungstreu, wenn:",
            opts: ["E[T] = g(θ) for all θ", "E[T] = θ for all θ", "T = g(θ) always", "Var(T) = g(θ)"],
            optsDE: ["E[T] = g(θ) für alle θ", "E[T] = θ für alle θ", "T = g(θ) immer", "Var(T) = g(θ)"],
            correct: 0
        },
        {
            q: "If X̄ₙ is unbiased for μ, is X̄ₙ² generally unbiased for μ²?",
            qDE: "Wenn X̄ₙ erwartungstreu für μ ist, ist X̄ₙ² im Allgemeinen erwartungstreu für μ²?",
            opts: ["No, because E[X̄ₙ²] = μ² + Var(X̄ₙ) ≠ μ² in general", "Yes, always", "Yes, but only if μ = 0", "No, because X̄ₙ is never unbiased"],
            optsDE: ["Nein, denn E[X̄ₙ²] = μ² + Var(X̄ₙ) ≠ μ² im Allgemeinen", "Ja, immer", "Ja, aber nur wenn μ = 0", "Nein, denn X̄ₙ ist nie erwartungstreu"],
            correct: 0
        },
        {
            q: "The sample variance S²ₙ = (1/(n−1))∑(Xᵢ − X̄ₙ)² is used instead of (1/n)∑(Xᵢ − X̄ₙ)² because:",
            qDE: "Die Stichprobenvarianz S²ₙ = (1/(n−1))∑(Xᵢ − X̄ₙ)² wird anstelle von (1/n)∑(Xᵢ − X̄ₙ)² verwendet, weil:",
            opts: ["Dividing by (n−1) makes S²ₙ an unbiased estimator of σ²", "It always gives a smaller value", "It is easier to compute", "It removes the need for X̄ₙ"],
            optsDE: ["Die Division durch (n−1) macht S²ₙ zu einem erwartungstreuen Schätzer für σ²", "Es liefert stets einen kleineren Wert", "Es ist einfacher zu berechnen", "Dadurch entfällt die Notwendigkeit von X̄ₙ"],
            correct: 0
        },

        // --- Asymptotische Erwartungstreue ---
        {
            q: "An estimator θ̂ₙ is asymptotically unbiased if:",
            qDE: "Ein Schätzer θ̂ₙ heißt asymptotisch erwartungstreu, wenn:",
            opts: ["lim_{n→∞} E[θ̂ₙ] = θ", "E[θ̂ₙ] = θ for every n", "Var(θ̂ₙ) → 0 as n → ∞", "θ̂ₙ → θ almost surely"],
            optsDE: ["lim_{n→∞} E[θ̂ₙ] = θ", "E[θ̂ₙ] = θ für jedes n", "Var(θ̂ₙ) → 0 für n → ∞", "θ̂ₙ → θ fast sicher"],
            correct: 0
        },
        {
            q: "The biased variance estimator (1/n)∑(Xᵢ − X̄ₙ)² is asymptotically unbiased for σ² because:",
            qDE: "Der verzerrte Varianzschätzer (1/n)∑(Xᵢ − X̄ₙ)² ist asymptotisch erwartungstreu für σ², weil:",
            opts: ["Its bias, proportional to −σ²/n, vanishes as n → ∞", "Its variance is always zero", "It equals S²ₙ for all n", "It never converges"],
            optsDE: ["Sein Bias, proportional zu −σ²/n, verschwindet für n → ∞", "Seine Varianz ist stets null", "Es ist für alle n gleich S²ₙ", "Es konvergiert nie"],
            correct: 0
        },
        {
            q: "An estimator that is unbiased for every finite n is automatically:",
            qDE: "Ein Schätzer, der für jedes endliche n erwartungstreu ist, ist automatisch:",
            opts: ["Asymptotically unbiased as well", "Consistent", "Efficient", "MSE-efficient"],
            optsDE: ["Auch asymptotisch erwartungstreu", "Konsistent", "Effizient", "MSE-effizient"],
            correct: 0
        },

        // --- MSE und Zerlegung ---
        {
            q: "The Mean Squared Error (MSE) of an estimator θ̂ for θ is defined as:",
            qDE: "Der mittlere quadratische Fehler (MSE) eines Schätzers θ̂ für θ ist definiert als:",
            opts: ["MSE(θ̂) = E[(θ̂ − θ)²]", "MSE(θ̂) = E[θ̂] − θ", "MSE(θ̂) = Var(θ̂) · Bias(θ̂)", "MSE(θ̂) = E[θ̂²]"],
            optsDE: ["MSE(θ̂) = E[(θ̂ − θ)²]", "MSE(θ̂) = E[θ̂] − θ", "MSE(θ̂) = Var(θ̂) · Bias(θ̂)", "MSE(θ̂) = E[θ̂²]"],
            correct: 0
        },
        {
            q: "The bias-variance decomposition of the MSE states that MSE(θ̂) equals:",
            qDE: "Die Bias-Varianz-Zerlegung des MSE besagt, dass MSE(θ̂) gleich ist:",
            opts: ["Var(θ̂) + Bias(θ̂)²", "Var(θ̂) − Bias(θ̂)²", "Var(θ̂) · Bias(θ̂)", "Var(θ̂) + Bias(θ̂)"],
            optsDE: ["Var(θ̂) + Bias(θ̂)²", "Var(θ̂) − Bias(θ̂)²", "Var(θ̂) · Bias(θ̂)", "Var(θ̂) + Bias(θ̂)"],
            correct: 0
        },
        {
            q: "If an estimator θ̂ is unbiased, its MSE simplifies to:",
            qDE: "Wenn ein Schätzer θ̂ erwartungstreu ist, vereinfacht sich sein MSE zu:",
            opts: ["MSE(θ̂) = Var(θ̂)", "MSE(θ̂) = 0", "MSE(θ̂) = Bias(θ̂)²", "MSE(θ̂) = E[θ̂]"],
            optsDE: ["MSE(θ̂) = Var(θ̂)", "MSE(θ̂) = 0", "MSE(θ̂) = Bias(θ̂)²", "MSE(θ̂) = E[θ̂]"],
            correct: 0
        },
        {
            q: "An estimator with Bias(θ̂) = 2 and Var(θ̂) = 3 has MSE(θ̂) equal to:",
            qDE: "Ein Schätzer mit Bias(θ̂) = 2 und Var(θ̂) = 3 hat einen MSE(θ̂) von:",
            opts: ["7", "5", "6", "9"],
            optsDE: ["7", "5", "6", "9"],
            correct: 0
        },
        {
            q: "A biased estimator can have a lower MSE than an unbiased one because:",
            qDE: "Ein verzerrter Schätzer kann einen niedrigeren MSE als ein erwartungstreuer haben, weil:",
            opts: ["A small increase in bias² can be offset by a larger reduction in variance", "Bias always reduces variance to zero", "Unbiased estimators always have infinite variance", "MSE ignores bias entirely"],
            optsDE: ["Eine kleine Zunahme des Bias² kann durch eine größere Reduktion der Varianz ausgeglichen werden", "Bias reduziert die Varianz immer auf null", "Erwartungstreue Schätzer haben immer unendliche Varianz", "MSE ignoriert den Bias vollständig"],
            correct: 0
        },

        // --- Konsistenz (schwach / stark) ---
        {
            q: "An estimator θ̂ₙ is weakly consistent for θ if:",
            qDE: "Ein Schätzer θ̂ₙ heißt schwach konsistent für θ, wenn:",
            opts: ["θ̂ₙ →ᵖ θ as n → ∞ (convergence in probability)", "θ̂ₙ = θ for all n", "θ̂ₙ →ᵃ·ˢ· θ as n → ∞", "E[θ̂ₙ] = θ for all n"],
            optsDE: ["θ̂ₙ →ᵖ θ für n → ∞ (stochastische Konvergenz)", "θ̂ₙ = θ für alle n", "θ̂ₙ →ᵃ·ˢ· θ für n → ∞", "E[θ̂ₙ] = θ für alle n"],
            correct: 0
        },
        {
            q: "An estimator θ̂ₙ is strongly consistent for θ if:",
            qDE: "Ein Schätzer θ̂ₙ heißt stark konsistent für θ, wenn:",
            opts: ["θ̂ₙ →ᵃ·ˢ· θ as n → ∞ (almost sure convergence)", "θ̂ₙ →ᵖ θ as n → ∞", "Var(θ̂ₙ) = 0 for all n", "θ̂ₙ is unbiased for all n"],
            optsDE: ["θ̂ₙ →ᵃ·ˢ· θ für n → ∞ (fast sichere Konvergenz)", "θ̂ₙ →ᵖ θ für n → ∞", "Var(θ̂ₙ) = 0 für alle n", "θ̂ₙ ist für alle n erwartungstreu"],
            correct: 0
        },
        {
            q: "Strong consistency implies weak consistency because:",
            qDE: "Starke Konsistenz impliziert schwache Konsistenz, weil:",
            opts: ["Almost sure convergence implies convergence in probability", "They are defined identically", "Weak consistency requires unbiasedness", "Strong consistency requires a larger sample"],
            optsDE: ["Fast sichere Konvergenz stochastische Konvergenz impliziert", "Sie identisch definiert sind", "Schwache Konsistenz Erwartungstreue voraussetzt", "Starke Konsistenz eine größere Stichprobe erfordert"],
            correct: 0
        },
        {
            q: "A common sufficient condition for weak consistency, via Chebyshev's inequality, is:",
            qDE: "Eine gängige hinreichende Bedingung für schwache Konsistenz (via Tschebyscheff) ist:",
            opts: ["θ̂ₙ is asymptotically unbiased and Var(θ̂ₙ) → 0 as n → ∞", "θ̂ₙ is unbiased for finite n only", "θ̂ₙ has infinite variance", "θ̂ₙ is a constant"],
            optsDE: ["θ̂ₙ ist asymptotisch erwartungstreu und Var(θ̂ₙ) → 0 für n → ∞", "θ̂ₙ ist nur für endliches n erwartungstreu", "θ̂ₙ hat unendliche Varianz", "θ̂ₙ ist eine Konstante"],
            correct: 0
        },
        {
            q: "By the Weak Law of Large Numbers, the sample mean X̄ₙ is a consistent estimator for μ provided that:",
            qDE: "Nach dem schwachen Gesetz der großen Zahlen ist X̄ₙ ein konsistenter Schätzer für μ, sofern:",
            opts: ["The Xᵢ are i.i.d. with finite variance", "The Xᵢ are normally distributed", "n is at least 30", "The Xᵢ are dependent"],
            optsDE: ["Die Xᵢ i.i.d. mit endlicher Varianz sind", "Die Xᵢ normalverteilt sind", "n mindestens 30 beträgt", "Die Xᵢ abhängig sind"],
            correct: 0
        },
        {
            q: "MSE(θ̂ₙ) → 0 as n → ∞ is sufficient to conclude:",
            qDE: "MSE(θ̂ₙ) → 0 für n → ∞ genügt, um zu folgern:",
            opts: ["θ̂ₙ is (weakly) consistent for θ", "θ̂ₙ is unbiased for every n", "θ̂ₙ is strongly consistent", "θ̂ₙ is efficient"],
            optsDE: ["θ̂ₙ ist (schwach) konsistent für θ", "θ̂ₙ ist für jedes n erwartungstreu", "θ̂ₙ ist stark konsistent", "θ̂ₙ ist effizient"],
            correct: 0
        },

        // --- Effizienz (unter erwartungstreuen Schätzern) ---
        {
            q: "Given two unbiased estimators θ̂₁ and θ̂₂ for θ, θ̂₁ is called more efficient than θ̂₂ if:",
            qDE: "Bei zwei erwartungstreuen Schätzern θ̂₁ und θ̂₂ für θ heißt θ̂₁ effizienter als θ̂₂, wenn:",
            opts: ["Var(θ̂₁) ≤ Var(θ̂₂), with strict inequality for at least one θ", "E[θ̂₁] < E[θ̂₂]", "θ̂₁ has a larger sample size", "Var(θ̂₁) = Var(θ̂₂)"],
            optsDE: ["Var(θ̂₁) ≤ Var(θ̂₂), mit strikter Ungleichung für mindestens ein θ", "E[θ̂₁] < E[θ̂₂]", "θ̂₁ eine größere Stichprobe verwendet", "Var(θ̂₁) = Var(θ̂₂)"],
            correct: 0
        },
        {
            q: "Efficiency, as a criterion for comparing estimators, is only meaningfully defined between:",
            qDE: "Effizienz als Kriterium zum Vergleich von Schätzern ist nur sinnvoll definiert zwischen:",
            opts: ["Two unbiased estimators of the same parameter", "Any two estimators, biased or not", "Two consistent estimators only", "Two estimators with equal variance"],
            optsDE: ["Zwei erwartungstreuen Schätzern desselben Parameters", "Beliebigen zwei Schätzern, verzerrt oder nicht", "Zwei konsistenten Schätzern", "Zwei Schätzern mit gleicher Varianz"],
            correct: 0
        },
        {
            q: "θ̂₁ has Var(θ̂₁) = 4 and θ̂₂ has Var(θ̂₂) = 9; both are unbiased for θ. Which is more efficient?",
            qDE: "θ̂₁ hat Var(θ̂₁) = 4, θ̂₂ hat Var(θ̂₂) = 9; beide sind erwartungstreu für θ. Welcher ist effizienter?",
            opts: ["θ̂₁, since it has the smaller variance", "θ̂₂, since it has the larger variance", "Both are equally efficient", "Neither, efficiency cannot be compared here"],
            optsDE: ["θ̂₁, da er die kleinere Varianz hat", "θ̂₂, da er die größere Varianz hat", "Beide sind gleich effizient", "Keiner, Effizienz ist hier nicht vergleichbar"],
            correct: 0
        },
        {
            q: "An unbiased estimator that achieves the Cramér-Rao lower bound is called:",
            qDE: "Ein erwartungstreuer Schätzer, der die Cramér-Rao-Schranke erreicht, heißt:",
            opts: ["Efficient", "Consistent", "Biased", "Asymptotically unbiased"],
            optsDE: ["Effizient", "Konsistent", "Verzerrt", "Asymptotisch erwartungstreu"],
            correct: 0
        },

        // --- MSE-Effizienz (beliebige Schätzer) ---
        {
            q: "Given two estimators θ̂₁ and θ̂₂ for θ, not necessarily unbiased, θ̂₁ is MSE-efficient relative to θ̂₂ if:",
            qDE: "Bei zwei nicht notwendig erwartungstreuen Schätzern θ̂₁ und θ̂₂ für θ heißt θ̂₁ MSE-effizienter als θ̂₂, wenn:",
            opts: ["MSE(θ̂₁) ≤ MSE(θ̂₂), with strict inequality for at least one θ", "Var(θ̂₁) ≤ Var(θ̂₂) regardless of bias", "Bias(θ̂₁) = 0 and Bias(θ̂₂) ≠ 0", "E[θ̂₁] = E[θ̂₂]"],
            optsDE: ["MSE(θ̂₁) ≤ MSE(θ̂₂), mit strikter Ungleichung für mindestens ein θ", "Var(θ̂₁) ≤ Var(θ̂₂) unabhängig vom Bias", "Bias(θ̂₁) = 0 und Bias(θ̂₂) ≠ 0", "E[θ̂₁] = E[θ̂₂]"],
            correct: 0
        },
        {
            q: "Why is MSE-efficiency a more general comparison criterion than (variance-based) efficiency?",
            qDE: "Warum ist MSE-Effizienz ein allgemeineres Vergleichskriterium als (varianzbasierte) Effizienz?",
            opts: ["It can compare any two estimators, including biased ones, not just unbiased ones", "It only applies to consistent estimators", "It ignores variance completely", "It requires both estimators to be unbiased"],
            optsDE: ["Sie kann beliebige zwei Schätzer vergleichen, auch verzerrte, nicht nur erwartungstreue", "Sie gilt nur für konsistente Schätzer", "Sie ignoriert die Varianz vollständig", "Sie setzt voraus, dass beide Schätzer erwartungstreu sind"],
            correct: 0
        },
        {
            q: "θ̂₁ (biased) has MSE = 5; θ̂₂ (unbiased) has MSE = 8. Which is MSE-efficient?",
            qDE: "θ̂₁ (verzerrt) hat MSE = 5; θ̂₂ (erwartungstreu) hat MSE = 8. Welcher ist MSE-effizient?",
            opts: ["θ̂₁, despite being biased, since its MSE is smaller", "θ̂₂, since it is unbiased", "Both, since MSE-efficiency ignores bias", "Neither can be compared"],
            optsDE: ["θ̂₁, trotz Verzerrung, da sein MSE kleiner ist", "θ̂₂, da er erwartungstreu ist", "Beide, da MSE-Effizienz den Bias ignoriert", "Keiner ist vergleichbar"],
            correct: 0
        },
        {
            q: "If both θ̂₁ and θ̂₂ are unbiased, comparing them by MSE-efficiency reduces to comparing them by:",
            qDE: "Wenn sowohl θ̂₁ als auch θ̂₂ erwartungstreu sind, reduziert sich der Vergleich nach MSE-Effizienz auf den Vergleich nach:",
            opts: ["Variance", "Bias", "Sample size", "Consistency"],
            optsDE: ["Varianz", "Bias", "Stichprobenumfang", "Konsistenz"],
            correct: 0
        },

    ],


    10: [

        // --- Konfidenzintervall: Grundidee ---
        {
            q: "A confidence interval with confidence level 1−α is constructed so that:",
            qDE: "Ein Konfidenzintervall mit Konfidenzniveau 1−α wird so konstruiert, dass:",
            opts: ["It contains the true parameter with probability 1−α (over repeated sampling)", "It contains the true parameter with certainty", "It equals the point estimate exactly", "It always has width 1−α"],
            optsDE: ["Es den wahren Parameter mit Wahrscheinlichkeit 1−α überdeckt (bei wiederholter Stichprobenziehung)", "Es den wahren Parameter mit Sicherheit enthält", "Es genau dem Punktschätzer entspricht", "Es stets die Breite 1−α hat"],
            correct: 0
        },
        {
            q: "A two-sided confidence interval for a parameter θ has the form:",
            qDE: "Ein zweiseitiges Konfidenzintervall für einen Parameter θ hat die Form:",
            opts: ["[θ̂ − c, θ̂ + c] bounding θ from both below and above", "(−∞, θ̂ + c] only", "[θ̂ − c, ∞) only", "A single point estimate θ̂"],
            optsDE: ["[θ̂ − c, θ̂ + c], das θ von unten und oben begrenzt", "Nur (−∞, θ̂ + c]", "Nur [θ̂ − c, ∞)", "Ein einzelner Punktschätzer θ̂"],
            correct: 0
        },
        {
            q: "A one-sided (upper) confidence interval for θ has the form:",
            qDE: "Ein einseitiges (oberes) Konfidenzintervall für θ hat die Form:",
            opts: ["(−∞, θ̂ + c]", "[θ̂ − c, θ̂ + c]", "[θ̂ − c, ∞)", "{θ̂}"],
            optsDE: ["(−∞, θ̂ + c]", "[θ̂ − c, θ̂ + c]", "[θ̂ − c, ∞)", "{θ̂}"],
            correct: 0
        },
        {
            q: "Increasing the confidence level from 90% to 99% (all else equal) makes the confidence interval:",
            qDE: "Eine Erhöhung des Konfidenzniveaus von 90% auf 99% (bei sonst gleichen Bedingungen) macht das Konfidenzintervall:",
            opts: ["Wider", "Narrower", "Unchanged", "Negative"],
            optsDE: ["Breiter", "Schmaler", "Unverändert", "Negativ"],
            correct: 0
        },
        {
            q: "Increasing the sample size n (all else equal) typically makes a confidence interval:",
            qDE: "Eine Erhöhung des Stichprobenumfangs n (bei sonst gleichen Bedingungen) macht ein Konfidenzintervall typischerweise:",
            opts: ["Narrower", "Wider", "Unchanged", "Undefined"],
            optsDE: ["Schmaler", "Breiter", "Unverändert", "Undefiniert"],
            correct: 0
        },

        // --- Konfidenzintervall für Erwartungswert ---
        {
            q: "For X₁,…,Xₙ i.i.d. N(μ, σ²) with σ² known, the two-sided CI for μ at level 1−α is:",
            qDE: "Für X₁,…,Xₙ i.i.d. N(μ, σ²) mit bekanntem σ² lautet das zweiseitige KI für μ zum Niveau 1−α:",
            opts: ["X̄ₙ ± z_{1−α/2} · σ/√n", "X̄ₙ ± z_{1−α} · σ/√n", "X̄ₙ ± t_{1−α/2} · σ/√n", "X̄ₙ ± σ²/n"],
            optsDE: ["X̄ₙ ± z_{1−α/2} · σ/√n", "X̄ₙ ± z_{1−α} · σ/√n", "X̄ₙ ± t_{1−α/2} · σ/√n", "X̄ₙ ± σ²/n"],
            correct: 0
        },
        {
            q: "When σ² is unknown and must be estimated from the sample, the two-sided CI for μ uses:",
            qDE: "Wenn σ² unbekannt ist und aus der Stichprobe geschätzt werden muss, verwendet das zweiseitige KI für μ:",
            opts: ["The t-distribution with n−1 degrees of freedom", "The standard normal distribution", "The chi-squared distribution", "The binomial distribution"],
            optsDE: ["Die t-Verteilung mit n−1 Freiheitsgraden", "Die Standardnormalverteilung", "Die Chi-Quadrat-Verteilung", "Die Binomialverteilung"],
            correct: 0
        },
        {
            q: "The two-sided CI for μ with unknown σ² is given by:",
            qDE: "Das zweiseitige KI für μ bei unbekanntem σ² lautet:",
            opts: ["X̄ₙ ± t_{n−1, 1−α/2} · Sₙ/√n", "X̄ₙ ± z_{1−α/2} · Sₙ/√n", "X̄ₙ ± t_{n−1, 1−α/2} · σ/√n", "X̄ₙ ± Sₙ/√n"],
            optsDE: ["X̄ₙ ± t_{n−1, 1−α/2} · Sₙ/√n", "X̄ₙ ± z_{1−α/2} · Sₙ/√n", "X̄ₙ ± t_{n−1, 1−α/2} · σ/√n", "X̄ₙ ± Sₙ/√n"],
            correct: 0
        },
        {
            q: "A one-sided upper CI for μ (σ² known) at level 1−α is:",
            qDE: "Ein einseitiges oberes KI für μ (σ² bekannt) zum Niveau 1−α lautet:",
            opts: ["(−∞, X̄ₙ + z_{1−α} · σ/√n]", "(−∞, X̄ₙ + z_{1−α/2} · σ/√n]", "[X̄ₙ − z_{1−α} · σ/√n, ∞)", "[X̄ₙ, ∞)"],
            optsDE: ["(−∞, X̄ₙ + z_{1−α} · σ/√n]", "(−∞, X̄ₙ + z_{1−α/2} · σ/√n]", "[X̄ₙ − z_{1−α} · σ/√n, ∞)", "[X̄ₙ, ∞)"],
            correct: 0
        },

        // --- Konfidenzintervall für Varianz (Chi-Quadrat) ---
        {
            q: "For X₁,…,Xₙ i.i.d. N(μ, σ²), the quantity (n−1)Sₙ²/σ² follows a:",
            qDE: "Für X₁,…,Xₙ i.i.d. N(μ, σ²) folgt die Größe (n−1)Sₙ²/σ² einer:",
            opts: ["Chi-squared distribution with n−1 degrees of freedom", "Standard normal distribution", "t-distribution with n−1 degrees of freedom", "Binomial distribution"],
            optsDE: ["Chi-Quadrat-Verteilung mit n−1 Freiheitsgraden", "Standardnormalverteilung", "t-Verteilung mit n−1 Freiheitsgraden", "Binomialverteilung"],
            correct: 0
        },
        {
            q: "The two-sided CI for σ² is constructed using two quantiles of:",
            qDE: "Das zweiseitige KI für σ² wird mithilfe zweier Quantile folgender Verteilung konstruiert:",
            opts: ["The chi-squared distribution with n−1 degrees of freedom", "The standard normal distribution", "The t-distribution", "The exponential distribution"],
            optsDE: ["Der Chi-Quadrat-Verteilung mit n−1 Freiheitsgraden", "Der Standardnormalverteilung", "Der t-Verteilung", "Der Exponentialverteilung"],
            correct: 0
        },
        {
            q: "The two-sided CI for σ² at level 1−α is:",
            qDE: "Das zweiseitige KI für σ² zum Niveau 1−α lautet:",
            opts: ["[(n−1)Sₙ² / χ²_{n−1, 1−α/2}, (n−1)Sₙ² / χ²_{n−1, α/2}]", "[Sₙ² − χ²_{1−α/2}, Sₙ² + χ²_{1−α/2}]", "X̄ₙ ± χ²_{1−α/2}", "[Sₙ² / χ²_{α/2}, ∞)"],
            optsDE: ["[(n−1)Sₙ² / χ²_{n−1, 1−α/2}, (n−1)Sₙ² / χ²_{n−1, α/2}]", "[Sₙ² − χ²_{1−α/2}, Sₙ² + χ²_{1−α/2}]", "X̄ₙ ± χ²_{1−α/2}", "[Sₙ² / χ²_{α/2}, ∞)"],
            correct: 0
        },
        {
            q: "Unlike the CI for μ, the CI for σ² based on the chi-squared distribution is generally:",
            qDE: "Im Gegensatz zum KI für μ ist das KI für σ² auf Basis der Chi-Quadrat-Verteilung im Allgemeinen:",
            opts: ["Not symmetric around the point estimate", "Symmetric around the point estimate", "Always of infinite width", "Independent of n"],
            optsDE: ["Nicht symmetrisch um den Punktschätzer", "Symmetrisch um den Punktschätzer", "Stets von unendlicher Breite", "Unabhängig von n"],
            correct: 0
        },

        // --- Konfidenzintervall für p (Binomialverteilung, approximativ) ---
        {
            q: "For X ~ Bin(n, p) with p̂ = X/n, the approximate (Wald) CI for p relies on which theorem?",
            qDE: "Für X ~ Bin(n, p) mit p̂ = X/n beruht das approximative (Wald-)KI für p auf welchem Satz?",
            opts: ["The Central Limit Theorem", "The Law of Large Numbers", "Bayes' theorem", "The Fundamental Theorem of Statistics"],
            optsDE: ["Dem Zentralen Grenzwertsatz", "Dem Gesetz der großen Zahlen", "Dem Satz von Bayes", "Dem Hauptsatz der Statistik"],
            correct: 0
        },
        {
            q: "The approximate two-sided CI for p (Wald interval) at level 1−α is:",
            qDE: "Das approximative zweiseitige KI für p (Wald-Intervall) zum Niveau 1−α lautet:",
            opts: ["p̂ ± z_{1−α/2} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α/2} · p̂(1−p̂)/n", "p̂ ± z_{1−α/2}/√n"],
            optsDE: ["p̂ ± z_{1−α/2} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α/2} · p̂(1−p̂)/n", "p̂ ± z_{1−α/2}/√n"],
            correct: 0
        },
        {
            q: "The approximate CI for p is generally considered reliable when:",
            qDE: "Das approximative KI für p gilt im Allgemeinen als zuverlässig, wenn:",
            opts: ["n is large enough that n·p̂ and n·(1−p̂) are both sufficiently large", "n is small and p̂ is close to 0.5", "p̂ = 0 or p̂ = 1", "n is any value at all"],
            optsDE: ["n groß genug ist, sodass n·p̂ und n·(1−p̂) beide ausreichend groß sind", "n klein ist und p̂ nahe 0,5 liegt", "p̂ = 0 oder p̂ = 1 ist", "n einen beliebigen Wert hat"],
            correct: 0
        },

        // --- Statistische Tests: Grundbegriffe ---
        {
            q: "In hypothesis testing, the null hypothesis H₀ typically represents:",
            qDE: "Beim Hypothesentest repräsentiert die Nullhypothese H₀ typischerweise:",
            opts: ["The default or status-quo claim to be tested against evidence", "The claim the researcher wants to prove", "A claim that is always true", "The sample mean"],
            optsDE: ["Die Standard- bzw. Status-quo-Annahme, die gegen die Evidenz getestet wird", "Die Behauptung, die der Forscher beweisen möchte", "Eine stets wahre Aussage", "Den Stichprobenmittelwert"],
            correct: 0
        },
        {
            q: "The alternative hypothesis H₁ represents:",
            qDE: "Die Alternativhypothese H₁ repräsentiert:",
            opts: ["The claim that contradicts H₀ and is accepted if H₀ is rejected", "The claim that is assumed true by default", "A restatement of H₀", "The observed sample data"],
            optsDE: ["Die Behauptung, die H₀ widerspricht und akzeptiert wird, falls H₀ verworfen wird", "Die standardmäßig als wahr angenommene Behauptung", "Eine Umformulierung von H₀", "Die beobachteten Stichprobendaten"],
            correct: 0
        },
        {
            q: "A Type I error occurs when:",
            qDE: "Ein Fehler 1. Art tritt auf, wenn:",
            opts: ["H₀ is true but is rejected", "H₀ is false but is not rejected", "H₀ is true and not rejected", "H₁ is true and accepted"],
            optsDE: ["H₀ wahr ist, aber verworfen wird", "H₀ falsch ist, aber nicht verworfen wird", "H₀ wahr ist und nicht verworfen wird", "H₁ wahr ist und akzeptiert wird"],
            correct: 0
        },
        {
            q: "A Type II error occurs when:",
            qDE: "Ein Fehler 2. Art tritt auf, wenn:",
            opts: ["H₀ is false but is not rejected", "H₀ is true but is rejected", "H₀ is true and not rejected", "H₁ is rejected while true"],
            optsDE: ["H₀ falsch ist, aber nicht verworfen wird", "H₀ wahr ist, aber verworfen wird", "H₀ wahr ist und nicht verworfen wird", "H₁ verworfen wird, obwohl sie wahr ist"],
            correct: 0
        },
        {
            q: "The significance level α of a test is defined as:",
            qDE: "Das Signifikanzniveau α eines Tests ist definiert als:",
            opts: ["The maximum allowed probability of a Type I error", "The probability of a Type II error", "The probability that H₀ is true", "The probability that H₁ is true"],
            optsDE: ["Die maximal zulässige Wahrscheinlichkeit für einen Fehler 1. Art", "Die Wahrscheinlichkeit für einen Fehler 2. Art", "Die Wahrscheinlichkeit, dass H₀ wahr ist", "Die Wahrscheinlichkeit, dass H₁ wahr ist"],
            correct: 0
        },
        {
            q: "The power of a test is defined as:",
            qDE: "Die Power (Trennschärfe) eines Tests ist definiert als:",
            opts: ["1 minus the probability of a Type II error", "The probability of a Type I error", "The significance level α", "The sample size n"],
            optsDE: ["1 minus die Wahrscheinlichkeit eines Fehlers 2. Art", "Die Wahrscheinlichkeit eines Fehlers 1. Art", "Das Signifikanzniveau α", "Der Stichprobenumfang n"],
            correct: 0
        },
        {
            q: "Increasing the sample size n, all else equal, typically has which effect on the power of a test?",
            qDE: "Eine Erhöhung des Stichprobenumfangs n hat, bei sonst gleichen Bedingungen, typischerweise welchen Effekt auf die Power eines Tests?",
            opts: ["It increases the power", "It decreases the power", "It has no effect on power", "It always sets power to 1"],
            optsDE: ["Sie erhöht die Power", "Sie verringert die Power", "Sie hat keinen Einfluss auf die Power", "Sie setzt die Power stets auf 1"],
            correct: 0
        },
        {
            q: "The power function (Gütefunktion) of a test, as a function of the true parameter θ, gives:",
            qDE: "Die Gütefunktion eines Tests gibt in Abhängigkeit vom wahren Parameter θ an:",
            opts: ["The probability of rejecting H₀ for each value of θ", "The probability of accepting H₀ for each value of θ", "The sample mean for each θ", "The significance level for each θ"],
            optsDE: ["Die Wahrscheinlichkeit, H₀ für jeden Wert von θ zu verwerfen", "Die Wahrscheinlichkeit, H₀ für jeden Wert von θ anzunehmen", "Den Stichprobenmittelwert für jedes θ", "Das Signifikanzniveau für jedes θ"],
            correct: 0
        },
        {
            q: "For θ values under H₀, the power function of a valid level-α test should be:",
            qDE: "Für θ-Werte unter H₀ sollte die Gütefunktion eines gültigen Tests zum Niveau α:",
            opts: ["At most α", "Exactly 1", "At least 1−α", "Equal to the power"],
            optsDE: ["Höchstens α sein", "Genau 1 sein", "Mindestens 1−α sein", "Gleich der Power sein"],
            correct: 0
        },

        // --- Tests für den Erwartungswert ---
        {
            q: "For a one-sample test of H₀: μ = μ₀ against H₁: μ ≠ μ₀, the test is called:",
            qDE: "Für einen Ein-Stichproben-Test von H₀: μ = μ₀ gegen H₁: μ ≠ μ₀ heißt der Test:",
            opts: ["Two-sided (two-tailed) test", "One-sided (one-tailed) test", "Chi-squared test", "Approximate test only"],
            optsDE: ["Zweiseitiger Test", "Einseitiger Test", "Chi-Quadrat-Test", "Nur ein approximativer Test"],
            correct: 0
        },
        {
            q: "For a one-sample test of H₀: μ ≤ μ₀ against H₁: μ > μ₀, the test is called:",
            qDE: "Für einen Ein-Stichproben-Test von H₀: μ ≤ μ₀ gegen H₁: μ > μ₀ heißt der Test:",
            opts: ["One-sided (upper-tailed) test", "Two-sided test", "Lower-tailed test only", "A test without a rejection region"],
            optsDE: ["Einseitiger Test (oberer Ablehnungsbereich)", "Zweiseitiger Test", "Nur ein unterer Test", "Ein Test ohne Ablehnungsbereich"],
            correct: 0
        },
        {
            q: "The Gauß-test (one-sample z-test) for the mean is used when:",
            qDE: "Der Gauß-Test (Ein-Stichproben-z-Test) für den Erwartungswert wird verwendet, wenn:",
            opts: ["The variance σ² is known and the data are (approximately) normal", "The variance is unknown", "The sample size is very small and σ² unknown", "The data follow a binomial distribution"],
            optsDE: ["Die Varianz σ² bekannt ist und die Daten (annähernd) normalverteilt sind", "Die Varianz unbekannt ist", "Der Stichprobenumfang sehr klein ist und σ² unbekannt", "Die Daten binomialverteilt sind"],
            correct: 0
        },
        {
            q: "The test statistic of the one-sample Gauß-test for H₀: μ = μ₀ is:",
            qDE: "Die Teststatistik des Ein-Stichproben-Gauß-Tests für H₀: μ = μ₀ lautet:",
            opts: ["Z = (X̄ₙ − μ₀) / (σ/√n)", "Z = (X̄ₙ − μ₀) / (Sₙ/√n)", "Z = (X̄ₙ − μ₀) · σ√n", "Z = X̄ₙ / σ"],
            optsDE: ["Z = (X̄ₙ − μ₀) / (σ/√n)", "Z = (X̄ₙ − μ₀) / (Sₙ/√n)", "Z = (X̄ₙ − μ₀) · σ√n", "Z = X̄ₙ / σ"],
            correct: 0
        },
        {
            q: "Under H₀, the test statistic of the one-sample Gauß-test follows:",
            qDE: "Unter H₀ folgt die Teststatistik des Ein-Stichproben-Gauß-Tests:",
            opts: ["The standard normal distribution N(0,1)", "The t-distribution with n−1 degrees of freedom", "The chi-squared distribution", "The binomial distribution"],
            optsDE: ["Der Standardnormalverteilung N(0,1)", "Der t-Verteilung mit n−1 Freiheitsgraden", "Der Chi-Quadrat-Verteilung", "Der Binomialverteilung"],
            correct: 0
        },
        {
            q: "The one-sample t-test for the mean is used instead of the Gauß-test when:",
            qDE: "Der Ein-Stichproben-t-Test für den Erwartungswert wird anstelle des Gauß-Tests verwendet, wenn:",
            opts: ["The variance σ² is unknown and must be estimated from the sample", "The variance σ² is known exactly", "n is extremely large only", "The data are binomially distributed"],
            optsDE: ["Die Varianz σ² unbekannt ist und aus der Stichprobe geschätzt werden muss", "Die Varianz σ² exakt bekannt ist", "n nur extrem groß ist", "Die Daten binomialverteilt sind"],
            correct: 0
        },
        {
            q: "The test statistic of the one-sample t-test for H₀: μ = μ₀ is:",
            qDE: "Die Teststatistik des Ein-Stichproben-t-Tests für H₀: μ = μ₀ lautet:",
            opts: ["T = (X̄ₙ − μ₀) / (Sₙ/√n)", "T = (X̄ₙ − μ₀) / (σ/√n)", "T = (X̄ₙ − μ₀) · Sₙ√n", "T = X̄ₙ / Sₙ"],
            optsDE: ["T = (X̄ₙ − μ₀) / (Sₙ/√n)", "T = (X̄ₙ − μ₀) / (σ/√n)", "T = (X̄ₙ − μ₀) · Sₙ√n", "T = X̄ₙ / Sₙ"],
            correct: 0
        },
        {
            q: "Under H₀, the test statistic of the one-sample t-test follows:",
            qDE: "Unter H₀ folgt die Teststatistik des Ein-Stichproben-t-Tests:",
            opts: ["The t-distribution with n−1 degrees of freedom", "The standard normal distribution N(0,1)", "The chi-squared distribution with n degrees of freedom", "The F-distribution"],
            optsDE: ["Der t-Verteilung mit n−1 Freiheitsgraden", "Der Standardnormalverteilung N(0,1)", "Der Chi-Quadrat-Verteilung mit n Freiheitsgraden", "Der F-Verteilung"],
            correct: 0
        },
        {
            q: "For a two-sided Gauß-test at level α, H₀ is rejected when:",
            qDE: "Bei einem zweiseitigen Gauß-Test zum Niveau α wird H₀ verworfen, wenn:",
            opts: ["|Z| > z_{1−α/2}", "Z > z_{1−α}", "Z < z_{α}", "|Z| < z_{1−α/2}"],
            optsDE: ["|Z| > z_{1−α/2}", "Z > z_{1−α}", "Z < z_{α}", "|Z| < z_{1−α/2}"],
            correct: 0
        },
        {
            q: "For a one-sided (upper-tailed) Gauß-test of H₀: μ ≤ μ₀ at level α, H₀ is rejected when:",
            qDE: "Bei einem einseitigen (oberen) Gauß-Test von H₀: μ ≤ μ₀ zum Niveau α wird H₀ verworfen, wenn:",
            opts: ["Z > z_{1−α}", "Z > z_{1−α/2}", "|Z| > z_{1−α}", "Z < z_{1−α}"],
            optsDE: ["Z > z_{1−α}", "Z > z_{1−α/2}", "|Z| > z_{1−α}", "Z < z_{1−α}"],
            correct: 0
        },

        // --- Zusammenhang Test und Konfidenzintervall ---
        {
            q: "The duality between confidence intervals and hypothesis tests states that a two-sided level-α test rejects H₀: μ = μ₀ if and only if:",
            qDE: "Die Dualität zwischen Konfidenzintervallen und Hypothesentests besagt: Ein zweiseitiger Test zum Niveau α verwirft H₀: μ = μ₀ genau dann, wenn:",
            opts: ["μ₀ lies outside the (1−α) confidence interval for μ", "μ₀ lies inside the (1−α) confidence interval for μ", "The sample mean equals μ₀", "The p-value is exactly α"],
            optsDE: ["μ₀ außerhalb des (1−α)-Konfidenzintervalls für μ liegt", "μ₀ innerhalb des (1−α)-Konfidenzintervalls für μ liegt", "Der Stichprobenmittelwert gleich μ₀ ist", "Der p-Wert genau α beträgt"],
            correct: 0
        },
        {
            q: "If the 95% confidence interval for μ is [2.1, 4.8], a two-sided test of H₀: μ = 5 at α = 0.05:",
            qDE: "Wenn das 95%-Konfidenzintervall für μ [2.1, 4.8] ist, ein zweiseitiger Test von H₀: μ = 5 zum Niveau α = 0.05:",
            opts: ["Rejects H₀, since 5 lies outside the interval", "Does not reject H₀, since 5 lies inside the interval", "Cannot be determined from the interval", "Always rejects H₀ regardless of the interval"],
            optsDE: ["Verwirft H₀, da 5 außerhalb des Intervalls liegt", "Verwirft H₀ nicht, da 5 innerhalb des Intervalls liegt", "Kann anhand des Intervalls nicht bestimmt werden", "Verwirft H₀ stets, unabhängig vom Intervall"],
            correct: 0
        },
        {
            q: "Constructing a confidence interval and performing a hypothesis test are related because both are based on:",
            qDE: "Die Konstruktion eines Konfidenzintervalls und die Durchführung eines Hypothesentests hängen zusammen, da beide auf Folgendem beruhen:",
            opts: ["The same test statistic and its sampling distribution", "Completely unrelated statistics", "The p-value alone", "The sample size alone"],
            optsDE: ["Derselben Teststatistik und ihrer Stichprobenverteilung", "Vollkommen unabhängigen Statistiken", "Nur dem p-Wert", "Nur dem Stichprobenumfang"],
            correct: 0
        },

        // --- p-Wert ---
        {
            q: "The p-value of a test is defined as:",
            qDE: "Der p-Wert eines Tests ist definiert als:",
            opts: ["The probability, under H₀, of observing a test statistic at least as extreme as the one observed", "The probability that H₀ is true", "The significance level α", "The probability that H₁ is true"],
            optsDE: ["Die Wahrscheinlichkeit unter H₀, eine Teststatistik zu beobachten, die mindestens so extrem ist wie die beobachtete", "Die Wahrscheinlichkeit, dass H₀ wahr ist", "Das Signifikanzniveau α", "Die Wahrscheinlichkeit, dass H₁ wahr ist"],
            correct: 0
        },
        {
            q: "Using the p-value decision rule, H₀ is rejected at significance level α when:",
            qDE: "Bei der p-Wert-Entscheidungsregel wird H₀ zum Signifikanzniveau α verworfen, wenn:",
            opts: ["p-value ≤ α", "p-value ≥ α", "p-value = 1", "p-value = 0.5"],
            optsDE: ["p-Wert ≤ α", "p-Wert ≥ α", "p-Wert = 1", "p-Wert = 0,5"],
            correct: 0
        },
        {
            q: "A very small p-value (e.g. 0.001) provides:",
            qDE: "Ein sehr kleiner p-Wert (z. B. 0,001) liefert:",
            opts: ["Strong evidence against H₀", "Strong evidence for H₀", "No information at all", "Proof that H₁ is true with certainty"],
            optsDE: ["Starke Evidenz gegen H₀", "Starke Evidenz für H₀", "Überhaupt keine Information", "Den sicheren Beweis, dass H₁ wahr ist"],
            correct: 0
        },
        {
            q: "A common misinterpretation of the p-value is to treat it as:",
            qDE: "Eine verbreitete Fehlinterpretation des p-Werts besteht darin, ihn zu behandeln als:",
            opts: ["The probability that H₀ is true given the data", "The probability, under H₀, of data as extreme as observed", "A measure of effect size", "The confidence level"],
            optsDE: ["Die Wahrscheinlichkeit, dass H₀ angesichts der Daten wahr ist", "Die Wahrscheinlichkeit unter H₀, Daten mindestens so extrem wie beobachtet zu erhalten", "Ein Maß für die Effektstärke", "Das Konfidenzniveau"],
            correct: 0
        },
    ],


    11: [

        // --- Asymptotischer Binomialtest ---
        {
            q: "The asymptotic (approximate) binomial test for H₀: p = p₀ uses which distribution as its approximation for the test statistic?",
            qDE: "Der asymptotische (approximative) Binomialtest für H₀: p = p₀ verwendet welche Verteilung zur Approximation der Teststatistik?",
            opts: ["The standard normal distribution N(0,1)", "The exact binomial distribution", "The t-distribution", "The chi-squared distribution"],
            optsDE: ["Die Standardnormalverteilung N(0,1)", "Die exakte Binomialverteilung", "Die t-Verteilung", "Die Chi-Quadrat-Verteilung"],
            correct: 0
        },
        {
            q: "The test statistic of the asymptotic binomial test for H₀: p = p₀, based on p̂ = X/n, is:",
            qDE: "Die Teststatistik des asymptotischen Binomialtests für H₀: p = p₀, basierend auf p̂ = X/n, lautet:",
            opts: ["Z = (p̂ − p₀) / √(p₀(1−p₀)/n)", "Z = (p̂ − p₀) / √(p̂(1−p̂))", "Z = p̂ / p₀", "Z = (p̂ − p₀) · n"],
            optsDE: ["Z = (p̂ − p₀) / √(p₀(1−p₀)/n)", "Z = (p̂ − p₀) / √(p̂(1−p̂))", "Z = p̂ / p₀", "Z = (p̂ − p₀) · n"],
            correct: 0
        },
        {
            q: "The asymptotic binomial test relies on which theorem to justify the normal approximation?",
            qDE: "Der asymptotische Binomialtest stützt sich auf welchen Satz, um die Normalapproximation zu rechtfertigen?",
            opts: ["The Central Limit Theorem", "The Law of Total Probability", "Bayes' theorem", "The Fundamental Theorem of Statistics"],
            optsDE: ["Den Zentralen Grenzwertsatz", "Den Satz der totalen Wahrscheinlichkeit", "Den Satz von Bayes", "Den Hauptsatz der Statistik"],
            correct: 0
        },
        {
            q: "A common rule of thumb for the asymptotic binomial test to be reliable is:",
            qDE: "Eine gängige Faustregel für die Zuverlässigkeit des asymptotischen Binomialtests lautet:",
            opts: ["n·p₀·(1−p₀) is sufficiently large (e.g. ≥ 9)", "n is at least 1000", "p₀ = 0.5 exactly", "The data must be continuous"],
            optsDE: ["n·p₀·(1−p₀) ist ausreichend groß (z. B. ≥ 9)", "n ist mindestens 1000", "p₀ = 0,5 genau", "Die Daten müssen stetig sein"],
            correct: 0
        },

        // --- Verbundenes Design (paired samples) ---
        {
            q: "In a paired (verbundenes) design, the two samples X₁,…,Xₙ and Y₁,…,Yₙ must satisfy:",
            qDE: "Bei einem verbundenen Design müssen die beiden Stichproben X₁,…,Xₙ und Y₁,…,Yₙ erfüllen:",
            opts: ["Both samples have the same size n, and Xᵢ and Yᵢ belong to the same unit (e.g. same subject before/after)", "The samples must have different sizes", "The samples must be independent of each other", "The variances must be known"],
            optsDE: ["Beide Stichproben haben denselben Umfang n, und Xᵢ und Yᵢ gehören zur selben Einheit (z. B. dieselbe Person vorher/nachher)", "Die Stichproben müssen unterschiedliche Umfänge haben", "Die Stichproben müssen unabhängig voneinander sein", "Die Varianzen müssen bekannt sein"],
            correct: 0
        },
        {
            q: "For a paired design, the differences are defined as:",
            qDE: "Bei einem verbundenen Design sind die Differenzen definiert als:",
            opts: ["Dᵢ = Yᵢ − Xᵢ", "Dᵢ = Yᵢ + Xᵢ", "Dᵢ = Yᵢ · Xᵢ", "Dᵢ = Yᵢ / Xᵢ"],
            optsDE: ["Dᵢ = Yᵢ − Xᵢ", "Dᵢ = Yᵢ + Xᵢ", "Dᵢ = Yᵢ · Xᵢ", "Dᵢ = Yᵢ / Xᵢ"],
            correct: 0
        },
        {
            q: "The test statistic for the paired-sample test on the mean difference is T = √n · D̄ / S_D, where S_D denotes:",
            qDE: "Die Teststatistik des Tests bei verbundenen Stichproben für den mittleren Unterschied ist T = √n · D̄ / S_D, wobei S_D bezeichnet:",
            opts: ["The sample standard deviation of the differences Dᵢ", "The standard deviation of Xᵢ only", "The standard deviation of Yᵢ only", "The pooled standard deviation of X and Y"],
            optsDE: ["Die Stichprobenstandardabweichung der Differenzen Dᵢ", "Die Standardabweichung von Xᵢ allein", "Die Standardabweichung von Yᵢ allein", "Die gepoolte Standardabweichung von X und Y"],
            correct: 0
        },
        {
            q: "The paired-sample test essentially reduces the two-sample problem to:",
            qDE: "Der Test bei verbundenen Stichproben reduziert das Zwei-Stichproben-Problem im Wesentlichen auf:",
            opts: ["A one-sample t-test on the differences Dᵢ against H₀: E[D] = 0", "A two-sample F-test", "An unpaired t-test", "A chi-squared test"],
            optsDE: ["Einen Ein-Stichproben-t-Test auf die Differenzen Dᵢ gegen H₀: E[D] = 0", "Einen Zwei-Stichproben-F-Test", "Einen unverbundenen t-Test", "Einen Chi-Quadrat-Test"],
            correct: 0
        },
        {
            q: "Under H₀: E[D] = 0, and assuming the Dᵢ are i.i.d. normal, the statistic T = √n · D̄ / S_D follows:",
            qDE: "Unter H₀: E[D] = 0 und unter der Annahme, dass die Dᵢ i.i.d. normalverteilt sind, folgt die Statistik T = √n · D̄ / S_D:",
            opts: ["A t-distribution with n−1 degrees of freedom", "A standard normal distribution", "A chi-squared distribution with n degrees of freedom", "An F-distribution"],
            optsDE: ["Einer t-Verteilung mit n−1 Freiheitsgraden", "Einer Standardnormalverteilung", "Einer Chi-Quadrat-Verteilung mit n Freiheitsgraden", "Einer F-Verteilung"],
            correct: 0
        },
        {
            q: "A paired design is typically preferred over an unpaired design when:",
            qDE: "Ein verbundenes Design wird einem unverbundenen Design typischerweise vorgezogen, wenn:",
            opts: ["Observations naturally come in related pairs (e.g. before/after on the same subject), reducing variability", "The two samples are collected from unrelated subjects", "The sample sizes differ", "The variances are known"],
            optsDE: ["Beobachtungen natürlich in zusammengehörigen Paaren vorliegen (z. B. vorher/nachher bei derselben Person), was die Variabilität verringert", "Die beiden Stichproben von nicht zusammenhängenden Personen stammen", "Die Stichprobenumfänge unterschiedlich sind", "Die Varianzen bekannt sind"],
            correct: 0
        },

        // --- Unverbundenes Design (unpaired samples) ---
        {
            q: "In an unpaired (unverbundenes) design, the two samples X₁,…,Xₘ and Y₁,…,Yₙ are assumed to be:",
            qDE: "Bei einem unverbundenen Design wird für die beiden Stichproben X₁,…,Xₘ und Y₁,…,Yₙ angenommen, dass sie:",
            opts: ["Independent of each other, and may have different sample sizes m ≠ n", "Always the same size", "Paired observations on the same units", "Perfectly correlated"],
            optsDE: ["Unabhängig voneinander sind und unterschiedliche Stichprobenumfänge m ≠ n haben können", "Immer denselben Umfang haben", "Gepaarte Beobachtungen derselben Einheiten sind", "Perfekt korreliert sind"],
            correct: 0
        },
        {
            q: "An unpaired design is typically used when:",
            qDE: "Ein unverbundenes Design wird typischerweise verwendet, wenn:",
            opts: ["The two groups consist of different, unrelated subjects (e.g. treatment vs. control group)", "The same subjects are measured twice", "The sample sizes must be equal", "There is no variability between groups"],
            optsDE: ["Die beiden Gruppen aus unterschiedlichen, nicht zusammenhängenden Personen bestehen (z. B. Behandlungs- vs. Kontrollgruppe)", "Dieselben Personen zweimal gemessen werden", "Die Stichprobenumfänge gleich sein müssen", "Es keine Variabilität zwischen den Gruppen gibt"],
            correct: 0
        },

        // --- F-Test auf Varianzhomogenität ---
        {
            q: "The F-test for homogeneity of variance tests the null hypothesis:",
            qDE: "Der F-Test auf Varianzhomogenität testet die Nullhypothese:",
            opts: ["H₀: σ_X² = σ_Y²", "H₀: μ_X = μ_Y", "H₀: σ_X² = 0", "H₀: p_X = p_Y"],
            optsDE: ["H₀: σ_X² = σ_Y²", "H₀: μ_X = μ_Y", "H₀: σ_X² = 0", "H₀: p_X = p_Y"],
            correct: 0
        },
        {
            q: "The F-test statistic for comparing two variances is:",
            qDE: "Die F-Teststatistik zum Vergleich zweier Varianzen lautet:",
            opts: ["F = S_X² / S_Y²", "F = S_X² − S_Y²", "F = S_X² · S_Y²", "F = (S_X² + S_Y²) / 2"],
            optsDE: ["F = S_X² / S_Y²", "F = S_X² − S_Y²", "F = S_X² · S_Y²", "F = (S_X² + S_Y²) / 2"],
            correct: 0
        },
        {
            q: "Under H₀: σ_X² = σ_Y², assuming both samples are normal and independent, the F-statistic S_X²/S_Y² follows:",
            qDE: "Unter H₀: σ_X² = σ_Y², bei normalverteilten und unabhängigen Stichproben, folgt die F-Statistik S_X²/S_Y²:",
            opts: ["An F-distribution with (m−1, n−1) degrees of freedom", "A t-distribution with m+n−2 degrees of freedom", "A standard normal distribution", "A chi-squared distribution"],
            optsDE: ["Einer F-Verteilung mit (m−1, n−1) Freiheitsgraden", "Einer t-Verteilung mit m+n−2 Freiheitsgraden", "Einer Standardnormalverteilung", "Einer Chi-Quadrat-Verteilung"],
            correct: 0
        },
        {
            q: "Why is the F-test on variance homogeneity often performed before a two-sample t-test?",
            qDE: "Warum wird der F-Test auf Varianzhomogenität oft vor einem Zwei-Stichproben-t-Test durchgeführt?",
            opts: ["To check whether the equal-variance assumption needed for the standard t-test holds, or whether the Welch test should be used instead", "To estimate the sample means", "To determine the correct sample size", "Because it replaces the need for a t-test entirely"],
            optsDE: ["Um zu prüfen, ob die für den Standard-t-Test nötige Annahme gleicher Varianzen zutrifft, oder ob stattdessen der Welch-Test verwendet werden sollte", "Um die Stichprobenmittelwerte zu schätzen", "Um den richtigen Stichprobenumfang zu bestimmen", "Weil er den t-Test vollständig ersetzt"],
            correct: 0
        },

        // --- 2-Stichproben-t-Test (gleiche Varianz) ---
        {
            q: "The two-sample t-test for a location difference μ_X − μ_Y assumes:",
            qDE: "Der Zwei-Stichproben-t-Test auf einen Lageunterschied μ_X − μ_Y setzt voraus:",
            opts: ["Both samples are normal, independent, and have equal (but unknown) variances", "Both samples have known, possibly unequal variances", "The samples are paired", "The variances are unequal"],
            optsDE: ["Beide Stichproben sind normalverteilt, unabhängig und besitzen gleiche (aber unbekannte) Varianzen", "Beide Stichproben haben bekannte, möglicherweise ungleiche Varianzen", "Die Stichproben sind verbunden", "Die Varianzen sind ungleich"],
            correct: 0
        },
        {
            q: "In the two-sample t-test (equal variances), the pooled variance estimator S_p² is a weighted average of:",
            qDE: "Beim Zwei-Stichproben-t-Test (gleiche Varianzen) ist der gepoolte Varianzschätzer S_p² ein gewichteter Durchschnitt aus:",
            opts: ["S_X² and S_Y², weighted by their respective degrees of freedom", "X̄ and Ȳ", "m and n only", "The F-statistic and the t-statistic"],
            optsDE: ["S_X² und S_Y², gewichtet nach ihren jeweiligen Freiheitsgraden", "X̄ und Ȳ", "Nur m und n", "Der F-Statistik und der t-Statistik"],
            correct: 0
        },
        {
            q: "The test statistic for the two-sample t-test with pooled variance S_p² is:",
            qDE: "Die Teststatistik des Zwei-Stichproben-t-Tests mit gepoolter Varianz S_p² lautet:",
            opts: ["T = (X̄ − Ȳ) / (S_p · √(1/m + 1/n))", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m+n)", "T = (X̄ − Ȳ) / (S_X + S_Y)"],
            optsDE: ["T = (X̄ − Ȳ) / (S_p · √(1/m + 1/n))", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m+n)", "T = (X̄ − Ȳ) / (S_X + S_Y)"],
            correct: 0
        },
        {
            q: "Under H₀: μ_X = μ_Y, the two-sample t-test statistic (equal variances) follows a t-distribution with how many degrees of freedom?",
            qDE: "Unter H₀: μ_X = μ_Y folgt die Zwei-Stichproben-t-Teststatistik (gleiche Varianzen) einer t-Verteilung mit wie vielen Freiheitsgraden?",
            opts: ["m + n − 2", "m + n − 1", "m − 1", "min(m, n) − 1"],
            optsDE: ["m + n − 2", "m + n − 1", "m − 1", "min(m, n) − 1"],
            correct: 0
        },

        // --- Welch-Test ---
        {
            q: "The Welch test is used instead of the standard two-sample t-test when:",
            qDE: "Der Welch-Test wird anstelle des Standard-Zwei-Stichproben-t-Tests verwendet, wenn:",
            opts: ["The two population variances cannot be assumed equal", "The two samples are paired", "The sample sizes are equal", "The variances are known exactly"],
            optsDE: ["Die Varianzen der beiden Grundgesamtheiten nicht als gleich angenommen werden können", "Die beiden Stichproben verbunden sind", "Die Stichprobenumfänge gleich sind", "Die Varianzen exakt bekannt sind"],
            correct: 0
        },
        {
            q: "The Welch test statistic for μ_X − μ_Y is:",
            qDE: "Die Welch-Teststatistik für μ_X − μ_Y lautet:",
            opts: ["T = (X̄ − Ȳ) / √(S_X²/m + S_Y²/n)", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m·n)", "T = (X̄ − Ȳ) / (S_X² + S_Y²)"],
            optsDE: ["T = (X̄ − Ȳ) / √(S_X²/m + S_Y²/n)", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m·n)", "T = (X̄ − Ȳ) / (S_X² + S_Y²)"],
            correct: 0
        },
        {
            q: "Unlike the standard two-sample t-test, the Welch test uses degrees of freedom that are:",
            qDE: "Im Gegensatz zum Standard-Zwei-Stichproben-t-Test verwendet der Welch-Test Freiheitsgrade, die:",
            opts: ["Estimated from the data via the Welch–Satterthwaite equation, and generally not an integer", "Always equal to m + n − 2", "Always equal to min(m, n) − 1", "Not needed at all"],
            optsDE: ["Über die Welch-Satterthwaite-Gleichung aus den Daten geschätzt werden und in der Regel keine ganze Zahl sind", "Immer gleich m + n − 2", "Immer gleich min(m, n) − 1", "Überhaupt nicht benötigt werden"],
            correct: 0
        },
        {
            q: "A key advantage of the Welch test over the pooled-variance t-test is that it remains valid when:",
            qDE: "Ein wesentlicher Vorteil des Welch-Tests gegenüber dem gepoolten t-Test besteht darin, dass er gültig bleibt, wenn:",
            opts: ["The two groups have unequal variances and/or unequal sample sizes", "The two groups have equal variances only", "The data are not normally distributed at all", "The sample sizes must both be small"],
            optsDE: ["Die beiden Gruppen ungleiche Varianzen und/oder ungleiche Stichprobenumfänge haben", "Die beiden Gruppen nur gleiche Varianzen haben", "Die Daten überhaupt nicht normalverteilt sind", "Beide Stichprobenumfänge klein sein müssen"],
            correct: 0
        },

        // --- 2-Stichproben-Binomialtest ---
        {
            q: "The two-sample binomial test compares:",
            qDE: "Der Zwei-Stichproben-Binomialtest vergleicht:",
            opts: ["Two proportions p_X and p_Y from two independent binomial samples", "Two variances from two normal samples", "Two paired means", "A single proportion against a fixed value"],
            optsDE: ["Zwei Anteile p_X und p_Y aus zwei unabhängigen Binomialstichproben", "Zwei Varianzen aus zwei Normalstichproben", "Zwei verbundene Mittelwerte", "Einen einzelnen Anteil gegen einen festen Wert"],
            correct: 0
        },
        {
            q: "For the two-sample binomial test of H₀: p_X = p_Y, the pooled proportion estimator p̂ is computed as:",
            qDE: "Für den Zwei-Stichproben-Binomialtest von H₀: p_X = p_Y wird der gepoolte Anteilsschätzer p̂ berechnet als:",
            opts: ["(Xₛᵤᵤₘ + Yₛᵤₘ) / (m + n), i.e. total successes over total observations", "(p̂_X + p̂_Y) / 2 only", "p̂_X · p̂_Y", "max(p̂_X, p̂_Y)"],
            optsDE: ["(Summe der Erfolge in X + Y) / (m + n), also Gesamterfolge über Gesamtbeobachtungen", "Nur (p̂_X + p̂_Y) / 2", "p̂_X · p̂_Y", "max(p̂_X, p̂_Y)"],
            correct: 0
        },
        {
            q: "The (asymptotic) test statistic for the two-sample binomial test under H₀: p_X = p_Y is approximately:",
            qDE: "Die (asymptotische) Teststatistik des Zwei-Stichproben-Binomialtests unter H₀: p_X = p_Y ist näherungsweise:",
            opts: ["Z = (p̂_X − p̂_Y) / √(p̂(1−p̂)(1/m + 1/n))", "Z = (p̂_X − p̂_Y) / (p̂_X + p̂_Y)", "Z = p̂_X / p̂_Y", "Z = (p̂_X − p̂_Y) · m · n"],
            optsDE: ["Z = (p̂_X − p̂_Y) / √(p̂(1−p̂)(1/m + 1/n))", "Z = (p̂_X − p̂_Y) / (p̂_X + p̂_Y)", "Z = p̂_X / p̂_Y", "Z = (p̂_X − p̂_Y) · m · n"],
            correct: 0
        },
        {
            q: "Under H₀, the two-sample binomial test statistic is approximately distributed as:",
            qDE: "Unter H₀ ist die Teststatistik des Zwei-Stichproben-Binomialtests näherungsweise verteilt als:",
            opts: ["N(0, 1)", "t-distribution with m+n−2 degrees of freedom", "Chi-squared distribution", "F-distribution"],
            optsDE: ["N(0, 1)", "t-Verteilung mit m+n−2 Freiheitsgraden", "Chi-Quadrat-Verteilung", "F-Verteilung"],
            correct: 0
        },

    ],












    12: [],




    13: [

        // Unsorted

        {
            q: "The Law of Large Numbers states that as the sample size n → ∞, the sample mean:",
            qDE: "Das Gesetz der großen Zahlen besagt, dass mit wachsendem Stichprobenumfang n der Stichprobenmittelwert:",
            opts: ["Converges to the true population mean μ", "Converges to 0", "Increases without bound", "Equals the median"],
            optsDE: ["Gegen den wahren Erwartungswert μ konvergiert", "Gegen 0 konvergiert", "Unbeschränkt wächst", "Dem Median entspricht"],
            correct: 0
        },
        {
            q: "The Central Limit Theorem requires that the random variables are:",
            qDE: "Der Zentrale Grenzwertsatz setzt voraus, dass die Zufallsvariablen:",
            opts: ["Independent and identically distributed (i.i.d.) with finite variance", "Normally distributed", "Discrete", "All equal to their mean"],
            optsDE: ["Unabhängig und identisch verteilt (i.i.d.) mit endlicher Varianz", "Normalverteilt", "Diskret", "Alle gleich ihrem Erwartungswert"],
            correct: 0
        },
        {
            q: "The covariance matrix Σ of a random vector is always:",
            qDE: "Die Kovarianzmatrix Σ eines Zufallsvektors ist stets:",
            opts: ["Symmetric and positive semi-definite", "Diagonal", "Invertible", "A scalar"],
            optsDE: ["Symmetrisch und positiv semidefinit", "Diagonal", "Invertierbar", "Ein Skalar"],
            correct: 0
        },
        {
            q: "A Poisson distribution with parameter λ has which expected value?",
            qDE: "Eine Poisson-Verteilung mit Parameter λ hat welchen Erwartungswert?",
            opts: ["λ", "1/λ", "λ²", "√λ"],
            optsDE: ["λ", "1/λ", "λ²", "√λ"],
            correct: 0
        },
        {
            q: "An unbiased estimator θ̂ for a parameter θ satisfies:",
            qDE: "Ein erwartungstreuer Schätzer θ̂ für einen Parameter θ erfüllt:",
            opts: ["E[θ̂] = θ", "Var(θ̂) = 0", "θ̂ = θ always", "E[θ̂] = 0"],
            optsDE: ["E[θ̂] = θ", "Var(θ̂) = 0", "θ̂ = θ immer", "E[θ̂] = 0"],
            correct: 0
        },
        {
            q: "For a random variable X, the moment generating function (MGF) is defined as:",
            qDE: "Für eine Zufallsvariable X ist die momenterzeugende Funktion (MGF) definiert als:",
            opts: ["M_X(t) = E[e^(tX)]", "M_X(t) = E[X^t]", "M_X(t) = ln E[X]", "M_X(t) = E[X] · t"],
            optsDE: ["M_X(t) = E[e^(tX)]", "M_X(t) = E[X^t]", "M_X(t) = ln E[X]", "M_X(t) = E[X] · t"],
            correct: 0
        },
        {
            q: "The marginal distribution of X is obtained from the joint distribution f(x, y) by:",
            qDE: "Die Randverteilung von X wird aus der gemeinsamen Verteilung f(x, y) durch folgendes erhalten:",
            opts: ["Integrating (or summing) over all values of Y", "Dividing by f(y)", "Subtracting f(y) from f(x,y)", "Multiplying f(x,y) by f(y)"],
            optsDE: ["Integration (oder Summation) über alle Werte von Y", "Division durch f(y)", "Subtraktion von f(y) aus f(x,y)", "Multiplikation von f(x,y) mit f(y)"],
            correct: 0
        },
        {
            q: "The variance of the sample mean (1/n)∑Xᵢ of n i.i.d. variables with variance σ² is:",
            qDE: "Die Varianz des Stichprobenmittelwerts (1/n)∑Xᵢ von n i.i.d. Variablen mit Varianz σ² beträgt:",
            opts: ["σ² / n", "σ²", "n · σ²", "σ / n"],
            optsDE: ["σ² / n", "σ²", "n · σ²", "σ / n"],
            correct: 0
        },
        {
            q: "Markov's inequality states that for a non-negative RV X and a > 0:",
            qDE: "Die Markov-Ungleichung besagt für eine nicht-negative ZV X und a > 0:",
            opts: ["P(X ≥ a) ≤ E[X] / a", "P(X ≥ a) ≥ E[X] / a", "P(X ≥ a) = E[X] / a", "P(X ≤ a) ≤ E[X] / a"],
            optsDE: ["P(X ≥ a) ≤ E[X] / a", "P(X ≥ a) ≥ E[X] / a", "P(X ≥ a) = E[X] / a", "P(X ≤ a) ≤ E[X] / a"],
            correct: 0
        },
        {
            q: "Chebyshev's inequality states that P(|X − μ| ≥ k·σ) is bounded by:",
            qDE: "Die Tschebyschow-Ungleichung begrenzt P(|X − μ| ≥ k·σ) durch:",
            opts: ["1 / k²", "1 / k", "k²", "σ / k"],
            optsDE: ["1 / k²", "1 / k", "k²", "σ / k"],
            correct: 0
        },


        {
            q: "What does the Central Limit Theorem state?",
            qDE: "Was besagt der Zentrale Grenzwertsatz?",
            opts: ["Sample means approach normality as n grows", "All distributions are normal", "The variance always equals 1", "Large samples have no skewness"],
            optsDE: ["Stichprobenmittelwerte nähern sich bei wachsendem n der Normalverteilung", "Alle Verteilungen sind normal", "Die Varianz beträgt immer 1", "Große Stichproben haben keine Schiefe"],
            correct: 0
        },
        {
            q: "What is the variance of a Ber(p) distribution?",
            qDE: "Wie lautet die Varianz einer Ber(p)-Verteilung?",
            opts: ["p(1−p)", "p²", "(1−p)²", "1/p"],
            optsDE: ["p(1−p)", "p²", "(1−p)²", "1/p"],
            correct: 0
        },
        {
            q: "What is the Bayes' theorem formula for P(A|B)?",
            qDE: "Wie lautet die Bayes-Formel für P(A|B)?",
            opts: ["P(B|A)·P(A)/P(B)", "P(A)·P(B)", "P(A∩B)/P(A)", "P(B)/P(A)"],
            optsDE: ["P(B|A)·P(A)/P(B)", "P(A)·P(B)", "P(A∩B)/P(A)", "P(B)/P(A)"],
            correct: 0
        },
        {
            q: "If X~N(0,1), what is P(X > 0)?",
            qDE: "Wenn X~N(0,1) gilt, was ist P(X > 0)?",
            opts: ["0.5", "0.25", "0.75", "1.0"],
            optsDE: ["0.5", "0.25", "0.75", "1.0"],
            correct: 0
        },
        {
            q: "A correlation coefficient r = −1 means:",
            qDE: "Ein Korrelationskoeffizient r = −1 bedeutet:",
            opts: ["Perfect negative linear relationship", "No relationship", "Perfect positive relationship", "Weak negative relationship"],
            optsDE: ["Perfekter negativer linearer Zusammenhang", "Kein Zusammenhang", "Perfekter positiver Zusammenhang", "Schwacher negativer Zusammenhang"],
            correct: 0
        },
        {
            q: "If Cov(X,Y) = 0 and X,Y are jointly normal, then:",
            qDE: "Wenn Cov(X,Y) = 0 und X,Y gemeinsam normalverteilt sind, dann:",
            opts: ["X and Y are independent", "X and Y are identical", "E[X]·E[Y]=0", "Var(X+Y)=0"],
            optsDE: ["X und Y sind unabhängig", "X und Y sind identisch", "E[X]·E[Y]=0", "Var(X+Y)=0"],
            correct: 0
        },
        {
            q: "For the CDF F(x) = P(X ≤ x), what is lim F(x) for x->oo?",
            qDE: "Für die Verteilungsfunktion F(x) = P(X ≤ x), was ist lim F(x) für x->oo?",
            opts: ["1", "0", "0.5", "Undefined"],
            optsDE: ["1", "0", "0.5", "Undefiniert"],
            correct: 0
        },

    ],
};


