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
            correct: 0,
            explain: "By definition, the sample space Ω collects every outcome an experiment could possibly produce — likely or unlikely, as long as it's possible.",
            explainDE: "Per Definition enthält die Ergebnismenge Ω alle Ergebnisse, die ein Experiment überhaupt hervorbringen kann — egal ob wahrscheinlich oder unwahrscheinlich, solange sie möglich sind."
        },
        {
            q: "The complement of event A (written Aᶜ) contains:",
            qDE: "Das Komplement des Ereignisses A (Aᶜ) enthält:",
            opts: ["All outcomes NOT in A", "All outcomes in A", "Only impossible outcomes", "The intersection of A with Ω"],
            optsDE: ["Alle Ergebnisse, die NICHT in A liegen", "Alle Ergebnisse in A", "Nur unmögliche Ergebnisse", "Den Schnitt von A mit Ω"],
            correct: 0,
            explain: "The complement Aᶜ is everything in Ω that is left over once you remove A — i.e. all outcomes where A does not happen.",
            explainDE: "Das Komplement Aᶜ besteht aus allem, was in Ω übrig bleibt, wenn man A entfernt — also allen Ergebnissen, bei denen A nicht eintritt."
        },
        {
            q: "If A and B are disjoint, then P(A ∩ B) equals:",
            qDE: "Wenn A und B disjunkt sind, gilt P(A ∩ B) =",
            opts: ["0", "P(A) + P(B)", "P(A) · P(B)", "1"],
            optsDE: ["0", "P(A) + P(B)", "P(A) · P(B)", "1"],
            correct: 0,
            explain: "Disjoint means A and B share no outcomes at all, so their intersection is the empty set ∅, which always has probability 0.",
            explainDE: "Disjunkt bedeutet, dass A und B keine gemeinsamen Ergebnisse haben, also ist ihr Schnitt die leere Menge ∅, die immer die Wahrscheinlichkeit 0 hat."
        },
        {
            q: "De Morgan's law states that (A ∪ B)ᶜ equals:",
            qDE: "Die Regel von De Morgan besagt, dass (A ∪ B)ᶜ gleich ist mit:",
            opts: ["Aᶜ ∩ Bᶜ", "Aᶜ ∪ Bᶜ", "A ∩ B", "A ∪ B"],
            optsDE: ["Aᶜ ∩ Bᶜ", "Aᶜ ∪ Bᶜ", "A ∩ B", "A ∪ B"],
            correct: 0,
            explain: "'Not (A or B)' means neither A nor B happened, which is the same as 'not A AND not B' — that's exactly Aᶜ ∩ Bᶜ.",
            explainDE: "„Nicht (A oder B)” bedeutet, dass weder A noch B eingetreten ist — also „nicht A UND nicht B”, was genau Aᶜ ∩ Bᶜ entspricht."
        },
        {
            q: "A probability measure P must satisfy P(Ω) = ?",
            qDE: "Ein Wahrscheinlichkeitsmaß P muss P(Ω) = ? erfüllen:",
            opts: ["1", "0", "0.5", "Any positive number"],
            optsDE: ["1", "0", "0.5", "Eine beliebige positive Zahl"],
            correct: 0,
            explain: "Ω contains every possible outcome, so something in Ω is guaranteed to happen — that's why P(Ω) must equal 1 (Kolmogorov's axiom).",
            explainDE: "Ω enthält alle möglichen Ergebnisse, also tritt garantiert etwas aus Ω ein — deshalb muss P(Ω) = 1 sein (Kolmogorov-Axiom)."
        },
        {
            q: "Which of these CANNOT be a valid probability?",
            qDE: "Welcher dieser Werte kann KEINE gültige Wahrscheinlichkeit sein?",
            opts: ["−0.1", "0", "0.5", "1"],
            optsDE: ["−0,1", "0", "0,5", "1"],
            correct: 0,
            explain: "Probabilities must always lie between 0 and 1, inclusive. −0.1 is negative, which breaks that rule — it can never be a valid probability.",
            explainDE: "Wahrscheinlichkeiten müssen immer zwischen 0 und 1 liegen. −0,1 ist negativ und verletzt damit diese Regel — es kann nie eine gültige Wahrscheinlichkeit sein."
        },
        {
            q: "The smallest possible σ-algebra on any non-empty Ω is:",
            qDE: "Die kleinste mögliche σ-Algebra auf einem nicht-leeren Ω ist:",
            opts: ["{∅, Ω}", "The power set of Ω", "{Ω}", "{∅}"],
            optsDE: ["{∅, Ω}", "Die Potenzmenge von Ω", "{Ω}", "{∅}"],
            correct: 0,
            explain: "A σ-algebra must always contain ∅ and Ω, and be closed under complements/unions. {∅, Ω} already satisfies all of that with nothing extra, so it's the smallest one possible.",
            explainDE: "Eine σ-Algebra muss immer ∅ und Ω enthalten und unter Komplement/Vereinigung abgeschlossen sein. {∅, Ω} erfüllt das bereits ohne etwas Zusätzliches — deshalb ist es die kleinstmögliche σ-Algebra."
        },
        {
            q: "The inclusion-exclusion formula for P(A ∪ B) is:",
            qDE: "Die Siebformel für P(A ∪ B) lautet:",
            opts: ["P(A) + P(B) − P(A ∩ B)", "P(A) + P(B) + P(A ∩ B)", "P(A) · P(B)", "P(A) − P(B)"],
            optsDE: ["P(A) + P(B) − P(A ∩ B)", "P(A) + P(B) + P(A ∩ B)", "P(A) · P(B)", "P(A) − P(B)"],
            correct: 0,
            explain: "If you just add P(A) + P(B), you count the overlap P(A ∩ B) twice, so you have to subtract it once to correct for the double-count.",
            explainDE: "Addiert man einfach P(A) + P(B), wird die Überlappung P(A ∩ B) doppelt gezählt — deshalb muss man sie einmal wieder abziehen."
        },
        {
            q: "Two fair dice are rolled. How many outcomes are in the sample space Ω?",
            qDE: "Zwei faire Würfel werden geworfen. Wie viele Ergebnisse hat die Ergebnismenge Ω?",
            opts: ["36", "12", "6", "18"],
            optsDE: ["36", "12", "6", "18"],
            correct: 0,
            explain: "Each die has 6 possible outcomes, and the two rolls are independent, so the total number of combined outcomes is 6 × 6 = 36.",
            explainDE: "Jeder Würfel hat 6 mögliche Ergebnisse, und die beiden Würfe sind unabhängig, also ergeben sich insgesamt 6 × 6 = 36 Kombinationen."
        },
        {
            q: "A set Ω has 4 elements. How many subsets does its power set Pot(Ω) contain?",
            qDE: "Eine Menge Ω hat 4 Elemente. Wie viele Teilmengen enthält die Potenzmenge Pot(Ω)?",
            opts: ["16", "8", "4", "12"],
            optsDE: ["16", "8", "4", "12"],
            correct: 0,
            explain: "A set with n elements has 2ⁿ subsets, since each element can independently be either included or excluded. Here 2⁴ = 16.",
            explainDE: "Eine Menge mit n Elementen hat 2ⁿ Teilmengen, da jedes Element unabhängig entweder enthalten oder nicht enthalten sein kann. Hier gilt 2⁴ = 16."
        },
        {
            q: "Which of the following is always true for any event A?",
            qDE: "Welche Aussage gilt immer für ein beliebiges Ereignis A?",
            opts: ["P(A) + P(Aᶜ) = 1", "P(A) = P(Aᶜ)", "P(A) · P(Aᶜ) = 1", "P(A) − P(Aᶜ) = 0"],
            optsDE: ["P(A) + P(Aᶜ) = 1", "P(A) = P(Aᶜ)", "P(A) · P(Aᶜ) = 1", "P(A) − P(Aᶜ) = 0"],
            correct: 0,
            explain: "A and Aᶜ together make up all of Ω and never overlap, so their probabilities must add up to P(Ω) = 1.",
            explainDE: "A und Aᶜ ergeben zusammen ganz Ω und überschneiden sich nie, daher müssen sich ihre Wahrscheinlichkeiten zu P(Ω) = 1 addieren."
        },
        {
            q: "De Morgan's law states that (A ∩ B)ᶜ equals:",
            qDE: "Die Regel von De-Morgan besagt, dass (A ∩ B)ᶜ gleich ist mit:",
            opts: ["Aᶜ ∪ Bᶜ", "Aᶜ ∩ Bᶜ", "A ∪ B", "A ∩ B"],
            optsDE: ["Aᶜ ∪ Bᶜ", "Aᶜ ∩ Bᶜ", "A ∪ B", "A ∩ B"],
            correct: 0,
            explain: "'Not (A and B)' means at least one of them failed to happen — that's 'not A OR not B', which is Aᶜ ∪ Bᶜ.",
            explainDE: "„Nicht (A und B)” bedeutet, dass mindestens eines der beiden nicht eingetreten ist — also „nicht A ODER nicht B”, was Aᶜ ∪ Bᶜ entspricht."
        },
        {
            q: "In a Laplace experiment, all elementary events have:",
            qDE: "In einem Laplace-Experiment haben alle Elementarereignisse:",
            opts: ["Equal probability", "Probability 0", "Probability 1", "Different probabilities"],
            optsDE: ["Gleiche Wahrscheinlichkeit", "Wahrscheinlichkeit 0", "Wahrscheinlichkeit 1", "Unterschiedliche Wahrscheinlichkeiten"],
            correct: 0,
            explain: "A Laplace experiment is defined by the discrete uniform distribution, meaning every single elementary outcome is equally likely by definition.",
            explainDE: "Ein Laplace-Experiment ist per Definition diskret gleichverteilt, d.h. jedes Elementarereignis ist gleich wahrscheinlich."
        },
        {
            q: "Events A and B are mutually exclusive. P(A) = 0.3. What can you say about P(A ∪ B)?",
            qDE: "Die Ereignisse A und B sind disjunkt. P(A) = 0,3. Was gilt für P(A ∪ B)?",
            opts: ["P(A ∪ B) = P(A) + P(B)", "P(A ∪ B) = P(A) · P(B)", "P(A ∪ B) = P(A) − P(B)", "P(A ∪ B) = P(A ∩ B)"],
            optsDE: ["P(A ∪ B) = P(A) + P(B)", "P(A ∪ B) = P(A) · P(B)", "P(A ∪ B) = P(A) − P(B)", "P(A ∪ B) = P(A ∩ B)"],
            correct: 0,
            explain: "Since A and B never overlap, the general formula P(A) + P(B) − P(A ∩ B) simplifies: P(A ∩ B) = 0, leaving just P(A) + P(B).",
            explainDE: "Da sich A und B nie überschneiden, vereinfacht sich die allgemeine Formel P(A) + P(B) − P(A ∩ B): P(A ∩ B) = 0, es bleibt nur P(A) + P(B) übrig."
        },
        {
            q: "The impossible event ∅ has probability:",
            qDE: "Das unmögliche Ereignis ∅ hat die Wahrscheinlichkeit:",
            opts: ["0", "1", "0.5", "Undefined"],
            optsDE: ["0", "1", "0,5", "Undefiniert"],
            correct: 0,
            explain: "∅ contains no outcomes at all, so it can never happen — by the axioms of probability, this always corresponds to probability 0.",
            explainDE: "∅ enthält keine Ergebnisse und kann daher nie eintreten — nach den Axiomen der Wahrscheinlichkeitsrechnung entspricht das immer der Wahrscheinlichkeit 0."
        },
        {
            q: "A coin is flipped twice. How many elementary events are in the sample space?",
            qDE: "Eine Münze wird zweimal geworfen. Wie viele Elementarereignisse hat die Ergebnismenge?",
            opts: ["4", "2", "8", "6"],
            optsDE: ["4", "2", "8", "6"],
            correct: 0,
            explain: "Each flip has 2 outcomes (heads/tails), and the two flips are independent, so there are 2 × 2 = 4 possible sequences: HH, HT, TH, TT.",
            explainDE: "Jeder Wurf hat 2 Ergebnisse (Kopf/Zahl), und die beiden Würfe sind unabhängig, also gibt es 2 × 2 = 4 mögliche Folgen: KK, KZ, ZK, ZZ."
        },
        {
            q: "P(A) = 0.4, P(B) = 0.5, P(A ∩ B) = 0.2. What is P(A ∪ B)?",
            qDE: "P(A) = 0,4, P(B) = 0,5, P(A ∩ B) = 0,2. Was ist P(A ∪ B)?",
            opts: ["0.7", "0.9", "0.2", "0.45"],
            optsDE: ["0,7", "0,9", "0,2", "0,45"],
            correct: 0,
            explain: "Using inclusion-exclusion: P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = 0.4 + 0.5 − 0.2 = 0.7.",
            explainDE: "Mit der Siebformel: P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = 0,4 + 0,5 − 0,2 = 0,7."
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
            correct: 0,
            explain: "In a Laplace space every outcome is equally likely, so the probability of A is simply the fraction of outcomes belonging to A out of all outcomes.",
            explainDE: "In einem Laplace-Raum ist jedes Ergebnis gleich wahrscheinlich, daher ist die Wahrscheinlichkeit von A einfach der Anteil der zu A gehörenden Ergebnisse an allen Ergebnissen."
        },
        {
            q: "Drawing WITHOUT replacement means:",
            qDE: "Ziehen OHNE Zurücklegen bedeutet:",
            opts: ["Each element can only be drawn once", "Elements can be drawn multiple times", "The order does not matter", "The sample space is infinite"],
            optsDE: ["Jedes Element kann nur einmal gezogen werden", "Elemente können mehrfach gezogen werden", "Die Reihenfolge spielt keine Rolle", "Die Ergebnismenge ist unendlich groß"],
            correct: 0,
            explain: "Without replacement means once an element is drawn it is removed from the pool, so it can never be chosen again in later draws.",
            explainDE: "Ohne Zurücklegen bedeutet, dass ein gezogenes Element aus dem Vorrat entfernt wird und daher bei späteren Zügen nicht erneut gewählt werden kann."
        },
        {
            q: "The union bound (Boolean Inequality) states P(A ∪ B) ≤",
            qDE: "Die Boolesche Ungleichung besagt P(A ∪ B) ≤",
            opts: ["P(A) + P(B)", "P(A) · P(B)", "P(A) − P(B)", "min(P(A), P(B))"],
            optsDE: ["P(A) + P(B)", "P(A) · P(B)", "P(A) − P(B)", "min(P(A), P(B))"],
            correct: 0,
            explain: "The union bound simply drops the −P(A ∩ B) correction term from the exact inclusion-exclusion formula, giving an upper bound instead of the exact value.",
            explainDE: "Die Boolesche Ungleichung lässt den Korrekturterm −P(A ∩ B) der exakten Siebformel weg und liefert dadurch eine obere statt einer exakten Schranke."
        },
        {
            q: "The number of ordered draws of k items from n WITHOUT replacement is:",
            qDE: "Die Anzahl geordneter Züge von k Elementen aus n OHNE Zurücklegen ist:",
            opts: ["n! / (n−k)!", "n! / k!", "nᵏ", "C(n,k)"],
            optsDE: ["n! / (n−k)!", "n! / k!", "nᵏ", "C(n,k)"],
            correct: 0,
            explain: "The first draw has n choices, the second n−1, and so on down to n−k+1 for the k-th draw; multiplying these together gives n!/(n−k)!.",
            explainDE: "Für den ersten Zug gibt es n Möglichkeiten, für den zweiten n−1, usw. bis n−k+1 für den k-ten Zug; das Produkt davon ergibt n!/(n−k)!."
        },
        {
            q: "The odds in favour of event A with P(A) = p are defined as:",
            qDE: "Die Chance (Odds) für Ereignis A mit P(A) = p sind definiert als:",
            opts: ["p / (1−p)", "(1−p) / p", "p · (1−p)", "1 / p"],
            optsDE: ["p / (1−p)", "(1−p) / p", "p · (1−p)", "1 / p"],
            correct: 0,
            explain: "Odds compare how likely something is to happen against how likely it is not to happen, so odds = P(happens)/P(doesn't happen) = p/(1−p).",
            explainDE: "Odds vergleichen die Wahrscheinlichkeit, dass etwas eintritt, mit der Wahrscheinlichkeit, dass es nicht eintritt, also Odds = p/(1−p)."
        },
        {
            q: "In a Laplace space, if every elementary event has probability 1/8, how many outcomes does Ω contain?",
            qDE: "In einem Laplace-Raum hat jedes Elementarereignis die Wahrscheinlichkeit 1/8. Wie viele Ergebnisse enthält Ω?",
            opts: ["8", "4", "16", "2"],
            optsDE: ["8", "4", "16", "2"],
            correct: 0,
            explain: "All outcomes are equally likely and their probabilities must sum to 1, so dividing 1 by the common probability 1/8 gives exactly 8 outcomes.",
            explainDE: "Alle Ergebnisse sind gleich wahrscheinlich und ihre Wahrscheinlichkeiten müssen sich zu 1 summieren, daher ergibt 1 geteilt durch 1/8 genau 8 Ergebnisse."
        },
        {
            q: "With replacement, order matters: drawing k items from n gives how many outcomes? (B(n,k) is the binomial coefficient)",
            qDE: "Mit Zurücklegen, Reihenfolge zählt: k Züge aus n ergeben wie viele Ergebnisse? (B(n,k) ist der Binomialkoeffizient)",
            opts: ["nᵏ", "n! / (n−k)!", "B(n,k)", "k!"],
            optsDE: ["nᵏ", "n! / (n−k)!", "B(n,k)", "k!"],
            correct: 0,
            explain: "Since items are replaced, every one of the k draws independently has n possible outcomes, giving n multiplied by itself k times: nᵏ.",
            explainDE: "Da Elemente zurückgelegt werden, hat jeder der k Züge unabhängig n mögliche Ergebnisse, was n mal sich selbst k-mal, also nᵏ, ergibt."
        },
        {
            q: "A σ-algebra must be closed under which operations?",
            qDE: "Eine σ-Algebra muss abgeschlossen sein unter welchen Operationen?",
            opts: ["Complement and countable union", "Only intersection", "Only complement", "Complement and finite intersection"],
            optsDE: ["Komplement und abzählbare Vereinigung", "Nur Schnitt", "Nur Komplement", "Komplement und endlichem Schnitt"],
            correct: 0,
            explain: "By definition a σ-algebra must contain the complement of every set it contains, and must be closed under taking countable (not just finite) unions of its sets.",
            explainDE: "Per Definition muss eine σ-Algebra das Komplement jeder enthaltenen Menge enthalten und unter abzählbaren (nicht nur endlichen) Vereinigungen ihrer Mengen abgeschlossen sein."
        },
        {
            q: "The binomial coefficient B(n, k) counts the number of ways to choose k items from n where:",
            qDE: "Der Binomialkoeffizient B(n, k) zählt die Möglichkeiten, k Elemente aus n zu wählen, wobei:",
            opts: ["Order does NOT matter and draws are without replacement", "Order matters and draws are with replacement", "Order matters and draws are without replacement", "Order does NOT matter and draws are with replacement"],
            optsDE: ["Reihenfolge KEINE Rolle spielt und ohne Zurücklegen gezogen wird", "Reihenfolge zählt und mit Zurücklegen gezogen wird", "Reihenfolge zählt und ohne Zurücklegen gezogen wird", "Reihenfolge KEINE Rolle spielt und mit Zurücklegen gezogen wird"],
            correct: 0,
            explain: "The binomial coefficient counts unordered subsets chosen without replacement — which k of the n items end up selected, regardless of the order they were picked in.",
            explainDE: "Der Binomialkoeffizient zählt ungeordnete Teilmengen ohne Zurücklegen — welche k der n Elemente ausgewählt werden, unabhängig von der Reihenfolge der Auswahl."
        },
        {
            q: "How many ways are there to arrange all 5 elements of a set in a row?",
            qDE: "Auf wie viele Arten lassen sich alle 5 Elemente einer Menge in einer Reihe anordnen?",
            opts: ["120", "25", "5", "60"],
            optsDE: ["120", "25", "5", "60"],
            correct: 0,
            explain: "Arranging all n elements in a row is a permutation, giving n! orderings; for n = 5 this is 5! = 5·4·3·2·1 = 120.",
            explainDE: "Das Anordnen aller n Elemente in einer Reihe ist eine Permutation und ergibt n! Anordnungen; für n = 5 also 5! = 5·4·3·2·1 = 120."
        },
        {
            q: "Boole's inequality (union bound) states that for any events A₁, …, Aₙ:",
            qDE: "Die Boolesche Ungleichung besagt, dass für beliebige Ereignisse A₁, …, Aₙ gilt:",
            opts: ["P(A₁ ∪ … ∪ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) = P(A₁) + … + P(Aₙ)", "P(A₁ ∩ … ∩ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) ≥ P(A₁) + … + P(Aₙ)"],
            optsDE: ["P(A₁ ∪ … ∪ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) = P(A₁) + … + P(Aₙ)", "P(A₁ ∩ … ∩ Aₙ) ≤ P(A₁) + … + P(Aₙ)", "P(A₁ ∪ … ∪ Aₙ) ≥ P(A₁) + … + P(Aₙ)"],
            correct: 0,
            explain: "Boole's inequality generalizes the two-event union bound to any number of events: the probability of their union never exceeds the sum of their individual probabilities.",
            explainDE: "Die Boolesche Ungleichung verallgemeinert die Zwei-Ereignis-Schranke auf beliebig viele Ereignisse: Die Wahrscheinlichkeit ihrer Vereinigung übersteigt nie die Summe der Einzelwahrscheinlichkeiten."
        },
        {
            q: "For the inclusion-exclusion principle applied to three sets, you add P(A), P(B), P(C), then subtract the pairwise intersections, then:",
            qDE: "Bei der Siebformel für drei Mengen addiert man P(A), P(B), P(C), subtrahiert die paarweisen Schnitte und dann:",
            opts: ["Add back P(A ∩ B ∩ C)", "Subtract P(A ∩ B ∩ C) again", "Do nothing further", "Subtract P(A ∪ B ∪ C)"],
            optsDE: ["Addiert P(A ∩ B ∩ C) wieder", "Subtrahiert P(A ∩ B ∩ C) erneut", "Tut nichts weiteres", "Subtrahiert P(A ∪ B ∪ C)"],
            correct: 0,
            explain: "Subtracting all three pairwise intersections removes the triple overlap once too many times, so it must be added back to correct the count.",
            explainDE: "Das Subtrahieren aller drei paarweisen Schnitte entfernt die dreifache Überlappung einmal zu oft, weshalb sie wieder addiert werden muss, um die Zählung zu korrigieren."
        },
        {
            q: "The binomial coefficient B(6, 2) equals:",
            qDE: "Der Binomialkoeffizient B(6, 2) ergibt:",
            opts: ["15", "12", "30", "6"],
            optsDE: ["15", "12", "30", "6"],
            correct: 0,
            explain: "B(6,2) = 6! / (2!·4!) = (6·5) / (2·1) = 15.",
            explainDE: "B(6,2) = 6! / (2!·4!) = (6·5) / (2·1) = 15."
        },
        {
            q: "In a Laplace space, a bag holds 3 red and 7 blue balls. What is P(drawing a red ball)?",
            qDE: "Im Laplace-Raum enthält ein Beutel 3 rote und 7 blaue Bälle. Was ist P(rote Kugel ziehen)?",
            opts: ["3/10", "7/10", "3/7", "1/3"],
            optsDE: ["3/10", "7/10", "3/7", "1/3"],
            correct: 0,
            explain: "There are 3 red balls out of 10 total balls, so in this Laplace space P(red) = 3/10.",
            explainDE: "Es gibt 3 rote von insgesamt 10 Bällen, daher gilt in diesem Laplace-Raum P(rot) = 3/10."
        },
        {
            q: "Drawing k items from n WITH replacement and order matters gives how many outcomes? (B(n,k) is the binomial coefficient)",
            qDE: "k Elemente aus n MIT Zurücklegen ziehen, Reihenfolge zählt. Wie viele Ergebnisse gibt es? (B(n,k) ist der Binomialkoeffizient)",
            opts: ["nᵏ", "B(n,k)", "n! / (n−k)!", "k!"],
            optsDE: ["nᵏ", "B(n,k)", "n! / (n−k)!", "k!"],
            correct: 0,
            explain: "Because items are replaced, each of the k draws independently has n possible outcomes, giving n·n·…·n (k times) = nᵏ.",
            explainDE: "Da Elemente zurückgelegt werden, hat jeder der k Züge unabhängig n mögliche Ergebnisse, was n·n·…·n (k-mal), also nᵏ, ergibt."
        },
        {
            q: "A valid σ-algebra on Ω must contain:",
            qDE: "Eine gültige σ-Algebra auf Ω muss enthalten:",
            opts: ["∅ and Ω", "Only Ω", "Only ∅", "All non-empty subsets of Ω"],
            optsDE: ["∅ und Ω", "Nur Ω", "Nur ∅", "Alle nicht-leeren Teilmengen von Ω"],
            correct: 0,
            explain: "Every σ-algebra is required by definition to contain both the empty set ∅ and the full sample space Ω.",
            explainDE: "Jede σ-Algebra muss per Definition sowohl die leere Menge ∅ als auch den gesamten Ergebnisraum Ω enthalten."
        },
        {
            q: "The odds in favour of an event with probability p = 0.25 are:",
            qDE: "Die Chance (Odds) für ein Ereignis mit Wahrscheinlichkeit p = 0,25 betragen:",
            opts: ["1/3", "1/4", "3/4", "4"],
            optsDE: ["1/3", "1/4", "3/4", "4"],
            correct: 0,
            explain: "Odds = p / (1−p) = 0.25 / 0.75 = 1/3.",
            explainDE: "Odds = p / (1−p) = 0,25 / 0,75 = 1/3."
        },
        {
            q: "How many unordered selections of 3 items from 10 (without replacement) are there?",
            qDE: "Wie viele ungeordnete Auswahlen von 3 aus 10 Elementen (ohne Zurücklegen) gibt es?",
            opts: ["120", "720", "30", "1000"],
            optsDE: ["120", "720", "30", "1000"],
            correct: 0,
            explain: "Unordered selections without replacement use the binomial coefficient: B(10,3) = 10! / (3!·7!) = 120.",
            explainDE: "Ungeordnete Auswahlen ohne Zurücklegen verwenden den Binomialkoeffizienten: B(10,3) = 10! / (3!·7!) = 120."
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
            correct: 0,
            explain: "Conditioning on B restricts attention to the world where B already happened, so we look at the share of that world where A also happens: P(A ∩ B) / P(B).",
            explainDE: "Die Bedingung auf B beschränkt die Betrachtung auf die Welt, in der B bereits eingetreten ist, daher betrachtet man den Anteil dieser Welt, in dem auch A eintritt: P(A ∩ B) / P(B)."
        },
        {
            q: "Events A and B are independent if and only if:",
            qDE: "Ereignisse A und B sind unabhängig genau dann, wenn:",
            opts: ["P(A ∩ B) = P(A) · P(B)", "P(A ∩ B) = 0", "P(A|B) = P(B)", "P(A ∪ B) = 1"],
            optsDE: ["P(A ∩ B) = P(A) · P(B)", "P(A ∩ B) = 0", "P(A|B) = P(B)", "P(A ∪ B) = 1"],
            correct: 0,
            explain: "Independence means knowing that B happened doesn't change the probability of A, which algebraically is exactly the condition P(A ∩ B) = P(A)·P(B).",
            explainDE: "Unabhängigkeit bedeutet, dass das Wissen um B die Wahrscheinlichkeit von A nicht verändert, was algebraisch genau der Bedingung P(A ∩ B) = P(A)·P(B) entspricht."
        },
        {
            q: "The law of total probability states that P(A) equals:",
            qDE: "Der Satz der totalen Wahrscheinlichkeit besagt, dass P(A) gleich ist:",
            opts: ["Σ P(A|Bᵢ)·P(Bᵢ) over a partition {Bᵢ}", "P(A|B) · P(B)", "P(A) · P(B)", "P(A ∩ B) / P(B)"],
            optsDE: ["Σ P(A|Bᵢ)·P(Bᵢ) über eine Partition {Bᵢ}", "P(A|B) · P(B)", "P(A) · P(B)", "P(A ∩ B) / P(B)"],
            correct: 0,
            explain: "Splitting Ω into disjoint scenarios Bᵢ that cover everything, A must happen through exactly one of them, so summing P(A|Bᵢ)·P(Bᵢ) over all scenarios recovers P(A).",
            explainDE: "Teilt man Ω in disjunkte, alles abdeckende Szenarien Bᵢ auf, muss A durch genau eines davon eintreten; die Summe von P(A|Bᵢ)·P(Bᵢ) über alle Szenarien liefert daher P(A)."
        },
        {
            q: "Bayes' theorem gives P(B|A) in terms of P(A|B) as:",
            qDE: "Der Satz von Bayes gibt P(B|A) in Abhängigkeit von P(A|B) als:",
            opts: ["P(A|B)·P(B) / P(A)", "P(A|B) / P(B)", "P(A|B) + P(B)", "P(B) / P(A)"],
            optsDE: ["P(A|B)·P(B) / P(A)", "P(A|B) / P(B)", "P(A|B) + P(B)", "P(B) / P(A)"],
            correct: 0,
            explain: "Bayes' theorem comes from writing P(A ∩ B) two ways — as P(A|B)·P(B) and as P(B|A)·P(A) — and solving for P(B|A), which yields P(A|B)·P(B)/P(A).",
            explainDE: "Der Satz von Bayes ergibt sich, indem man P(A ∩ B) auf zwei Arten schreibt — als P(A|B)·P(B) und als P(B|A)·P(A) — und nach P(B|A) auflöst, was P(A|B)·P(B)/P(A) liefert."
        },
        {
            q: "For a continuous random variable X, P(X = c) for any single value c equals:",
            qDE: "Für eine stetige Zufallsvariable X gilt P(X = c) für jeden einzelnen Wert c:",
            opts: ["0", "f(c) where f is the PDF", "F(c) where F is the CDF", "1 / range"],
            optsDE: ["0", "f(c), wobei f die Dichte ist", "F(c), wobei F die Verteilungsfunktion ist", "1 / Bereich"],
            correct: 0,
            explain: "A continuous distribution spreads probability over an uncountable continuum of values, so any single exact point carries zero probability mass.",
            explainDE: "Eine stetige Verteilung verteilt die Wahrscheinlichkeit über ein überabzählbares Kontinuum von Werten, weshalb ein einzelner exakter Punkt keine Wahrscheinlichkeitsmasse trägt."
        },
        {
            q: "The distribution function F(x) of a random variable X is defined as:",
            qDE: "Die Verteilungsfunktion F(x) einer Zufallsvariable X ist definiert als:",
            opts: ["P(X ≤ x)", "P(X = x)", "P(X > x)", "d/dx P(X ≤ x)"],
            optsDE: ["P(X ≤ x)", "P(X = x)", "P(X > x)", "d/dx P(X ≤ x)"],
            correct: 0,
            explain: "The CDF is defined to accumulate all probability up to and including x, i.e. the probability that X takes a value at most x.",
            explainDE: "Die Verteilungsfunktion ist so definiert, dass sie die gesamte Wahrscheinlichkeit bis einschließlich x aufsummiert, also die Wahrscheinlichkeit, dass X höchstens x annimmt."
        },
        {
            q: "The quantile function Q(p) is the smallest x such that:",
            qDE: "Die Quantilfunktion Q(p) ist das kleinste x, sodass:",
            opts: ["F(x) ≥ p", "F(x) ≤ p", "f(x) = p", "P(X > x) = p"],
            optsDE: ["F(x) ≥ p", "F(x) ≤ p", "f(x) = p", "P(X > x) = p"],
            correct: 0,
            explain: "The quantile function inverts the CDF: it finds the smallest threshold x by which at least fraction p of the probability has accumulated.",
            explainDE: "Die Quantilfunktion kehrt die Verteilungsfunktion um: Sie findet den kleinsten Schwellenwert x, bis zu dem mindestens der Anteil p der Wahrscheinlichkeit aufgelaufen ist."
        },
        {
            q: "For an exponential distribution with rate λ, the distribution function for x ≥ 0 is:",
            qDE: "Für eine Exponentialverteilung mit Rate λ lautet die Verteilungsfunktion für x ≥ 0:",
            opts: ["1 − e^(−λx)", "e^(−λx)", "λ·e^(−λx)", "1 − λ·e^(−x)"],
            optsDE: ["1 − e^(−λx)", "e^(−λx)", "λ·e^(−λx)", "1 − λ·e^(−x)"],
            correct: 0,
            explain: "Integrating the exponential density λe^(−λt) from 0 to x gives the accumulated probability F(x) = 1 − e^(−λx).",
            explainDE: "Integriert man die exponentielle Dichte λe^(−λt) von 0 bis x, erhält man die aufgelaufene Wahrscheinlichkeit F(x) = 1 − e^(−λx)."
        },
        {
            q: "The multiplication rule for conditional probability states that P(A ∩ B) equals:",
            qDE: "Die Multiplikationsregel für bedingte Wahrscheinlichkeiten besagt, dass P(A ∩ B) gleich ist:",
            opts: ["P(A|B) · P(B)", "P(A) + P(B)", "P(A) / P(B)", "P(A|B) + P(B)"],
            optsDE: ["P(A|B) · P(B)", "P(A) + P(B)", "P(A) / P(B)", "P(A|B) + P(B)"],
            correct: 0,
            explain: "This is just the definition of conditional probability rearranged: multiplying both sides of P(A|B) = P(A∩B)/P(B) by P(B) gives P(A ∩ B) = P(A|B)·P(B).",
            explainDE: "Dies ist einfach die umgestellte Definition der bedingten Wahrscheinlichkeit: Multipliziert man beide Seiten von P(A|B) = P(A∩B)/P(B) mit P(B), erhält man P(A ∩ B) = P(A|B)·P(B)."
        },
        {
            q: "In a two-stage probability tree, the probability of a path equals:",
            qDE: "In einem zweistufigen Wahrscheinlichkeitsbaum ist die Wahrscheinlichkeit eines Pfades gleich:",
            opts: ["The product of the probabilities along the path", "The sum of the probabilities along the path", "The probability of the final branch only", "1 divided by the number of paths"],
            optsDE: ["Das Produkt der Wahrscheinlichkeiten entlang des Pfades", "Die Summe der Wahrscheinlichkeiten entlang des Pfades", "Nur die Wahrscheinlichkeit des letzten Asts", "1 geteilt durch die Anzahl der Pfade"],
            correct: 0,
            explain: "Each branch probability is really a conditional probability given the branches before it, so by the multiplication rule the whole path's probability is their product.",
            explainDE: "Jede Astwahrscheinlichkeit ist eigentlich eine bedingte Wahrscheinlichkeit gegeben die vorherigen Äste, daher ist nach der Multiplikationsregel die Wahrscheinlichkeit des gesamten Pfades ihr Produkt."
        },
        {
            q: "Which statement about independent events A and B is correct?",
            qDE: "Welche Aussage über unabhängige Ereignisse A und B ist korrekt?",
            opts: ["P(A|B) = P(A)", "P(A|B) = P(B)", "P(A ∩ B) = 0", "P(A ∪ B) = 1"],
            optsDE: ["P(A|B) = P(A)", "P(A|B) = P(B)", "P(A ∩ B) = 0", "P(A ∪ B) = 1"],
            correct: 0,
            explain: "Independence means learning that B occurred gives no information about A, so the conditional probability P(A|B) is unchanged and equals the unconditional P(A).",
            explainDE: "Unabhängigkeit bedeutet, dass das Wissen um das Eintreten von B keine Information über A liefert, sodass die bedingte Wahrscheinlichkeit P(A|B) unverändert bleibt und gleich der unbedingten P(A) ist."
        },
        {
            q: "Bayes' theorem is used to:",
            qDE: "Der Satz von Bayes wird verwendet, um:",
            opts: ["Update a prior probability given new evidence", "Add two probabilities together", "Calculate the probability of the complement", "Find the expected value of a random variable"],
            optsDE: ["Eine A-priori-Wahrscheinlichkeit angesichts neuer Evidenz zu aktualisieren", "Zwei Wahrscheinlichkeiten zu addieren", "Die Wahrscheinlichkeit des Komplements zu berechnen", "Den Erwartungswert einer Zufallsvariable zu finden"],
            correct: 0,
            explain: "Bayes' theorem's core use is combining a prior belief P(B) with new observed evidence P(A|B) to produce an updated, more informed posterior belief P(B|A).",
            explainDE: "Der Kernnutzen des Satzes von Bayes ist es, eine A-priori-Überzeugung P(B) mit neuer beobachteter Evidenz P(A|B) zu kombinieren, um eine aktualisierte, informiertere A-posteriori-Überzeugung P(B|A) zu erhalten."
        },
        {
            q: "A discrete random variable X assigns:",
            qDE: "Eine diskrete Zufallsvariable X ordnet zu:",
            opts: ["A real number to each outcome in Ω", "A probability to each event", "A set to each outcome", "An interval to each outcome"],
            optsDE: ["Jedem Ergebnis in Ω eine reelle Zahl", "Jedem Ereignis eine Wahrscheinlichkeit", "Jedem Ergebnis eine Menge", "Jedem Ergebnis ein Intervall"],
            correct: 0,
            explain: "A random variable is, by definition, a function that maps each outcome of the sample space to a real number, allowing us to work numerically with random experiments.",
            explainDE: "Eine Zufallsvariable ist per Definition eine Funktion, die jedem Ergebnis des Ergebnisraums eine reelle Zahl zuordnet, wodurch man mit Zufallsexperimenten numerisch arbeiten kann."
        },
        {
            q: "For the exponential distribution Exp(λ), the mean (expected value) is:",
            qDE: "Für die Exponentialverteilung Exp(λ) gilt als Erwartungswert:",
            opts: ["1/λ", "λ", "λ²", "1/λ²"],
            optsDE: ["1/λ", "λ", "λ²", "1/λ²"],
            correct: 0,
            explain: "Integrating x·λe^(−λx) over x from 0 to infinity yields the mean 1/λ — a larger rate λ means events happen sooner, so the average waiting time shrinks.",
            explainDE: "Integriert man x·λe^(−λx) über x von 0 bis unendlich, erhält man den Erwartungswert 1/λ — eine größere Rate λ bedeutet, dass Ereignisse früher eintreten, daher sinkt die durchschnittliche Wartezeit."
        },
        {
            q: "The density p(x) of a discrete random variable must satisfy:",
            qDE: "Die Zähldichte p(x) einer diskreten Zufallsvariablen muss erfüllen:",
            opts: ["Σ p(x) = 1 and p(x) ≥ 0 for all x", "Σ p(x) = 0", "p(x) = 1 for all x", "∫ p(x) dx = 1"],
            optsDE: ["Σ p(x) = 1 und p(x) ≥ 0 für alle x", "Σ p(x) = 0", "p(x) = 1 für alle x", "∫ p(x) dx = 1"],
            correct: 0,
            explain: "Probabilities can never be negative, and since X must take some value, the probabilities of all possible values must sum to exactly 1.",
            explainDE: "Wahrscheinlichkeiten können nie negativ sein, und da X irgendeinen Wert annehmen muss, müssen sich die Wahrscheinlichkeiten aller möglichen Werte zu genau 1 summieren."
        },
        {
            q: "The density function f(x) of a continuous random variable satisfies:",
            qDE: "Die Dichtefunktion f(x) einer stetigen Zufallsvariable erfüllt:",
            opts: ["∫ f(x) dx = 1 over ℝ, and f(x) ≥ 0", "f(x) = P(X = x)", "Σ f(x) = 1", "f(x) > 1 is not allowed"],
            optsDE: ["∫ f(x) dx = 1 über ℝ, und f(x) ≥ 0", "f(x) = P(X = x)", "Σ f(x) = 1", "f(x) > 1 ist nicht erlaubt"],
            correct: 0,
            explain: "The density must be non-negative everywhere, and since X is guaranteed to fall somewhere, the total area under the density curve over all of ℝ must equal 1.",
            explainDE: "Die Dichte muss überall nicht-negativ sein, und da X garantiert irgendwo landet, muss die Gesamtfläche unter der Dichtekurve über ganz ℝ gleich 1 sein."
        },
        {
            q: "The quantile Q(0.5) of a distribution is called the:",
            qDE: "Das Quantil Q(0,5) einer Verteilung heißt:",
            opts: ["Median", "Mean", "Mode", "Variance"],
            optsDE: ["Median", "Erwartungswert", "Modus", "Varianz"],
            correct: 0,
            explain: "Q(0.5) is the value below which half the probability lies — exactly the definition of the median.",
            explainDE: "Q(0,5) ist der Wert, unterhalb dessen die Hälfte der Wahrscheinlichkeit liegt — genau die Definition des Medians."
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
            correct: 0,
            explain: "The expected value is a probability-weighted average: each possible value x is weighted by how likely it is to occur, then summed.",
            explainDE: "Der Erwartungswert ist ein wahrscheinlichkeitsgewichteter Durchschnitt: Jeder mögliche Wert x wird mit seiner Eintrittswahrscheinlichkeit gewichtet und dann summiert."
        },
        {
            q: "For independent X and Y, E[X·Y] equals:",
            qDE: "Für unabhängige X und Y gilt E[X·Y] =",
            opts: ["E[X] · E[Y]", "E[X] + E[Y]", "E[X²] · E[Y²]", "Cov(X,Y)"],
            optsDE: ["E[X] · E[Y]", "E[X] + E[Y]", "E[X²] · E[Y²]", "Cov(X,Y)"],
            correct: 0,
            explain: "Independence lets the joint expectation factor across the product because the double sum/integral of x·y·f_X(x)f_Y(y) splits neatly into (Σx·f_X(x))·(Σy·f_Y(y)).",
            explainDE: "Unabhängigkeit erlaubt es, den gemeinsamen Erwartungswert zu faktorisieren, da sich die Doppelsumme/das Integral von x·y·f_X(x)f_Y(y) sauber in (Σx·f_X(x))·(Σy·f_Y(y)) aufteilt."
        },
        {
            q: "For a Ber(p) distributed random variable, E[X] equals:",
            qDE: "Für eine Ber(p)-verteilte Zufallsvariable gilt E[X] =",
            opts: ["p", "p(1−p)", "p²", "1−p"],
            optsDE: ["p", "p(1−p)", "p²", "1−p"],
            correct: 0,
            explain: "X takes value 1 with probability p and 0 with probability 1−p, so E[X] = 1·p + 0·(1−p) = p.",
            explainDE: "X nimmt mit Wahrscheinlichkeit p den Wert 1 an und mit Wahrscheinlichkeit 1−p den Wert 0, daher E[X] = 1·p + 0·(1−p) = p."
        },
        {
            q: "For Y = aX + b with constants a and b, E[Y] equals:",
            qDE: "Für Y = aX + b mit Konstanten a und b gilt E[Y] =",
            opts: ["a·E[X] + b", "a·E[X]", "E[X] + b", "a + b"],
            optsDE: ["a·E[X] + b", "a·E[X]", "E[X] + b", "a + b"],
            correct: 0,
            explain: "Expectation is linear, so scaling X by a and shifting by b scales and shifts its expected value the exact same way.",
            explainDE: "Der Erwartungswert ist linear, daher werden Skalierung von X um a und Verschiebung um b genauso auf den Erwartungswert übertragen."
        },
        {
            q: "The covariance Cov(X, Y) is defined as:",
            qDE: "Die Kovarianz Cov(X, Y) ist definiert als:",
            opts: ["E[(X−E[X])(Y−E[Y])]", "E[X] · E[Y]", "E[X + Y]", "Var(X) + Var(Y)"],
            optsDE: ["E[(X−E[X])(Y−E[Y])]", "E[X] · E[Y]", "E[X + Y]", "Var(X) + Var(Y)"],
            correct: 0,
            explain: "Covariance measures whether X and Y tend to deviate from their own means in the same direction, captured by the expected product of their centered deviations.",
            explainDE: "Die Kovarianz misst, ob X und Y tendenziell in dieselbe Richtung von ihren jeweiligen Mittelwerten abweichen, erfasst durch den Erwartungswert des Produkts ihrer zentrierten Abweichungen."
        },
        {
            q: "The correlation coefficient r between X and Y lies in the range:",
            qDE: "Der Korrelationskoeffizient r zwischen X und Y liegt im Bereich:",
            opts: ["[−1, 1]", "[0, 1]", "[0, ∞)", "(−∞, ∞)"],
            optsDE: ["[−1, 1]", "[0, 1]", "[0, ∞)", "(−∞, ∞)"],
            correct: 0,
            explain: "Correlation is covariance normalized by both standard deviations, and the Cauchy-Schwarz inequality guarantees this normalized quantity always falls between −1 and 1.",
            explainDE: "Die Korrelation ist die durch beide Standardabweichungen normierte Kovarianz, und die Cauchy-Schwarz-Ungleichung garantiert, dass diese normierte Größe stets zwischen −1 und 1 liegt."
        },
        {
            q: "If X and Y are independent, their covariance Cov(X, Y) equals:",
            qDE: "Wenn X und Y unabhängig sind, gilt für ihre Kovarianz Cov(X, Y):",
            opts: ["0", "1", "Var(X) · Var(Y)", "E[X] · E[Y]"],
            optsDE: ["0", "1", "Var(X) · Var(Y)", "E[X] · E[Y]"],
            correct: 0,
            explain: "Independence gives E[XY] = E[X]E[Y], and since Cov(X,Y) = E[XY] − E[X]E[Y], this difference collapses to zero.",
            explainDE: "Unabhängigkeit liefert E[XY] = E[X]E[Y], und da Cov(X,Y) = E[XY] − E[X]E[Y], wird diese Differenz null."
        },
        {
            q: "For X ~ N(μ, σ²), the standardised variable Z = (X − μ)/σ follows:",
            qDE: "Für X ~ N(μ, σ²) folgt die standardisierte Variable Z = (X − μ)/σ der:",
            opts: ["Standard normal distribution N(0,1)", "Normal distribution N(μ, σ²)", "Uniform distribution on [0,1]", "Exponential distribution Exp(1)"],
            optsDE: ["Standardnormalverteilung N(0,1)", "Normalverteilung N(μ, σ²)", "Gleichverteilung auf [0,1]", "Exponentialverteilung Exp(1)"],
            correct: 0,
            explain: "Subtracting μ centers the mean at 0, and dividing by σ rescales the variance to 1, converting any normal into the standard normal N(0,1).",
            explainDE: "Das Subtrahieren von μ zentriert den Mittelwert auf 0, und das Teilen durch σ skaliert die Varianz auf 1, wodurch jede Normalverteilung in die Standardnormalverteilung N(0,1) überführt wird."
        },
        {
            q: "The standard normal distribution N(0,1) is symmetric around:",
            qDE: "Die Standardnormalverteilung N(0,1) ist symmetrisch um:",
            opts: ["0", "1", "0.5", "−1"],
            optsDE: ["0", "1", "0,5", "−1"],
            correct: 0,
            explain: "The standard normal has mean 0, and its bell-shaped density is a mirror image on either side of that mean.",
            explainDE: "Die Standardnormalverteilung hat den Mittelwert 0, und ihre glockenförmige Dichte ist zu beiden Seiten dieses Mittelwerts spiegelbildlich."
        },
        {
            q: "Var(X + Y) when X and Y are NOT independent equals:",
            qDE: "Var(X + Y) wenn X und Y NICHT unabhängig sind, lautet:",
            opts: ["Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) − Var(Y)"],
            optsDE: ["Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) − Var(Y)"],
            correct: 0,
            explain: "Expanding Var(X+Y) = E[((X−μ_X)+(Y−μ_Y))²] gives Var(X) + Var(Y) plus a cross term 2·E[(X−μ_X)(Y−μ_Y)] = 2·Cov(X,Y), which only vanishes under independence.",
            explainDE: "Das Ausmultiplizieren von Var(X+Y) = E[((X−μ_X)+(Y−μ_Y))²] ergibt Var(X) + Var(Y) plus einen Kreuzterm 2·E[(X−μ_X)(Y−μ_Y)] = 2·Cov(X,Y), der nur bei Unabhängigkeit verschwindet."
        },
        {
            q: "Jensen's inequality for a convex function f states that:",
            qDE: "Die Jensensche Ungleichung für eine konvexe Funktion f besagt:",
            opts: ["E[f(X)] ≥ f(E[X])", "E[f(X)] ≤ f(E[X])", "E[f(X)] = f(E[X])", "E[f(X)] = 0"],
            optsDE: ["E[f(X)] ≥ f(E[X])", "E[f(X)] ≤ f(E[X])", "E[f(X)] = f(E[X])", "E[f(X)] = 0"],
            correct: 0,
            explain: "A convex function curves upward, so its chord lies above the curve; averaging f over X's spread therefore gives at least as much as evaluating f at the averaged X.",
            explainDE: "Eine konvexe Funktion krümmt sich nach oben, sodass ihre Sehne über der Kurve liegt; die Mittelung von f über die Streuung von X liefert daher mindestens so viel wie die Auswertung von f am gemittelten X."
        },
        {
            q: "The density transformation theorem is used when:",
            qDE: "Der Dichtetransformationssatz wird verwendet, wenn:",
            opts: ["You know the density of X and want the density of Y = g(X)", "You need to compute E[X]", "You want to standardise a normal variable", "You need to find the distribution function from a density function"],
            optsDE: ["Man die Dichte von X kennt und die Dichte von Y = g(X) sucht", "Man E[X] berechnen möchte", "Man eine Normalvariable standardisieren möchte", "Man die Verteilungsfunktion aus einer Zähldichte bestimmen möchte"],
            correct: 0,
            explain: "This theorem translates a known density for X into the density of a transformed variable Y = g(X), accounting for how g stretches or compresses probability.",
            explainDE: "Dieser Satz überträgt eine bekannte Dichte von X in die Dichte einer transformierten Variable Y = g(X), unter Berücksichtigung, wie g die Wahrscheinlichkeit streckt oder staucht."
        },
        {
            q: 'For Y = aX + b with a > 0 and X having density function f_X, the density function f_Y(y) equals:',
            qDE: 'Für Y = aX + b mit a > 0 und X mit Dichte f_X gilt für f_Y(y):',
            opts: ['f_X((y−b)/a) · (1/a)', 'f_X(ay + b)', 'a · f_X(y)', 'f_X(y − b)'],
            optsDE: ['f_X((y−b)/a) · (1/a)', 'f_X(ay + b)', 'a · f_X(y)', 'f_X(y − b)'],
            correct: 0,
            explain: "Inverting y = ax+b gives x = (y−b)/a, and the 1/a factor is the Jacobian correction that keeps the total probability under the transformed density equal to 1.",
            explainDE: "Das Umkehren von y = ax+b ergibt x = (y−b)/a, und der Faktor 1/a ist die Jacobi-Korrektur, die dafür sorgt, dass die Gesamtwahrscheinlichkeit unter der transformierten Dichte gleich 1 bleibt."
        },
        {
            q: 'X ~ U[0,1] and Y = 2X. What distribution does Y follow?',
            qDE: 'X ~ U[0,1] und Y = 2X. Welcher Verteilung folgt Y?',
            opts: ['U[0,2]', 'U[0,1]', 'N(0,1)', 'Exp(1)'],
            optsDE: ['U[0,2]', 'U[0,1]', 'N(0,1)', 'Exp(1)'],
            correct: 0,
            explain: "Doubling a uniform variable on [0,1] stretches its support to [0,2] while keeping the distribution flat, so it stays uniform, just over the wider interval.",
            explainDE: "Das Verdoppeln einer auf [0,1] gleichverteilten Variable streckt ihren Träger auf [0,2], während die Verteilung flach bleibt — sie bleibt also gleichverteilt, nur über dem breiteren Intervall."
        },
        {
            q: 'Two random variables X and Y are independent if and only if:',
            qDE: 'Zwei Zufallsvariablen X und Y sind unabhängig genau dann, wenn:',
            opts: ['Their joint density equals the product of the marginals', 'E[X] = E[Y]', 'Var(X) = Var(Y)', 'They take the same values'],
            optsDE: ['Ihre gemeinsame Zähldichte/Dichte dem Produkt der Randdichten entspricht', 'E[X] = E[Y]', 'Var(X) = Var(Y)', 'Sie dieselben Werte annehmen'],
            correct: 0,
            explain: "This factorization condition means the two variables carry no information about each other — knowing X's value doesn't change the density governing Y, and vice versa.",
            explainDE: "Diese Faktorisierungsbedingung bedeutet, dass die beiden Variablen keine Information übereinander tragen — das Wissen um den Wert von X ändert die Dichte von Y nicht, und umgekehrt."
        },
        {
            q: 'If X and Y are independent, which formula holds?',
            qDE: 'Wenn X und Y unabhängig sind, welche Formel gilt dann?',
            opts: ['E[X·Y] = E[X]·E[Y]', 'E[X+Y] = E[X]·E[Y]', 'Var(X+Y) = Var(X)·Var(Y)', 'E[X·Y] = 0'],
            optsDE: ['E[X·Y] = E[X]·E[Y]', 'E[X+Y] = E[X]·E[Y]', 'Var(X+Y) = Var(X)·Var(Y)', 'E[X·Y] = 0'],
            correct: 0,
            explain: "Because the joint density factors under independence, the expected product also factors into the product of the individual expectations.",
            explainDE: "Da die gemeinsame Dichte bei Unabhängigkeit faktorisiert, faktorisiert auch der erwartete Produktwert in das Produkt der einzelnen Erwartungswerte."
        },
        {
            q: 'If X and Y are independent with continuous distributions, their joint density function f_{X,Y}(x,y) equals:',
            qDE: 'Wenn X und Y unabhängig mit stetiger Verteilung sind, gilt für die gemeinsame Dichte f_{X,Y}(x,y):',
            opts: ['f_X(x) · f_Y(y)', 'f_X(x) + f_Y(y)', 'f_X(x) / f_Y(y)', 'f_X(x·y)'],
            optsDE: ['f_X(x) · f_Y(y)', 'f_X(x) + f_Y(y)', 'f_X(x) / f_Y(y)', 'f_X(x·y)'],
            correct: 0,
            explain: "This is the defining property of independence for continuous variables: the joint density splits cleanly into the product of each variable's own marginal density.",
            explainDE: "Dies ist die definierende Eigenschaft der Unabhängigkeit bei stetigen Variablen: Die gemeinsame Dichte zerfällt sauber in das Produkt der jeweiligen Randdichten."
        },
        {
            q: '"i.i.d." stands for:',
            qDE: '"i.i.d." steht für:',
            opts: ['Independent and identically distributed', 'Independent and identically defined', 'Identically integrated and distributed', 'Independent and increasing data'],
            optsDE: ['Unabhängig und identisch verteilt', 'Unabhängig und identisch definiert', 'Identisch integriert und verteilt', 'Unabhängig und zunehmende Daten'],
            correct: 0,
            explain: "This is simply the standard abbreviation used throughout probability and statistics for variables that are mutually independent and all share the same distribution.",
            explainDE: "Dies ist einfach die in Wahrscheinlichkeitstheorie und Statistik übliche Abkürzung für Variablen, die untereinander unabhängig sind und alle dieselbe Verteilung teilen."
        },
        {
            q: 'For n i.i.d. random variables X₁,…,Xₙ with E[Xᵢ]=μ and Var(Xᵢ)=σ², what is Var((1/n)Σᵢ Xᵢ)?',
            qDE: 'Für n i.i.d. Zufallsvariablen X₁,…,Xₙ mit E[Xᵢ]=μ und Var(Xᵢ)=σ²: Was ist Var((1/n)Σᵢ Xᵢ)?',
            opts: ['σ²/n', 'σ²·n', 'σ²', 'σ/n'],
            optsDE: ['σ²/n', 'σ²·n', 'σ²', 'σ/n'],
            correct: 0,
            explain: "Independence lets variances add: Var(ΣXᵢ) = nσ², and scaling by 1/n squares to 1/n², giving nσ²/n² = σ²/n — the sample mean's spread shrinks as n grows.",
            explainDE: "Unabhängigkeit erlaubt das Addieren der Varianzen: Var(ΣXᵢ) = nσ², und die Skalierung mit 1/n wird quadriert zu 1/n², was nσ²/n² = σ²/n ergibt — die Streuung des Stichprobenmittelwerts sinkt mit wachsendem n."
        },
        {
            q: 'The expected value of a continuous random variable X with density function f is:',
            qDE: 'Der Erwartungswert einer stetigen Zufallsvariable X mit Dichte f ist:',
            opts: ['∫ x·f(x) dx over ℝ', 'Σ x·P(X=x)', 'f(0)', '∫ f(x) dx'],
            optsDE: ['∫ x·f(x) dx über ℝ', 'Σ x·P(X=x)', 'f(0)', '∫ f(x) dx'],
            correct: 0,
            explain: "For continuous variables, the discrete sum Σx·P(X=x) becomes an integral, weighting each infinitesimal value x by the density f(x) at that point.",
            explainDE: "Bei stetigen Variablen wird aus der diskreten Summe Σx·P(X=x) ein Integral, das jeden infinitesimalen Wert x mit der Dichte f(x) an dieser Stelle gewichtet."
        },
        {
            q: 'The expected value of a discrete random variable X with density p is:',
            qDE: 'Der Erwartungswert einer diskreten Zufallsvariable X mit Zähldichte p ist:',
            opts: ['Σ x·p(x)', '∫ x·p(x) dx', 'max p(x)', 'Σ p(x)'],
            optsDE: ['Σ x·p(x)', '∫ x·p(x) dx', 'max p(x)', 'Σ p(x)'],
            correct: 0,
            explain: "For discrete variables this is a sum, not an integral: each possible value x is weighted by its probability p(x) and these are added up.",
            explainDE: "Bei diskreten Variablen handelt es sich um eine Summe, kein Integral: Jeder mögliche Wert x wird mit seiner Wahrscheinlichkeit p(x) gewichtet und diese werden addiert."
        },
        {
            q: 'For X ~ Ber(p), what is E[X]?',
            qDE: 'Für X ~ Ber(p), was ist E[X]?',
            opts: ['p', 'p(1−p)', '1−p', 'p²'],
            optsDE: ['p', 'p(1−p)', '1−p', 'p²'],
            correct: 0,
            explain: "With X = 1 (prob. p) or X = 0 (prob. 1−p), the expected value collapses to 1·p + 0·(1−p) = p.",
            explainDE: "Mit X = 1 (Wahrsch. p) oder X = 0 (Wahrsch. 1−p) reduziert sich der Erwartungswert auf 1·p + 0·(1−p) = p."
        },
        {
            q: 'For X ~ Ber(p), what is Var(X)?',
            qDE: 'Für X ~ Ber(p), wie groß ist Var(X)?',
            opts: ['p(1−p)', 'p', 'p²', '(1−p)²'],
            optsDE: ['p(1−p)', 'p', 'p²', '(1−p)²'],
            correct: 0,
            explain: "Using Var(X) = E[X²] − (E[X])² with E[X²] = p (since X² = X for 0/1 values), we get Var(X) = p − p² = p(1−p).",
            explainDE: "Mit Var(X) = E[X²] − (E[X])² und E[X²] = p (da X² = X für Werte 0/1) erhält man Var(X) = p − p² = p(1−p)."
        },
        {
            q: 'A Ber(p) random variable takes the value 1 with probability p and 0 with probability:',
            qDE: 'Eine Ber(p)-Zufallsvariable nimmt den Wert 1 mit Wahrscheinlichkeit p und 0 mit Wahrscheinlichkeit:',
            opts: ['1−p', 'p', 'p(1−p)', '1/p'],
            optsDE: ['1−p', 'p', 'p(1−p)', '1/p'],
            correct: 0,
            explain: "Since the two outcomes 0 and 1 are the only possibilities and probabilities must sum to 1, the probability of 0 is just the leftover 1−p.",
            explainDE: "Da die beiden Ergebnisse 0 und 1 die einzigen Möglichkeiten sind und sich Wahrscheinlichkeiten zu 1 summieren müssen, ist die Wahrscheinlichkeit für 0 einfach der Rest 1−p."
        },
        {
            q: 'For which value of p is Var(X) = p(1−p) maximised for X ~ Ber(p)?',
            qDE: 'Bei welchem Wert von p ist Var(X) = p(1−p) für X ~ Ber(p) maximal?',
            opts: ['p = 0.5', 'p = 0', 'p = 1', 'p = 0.25'],
            optsDE: ['p = 0,5', 'p = 0', 'p = 1', 'p = 0,25'],
            correct: 0,
            explain: "p(1−p) is a downward parabola in p; taking its derivative (1−2p) and setting it to zero shows the maximum occurs exactly at p = 0.5, where uncertainty is greatest.",
            explainDE: "p(1−p) ist eine nach unten geöffnete Parabel in p; die Ableitung (1−2p) gleich null gesetzt zeigt, dass das Maximum genau bei p = 0,5 liegt, wo die Unsicherheit am größten ist."
        },
        {
            q: 'Linearity of expectation states that E[aX + bY] equals:',
            qDE: 'Die Linearität des Erwartungswertes besagt, dass E[aX + bY] gleich ist:',
            opts: ['a·E[X] + b·E[Y]', 'E[aX]·E[bY]', 'a·b·E[X+Y]', 'E[X+Y]'],
            optsDE: ['a·E[X] + b·E[Y]', 'E[aX]·E[bY]', 'a·b·E[X+Y]', 'E[X+Y]'],
            correct: 0,
            explain: "Expectation is a linear operator, meaning it distributes over sums and pulls out constant multipliers, regardless of whether X and Y are independent.",
            explainDE: "Der Erwartungswert ist ein linearer Operator, das heißt er verteilt sich über Summen und zieht konstante Faktoren heraus, unabhängig davon, ob X und Y unabhängig sind."
        },
        {
            q: 'The triangle inequality for expectations states that |E[X + Y]| ≤',
            qDE: 'Die Dreiecksungleichung für Erwartungswerte besagt |E[X + Y]| ≤',
            opts: ['E[|X|] + E[|Y|]', 'E[X] + E[Y]', '|E[X]| · |E[Y]|', 'E[X·Y]'],
            optsDE: ['E[|X|] + E[|Y|]', 'E[X] + E[Y]', '|E[X]| · |E[Y]|', 'E[X·Y]'],
            correct: 0,
            explain: "This mirrors the ordinary triangle inequality |a+b| ≤ |a|+|b| pointwise, and taking expectations of both sides preserves the inequality.",
            explainDE: "Dies spiegelt die gewöhnliche Dreiecksungleichung |a+b| ≤ |a|+|b| punktweise wider, und die Bildung des Erwartungswerts auf beiden Seiten erhält die Ungleichung."
        },
        {
            q: 'Var(aX) for a constant a equals:',
            qDE: 'Var(aX) für eine Konstante a ergibt:',
            opts: ['a²·Var(X)', 'a·Var(X)', 'Var(X)', 'a²+Var(X)'],
            optsDE: ['a²·Var(X)', 'a·Var(X)', 'Var(X)', 'a²+Var(X)'],
            correct: 0,
            explain: "Variance measures squared deviation, so scaling X by a scales each deviation by a and each squared deviation by a², pulling out an a² factor.",
            explainDE: "Die Varianz misst die quadrierte Abweichung, daher skaliert die Multiplikation von X mit a jede Abweichung um a und jede quadrierte Abweichung um a², wodurch ein Faktor a² herausgezogen wird."
        },
        {
            q: 'Adding a constant c to X: what happens to Var(X+c)?',
            qDE: 'Addiert man eine Konstante c zu X: Was gilt für Var(X+c)?',
            opts: ['Var(X+c) = Var(X)', 'Var(X+c) = Var(X) + c', 'Var(X+c) = Var(X) + c²', 'Var(X+c) = c·Var(X)'],
            optsDE: ['Var(X+c) = Var(X)', 'Var(X+c) = Var(X) + c', 'Var(X+c) = Var(X) + c²', 'Var(X+c) = c·Var(X)'],
            correct: 0,
            explain: "Shifting X by a constant shifts its mean by the same constant, but the deviations from that mean — and hence the spread — stay exactly the same.",
            explainDE: "Das Verschieben von X um eine Konstante verschiebt auch dessen Mittelwert um dieselbe Konstante, aber die Abweichungen von diesem Mittelwert — und somit die Streuung — bleiben exakt gleich."
        },
        {
            q: 'The Shift-Theorem states:',
            qDE: 'Der Verschiebungssatz lautet:',
            opts: ['Var(X) = E[X²] − (E[X])²', 'Var(X) = E[X²] + (E[X])²', 'Var(X) = (E[X])² − E[X²]', 'Var(X) = E[(X−1)²]'],
            optsDE: ['Var(X) = E[X²] − (E[X])²', 'Var(X) = E[X²] + (E[X])²', 'Var(X) = (E[X])² − E[X²]', 'Var(X) = E[(X−1)²]'],
            correct: 0,
            explain: "Expanding Var(X) = E[(X−E[X])²] with the binomial formula and simplifying gives this handy computational shortcut, avoiding the need to work with deviations directly.",
            explainDE: "Das Ausmultiplizieren von Var(X) = E[(X−E[X])²] mit der binomischen Formel und Vereinfachen ergibt diese praktische Rechenabkürzung, die es erspart, direkt mit Abweichungen zu arbeiten."
        },
        {
            q: 'For independent X and Y, Var(X + Y) equals:',
            qDE: 'Für unabhängige X und Y gilt Var(X + Y) =',
            opts: ['Var(X) + Var(Y)', 'Var(X)·Var(Y)', 'Var(X) − Var(Y)', 'Var(X) + Var(Y) + 2·Cov(X,Y)'],
            optsDE: ['Var(X) + Var(Y)', 'Var(X)·Var(Y)', 'Var(X) − Var(Y)', 'Var(X) + Var(Y) + 2·Cov(X,Y)'],
            correct: 0,
            explain: "The general formula Var(X+Y) = Var(X)+Var(Y)+2Cov(X,Y) simplifies here because independence makes Cov(X,Y) = 0, leaving just Var(X)+Var(Y).",
            explainDE: "Die allgemeine Formel Var(X+Y) = Var(X)+Var(Y)+2Cov(X,Y) vereinfacht sich hier, da Unabhängigkeit Cov(X,Y) = 0 macht, sodass nur Var(X)+Var(Y) übrig bleibt."
        },
        {
            q: 'The standard deviation σ(X) is related to the variance Var(X) by:',
            qDE: 'Die Standardabweichung σ(X) hängt mit der Varianz Var(X) zusammen durch:',
            opts: ['σ(X) = √Var(X)', 'σ(X) = Var(X)²', 'σ(X) = Var(X)/2', 'σ(X) = E[X]'],
            optsDE: ['σ(X) = √Var(X)', 'σ(X) = Var(X)²', 'σ(X) = Var(X)/2', 'σ(X) = E[X]'],
            correct: 0,
            explain: "Since variance is measured in squared units, taking its square root converts back to the original units of X, giving the standard deviation.",
            explainDE: "Da die Varianz in quadrierten Einheiten gemessen wird, führt das Ziehen der Quadratwurzel zurück zu den ursprünglichen Einheiten von X, was die Standardabweichung ergibt."
        },
        {
            q: 'The transformation theorem for discrete X states E[g(X)] equals:',
            qDE: 'Der Transformationssatz für diskrete X besagt E[g(X)] =',
            opts: ['Σ g(x)·p(x)', 'g(E[X])', '∫ g(x) dx', 'Σ g(x)'],
            optsDE: ['Σ g(x)·p(x)', 'g(E[X])', '∫ g(x) dx', 'Σ g(x)'],
            correct: 0,
            explain: "This theorem lets you compute E[g(X)] directly from X's original density, without first deriving the density of g(X) — just weight g(x) by p(x) and sum.",
            explainDE: "Dieser Satz erlaubt es, E[g(X)] direkt aus der ursprünglichen Dichte von X zu berechnen, ohne zuerst die Dichte von g(X) herzuleiten — man gewichtet einfach g(x) mit p(x) und summiert."
        },
        {
            q: 'For continuous X with density function f, E[g(X)] equals:',
            qDE: 'Für stetige X mit Dichte f gilt E[g(X)] =',
            opts: ['∫ g(x)·f(x) dx', 'g(E[X])', 'Σ g(x)·f(x)', '∫ g(x) dx'],
            optsDE: ['∫ g(x)·f(x) dx', 'g(E[X])', 'Σ g(x)·f(x)', '∫ g(x) dx'],
            correct: 0,
            explain: "The continuous analogue of the discrete transformation theorem replaces the sum with an integral, weighting g(x) by the density f(x).",
            explainDE: "Das stetige Analogon zum diskreten Transformationssatz ersetzt die Summe durch ein Integral und gewichtet g(x) mit der Dichte f(x)."
        },
        {
            q: 'For X ~ Bin(n, p), what is E[X]?',
            qDE: 'Für X ~ Bin(n, p), was ist E[X]?',
            opts: ['n·p', 'n·p·(1−p)', 'p/n', 'n/p'],
            optsDE: ['n·p', 'n·p·(1−p)', 'p/n', 'n/p'],
            correct: 0,
            explain: "A Binomial(n,p) variable is the sum of n independent Ber(p) trials, and since expectation is additive, its mean is just n copies of p's mean: n·p.",
            explainDE: "Eine Bin(n,p)-Variable ist die Summe von n unabhängigen Ber(p)-Versuchen, und da der Erwartungswert additiv ist, ist ihr Mittelwert einfach n-mal der Mittelwert von p: n·p."
        },
        {
            q: 'For X ~ Bin(n, p), what is Var(X)?',
            qDE: 'Für X ~ Bin(n, p), was ist Var(X)?',
            opts: ['n·p·(1−p)', 'n·p', 'p·(1−p)', 'n²·p'],
            optsDE: ['n·p·(1−p)', 'n·p', 'p·(1−p)', 'n²·p'],
            correct: 0,
            explain: "Because the n underlying Bernoulli trials are independent, their variances simply add: n copies of p(1−p) give n·p·(1−p).",
            explainDE: "Da die n zugrunde liegenden Bernoulli-Versuche unabhängig sind, addieren sich ihre Varianzen einfach: n-mal p(1−p) ergibt n·p·(1−p)."
        },
        {
            q: 'X ~ Bin(n, p) counts the number of successes in:',
            qDE: 'X ~ Bin(n, p) zählt die Anzahl der Erfolge in:',
            opts: ['n independent Ber(p) trials', 'n dependent trials', 'n draws without replacement', 'a single Bernoulli trial repeated n²  times'],
            optsDE: ['n unabhängigen Ber(p)-Versuchen', 'n abhängigen Versuchen', 'n Zügen ohne Zurücklegen', 'einem einzelnen Bernoulli-Versuch n²-mal wiederholt'],
            correct: 0,
            explain: "By construction, the binomial distribution models the total count of successes across n repeated, independent Bernoulli(p) experiments.",
            explainDE: "Konstruktionsbedingt modelliert die Binomialverteilung die Gesamtzahl der Erfolge über n wiederholte, unabhängige Bernoulli(p)-Experimente."
        },
        {
            q: 'The density of X ~ Bin(n,p) for X = k is given by: (C denotes the binomial coefficient)',
            qDE: 'Die Zähldichte von X ~ Bin(n,p) für X = k lautet: (C stellt den Binomialkoeffizienten dar)',
            opts: ['C(n,k)·pᵏ·(1−p)^(n−k)', 'pᵏ·(1−p)^(n−k)', 'C(n,k)·pᵏ', 'n!·pᵏ'],
            optsDE: ['C(n,k)·pᵏ·(1−p)^(n−k)', 'pᵏ·(1−p)^(n−k)', 'C(n,k)·pᵏ', 'n!·pᵏ'],
            correct: 0,
            explain: "Getting exactly k successes requires choosing which k of the n trials succeed (C(n,k) ways) and multiplying the probability of that specific pattern: pᵏ for successes times (1−p)^(n−k) for failures.",
            explainDE: "Genau k Erfolge zu erhalten erfordert, dass man auswählt, welche k der n Versuche erfolgreich sind (C(n,k) Möglichkeiten), multipliziert mit der Wahrscheinlichkeit dieses speziellen Musters: pᵏ für Erfolge mal (1−p)^(n−k) für Misserfolge."
        },
        {
            q: 'The binomial coefficient C(n,k) counts the number of ways to choose k items from n where:',
            qDE: 'Der Binomialkoeffizient C(n,k) zählt die Möglichkeiten, k Elemente aus n zu wählen, wobei:',
            opts: ['Order does NOT matter, no replacement', 'Order matters, no replacement', 'Order matters, with replacement', 'Order does NOT matter, with replacement'],
            optsDE: ['Reihenfolge KEINE Rolle spielt, ohne Zurücklegen', 'Reihenfolge zählt, ohne Zurücklegen', 'Reihenfolge zählt, mit Zurücklegen', 'Reihenfolge KEINE Rolle spielt, mit Zurücklegen'],
            correct: 0,
            explain: "C(n,k) counts unordered subsets of size k chosen without replacement — which items end up in the group, not the sequence in which they were picked.",
            explainDE: "C(n,k) zählt ungeordnete Teilmengen der Größe k ohne Zurücklegen — welche Elemente in der Gruppe landen, nicht die Reihenfolge, in der sie gewählt wurden."
        },
        {
            q: 'The binomial coefficient C(n, 0) equals:',
            qDE: 'Der Binomialkoeffizient C(n, 0) ist gleich:',
            opts: ['1 for any n ≥ 0', 'n', '0', 'n!'],
            optsDE: ['1 für beliebiges n ≥ 0', 'n', '0', 'n!'],
            correct: 0,
            explain: "There is exactly one way to choose nothing — the empty selection — regardless of how large n is, so C(n,0) is always 1.",
            explainDE: "Es gibt genau eine Möglichkeit, nichts auszuwählen — die leere Auswahl — unabhängig davon, wie groß n ist, daher ist C(n,0) stets 1."
        },
        {
            q: 'For the binomial coefficient we have C(n, k) = C(n, n−k). This symmetry means:',
            qDE: 'Für den Binomialkoeffizienten gilt C(n, k) = C(n, n−k). Diese Symmetrie bedeutet:',
            opts: ['Choosing k items is equivalent to leaving out n−k items', 'C(n,k) is always even', 'k must equal n−k', 'The formula only works for k < n/2'],
            optsDE: ['k Elemente wählen ist gleichwertig dazu, n−k Elemente wegzulassen', 'C(n,k) ist immer gerade', 'k muss gleich n−k sein', 'Die Formel gilt nur für k < n/2'],
            correct: 0,
            explain: "Every selection of k items automatically determines a complementary set of the n−k items left out, so counting one is the same as counting the other.",
            explainDE: "Jede Auswahl von k Elementen bestimmt automatisch eine komplementäre Menge der n−k weggelassenen Elemente, daher ist das Zählen der einen dasselbe wie das Zählen der anderen."
        },
        {
            q: 'If X ~ Bin(m, p) and Y ~ Bin(n, p) are independent, then X+Y follows:',
            qDE: 'Wenn X ~ Bin(m, p) und Y ~ Bin(n, p) unabhängig sind, folgt X+Y der Verteilung:',
            opts: ['Bin(m+n, p)', 'Bin(m·n, p)', 'Bin(m+n, 2p)', 'Bin(m+n, p²)'],
            optsDE: ['Bin(m+n, p)', 'Bin(m·n, p)', 'Bin(m+n, 2p)', 'Bin(m+n, p²)'],
            correct: 0,
            explain: "X is the count of successes in m Bernoulli(p) trials and Y in n more, so their independent sum is just the count of successes across all m+n trials with the same success probability p.",
            explainDE: "X ist die Erfolgsanzahl in m Bernoulli(p)-Versuchen und Y in n weiteren, daher ist ihre unabhängige Summe einfach die Erfolgsanzahl über alle m+n Versuche mit derselben Erfolgswahrscheinlichkeit p."
        },
        {
            q: 'The convolution property of the binomial distribution requires that both distributions have:',
            qDE: 'Die Faltungseigenschaft der Binomialverteilung erfordert, dass beide Verteilungen:',
            opts: ['The same success probability p', 'The same parameter n', 'Both n and p equal', 'Any parameters'],
            optsDE: ['Dieselbe Erfolgswahrscheinlichkeit p', 'Denselben Parameter n', 'Sowohl n als auch p gleich', 'Beliebige Parameter'],
            correct: 0,
            explain: "The sum only stays binomial if every underlying trial shares the same success probability p; if p differs between the two groups the sum is no longer simply binomial.",
            explainDE: "Die Summe bleibt nur binomialverteilt, wenn jeder zugrunde liegende Versuch dieselbe Erfolgswahrscheinlichkeit p teilt; unterscheidet sich p zwischen den beiden Gruppen, ist die Summe nicht mehr einfach binomialverteilt."
        },
        {
            q: 'X ~ Bin(3, 0.5) and Y ~ Bin(7, 0.5) are independent. What distribution does X+Y follow?',
            qDE: 'X ~ Bin(3; 0,5) und Y ~ Bin(7; 0,5) sind unabhängig. Welcher Verteilung folgt X+Y?',
            opts: ['Bin(10, 0.5)', 'Bin(21, 0.5)', 'Bin(10, 1)', 'Bin(4, 0.5)'],
            optsDE: ['Bin(10; 0,5)', 'Bin(21; 0,5)', 'Bin(10; 1)', 'Bin(4; 0,5)'],
            correct: 0,
            explain: "Since both share success probability p = 0.5, the convolution rule applies directly: the trial counts add to 3+7=10, giving Bin(10, 0.5).",
            explainDE: "Da beide dieselbe Erfolgswahrscheinlichkeit p = 0,5 teilen, gilt die Faltungsregel direkt: Die Versuchsanzahlen addieren sich zu 3+7=10, was Bin(10; 0,5) ergibt."
        },
        {
            q: 'Drawing k items from n without replacement and ignoring order: the number of outcomes is:',
            qDE: 'k Elemente aus n ohne Zurücklegen ziehen, Reihenfolge egal: Anzahl der Ergebnisse ist:',
            opts: ['C(n,k)', 'nᵏ', 'n!/(n−k)!', 'k!'],
            optsDE: ['C(n,k)', 'nᵏ', 'n!/(n−k)!', 'k!'],
            correct: 0,
            explain: "This is precisely the setting the binomial coefficient was built for: unordered, no-replacement selections of size k from n, counted as C(n,k).",
            explainDE: "Dies ist genau die Situation, für die der Binomialkoeffizient konstruiert wurde: ungeordnete Auswahlen der Größe k aus n ohne Zurücklegen, gezählt als C(n,k)."
        },
        {
            q: 'Drawing k items from n WITH replacement and ignoring order: the number of outcomes is:',
            qDE: 'k Elemente aus n MIT Zurücklegen, Reihenfolge egal: Anzahl der Ergebnisse ist:',
            opts: ['C(n+k−1, k)', 'C(n, k)', 'nᵏ', 'n!/(n−k)!'],
            optsDE: ['C(n+k−1, k)', 'C(n, k)', 'nᵏ', 'n!/(n−k)!'],
            correct: 0,
            explain: "This is the 'stars and bars' counting scenario: since items can repeat and order doesn't matter, the count of multisets of size k from n types is C(n+k−1, k).",
            explainDE: "Dies ist die 'Sterne-und-Balken'-Zählsituation: Da Elemente sich wiederholen können und die Reihenfolge egal ist, ist die Anzahl der Multimengen der Größe k aus n Typen gleich C(n+k−1, k)."
        },
        {
            q: 'Which combinatorial model is used in the binomial distribution density?',
            qDE: 'Welches kombinatorische Modell wird in der Zähldichte der Binomialverteilung verwendet?',
            opts: ['Drawing without replacement, no order (binomial coefficient)', 'Drawing with replacement, with order', 'Drawing without replacement, with order', 'Drawing with replacement, no order'],
            optsDE: ['Ziehen ohne Zurücklegen, ohne Reihenfolge (Binomialkoeffizient)', 'Ziehen mit Zurücklegen, mit Reihenfolge', 'Ziehen ohne Zurücklegen, mit Reihenfolge', 'Ziehen mit Zurücklegen, ohne Reihenfolge'],
            correct: 0,
            explain: "The binomial density's C(n,k) term comes from selecting which k of the n trials are successes — an unordered, without-replacement choice of positions.",
            explainDE: "Der Term C(n,k) in der Binomialdichte stammt aus der Auswahl, welche k der n Versuche Erfolge sind — eine ungeordnete Auswahl von Positionen ohne Zurücklegen."
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
            explain: "Drawing without replacement from a finite population split into two categories (defective/non-defective) is exactly what the hypergeometric distribution models, unlike the binomial which assumes replacement.",
            explainDE: "Das Ziehen ohne Zurücklegen aus einer endlichen Grundgesamtheit mit zwei Kategorien (defekt/nicht defekt) ist genau das, was die hypergeometrische Verteilung modelliert, im Gegensatz zur Binomialverteilung, die Zurücklegen voraussetzt."
        },
        {
            q: 'For a hypergeometric distribution with N=20, K=8, n=5, what is the expected value E[X]?',
            qDE: 'Für eine hypergeometrische Verteilung mit N=20, K=8, n=5: Wie lautet der Erwartungswert E[X]?',
            opts: ['2', '2.5', '1.6', '4'],
            optsDE: ['2', '2,5', '1,6', '4'],
            correct: 0,
            explain: "For the hypergeometric distribution, E[X] = n·K/N, so with n=5, K=8, N=20 this gives 5·8/20 = 2.",
            explainDE: "Für die hypergeometrische Verteilung gilt E[X] = n·K/N, also mit n=5, K=8, N=20 ergibt das 5·8/20 = 2."
        },
        {
            q: 'The hypergeometric distribution differs from the binomial distribution primarily because:',
            qDE: 'Die hypergeometrische Verteilung unterscheidet sich von der Binomialverteilung hauptsächlich, weil:',
            opts: ['Draws are made without replacement', 'The number of trials is unlimited', 'Success probability changes each trial independently', 'It models continuous outcomes'],
            optsDE: ['Ziehungen ohne Zurücklegen erfolgen', 'Die Anzahl der Versuche unbegrenzt ist', 'Die Erfolgswahrscheinlichkeit unabhängig variiert', 'Stetige Ergebnisse modelliert werden'],
            correct: 0,
            explain: "The binomial distribution assumes each draw is independent with a fixed success probability (drawing with replacement), while the hypergeometric distribution accounts for how removing items changes the composition of what's left.",
            explainDE: "Die Binomialverteilung setzt voraus, dass jeder Zug unabhängig mit fester Erfolgswahrscheinlichkeit erfolgt (Ziehen mit Zurücklegen), während die hypergeometrische Verteilung berücksichtigt, wie das Entfernen von Elementen die Zusammensetzung des Rests verändert."
        },

        // --- Geometrische Verteilung ---
        {
            q: 'The geometric distribution models the number of trials until the first success. If p=0.25, what is E[X]?',
            qDE: 'Die geometrische Verteilung modelliert Versuche bis zum ersten Erfolg. Bei p=0,25: Was ist E[X]?',
            opts: ['4', '0.25', '3', '2'],
            optsDE: ['4', '0,25', '3', '2'],
            correct: 0,
            explain: "For a geometric distribution, E[X] = 1/p, so with p=0.25 the expected number of trials until the first success is 1/0.25 = 4.",
            explainDE: "Für eine geometrische Verteilung gilt E[X] = 1/p, also ist bei p=0,25 die erwartete Anzahl an Versuchen bis zum ersten Erfolg 1/0,25 = 4."
        },
        {
            q: 'What is the variance of a geometrically distributed random variable X with success probability p?',
            qDE: 'Wie lautet die Varianz einer geometrisch verteilten Zufallsvariablen X mit Erfolgswahrscheinlichkeit p?',
            opts: ['(1−p)/p²', 'p/(1−p)', '1/p', 'p·(1−p)'],
            optsDE: ['(1−p)/p²', 'p/(1−p)', '1/p', 'p·(1−p)'],
            correct: 0,
            explain: "The variance of a geometric distribution comes from summing the squared deviations weighted by the geometric probabilities, which simplifies to the closed form (1−p)/p².",
            explainDE: "Die Varianz einer geometrischen Verteilung ergibt sich aus der Summierung der quadrierten Abweichungen, gewichtet mit den geometrischen Wahrscheinlichkeiten, was sich zur geschlossenen Form (1−p)/p² vereinfacht."
        },
        {
            q: 'Which key property does the geometric distribution share with the exponential distribution?',
            qDE: 'Welche wichtige Eigenschaft teilt die geometrische Verteilung mit der Exponentialverteilung?',
            opts: ['Memorylessness', 'Symmetry', 'Finite support', 'Unimodality only at 0'],
            optsDE: ['Gedächtnislosigkeit', 'Symmetrie', 'Endlicher Träger', 'Unimodalität nur bei 0'],
            correct: 0,
            explain: "Both distributions are memoryless: the probability of waiting longer doesn't depend on how long you've already waited — the geometric is the discrete analogue of the continuous exponential.",
            explainDE: "Beide Verteilungen sind gedächtnislos: Die Wahrscheinlichkeit, noch länger warten zu müssen, hängt nicht davon ab, wie lange man bereits gewartet hat — die geometrische Verteilung ist das diskrete Gegenstück zur stetigen Exponentialverteilung."
        },

        // --- Bernoulli-Folge ---
        {
            q: 'A Bernoulli sequence consists of:',
            qDE: 'Eine Bernoulli-Folge besteht aus:',
            opts: ['Independent, identically distributed Bernoulli trials', 'Dependent trials with varying probabilities', 'Normally distributed random variables', 'Trials without a fixed success probability'],
            optsDE: ['Unabhängigen, gleichverteilten Bernoulli-Versuchen', 'Abhängigen Versuchen mit wechselnden Wahrscheinlichkeiten', 'Normalverteilten Zufallsvariablen', 'Versuchen ohne feste Erfolgswahrscheinlichkeit'],
            correct: 0,
            explain: "A Bernoulli sequence is, by definition, a series of trials that are both independent of each other and share the same fixed success probability p.",
            explainDE: "Eine Bernoulli-Folge ist per Definition eine Reihe von Versuchen, die sowohl unabhängig voneinander sind als auch dieselbe feste Erfolgswahrscheinlichkeit p teilen."
        },
        {
            q: 'In a Bernoulli sequence with n=10 and p=0.3, X counts the successes. What is Var(X)?',
            qDE: 'In einer Bernoulli-Folge mit n=10 und p=0,3 zählt X die Erfolge. Was ist Var(X)?',
            opts: ['2.1', '3', '0.3', '0.9'],
            optsDE: ['2,1', '3', '0,3', '0,9'],
            correct: 0,
            explain: "The count of successes in a Bernoulli sequence follows Bin(n,p), whose variance is n·p·(1−p) = 10·0.3·0.7 = 2.1.",
            explainDE: "Die Anzahl der Erfolge in einer Bernoulli-Folge folgt Bin(n,p), deren Varianz n·p·(1−p) = 10·0,3·0,7 = 2,1 beträgt."
        },
        {
            q: 'A Bernoulli sequence with fixed p underlies which distribution for the total number of successes in n trials?',
            qDE: 'Eine Bernoulli-Folge mit festem p liegt welcher Verteilung der Gesamtzahl an Erfolgen in n Versuchen zugrunde?',
            opts: ['Binomial distribution', 'Poisson distribution', 'Exponential distribution', 'Uniform distribution'],
            optsDE: ['Binomialverteilung', 'Poisson-Verteilung', 'Exponentialverteilung', 'Gleichverteilung'],
            correct: 0,
            explain: "Counting the total successes across a fixed number of Bernoulli trials with constant p is exactly how the binomial distribution is constructed.",
            explainDE: "Das Zählen der Gesamterfolge über eine feste Anzahl von Bernoulli-Versuchen mit konstantem p ist genau die Konstruktion der Binomialverteilung."
        },

        // --- Negative Binomialverteilung ---
        {
            q: 'The negative binomial distribution models:',
            qDE: 'Die negative Binomialverteilung modelliert:',
            opts: ['The number of trials until the r-th success', 'The number of successes in n trials', 'The waiting time to any event', 'The spread of a continuous variable'],
            optsDE: ['Die Anzahl der Versuche bis zum r-ten Erfolg', 'Die Anzahl der Erfolge in n Versuchen', 'Die Wartezeit bis zu einem beliebigen Ereignis', 'Die Streuung einer stetigen Variable'],
            correct: 0,
            explain: "The negative binomial distribution generalizes the geometric distribution by counting trials needed to reach not just the first, but the r-th success.",
            explainDE: "Die negative Binomialverteilung verallgemeinert die geometrische Verteilung, indem sie die Versuche zählt, die nötig sind, um nicht nur den ersten, sondern den r-ten Erfolg zu erreichen."
        },
        {
            q: 'For a negative binomial distribution with r=3 and p=0.5, what is E[X] (number of trials until r-th success)?',
            qDE: 'Für eine negative Binomialverteilung mit r=3 und p=0,5: Was ist E[X] (Versuche bis zum r-ten Erfolg)?',
            opts: ['6', '3', '1.5', '9'],
            optsDE: ['6', '3', '1,5', '9'],
            correct: 0,
            explain: "For the negative binomial distribution, E[X] = r/p, so with r=3 and p=0.5 this gives 3/0.5 = 6.",
            explainDE: "Für die negative Binomialverteilung gilt E[X] = r/p, also ergibt sich mit r=3 und p=0,5: 3/0,5 = 6."
        },
        {
            q: 'The geometric distribution is a special case of the negative binomial distribution with:',
            qDE: 'Die geometrische Verteilung ist ein Spezialfall der negativen Binomialverteilung mit:',
            opts: ['r = 1', 'r = 0', 'p = 0.5', 'n = 1'],
            optsDE: ['r = 1', 'r = 0', 'p = 0,5', 'n = 1'],
            correct: 0,
            explain: "Waiting for exactly one success is the geometric distribution's definition, so setting r=1 in the negative binomial recovers it exactly.",
            explainDE: "Das Warten auf genau einen Erfolg ist die Definition der geometrischen Verteilung, daher ergibt sich diese exakt, wenn man r=1 in der negativen Binomialverteilung setzt."
        },

        // --- Poisson-Verteilung ---
        {
            q: 'A Poisson-distributed random variable X with parameter λ has E[X] = ?',
            qDE: 'Eine Poisson-verteilte Zufallsvariable X mit Parameter λ hat E[X] = ?',
            opts: ['λ', 'λ²', '1/λ', '√λ'],
            optsDE: ['λ', 'λ²', '1/λ', '√λ'],
            correct: 0,
            explain: "The Poisson distribution's defining parameter λ is simultaneously its expected value, representing the average rate of occurrence.",
            explainDE: "Der definierende Parameter λ der Poisson-Verteilung ist gleichzeitig ihr Erwartungswert und stellt die durchschnittliche Ereignisrate dar."
        },
        {
            q: 'For the Poisson distribution, which statement is true about mean and variance?',
            qDE: 'Welche Aussage gilt für Erwartungswert und Varianz der Poisson-Verteilung?',
            opts: ['E[X] = Var(X) = λ', 'E[X] = λ, Var(X) = λ²', 'E[X] = 1/λ, Var(X) = λ', 'E[X] = λ², Var(X) = λ'],
            optsDE: ['E[X] = Var(X) = λ', 'E[X] = λ, Var(X) = λ²', 'E[X] = 1/λ, Var(X) = λ', 'E[X] = λ², Var(X) = λ'],
            correct: 0,
            explain: "A distinctive feature of the Poisson distribution is that its mean and variance coincide, both equal to the single parameter λ.",
            explainDE: "Ein charakteristisches Merkmal der Poisson-Verteilung ist, dass Erwartungswert und Varianz übereinstimmen und beide gleich dem einzigen Parameter λ sind."
        },
        {
            q: 'The Poisson distribution is appropriate to model:',
            qDE: 'Die Poisson-Verteilung eignet sich zur Modellierung von:',
            opts: ['Rare events occurring at a constant average rate', 'Outcomes of a fair coin flip', 'Continuous measurements like height', 'Exactly two possible outcomes per trial'],
            optsDE: ['Seltenen Ereignissen mit konstanter Durchschnittsrate', 'Ergebnissen eines fairen Münzwurfs', 'Stetigen Messungen wie Körpergröße', 'Genau zwei möglichen Ausgängen je Versuch'],
            correct: 0,
            explain: "The Poisson distribution was specifically developed to model counts of rare, independent events occurring at a constant average rate over a fixed interval.",
            explainDE: "Die Poisson-Verteilung wurde speziell entwickelt, um die Anzahl seltener, unabhängiger Ereignisse zu modellieren, die mit konstanter Durchschnittsrate über ein festes Intervall auftreten."
        },

        // --- Poisson-Grenzwertsatz (Binomial → Poisson) ---
        {
            q: 'The Poisson limit theorem states that as n → ∞ and p → 0, the binomial distribution converges to Poisson with parameter:',
            qDE: 'Der Poisson-Grenzwertsatz besagt: Für n→∞ und p→0 konvergiert die Binomialverteilung gegen Poisson mit Parameter:',
            opts: ['λ = n·p', 'λ = n/p', 'λ = p/n', 'λ = n+p'],
            optsDE: ['λ = n·p', 'λ = n/p', 'λ = p/n', 'λ = n+p'],
            correct: 0,
            explain: "As n grows large and p shrinks toward 0 while their product stays fixed, the shape of the binomial distribution converges to a Poisson distribution with λ = n·p.",
            explainDE: "Wenn n groß wird und p gegen 0 strebt, während ihr Produkt konstant bleibt, konvergiert die Form der Binomialverteilung gegen eine Poisson-Verteilung mit λ = n·p."
        },
        {
            q: 'Which rule of thumb justifies approximating Bin(n,p) by Poisson(λ)?',
            qDE: 'Welche Faustregel rechtfertigt die Annäherung von Bin(n,p) durch Poisson(λ)?',
            opts: ['n large and p small, so that n·p stays moderate', 'n small and p close to 0.5', 'n and p both large', 'p > 0.1 always'],
            optsDE: ['n groß und p klein, sodass n·p moderat bleibt', 'n klein und p nahe 0,5', 'n und p beide groß', 'p > 0,1 immer'],
            correct: 0,
            explain: "The approximation works well precisely when trials are numerous but individually unlikely to succeed, keeping the expected count n·p at a moderate, stable value.",
            explainDE: "Die Näherung funktioniert gut, wenn Versuche zahlreich, aber einzeln unwahrscheinlich erfolgreich sind, sodass die erwartete Anzahl n·p moderat und stabil bleibt."
        },
        {
            q: 'In n=500 trials each with p=0.004, we approximate X ~ Bin(500, 0.004) by a Poisson. What is λ?',
            qDE: 'Bei n=500 Versuchen mit p=0,004 nähern wir X ~ Bin(500, 0,004) durch eine Poissonverteilung an. Was ist λ?',
            opts: ['2', '0.004', '500', '0.5'],
            optsDE: ['2', '0,004', '500', '0,5'],
            correct: 0,
            explain: "Multiplying the number of trials by the success probability gives λ = n·p = 500 · 0.004 = 2.",
            explainDE: "Die Multiplikation der Versuchsanzahl mit der Erfolgswahrscheinlichkeit ergibt λ = n·p = 500 · 0,004 = 2."
        },

        // --- Stetige Gleichverteilung ---
        {
            q: 'For X ~ U(a, b), what is the expected value E[X]?',
            qDE: 'Für X ~ U(a, b): Wie lautet der Erwartungswert E[X]?',
            opts: ['(a+b)/2', '(b−a)/2', 'a·b', '1/(b−a)'],
            optsDE: ['(a+b)/2', '(b−a)/2', 'a·b', '1/(b−a)'],
            correct: 0,
            explain: "Because the uniform density is flat across [a,b], its balance point — the expected value — sits exactly in the middle at (a+b)/2.",
            explainDE: "Da die Gleichverteilungsdichte über [a,b] flach ist, liegt ihr Schwerpunkt — der Erwartungswert — genau in der Mitte bei (a+b)/2."
        },
        {
            q: 'For X ~ U(0, 6), what is Var(X)?',
            qDE: 'Für X ~ U(0, 6): Wie groß ist Var(X)?',
            opts: ['3', '6', '36', '1'],
            optsDE: ['3', '6', '36', '1'],
            correct: 0,
            explain: "The variance of a uniform distribution is (b−a)²/12, so for U(0,6) this gives 6²/12 = 3.",
            explainDE: "Die Varianz einer Gleichverteilung beträgt (b−a)²/12, also ergibt sich für U(0,6): 6²/12 = 3."
        },
        {
            q: 'The PDF of the continuous uniform distribution on [a, b] is:',
            qDE: 'Die Dichtefunktion der stetigen Gleichverteilung auf [a, b] lautet:',
            opts: ['1/(b−a) for x∈[a,b], else 0', '1/(b+a) for x∈[a,b], else 0', 'b−a for x∈[a,b], else 0', '2/(b−a) for x∈[a,b], else 0'],
            optsDE: ['1/(b−a) für x∈[a,b], sonst 0', '1/(b+a) für x∈[a,b], sonst 0', 'b−a für x∈[a,b], sonst 0', '2/(b−a) für x∈[a,b], sonst 0'],
            correct: 0,
            explain: "A uniform density must be constant over [a,b] and integrate to 1, so the flat height must be exactly 1/(b−a).",
            explainDE: "Eine Gleichverteilungsdichte muss über [a,b] konstant sein und zu 1 integrieren, daher muss die konstante Höhe genau 1/(b−a) betragen."
        },

        // --- Exponentialverteilung ---
        {
            q: 'For X ~ Exp(λ), what is the expected value E[X]?',
            qDE: 'Für X ~ Exp(λ): Wie lautet der Erwartungswert E[X]?',
            opts: ['1/λ', 'λ', 'λ²', '1/λ²'],
            optsDE: ['1/λ', 'λ', 'λ²', '1/λ²'],
            correct: 0,
            explain: "Integrating x·λe^(−λx) over x from 0 to infinity gives the mean 1/λ of the exponential distribution.",
            explainDE: "Die Integration von x·λe^(−λx) über x von 0 bis unendlich ergibt den Erwartungswert 1/λ der Exponentialverteilung."
        },
        {
            q: 'The exponential distribution is memoryless. This means:',
            qDE: 'Die Exponentialverteilung ist gedächtnislos. Das bedeutet:',
            opts: ['P(X > s+t | X > s) = P(X > t)', 'P(X > s+t) = P(X > s) + P(X > t)', 'Past waiting time increases future probability', 'The distribution resets only at integer times'],
            optsDE: ['P(X > s+t | X > s) = P(X > t)', 'P(X > s+t) = P(X > s) + P(X > t)', 'Vergangene Wartezeit erhöht künftige Wahrscheinlichkeit', 'Die Verteilung setzt nur zu ganzzahligen Zeiten zurück'],
            correct: 0,
            explain: "Memorylessness means the remaining waiting time has the same distribution regardless of how much time has already elapsed — the process never 'ages'.",
            explainDE: "Gedächtnislosigkeit bedeutet, dass die verbleibende Wartezeit dieselbe Verteilung hat, unabhängig davon, wie viel Zeit bereits verstrichen ist — der Prozess „altert” nie."
        },
        {
            q: 'For X ~ Exp(2), what is Var(X)?',
            qDE: 'Für X ~ Exp(2): Was ist Var(X)?',
            opts: ['0.25', '0.5', '2', '4'],
            optsDE: ['0,25', '0,5', '2', '4'],
            correct: 0,
            explain: "The variance of an exponential distribution is 1/λ², so for λ=2 this gives 1/2² = 0.25.",
            explainDE: "Die Varianz einer Exponentialverteilung beträgt 1/λ², also ergibt sich für λ=2: 1/2² = 0,25."
        },

        // --- Normalverteilung ---
        {
            q: 'The standard normal distribution N(0,1) has mean and variance:',
            qDE: 'Die Standardnormalverteilung N(0,1) hat Erwartungswert und Varianz:',
            opts: ['μ=0, σ²=1', 'μ=1, σ²=0', 'μ=0, σ²=0', 'μ=1, σ²=1'],
            optsDE: ['μ=0, σ²=1', 'μ=1, σ²=0', 'μ=0, σ²=0', 'μ=1, σ²=1'],
            correct: 0,
            explain: "The standard normal distribution is defined precisely as the normal distribution with mean 0 and variance 1.",
            explainDE: "Die Standardnormalverteilung ist genau definiert als die Normalverteilung mit Erwartungswert 0 und Varianz 1."
        },
        {
            q: 'The normal distribution is symmetric around its mean. What fraction of values lies within μ ± σ (approximately)?',
            qDE: 'Die Normalverteilung ist symmetrisch um ihren Erwartungswert. Welcher Anteil liegt in μ ± σ (ca.)?',
            opts: ['68%', '95%', '99.7%', '50%'],
            optsDE: ['68%', '95%', '99,7%', '50%'],
            correct: 0,
            explain: "This is the well-known empirical rule: roughly 68% of a normal distribution's probability mass falls within one standard deviation of the mean.",
            explainDE: "Dies ist die bekannte empirische Regel: Etwa 68% der Wahrscheinlichkeitsmasse einer Normalverteilung liegen innerhalb einer Standardabweichung um den Mittelwert."
        },
        {
            q: 'To standardize X ~ N(μ, σ²), you compute Z = ?',
            qDE: 'Um X ~ N(μ, σ²) zu standardisieren, berechnet man Z = ?',
            opts: ['(X − μ) / σ', '(X + μ) / σ', 'X / μ', '(X − σ) / μ'],
            optsDE: ['(X − μ) / σ', '(X + μ) / σ', 'X / μ', '(X − σ) / μ'],
            correct: 0,
            explain: "Subtracting the mean centers the distribution at 0, and dividing by the standard deviation rescales its spread to 1, producing the standard normal Z.",
            explainDE: "Das Subtrahieren des Mittelwerts zentriert die Verteilung auf 0, und die Division durch die Standardabweichung skaliert die Streuung auf 1, wodurch die Standardnormalvariable Z entsteht."
        },

        // --- Rechnen mit normalverteilten Zufallsvariablen ---
        {
            q: 'If X ~ N(μ₁, σ₁²) and Y ~ N(μ₂, σ₂²) are independent, what is the distribution of X + Y?',
            qDE: 'Wenn X ~ N(μ₁, σ₁²) und Y ~ N(μ₂, σ₂²) unabhängig sind, welche Verteilung hat X + Y?',
            opts: ['N(μ₁+μ₂, σ₁²+σ₂²)', 'N(μ₁·μ₂, σ₁²·σ₂²)', 'N(μ₁−μ₂, σ₁²−σ₂²)', 'Not normally distributed'],
            optsDE: ['N(μ₁+μ₂, σ₁²+σ₂²)', 'N(μ₁·μ₂, σ₁²·σ₂²)', 'N(μ₁−μ₂, σ₁²−σ₂²)', 'Nicht normalverteilt'],
            correct: 0,
            explain: "Sums of independent normal variables remain normal, with means adding directly and variances (not standard deviations) adding as well.",
            explainDE: "Summen unabhängiger normalverteilter Variablen bleiben normalverteilt, wobei sich die Mittelwerte direkt addieren und ebenso die Varianzen (nicht die Standardabweichungen)."
        },
        {
            q: 'If X ~ N(3, 4) and a = 2, b = 1, what is the distribution of a·X + b?',
            qDE: 'Wenn X ~ N(3, 4), a = 2, b = 1: Welche Verteilung hat a·X + b?',
            opts: ['N(7, 16)', 'N(6, 8)', 'N(7, 8)', 'N(6, 16)'],
            optsDE: ['N(7, 16)', 'N(6, 8)', 'N(7, 8)', 'N(6, 16)'],
            correct: 0,
            explain: "Scaling shifts the mean to a·μ+b = 2·3+1 = 7 and scales the variance by a² to 2²·4 = 16.",
            explainDE: "Die Skalierung verschiebt den Mittelwert auf a·μ+b = 2·3+1 = 7 und skaliert die Varianz mit a² auf 2²·4 = 16."
        },
        {
            q: 'P(X ≤ μ) for X ~ N(μ, σ²) equals:',
            qDE: 'P(X ≤ μ) für X ~ N(μ, σ²) beträgt:',
            opts: ['0.5', '0', '1', 'Depends on σ'],
            optsDE: ['0,5', '0', '1', 'Hängt von σ ab'],
            correct: 0,
            explain: "Since the normal distribution is symmetric around its mean, exactly half of its probability mass lies at or below μ.",
            explainDE: "Da die Normalverteilung symmetrisch um ihren Mittelwert ist, liegt genau die Hälfte ihrer Wahrscheinlichkeitsmasse bei oder unterhalb von μ."
        },

        // --- Zufallsvektoren ---
        {
            q: 'A random vector (X, Y) is characterized by its:',
            qDE: 'Ein Zufallsvektor (X, Y) wird beschrieben durch seine:',
            opts: ['Joint distribution', 'Marginal distribution of X only', 'Sum X + Y', 'Individual variances only'],
            optsDE: ['Gemeinsame Verteilung', 'Nur Randverteilung von X', 'Summe X + Y', 'Nur die einzelnen Varianzen'],
            correct: 0,
            explain: "A random vector is only fully described by its joint distribution, which captures not just each component's individual behavior but how they relate to each other.",
            explainDE: "Ein Zufallsvektor wird nur durch seine gemeinsame Verteilung vollständig beschrieben, die nicht nur das Verhalten jeder einzelnen Komponente erfasst, sondern auch deren Zusammenhang."
        },
        {
            q: 'The covariance Cov(X, Y) = 0 implies:',
            qDE: 'Die Kovarianz Cov(X, Y) = 0 impliziert:',
            opts: ['X and Y are uncorrelated (but not necessarily independent)', 'X and Y are independent', 'X and Y are identical', 'Var(X+Y) = 0'],
            optsDE: ['X und Y sind unkorreliert (aber nicht unbedingt unabhängig)', 'X und Y sind unabhängig', 'X und Y sind identisch', 'Var(X+Y) = 0'],
            correct: 0,
            explain: "Zero covariance only rules out a linear association; X and Y can still be dependent through nonlinear relationships, so independence is not guaranteed.",
            explainDE: "Eine Kovarianz von null schließt nur einen linearen Zusammenhang aus; X und Y können dennoch über nichtlineare Beziehungen abhängig sein, daher ist Unabhängigkeit nicht garantiert."
        },
        {
            q: 'For a random vector (X, Y), the covariance matrix is:',
            qDE: 'Für einen Zufallsvektor (X, Y) ist die Kovarianzmatrix:',
            opts: ['Always symmetric and positive semi-definite', 'Always diagonal', 'Always invertible', 'Defined only for independent components'],
            optsDE: ['Stets symmetrisch und positiv semidefinit', 'Stets diagonal', 'Stets invertierbar', 'Nur für unabhängige Komponenten definiert'],
            correct: 0,
            explain: "Cov(Xᵢ,Xⱼ) = Cov(Xⱼ,Xᵢ) makes the matrix symmetric, and the variance of any linear combination of the components must be non-negative, which forces positive semi-definiteness.",
            explainDE: "Cov(Xᵢ,Xⱼ) = Cov(Xⱼ,Xᵢ) macht die Matrix symmetrisch, und die Varianz jeder Linearkombination der Komponenten muss nicht-negativ sein, was positive Semidefinitheit erzwingt."
        },

        // --- Verteilung von Zufallsvektoren ---
        {
            q: 'The marginal distribution of X is obtained from the joint density f(x,y) by:',
            qDE: 'Die Randverteilung von X erhält man aus der gemeinsamen Dichte f(x,y) durch:',
            opts: ['Integrating (or summing) over all values of y', 'Dividing by f(y)', 'Multiplying f(x) · f(y)', 'Setting y = 0'],
            optsDE: ['Integration (bzw. Summation) über alle y-Werte', 'Division durch f(y)', 'Multiplikation f(x) · f(y)', 'Setzen von y = 0'],
            correct: 0,
            explain: "To find how X alone behaves, you sum (or integrate) the joint density over all possible values of Y, effectively removing Y from consideration.",
            explainDE: "Um das Verhalten von X allein zu bestimmen, summiert (oder integriert) man die gemeinsame Dichte über alle möglichen Werte von Y, wodurch Y effektiv „entfernt” wird."
        },
        {
            q: 'If (X, Y) is jointly normal with zero means, the joint density depends on:',
            qDE: 'Wenn (X, Y) gemeinsam normalverteilt ist mit Nullmittelwerten, hängt die gemeinsame Dichte ab von:',
            opts: ['σ_X, σ_Y, and the correlation ρ', 'Only σ_X and σ_Y', 'Only the means', 'The sum X+Y only'],
            optsDE: ['σ_X, σ_Y und der Korrelation ρ', 'Nur σ_X und σ_Y', 'Nur den Erwartungswerten', 'Nur der Summe X+Y'],
            correct: 0,
            explain: "With the means fixed at zero, the shape of the bivariate normal density is fully determined by the two standard deviations and how strongly the variables move together, captured by ρ.",
            explainDE: "Bei auf null fixierten Mittelwerten wird die Form der bivariaten Normaldichte vollständig durch die beiden Standardabweichungen und die Stärke ihres gemeinsamen Verhaltens (ρ) bestimmt."
        },
        {
            q: 'For a discrete random vector (X, Y), the joint probability mass function satisfies:',
            qDE: 'Für einen diskreten Zufallsvektor (X, Y) gilt für die gemeinsame Zähldichte:',
            opts: ['∑_x ∑_y P(X=x, Y=y) = 1', '∑_x P(X=x, Y=y) = P(Y=y) only if X ⊥ Y', 'P(X=x, Y=y) ≥ 1 for all x,y', 'It equals the product of CDFs'],
            optsDE: ['∑_x ∑_y P(X=x, Y=y) = 1', '∑_x P(X=x, Y=y) = P(Y=y) nur bei X ⊥ Y', 'P(X=x, Y=y) ≥ 1 für alle x,y', 'Sie entspricht dem Produkt der Verteilungsfunktionen'],
            correct: 0,
            explain: "Since (X,Y) must take some pair of values with certainty, summing the joint probability mass function over every possible pair must total exactly 1.",
            explainDE: "Da (X,Y) mit Sicherheit irgendein Wertepaar annimmt, muss die Summe der gemeinsamen Zähldichte über alle möglichen Paare genau 1 ergeben."
        },

        // --- Produktverteilung bei Unabhängigkeit ---
        {
            q: 'X and Y are independent if and only if their joint density satisfies:',
            qDE: 'X und Y sind unabhängig genau dann, wenn ihre gemeinsame Dichte gilt:',
            opts: ['f(x,y) = f_X(x) · f_Y(y)', 'f(x,y) = f_X(x) + f_Y(y)', 'f(x,y) = f_X(x) / f_Y(y)', 'f(x,y) = f_X(y) · f_Y(x)'],
            optsDE: ['f(x,y) = f_X(x) · f_Y(y)', 'f(x,y) = f_X(x) + f_Y(y)', 'f(x,y) = f_X(x) / f_Y(y)', 'f(x,y) = f_X(y) · f_Y(x)'],
            correct: 0,
            explain: "Independence between X and Y means their joint density splits cleanly into the product of each variable's own marginal density.",
            explainDE: "Unabhängigkeit zwischen X und Y bedeutet, dass ihre gemeinsame Dichte sauber in das Produkt der jeweiligen Randdichten zerfällt."
        },
        {
            q: 'If X and Y are independent, then Cov(X, Y) = ?',
            qDE: 'Wenn X und Y unabhängig sind, dann gilt Cov(X, Y) = ?',
            opts: ['0', '1', 'E[X]·E[Y]', 'Var(X)·Var(Y)'],
            optsDE: ['0', '1', 'E[X]·E[Y]', 'Var(X)·Var(Y)'],
            correct: 0,
            explain: "Independence gives E[XY] = E[X]E[Y], so Cov(X,Y) = E[XY] − E[X]E[Y] collapses to zero.",
            explainDE: "Unabhängigkeit liefert E[XY] = E[X]E[Y], daher wird Cov(X,Y) = E[XY] − E[X]E[Y] gleich null."
        },
        {
            q: 'If X ~ Exp(2) and Y ~ Exp(3) are independent, which statement is true?',
            qDE: 'Wenn X ~ Exp(2) und Y ~ Exp(3) unabhängig sind, welche Aussage stimmt?',
            opts: ['f(x,y) = 6·e^(−2x)·e^(−3y) for x,y ≥ 0', 'f(x,y) = e^(−2x−3y)/(2+3)', 'f(x,y) = f_X(x+y)', 'f(x,y) = 5·e^(−5(x+y))'],
            optsDE: ['f(x,y) = 6·e^(−2x)·e^(−3y) für x,y ≥ 0', 'f(x,y) = e^(−2x−3y)/(2+3)', 'f(x,y) = f_X(x+y)', 'f(x,y) = 5·e^(−5(x+y))'],
            correct: 0,
            explain: "Independence lets the joint density factor as the product of each marginal exponential density: λ₁e^(−λ₁x) · λ₂e^(−λ₂y) = 2e^(−2x) · 3e^(−3y) = 6e^(−2x−3y).",
            explainDE: "Unabhängigkeit erlaubt, die gemeinsame Dichte als Produkt der einzelnen Exponentialdichten zu schreiben: λ₁e^(−λ₁x) · λ₂e^(−λ₂y) = 2e^(−2x) · 3e^(−3y) = 6e^(−2x−3y)."
        },

        // --- Bedingte Zähldichte ---
        {
            q: 'The conditional probability mass function of X given Y=y is defined as:',
            qDE: 'Die bedingte Zähldichte von X gegeben Y=y ist definiert als:',
            opts: ['P(X=x | Y=y) = P(X=x, Y=y) / P(Y=y)', 'P(X=x | Y=y) = P(X=x) · P(Y=y)', 'P(X=x | Y=y) = P(Y=y) / P(X=x)', 'P(X=x | Y=y) = P(X=x) + P(Y=y)'],
            optsDE: ['P(X=x | Y=y) = P(X=x, Y=y) / P(Y=y)', 'P(X=x | Y=y) = P(X=x) · P(Y=y)', 'P(X=x | Y=y) = P(Y=y) / P(X=x)', 'P(X=x | Y=y) = P(X=x) + P(Y=y)'],
            correct: 0,
            explain: "Conditioning on Y=y restricts attention to that slice of outcomes, so the conditional probability normalizes the joint probability by dividing out P(Y=y).",
            explainDE: "Die Bedingung auf Y=y beschränkt die Betrachtung auf diese Teilmenge der Ergebnisse, daher normiert die bedingte Wahrscheinlichkeit die gemeinsame Wahrscheinlichkeit, indem sie durch P(Y=y) teilt."
        },
        {
            q: 'If X and Y are independent, then the conditional PMF of X given Y=y equals:',
            qDE: 'Wenn X und Y unabhängig sind, gilt für die bedingte Zähldichte von X gegeben Y=y:',
            opts: ['P(X=x)', 'P(Y=y)', 'P(X=x)·P(Y=y)', '1'],
            optsDE: ['P(X=x)', 'P(Y=y)', 'P(X=x)·P(Y=y)', '1'],
            correct: 0,
            explain: "If X and Y are independent, knowing Y's value tells you nothing new about X, so the conditional distribution of X collapses back to its unconditional marginal.",
            explainDE: "Wenn X und Y unabhängig sind, liefert das Wissen um den Wert von Y keine neue Information über X, daher entspricht die bedingte Verteilung von X wieder ihrer unbedingten Randverteilung."
        },
        {
            q: 'The law of total probability for the marginal PMF of Y uses the conditional PMF how?',
            qDE: 'Das Gesetz der totalen Wahrscheinlichkeit für die Randverteilung von Y nutzt die bedingte Zähldichte wie?',
            opts: ['P(Y=y) = ∑_x P(Y=y | X=x)·P(X=x)', 'P(Y=y) = P(Y=y | X=x) for any x', 'P(Y=y) = ∏_x P(Y=y | X=x)', 'P(Y=y) = P(Y=y | X=x) / P(X=x)'],
            optsDE: ['P(Y=y) = ∑_x P(Y=y | X=x)·P(X=x)', 'P(Y=y) = P(Y=y | X=x) für ein beliebiges x', 'P(Y=y) = ∏_x P(Y=y | X=x)', 'P(Y=y) = P(Y=y | X=x) / P(X=x)'],
            correct: 0,
            explain: "Summing the conditional probability of Y=y across every possible value of X, each weighted by how likely that X value is, reconstructs the unconditional probability of Y=y.",
            explainDE: "Die Summierung der bedingten Wahrscheinlichkeit von Y=y über jeden möglichen Wert von X, jeweils gewichtet mit der Wahrscheinlichkeit dieses X-Werts, rekonstruiert die unbedingte Wahrscheinlichkeit von Y=y."
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
            explain: "Simpson's paradox is defined by exactly this reversal: a pattern that holds in every subgroup can vanish or flip once the subgroups are pooled together.",
            explainDE: "Das Simpsons Paradoxon ist genau durch diese Umkehrung definiert: Ein Muster, das in jeder Untergruppe gilt, kann verschwinden oder sich umkehren, sobald die Untergruppen zusammengefasst werden."
        },
        {
            q: "The main cause of Simpson's paradox is typically:",
            qDE: "Die Hauptursache des Simpsons Paradoxons ist typischerweise:",
            opts: ["A lurking (confounding) variable that is not accounted for", "A calculation error in the marginal probabilities", "Too small a sample size in each group", "Non-normal distribution of the data"],
            optsDE: ["Eine verborgene (konfundierende) Variable, die nicht berücksichtigt wird", "Ein Rechenfehler bei den Randwahrscheinlichkeiten", "Zu kleiner Stichprobenumfang in jeder Gruppe", "Nicht-normale Verteilung der Daten"],
            correct: 0,
            explain: "The paradox typically arises because group sizes differ systematically along some hidden third variable, which distorts the combined result even though each group's trend is calculated correctly.",
            explainDE: "Das Paradoxon entsteht typischerweise, weil sich die Gruppengrößen systematisch entlang einer verborgenen dritten Variable unterscheiden, was das kombinierte Ergebnis verzerrt, obwohl der Trend in jeder Gruppe korrekt berechnet ist."
        },
        {
            q: "Simpson's paradox is most relevant as a warning against:",
            qDE: "Das Simpsons Paradoxon ist vor allem eine Warnung vor:",
            opts: ["Naively aggregating data without controlling for confounders", "Using conditional probabilities", "Computing marginal distributions", "Applying the law of total expectation"],
            optsDE: ["Naiver Datenaggregation ohne Kontrolle von Störvariablen", "Der Verwendung bedingter Wahrscheinlichkeiten", "Der Berechnung von Randverteilungen", "Der Anwendung des Gesetzes der totalen Erwartung"],
            correct: 0,
            explain: "The practical lesson of the paradox is that pooling data without controlling for relevant subgroups can produce a conclusion that's the opposite of what the disaggregated data actually shows.",
            explainDE: "Die praktische Lehre des Paradoxons ist, dass das Zusammenfassen von Daten ohne Kontrolle relevanter Untergruppen zu einer Schlussfolgerung führen kann, die dem Gegenteil dessen entspricht, was die aufgeschlüsselten Daten tatsächlich zeigen."
        },

        // --- Bedingte Dichte ---
        {
            q: "The conditional density of X given Y=y is defined as:",
            qDE: "Die bedingte Dichte von X gegeben Y=y ist definiert als:",
            opts: ["f_{X|Y}(x|y) = f(x,y) / f_Y(y)", "f_{X|Y}(x|y) = f_X(x) · f_Y(y)", "f_{X|Y}(x|y) = f_Y(y) / f(x,y)", "f_{X|Y}(x|y) = f(x,y) − f_Y(y)"],
            optsDE: ["f_{X|Y}(x|y) = f(x,y) / f_Y(y)", "f_{X|Y}(x|y) = f_X(x) · f_Y(y)", "f_{X|Y}(x|y) = f_Y(y) / f(x,y)", "f_{X|Y}(x|y) = f(x,y) − f_Y(y)"],
            correct: 0,
            explain: "Conditioning on Y=y restricts attention to that slice of the joint density, so the conditional density normalizes the joint density by dividing out f_Y(y), the continuous analogue of conditional probability.",
            explainDE: "Die Bedingung auf Y=y beschränkt die Betrachtung auf diesen Schnitt der gemeinsamen Dichte, daher normiert die bedingte Dichte die gemeinsame Dichte, indem sie durch f_Y(y) teilt — das stetige Gegenstück zur bedingten Wahrscheinlichkeit."
        },
        {
            q: "For the conditional density f_{X|Y}(x|y) to be valid, it must satisfy:",
            qDE: "Damit die bedingte Dichte f_{X|Y}(x|y) gültig ist, muss gelten:",
            opts: ["∫ f_{X|Y}(x|y) dx = 1 for each fixed y", "∫∫ f_{X|Y}(x|y) dx dy = 1", "f_{X|Y}(x|y) = f_{Y|X}(y|x)", "f_{X|Y}(x|y) ≥ f_X(x) for all x"],
            optsDE: ["∫ f_{X|Y}(x|y) dx = 1 für jedes feste y", "∫∫ f_{X|Y}(x|y) dx dy = 1", "f_{X|Y}(x|y) = f_{Y|X}(y|x)", "f_{X|Y}(x|y) ≥ f_X(x) für alle x"],
            correct: 0,
            explain: "Since f_{X|Y}(x|y) is itself a valid density in x for each fixed y, it must integrate to 1 over all x, just like any ordinary probability density.",
            explainDE: "Da f_{X|Y}(x|y) für jedes feste y selbst eine gültige Dichte in x ist, muss sie über alle x zu 1 integrieren, genau wie jede gewöhnliche Wahrscheinlichkeitsdichte."
        },
        {
            q: "The joint density f(x,y) can be recovered from the conditional density via:",
            qDE: "Die gemeinsame Dichte f(x,y) lässt sich aus der bedingten Dichte zurückgewinnen durch:",
            opts: ["f(x,y) = f_{X|Y}(x|y) · f_Y(y)", "f(x,y) = f_{X|Y}(x|y) + f_Y(y)", "f(x,y) = f_{X|Y}(x|y) / f_Y(y)", "f(x,y) = f_{X|Y}(x|y) · f_X(x)"],
            optsDE: ["f(x,y) = f_{X|Y}(x|y) · f_Y(y)", "f(x,y) = f_{X|Y}(x|y) + f_Y(y)", "f(x,y) = f_{X|Y}(x|y) / f_Y(y)", "f(x,y) = f_{X|Y}(x|y) · f_X(x)"],
            correct: 0,
            explain: "This is just rearranging the definition of conditional density: multiplying the conditional density back by f_Y(y) undoes the earlier division and returns the joint density.",
            explainDE: "Dies ist lediglich die Umformung der Definition der bedingten Dichte: Multipliziert man die bedingte Dichte wieder mit f_Y(y), macht man die vorherige Division rückgängig und erhält die gemeinsame Dichte."
        },

        // --- Kriterium für Unabhängigkeit über bedingte Dichten ---
        {
            q: "In the continuous case, X and Y are independent if and only if:",
            qDE: "Im stetigen Fall sind X und Y unabhängig genau dann, wenn:",
            opts: ["f_{X|Y}(x|y) = f_X(x) for all x, y", "f_{X|Y}(x|y) = f_Y(y) for all x, y", "f_{X|Y}(x|y) = f(x,y) for all x, y", "f_{X|Y}(x|y) = 0 for all x ≠ y"],
            optsDE: ["f_{X|Y}(x|y) = f_X(x) für alle x, y", "f_{X|Y}(x|y) = f_Y(y) für alle x, y", "f_{X|Y}(x|y) = f(x,y) für alle x, y", "f_{X|Y}(x|y) = 0 für alle x ≠ y"],
            correct: 0,
            explain: "Independence means that conditioning on Y provides no new information about X, so X's conditional density must equal its unconditional marginal density for every value of y.",
            explainDE: "Unabhängigkeit bedeutet, dass die Bedingung auf Y keine neue Information über X liefert, daher muss die bedingte Dichte von X für jeden Wert von y gleich ihrer unbedingten Randdichte sein."
        },
        {
            q: "In the discrete case, X ⊥ Y if and only if for all x, y:",
            qDE: "Im diskreten Fall gilt X ⊥ Y genau dann, wenn für alle x, y:",
            opts: ["P(X=x, Y=y) = P(X=x) · P(Y=y)", "P(X=x | Y=y) = P(Y=y)", "P(X=x, Y=y) = P(X=x) + P(Y=y)", "P(X=x | Y=y) = 0"],
            optsDE: ["P(X=x, Y=y) = P(X=x) · P(Y=y)", "P(X=x | Y=y) = P(Y=y)", "P(X=x, Y=y) = P(X=x) + P(Y=y)", "P(X=x | Y=y) = 0"],
            correct: 0,
            explain: "This is the standard discrete definition of independence: the joint probability must factor exactly into the product of the two marginal probabilities for every pair of values.",
            explainDE: "Dies ist die übliche diskrete Definition von Unabhängigkeit: Die gemeinsame Wahrscheinlichkeit muss sich für jedes Wertepaar exakt in das Produkt der beiden Randwahrscheinlichkeiten zerlegen lassen."
        },
        {
            q: "If the joint density factors as f(x,y) = g(x) · h(y), then X and Y are:",
            qDE: "Wenn die gemeinsame Dichte faktorisiert als f(x,y) = g(x) · h(y), dann sind X und Y:",
            opts: ["Independent", "Uncorrelated but not necessarily independent", "Identically distributed", "Jointly normally distributed"],
            optsDE: ["Unabhängig", "Unkorreliert, aber nicht notwendig unabhängig", "Identisch verteilt", "Gemeinsam normalverteilt"],
            correct: 0,
            explain: "Whenever the joint density splits into a function of x alone times a function of y alone, this factorization is itself sufficient to guarantee independence, regardless of normalization constants.",
            explainDE: "Sobald sich die gemeinsame Dichte in eine Funktion allein von x mal eine Funktion allein von y zerlegen lässt, reicht diese Faktorisierung selbst aus, um Unabhängigkeit zu garantieren, unabhängig von Normierungskonstanten."
        },

        // --- Bedingter Erwartungswert (diskret und stetig) ---
        {
            q: "The conditional expectation E[X | Y=y] in the continuous case is computed as:",
            qDE: "Der bedingte Erwartungswert E[X | Y=y] im stetigen Fall wird berechnet als:",
            opts: ["∫ x · f_{X|Y}(x|y) dx", "∫ x · f_X(x) dx", "∫ x · f(x,y) dx", "∫ x · f_Y(y) dx"],
            optsDE: ["∫ x · f_{X|Y}(x|y) dx", "∫ x · f_X(x) dx", "∫ x · f(x,y) dx", "∫ x · f_Y(y) dx"],
            correct: 0,
            explain: "Just like an ordinary expectation weights each value of x by its density, the conditional expectation weights x by the conditional density f_{X|Y}(x|y) that reflects knowing Y=y.",
            explainDE: "Genau wie ein gewöhnlicher Erwartungswert jeden Wert von x mit seiner Dichte gewichtet, gewichtet der bedingte Erwartungswert x mit der bedingten Dichte f_{X|Y}(x|y), die das Wissen um Y=y widerspiegelt."
        },
        {
            q: "The tower property (law of total expectation) states:",
            qDE: "Die Turmregel (Gesetz der totalen Erwartung) besagt:",
            opts: ["E[X] = E[E[X | Y]]", "E[X | Y] = E[X] · E[Y]", "E[X] = E[X | Y] + E[Y]", "E[X | Y] = E[Y | X]"],
            optsDE: ["E[X] = E[E[X | Y]]", "E[X | Y] = E[X] · E[Y]", "E[X] = E[X | Y] + E[Y]", "E[X | Y] = E[Y | X]"],
            correct: 0,
            explain: "Averaging the conditional expectations E[X|Y] over all possible values of Y, weighted by how likely each is, must reconstruct the overall unconditional expectation of X.",
            explainDE: "Die Mittelung der bedingten Erwartungswerte E[X|Y] über alle möglichen Werte von Y, gewichtet mit deren Wahrscheinlichkeit, muss den gesamten unbedingten Erwartungswert von X rekonstruieren."
        },
        {
            q: "If X and Y are independent, then E[X | Y=y] equals:",
            qDE: "Wenn X und Y unabhängig sind, dann gilt E[X | Y=y] =",
            opts: ["E[X]", "E[Y]", "E[X] · E[Y]", "E[X + Y]"],
            optsDE: ["E[X]", "E[Y]", "E[X] · E[Y]", "E[X + Y]"],
            correct: 0,
            explain: "When X and Y are independent, knowing Y=y gives no information about X, so the conditional expectation collapses back to the plain unconditional expectation E[X].",
            explainDE: "Wenn X und Y unabhängig sind, liefert das Wissen um Y=y keine Information über X, daher entspricht der bedingte Erwartungswert wieder dem einfachen unbedingten Erwartungswert E[X]."
        },

        // --- Zufallszahlen mit Box-Muller-Methode ---
        {
            q: "The Box–Muller transform converts which input into standard normal random numbers?",
            qDE: "Die Box-Muller-Methode wandelt welche Eingabe in standardnormalverteilte Zufallszahlen um?",
            opts: ["Two independent uniform random numbers on (0,1)", "One exponentially distributed random number", "Two standard normal random numbers", "One uniform and one exponential random number"],
            optsDE: ["Zwei unabhängige gleichverteilte Zufallszahlen auf (0,1)", "Eine exponentialverteilte Zufallszahl", "Zwei standardnormalverteilte Zufallszahlen", "Eine gleichverteilte und eine exponentialverteilte Zufallszahl"],
            correct: 0,
            explain: "The Box–Muller method starts from two easy-to-generate uniform random numbers and transforms them, via logarithms and trigonometric functions, into a pair of standard normal values.",
            explainDE: "Die Box-Muller-Methode geht von zwei leicht erzeugbaren gleichverteilten Zufallszahlen aus und transformiert sie mittels Logarithmus und trigonometrischer Funktionen in ein Paar standardnormalverteilter Werte."
        },
        {
            q: "In the Box–Muller method with U₁, U₂ ~ Uniform(0,1), the formula Z₁ = √(−2 ln U₁) · cos(2πU₂) produces:",
            qDE: "Bei der Box-Muller-Methode mit U₁, U₂ ~ Gleichverteilung(0,1) erzeugt Z₁ = √(−2 ln U₁) · cos(2πU₂):",
            opts: ["A standard normal N(0,1) random variable", "A uniform random variable", "An exponential random variable", "A chi-squared random variable"],
            optsDE: ["Eine standardnormalverteilte N(0,1) Zufallsvariable", "Eine gleichverteilte Zufallsvariable", "Eine exponentialverteilte Zufallsvariable", "Eine chi-quadrat-verteilte Zufallsvariable"],
            correct: 0,
            explain: "This specific combination of a radius term √(−2 ln U₁) and an angle term cos(2πU₂) is exactly the construction that produces a standard normal output.",
            explainDE: "Diese spezielle Kombination aus einem Radiusterm √(−2 ln U₁) und einem Winkelterm cos(2πU₂) ist genau die Konstruktion, die eine standardnormalverteilte Ausgabe erzeugt."
        },
        {
            q: "A key advantage of the Box–Muller method is that it produces normal random variables:",
            qDE: "Ein wesentlicher Vorteil der Box-Muller-Methode ist, dass sie Normalzufallszahlen erzeugt:",
            opts: ["Exactly, not just approximately", "Only approximately via the CLT", "Using only one uniform input", "Without any trigonometric functions"],
            optsDE: ["Exakt, nicht nur näherungsweise", "Nur näherungsweise über den ZGS", "Mit nur einer gleichverteilten Eingabe", "Ohne trigonometrische Funktionen"],
            correct: 0,
            explain: "Unlike methods that rely on summing many variables and invoking the Central Limit Theorem for an approximate result, Box–Muller gives exact standard normal draws from the transform itself.",
            explainDE: "Im Gegensatz zu Methoden, die viele Variablen summieren und sich auf den Zentralen Grenzwertsatz für ein approximatives Ergebnis stützen, liefert Box-Muller durch die Transformation selbst exakte standardnormalverteilte Werte."
        },

        // --- Erwartungswertvektor ---
        {
            q: "The expected value vector (mean vector) of a random vector (X₁, …, Xₙ) is:",
            qDE: "Der Erwartungswertvektor eines Zufallsvektors (X₁, …, Xₙ) ist:",
            opts: ["The vector (E[X₁], …, E[Xₙ])", "The vector of variances (Var(X₁), …, Var(Xₙ))", "The covariance matrix diagonal", "E[X₁ + … + Xₙ] as a scalar"],
            optsDE: ["Der Vektor (E[X₁], …, E[Xₙ])", "Der Varianzvektor (Var(X₁), …, Var(Xₙ))", "Die Diagonale der Kovarianzmatrix", "E[X₁ + … + Xₙ] als Skalar"],
            correct: 0,
            explain: "The mean vector simply stacks the individual expectations of each component into one vector, giving a single summary of the 'center' of the whole random vector.",
            explainDE: "Der Erwartungswertvektor fasst einfach die einzelnen Erwartungswerte jeder Komponente in einem Vektor zusammen und liefert so eine einzige Zusammenfassung des „Zentrums” des gesamten Zufallsvektors."
        },
        {
            q: "For a linear transformation Y = AX + b, the expected value vector E[Y] equals:",
            qDE: "Für eine lineare Transformation Y = AX + b gilt für den Erwartungswertvektor E[Y]:",
            opts: ["A·E[X] + b", "E[X] + b", "A·E[X]", "A·b + E[X]"],
            optsDE: ["A·E[X] + b", "E[X] + b", "A·E[X]", "A·b + E[X]"],
            correct: 0,
            explain: "Because expectation is linear, it passes straight through matrix multiplication and vector addition, so E[AX+b] = A·E[X] + b.",
            explainDE: "Da der Erwartungswert linear ist, überträgt er sich direkt auf Matrixmultiplikation und Vektoraddition, sodass E[AX+b] = A·E[X] + b gilt."
        },
        {
            q: "The mean vector of a sum X + Y of two random vectors equals:",
            qDE: "Der Erwartungswertvektor einer Summe X + Y zweier Zufallsvektoren ist:",
            opts: ["E[X] + E[Y] (always, regardless of dependence)", "E[X] + E[Y] only if X and Y are independent", "E[X] · E[Y]", "E[X] only if X and Y are identically distributed"],
            optsDE: ["E[X] + E[Y] (stets, auch bei Abhängigkeit)", "E[X] + E[Y] nur bei Unabhängigkeit", "E[X] · E[Y]", "E[X], nur wenn X und Y identisch verteilt sind"],
            correct: 0,
            explain: "Linearity of expectation holds unconditionally, so the mean of a sum of random vectors always equals the sum of their individual means, no independence assumption required.",
            explainDE: "Die Linearität des Erwartungswerts gilt bedingungslos, daher entspricht der Mittelwert einer Summe von Zufallsvektoren stets der Summe ihrer einzelnen Mittelwerte, ohne dass Unabhängigkeit vorausgesetzt werden muss."
        },

        // --- Kovarianz ---
        {
            q: "The covariance of X and Y is defined as:",
            qDE: "Die Kovarianz von X und Y ist definiert als:",
            opts: ["Cov(X,Y) = E[(X − E[X])(Y − E[Y])]", "Cov(X,Y) = E[X] · E[Y]", "Cov(X,Y) = E[X²] − E[Y²]", "Cov(X,Y) = Var(X) + Var(Y)"],
            optsDE: ["Cov(X,Y) = E[(X − E[X])(Y − E[Y])]", "Cov(X,Y) = E[X] · E[Y]", "Cov(X,Y) = E[X²] − E[Y²]", "Cov(X,Y) = Var(X) + Var(Y)"],
            correct: 0,
            explain: "Covariance measures how X and Y move together by averaging the product of their deviations from their own means — positive when they tend to rise and fall together.",
            explainDE: "Die Kovarianz misst, wie sich X und Y gemeinsam verändern, indem sie das Produkt ihrer Abweichungen von den jeweiligen Mittelwerten mittelt — positiv, wenn sie tendenziell gemeinsam steigen und fallen."
        },
        {
            q: "The computational shortcut for covariance is:",
            qDE: "Die Verschiebungsformel für die Kovarianz lautet:",
            opts: ["Cov(X,Y) = E[XY] − E[X]·E[Y]", "Cov(X,Y) = E[XY] + E[X]·E[Y]", "Cov(X,Y) = E[X²Y²] − E[XY]", "Cov(X,Y) = E[XY] / (E[X]·E[Y])"],
            optsDE: ["Cov(X,Y) = E[XY] − E[X]·E[Y]", "Cov(X,Y) = E[XY] + E[X]·E[Y]", "Cov(X,Y) = E[X²Y²] − E[XY]", "Cov(X,Y) = E[XY] / (E[X]·E[Y])"],
            correct: 0,
            explain: "Expanding the definition of covariance and using linearity of expectation, the cross terms simplify to this shortcut formula, avoiding the need to compute deviations explicitly.",
            explainDE: "Erweitert man die Definition der Kovarianz und nutzt die Linearität des Erwartungswerts, vereinfachen sich die Kreuzterme zu dieser Verschiebungsformel, wodurch man die Abweichungen nicht explizit berechnen muss."
        },
        {
            q: "Cov(X, X) equals:",
            qDE: "Cov(X, X) ist gleich:",
            opts: ["Var(X)", "E[X]²", "0", "E[X²]"],
            optsDE: ["Var(X)", "E[X]²", "0", "E[X²]"],
            correct: 0,
            explain: "Substituting Y=X into the covariance definition gives E[(X−E[X])²], which is precisely the definition of the variance of X.",
            explainDE: "Setzt man Y=X in die Definition der Kovarianz ein, erhält man E[(X−E[X])²], was genau der Definition der Varianz von X entspricht."
        },

        // --- Kovarianzmatrix ---
        {
            q: "The covariance matrix Σ of a random vector X has entries Σ_{ij} =",
            qDE: "Die Kovarianzmatrix Σ eines Zufallsvektors X hat Einträge Σ_{ij} =",
            opts: ["Cov(Xᵢ, Xⱼ)", "E[Xᵢ] · E[Xⱼ]", "Var(Xᵢ) + Var(Xⱼ)", "Corr(Xᵢ, Xⱼ)"],
            optsDE: ["Cov(Xᵢ, Xⱼ)", "E[Xᵢ] · E[Xⱼ]", "Var(Xᵢ) + Var(Xⱼ)", "Corr(Xᵢ, Xⱼ)"],
            correct: 0,
            explain: "Each entry of the covariance matrix records how the i-th and j-th components of the random vector vary together, with the diagonal entries reducing to ordinary variances when i=j.",
            explainDE: "Jeder Eintrag der Kovarianzmatrix erfasst, wie die i-te und j-te Komponente des Zufallsvektors gemeinsam variieren, wobei die Diagonaleinträge für i=j zu gewöhnlichen Varianzen werden."
        },
        {
            q: "For a linear transformation Y = AX, the covariance matrix of Y is:",
            qDE: "Für eine lineare Transformation Y = AX ist die Kovarianzmatrix von Y:",
            opts: ["A · Σ_X · Aᵀ", "A · Σ_X", "Σ_X · Aᵀ", "Aᵀ · Σ_X · A"],
            optsDE: ["A · Σ_X · Aᵀ", "A · Σ_X", "Σ_X · Aᵀ", "Aᵀ · Σ_X · A"],
            correct: 0,
            explain: "Transforming a random vector by a matrix A sandwiches the original covariance matrix between A and its transpose, which is what keeps the result symmetric and correctly dimensioned.",
            explainDE: "Die Transformation eines Zufallsvektors mit einer Matrix A setzt die ursprüngliche Kovarianzmatrix zwischen A und ihre Transponierte, wodurch das Ergebnis symmetrisch bleibt und die richtige Dimension erhält."
        },
        {
            q: "The covariance matrix is always:",
            qDE: "Die Kovarianzmatrix ist stets:",
            opts: ["Symmetric and positive semi-definite", "Diagonal", "Invertible", "An identity matrix scaled by σ²"],
            optsDE: ["Symmetrisch und positiv semidefinit", "Diagonal", "Invertierbar", "Eine mit σ² skalierte Einheitsmatrix"],
            correct: 0,
            explain: "Cov(Xᵢ,Xⱼ) = Cov(Xⱼ,Xᵢ) makes the matrix symmetric, and since the variance of any linear combination of the components must be non-negative, the matrix is forced to be positive semi-definite.",
            explainDE: "Cov(Xᵢ,Xⱼ) = Cov(Xⱼ,Xᵢ) macht die Matrix symmetrisch, und da die Varianz jeder Linearkombination der Komponenten nicht-negativ sein muss, ist die Matrix zwangsläufig positiv semidefinit."
        },

        // --- Unkorreliert ---
        {
            q: "Two random variables X and Y are uncorrelated if:",
            qDE: "Zwei Zufallsvariablen X und Y sind unkorreliert, wenn:",
            opts: ["Cov(X,Y) = 0", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 0"],
            optsDE: ["Cov(X,Y) = 0", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 0"],
            correct: 0,
            explain: "Uncorrelated is, by definition, exactly the statement that the covariance between the two variables is zero — no linear relationship between them.",
            explainDE: "Unkorreliert bedeutet per Definition genau, dass die Kovarianz zwischen den beiden Variablen null ist — kein linearer Zusammenhang zwischen ihnen."
        },
        {
            q: "Independence implies uncorrelatedness, but not vice versa. A counterexample is:",
            qDE: "Unabhängigkeit impliziert Unkorreliertheit, aber nicht umgekehrt. Ein Gegenbeispiel ist:",
            opts: ["X ~ Uniform(−1,1) and Y = X²", "X and Y both standard normal and independent", "X and Y with the same distribution", "X and Y both Ber(0.5)"],
            optsDE: ["X ~ Gleichverteilung(−1,1) und Y = X²", "X und Y beide standardnormalverteilt und unabhängig", "X und Y mit gleicher Verteilung", "X und Y beide Ber(0,5)"],
            correct: 0,
            explain: "Here Y is completely determined by X (strongly dependent), yet by symmetry Cov(X,X²)=0, showing that zero covariance doesn't rule out a strong nonlinear relationship.",
            explainDE: "Hier ist Y vollständig durch X bestimmt (stark abhängig), doch aus Symmetriegründen gilt Cov(X,X²)=0, was zeigt, dass eine Kovarianz von null einen starken nichtlinearen Zusammenhang nicht ausschließt."
        },
        {
            q: "For jointly normal X and Y, uncorrelatedness implies:",
            qDE: "Für gemeinsam normalverteilte X und Y impliziert Unkorreliertheit:",
            opts: ["Independence", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 1"],
            optsDE: ["Unabhängigkeit", "E[X] = E[Y]", "Var(X) = Var(Y)", "E[XY] = 1"],
            correct: 0,
            explain: "The bivariate normal density is fully determined by means, variances, and the correlation ρ, so when ρ=0 the joint density factors into the product of the marginals, giving independence — a special property not shared by other distributions.",
            explainDE: "Die bivariate Normaldichte ist vollständig durch die Mittelwerte, Varianzen und die Korrelation ρ bestimmt, daher zerfällt bei ρ=0 die gemeinsame Dichte in das Produkt der Randdichten, was Unabhängigkeit ergibt — eine Besonderheit, die nicht bei anderen Verteilungen gilt."
        },

        // --- Korrelation ---
        {
            q: "The correlation coefficient of X and Y is defined as:",
            qDE: "Der Korrelationskoeffizient von X und Y ist definiert als:",
            opts: ["Corr(X,Y) = Cov(X,Y) / (σ_X · σ_Y)", "Corr(X,Y) = Cov(X,Y) · σ_X · σ_Y", "Corr(X,Y) = Cov(X,Y) / Var(X)", "Corr(X,Y) = E[XY] / E[X+Y]"],
            optsDE: ["Corr(X,Y) = Cov(X,Y) / (σ_X · σ_Y)", "Corr(X,Y) = Cov(X,Y) · σ_X · σ_Y", "Corr(X,Y) = Cov(X,Y) / Var(X)", "Corr(X,Y) = E[XY] / E[X+Y]"],
            correct: 0,
            explain: "Dividing covariance by both standard deviations rescales it into a unit-free measure, letting correlation strength be compared across variables regardless of their original units.",
            explainDE: "Die Division der Kovarianz durch beide Standardabweichungen skaliert sie zu einem einheitenfreien Maß, wodurch sich die Stärke der Korrelation unabhängig von den ursprünglichen Einheiten vergleichen lässt."
        },
        {
            q: "The correlation coefficient always lies in the range:",
            qDE: "Der Korrelationskoeffizient liegt stets im Bereich:",
            opts: ["[−1, 1]", "[0, 1]", "[−∞, ∞]", "[0, ∞)"],
            optsDE: ["[−1, 1]", "[0, 1]", "[−∞, ∞]", "[0, ∞)"],
            correct: 0,
            explain: "The Cauchy–Schwarz inequality bounds the squared covariance by the product of the variances, which forces the normalized correlation coefficient to always fall between −1 and 1.",
            explainDE: "Die Cauchy-Schwarz-Ungleichung beschränkt die quadrierte Kovarianz durch das Produkt der Varianzen, wodurch der normierte Korrelationskoeffizient stets zwischen −1 und 1 liegen muss."
        },
        {
            q: "Corr(X,Y) = 1 means:",
            qDE: "Corr(X,Y) = 1 bedeutet:",
            opts: ["X and Y are perfectly linearly related with positive slope", "X and Y are independent", "Var(X) = Var(Y)", "E[X] = E[Y]"],
            optsDE: ["X und Y sind perfekt linear abhängig mit positiver Steigung", "X und Y sind unabhängig", "Var(X) = Var(Y)", "E[X] = E[Y]"],
            correct: 0,
            explain: "Correlation reaches its maximum value of exactly 1 only when one variable is an exact positive linear function of the other, with no scatter around that line.",
            explainDE: "Die Korrelation erreicht ihren Maximalwert von genau 1 nur dann, wenn eine Variable eine exakte positive lineare Funktion der anderen ist, ohne Streuung um diese Gerade."
        },

        // --- Rechenregel für Kovarianz inkl. Cauchy-Schwarz ---
        {
            q: "The bilinearity rule for covariance gives Cov(aX + b, Y) =",
            qDE: "Die Bilinearitätsregel für die Kovarianz ergibt Cov(aX + b, Y) =",
            opts: ["a · Cov(X,Y)", "a · Cov(X,Y) + b", "Cov(X,Y) + b · Cov(1,Y)", "a · Var(X)"],
            optsDE: ["a · Cov(X,Y)", "a · Cov(X,Y) + b", "Cov(X,Y) + b · Cov(1,Y)", "a · Var(X)"],
            correct: 0,
            explain: "Because covariance is bilinear, scaling X by a scales the covariance by that same factor a, while adding a constant b has no effect since constants don't co-vary with anything.",
            explainDE: "Da die Kovarianz bilinear ist, skaliert die Multiplikation von X mit a die Kovarianz um denselben Faktor a, während die Addition einer Konstante b keine Wirkung hat, da Konstanten mit nichts kovariieren."
        },
        {
            q: "The Cauchy–Schwarz inequality for random variables states:",
            qDE: "Die Cauchy-Schwarz-Ungleichung für Zufallsvariablen besagt:",
            opts: ["|Cov(X,Y)|² ≤ Var(X) · Var(Y)", "Cov(X,Y) ≤ E[X] · E[Y]", "|E[XY]| ≤ E[X] + E[Y]", "Var(X+Y) ≤ Var(X) · Var(Y)"],
            optsDE: ["|Cov(X,Y)|² ≤ Var(X) · Var(Y)", "Cov(X,Y) ≤ E[X] · E[Y]", "|E[XY]| ≤ E[X] + E[Y]", "Var(X+Y) ≤ Var(X) · Var(Y)"],
            correct: 0,
            explain: "This inequality caps how large the covariance between two variables can be relative to their individual variances, and it's exactly what guarantees correlation stays within [−1,1].",
            explainDE: "Diese Ungleichung begrenzt, wie groß die Kovarianz zwischen zwei Variablen im Verhältnis zu ihren eigenen Varianzen sein kann, und garantiert genau dadurch, dass die Korrelation im Bereich [−1,1] bleibt."
        },
        {
            q: "For independent X and Y, Var(X + Y) equals:",
            qDE: "Für unabhängige X und Y gilt Var(X + Y) =",
            opts: ["Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) − Var(Y)"],
            optsDE: ["Var(X) + Var(Y)", "Var(X) · Var(Y)", "Var(X) + Var(Y) + 2·Cov(X,Y)", "Var(X) − Var(Y)"],
            correct: 0,
            explain: "The general formula Var(X+Y) = Var(X)+Var(Y)+2·Cov(X,Y) simplifies here because independence forces Cov(X,Y)=0, leaving just the sum of the two variances.",
            explainDE: "Die allgemeine Formel Var(X+Y) = Var(X)+Var(Y)+2·Cov(X,Y) vereinfacht sich hier, da Unabhängigkeit Cov(X,Y)=0 erzwingt, sodass nur die Summe der beiden Varianzen übrig bleibt."
        },

        // --- Multivariate Normalverteilung ---
        {
            q: "A multivariate normal distribution is fully characterized by:",
            qDE: "Eine multivariate Normalverteilung ist vollständig bestimmt durch:",
            opts: ["The mean vector μ and the covariance matrix Σ", "Only the mean vector μ", "Only the covariance matrix Σ", "The marginal distributions alone"],
            optsDE: ["Den Erwartungswertvektor μ und die Kovarianzmatrix Σ", "Nur den Erwartungswertvektor μ", "Nur die Kovarianzmatrix Σ", "Nur die Randverteilungen"],
            correct: 0,
            explain: "Just as a univariate normal is fully specified by its mean and variance, the multivariate normal is fully specified by its mean vector and covariance matrix — no further information is needed.",
            explainDE: "Genau wie eine univariate Normalverteilung vollständig durch Erwartungswert und Varianz bestimmt ist, ist die multivariate Normalverteilung vollständig durch ihren Erwartungswertvektor und ihre Kovarianzmatrix bestimmt — keine weitere Information ist nötig."
        },
        {
            q: "If X ~ N(μ, Σ) and Y = AX + b, then Y follows:",
            qDE: "Wenn X ~ N(μ, Σ) und Y = AX + b, dann folgt Y:",
            opts: ["N(Aμ + b, AΣAᵀ)", "N(Aμ, Σ)", "N(μ + b, AΣ)", "N(Aμ + b, Σ)"],
            optsDE: ["N(Aμ + b, AΣAᵀ)", "N(Aμ, Σ)", "N(μ + b, AΣ)", "N(Aμ + b, Σ)"],
            correct: 0,
            explain: "Any linear (affine) transformation of a multivariate normal vector stays normal, with the mean transforming as Aμ+b and the covariance transforming as AΣAᵀ, matching the earlier rules for mean vectors and covariance matrices.",
            explainDE: "Jede lineare (affine) Transformation eines multivariat normalverteilten Vektors bleibt normalverteilt, wobei sich der Mittelwert als Aμ+b und die Kovarianz als AΣAᵀ transformiert, passend zu den vorherigen Regeln für Erwartungswertvektoren und Kovarianzmatrizen."
        },
        {
            q: "For a multivariate normal vector, all marginal distributions are:",
            qDE: "Bei einem multivariaten Normalverteilungsvektor sind alle Randverteilungen:",
            opts: ["Univariate normal distributions", "Uniform distributions", "Exponential distributions", "Possibly non-normal"],
            optsDE: ["Univariate Normalverteilungen", "Gleichverteilungen", "Exponentialverteilungen", "Möglicherweise nicht normalverteilt"],
            correct: 0,
            explain: "Picking out any single component of a multivariate normal vector and integrating out the rest always leaves a univariate normal distribution — a defining property of the multivariate normal family.",
            explainDE: "Greift man eine einzelne Komponente eines multivariat normalverteilten Vektors heraus und integriert die übrigen aus, erhält man stets eine univariate Normalverteilung — eine charakteristische Eigenschaft der multivariaten Normalverteilungsfamilie."
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
            correct: 0,
            explain: "By definition, the sample mean sums all n observations and divides by their count — the standard way to summarize a batch of data with one number.",
            explainDE: "Per Definition summiert das arithmetische Mittel alle n Beobachtungen und teilt durch ihre Anzahl — die Standardmethode, einen Datensatz mit einer Zahl zusammenzufassen."
        },
        {
            q: "For i.i.d. random variables X₁, …, Xₙ with E[Xᵢ] = μ, what is E[X̄ₙ]?",
            qDE: "Für i.i.d. Zufallsvariablen X₁, …, Xₙ mit E[Xᵢ] = μ, was ist E[X̄ₙ]?",
            opts: ["μ", "μ / n", "n · μ", "0"],
            optsDE: ["μ", "μ / n", "n · μ", "0"],
            correct: 0,
            explain: "Since expectation is linear, averaging n variables that each have mean μ still gives a mean of μ — the sample mean is an unbiased estimator.",
            explainDE: "Da der Erwartungswert linear ist, ergibt der Mittelwert von n Variablen mit jeweils Erwartungswert μ wieder μ — das arithmetische Mittel ist ein erwartungstreuer Schätzer."
        },
        {
            q: "For i.i.d. random variables with variance σ², what is Var(X̄ₙ)?",
            qDE: "Für i.i.d. Zufallsvariablen mit Varianz σ², was ist Var(X̄ₙ)?",
            opts: ["σ² / n", "σ²", "σ² · n", "σ / n"],
            optsDE: ["σ² / n", "σ²", "σ² · n", "σ / n"],
            correct: 0,
            explain: "Averaging independent variables shrinks variance by a factor of n, since Var(sum) = n·σ² and dividing by n twice (once for each factor of the mean) leaves σ²/n.",
            explainDE: "Die Mittelung unabhängiger Variablen verringert die Varianz um den Faktor n, da Var(Summe) = n·σ² ist und die Division durch n (zweifach, da im Quadrat) σ²/n ergibt."
        },

        // --- Tschebyscheff-Ungleichung ---
        {
            q: "Chebyshev's inequality states that for any ε > 0:",
            qDE: "Die Tschebyscheff-Ungleichung besagt für beliebiges ε > 0:",
            opts: ["P(|X − μ| ≥ ε) ≤ Var(X) / ε²", "P(|X − μ| ≥ ε) ≤ E[X] / ε", "P(|X − μ| ≥ ε) ≥ Var(X) / ε²", "P(|X − μ| ≥ ε) = 1 / ε"],
            optsDE: ["P(|X − μ| ≥ ε) ≤ Var(X) / ε²", "P(|X − μ| ≥ ε) ≤ E[X] / ε", "P(|X − μ| ≥ ε) ≥ Var(X) / ε²", "P(|X − μ| ≥ ε) = 1 / ε"],
            correct: 0,
            explain: "Chebyshev's inequality bounds the probability of straying far from the mean using only the variance, without needing to know the full distribution.",
            explainDE: "Die Tschebyscheff-Ungleichung beschränkt die Wahrscheinlichkeit einer großen Abweichung vom Mittelwert allein mithilfe der Varianz, ohne die vollständige Verteilung zu kennen."
        },
        {
            q: "Chebyshev's inequality requires knowledge of which quantity to bound P(|X − μ| ≥ ε)?",
            qDE: "Die Tschebyscheff-Ungleichung benötigt welche Größe, um P(|X − μ| ≥ ε) zu beschränken?",
            opts: ["The variance Var(X)", "The full distribution of X", "The median of X", "The moment generating function"],
            optsDE: ["Die Varianz Var(X)", "Die vollständige Verteilung von X", "Den Median von X", "Die momenterzeugende Funktion"],
            correct: 0,
            explain: "Chebyshev's bound is built entirely from the variance — no other information about the shape of the distribution is needed or used.",
            explainDE: "Die Tschebyscheff-Schranke basiert ausschließlich auf der Varianz — keine weitere Information über die Form der Verteilung wird benötigt oder verwendet."
        },

        // --- Stochastische Konvergenz ---
        {
            q: "A sequence Xₙ converges in probability to X if:",
            qDE: "Eine Folge Xₙ konvergiert stochastisch gegen X, wenn:",
            opts: ["P(|Xₙ − X| ≥ ε) → 0 as n → ∞ for all ε > 0", "P(Xₙ = X) = 1 for all n", "E[Xₙ] → 0 for all n", "Var(Xₙ) → ∞"],
            optsDE: ["P(|Xₙ − X| ≥ ε) → 0 für n → ∞ für alle ε > 0", "P(Xₙ = X) = 1 für alle n", "E[Xₙ] → 0 für alle n", "Var(Xₙ) → ∞"],
            correct: 0,
            explain: "Convergence in probability means the chance of a large deviation from X shrinks to nothing as n grows, for any fixed tolerance ε.",
            explainDE: "Stochastische Konvergenz bedeutet, dass die Wahrscheinlichkeit einer großen Abweichung von X für wachsendes n gegen null geht, für jede feste Toleranz ε."
        },
        {
            q: "The notation Xₙ →ᵖ X means:",
            qDE: "Die Schreibweise Xₙ →ᵖ X bedeutet:",
            opts: ["Convergence in probability", "Almost sure convergence", "Convergence in distribution", "Convergence in mean square"],
            optsDE: ["Konvergenz in Wahrscheinlichkeit (stochastische Konvergenz)", "Fast sichere Konvergenz", "Konvergenz in Verteilung", "Konvergenz im quadratischen Mittel"],
            correct: 0,
            explain: "The superscript p in this notation is a standard shorthand indicating convergence in probability specifically, as opposed to other convergence modes.",
            explainDE: "Das hochgestellte p in dieser Notation ist eine übliche Abkürzung, die speziell stochastische Konvergenz kennzeichnet, im Unterschied zu anderen Konvergenzarten."
        },
        {
            q: "Which type of convergence is implied by almost sure convergence?",
            qDE: "Welche Konvergenzart wird durch fast sichere Konvergenz impliziert?",
            opts: ["Convergence in probability", "Convergence in distribution only", "No other type", "Mean square convergence"],
            optsDE: ["Stochastische Konvergenz", "Nur Konvergenz in Verteilung", "Keine andere Konvergenzart", "Konvergenz im quadratischen Mittel"],
            correct: 0,
            explain: "Almost sure convergence is the stronger notion, so it automatically guarantees the weaker convergence in probability, but the reverse implication doesn't hold.",
            explainDE: "Fast sichere Konvergenz ist der stärkere Begriff, daher garantiert sie automatisch die schwächere stochastische Konvergenz, die Umkehrung gilt jedoch nicht."
        },

        // --- Schwaches Gesetz der großen Zahlen ---
        {
            q: "The Weak Law of Large Numbers states that for i.i.d. variables with mean μ:",
            qDE: "Das schwache Gesetz der großen Zahlen besagt für i.i.d. Variablen mit Erwartungswert μ:",
            opts: ["X̄ₙ →ᵖ μ as n → ∞", "X̄ₙ → 0 as n → ∞", "X̄ₙ = μ for all n", "X̄ₙ →ᵃ·ˢ· μ"],
            optsDE: ["X̄ₙ →ᵖ μ für n → ∞", "X̄ₙ → 0 für n → ∞", "X̄ₙ = μ für alle n", "X̄ₙ →ᵃ·ˢ· μ"],
            correct: 0,
            explain: "The Weak Law says the sample mean converges in probability to the true mean μ as more data is collected, even though any single sample could still deviate.",
            explainDE: "Das schwache Gesetz besagt, dass das arithmetische Mittel mit wachsender Datenmenge stochastisch gegen den wahren Erwartungswert μ konvergiert, auch wenn eine einzelne Stichprobe noch abweichen kann."
        },
        {
            q: "The Weak Law of Large Numbers guarantees convergence in which sense?",
            qDE: "Das schwache Gesetz der großen Zahlen garantiert Konvergenz in welchem Sinne?",
            opts: ["In probability", "Almost surely", "In distribution only", "In the L² sense only"],
            optsDE: ["In Wahrscheinlichkeit (stochastisch)", "Fast sicher", "Nur in Verteilung", "Nur im L²-Sinne"],
            correct: 0,
            explain: "The Weak Law specifically establishes convergence in probability — a weaker guarantee than almost sure convergence, which the Strong Law provides instead.",
            explainDE: "Das schwache Gesetz begründet speziell stochastische Konvergenz — eine schwächere Garantie als die fast sichere Konvergenz, die stattdessen das starke Gesetz liefert."
        },
        {
            q: "Which condition is sufficient to prove the Weak Law via Chebyshev's inequality?",
            qDE: "Welche Bedingung reicht aus, um das schwache Gesetz mittels Tschebyscheff zu beweisen?",
            opts: ["Finite variance σ² < ∞", "The distribution must be normal", "The variables must be bounded", "The mean must be zero"],
            optsDE: ["Endliche Varianz σ² < ∞", "Die Verteilung muss normal sein", "Die Variablen müssen beschränkt sein", "Der Erwartungswert muss null sein"],
            correct: 0,
            explain: "Chebyshev's inequality needs only a finite variance to bound the probability of deviation, which is exactly the ingredient needed to prove the Weak Law.",
            explainDE: "Die Tschebyscheff-Ungleichung benötigt nur eine endliche Varianz, um die Abweichungswahrscheinlichkeit zu beschränken — genau die Zutat, die für den Beweis des schwachen Gesetzes nötig ist."
        },

        // --- Starkes Gesetz der großen Zahlen ---
        {
            q: "The Strong Law of Large Numbers states that X̄ₙ converges to μ:",
            qDE: "Das starke Gesetz der großen Zahlen besagt, dass X̄ₙ gegen μ konvergiert:",
            opts: ["Almost surely (with probability 1)", "In probability only", "In distribution only", "For finitely many n"],
            optsDE: ["Fast sicher (mit Wahrscheinlichkeit 1)", "Nur in Wahrscheinlichkeit", "Nur in Verteilung", "Für endlich viele n"],
            correct: 0,
            explain: "The Strong Law makes the stronger claim that the sample mean converges to μ with probability 1 — not just that large deviations become unlikely, but that the sequence actually settles on μ.",
            explainDE: "Das starke Gesetz trifft die stärkere Aussage, dass das arithmetische Mittel mit Wahrscheinlichkeit 1 gegen μ konvergiert — nicht nur, dass große Abweichungen unwahrscheinlich werden, sondern dass die Folge tatsächlich bei μ landet."
        },
        {
            q: "The Strong Law is a stronger statement than the Weak Law because:",
            qDE: "Das starke Gesetz ist eine stärkere Aussage als das schwache, weil:",
            opts: ["Almost sure convergence implies convergence in probability, but not vice versa", "It requires fewer assumptions", "It applies to dependent variables", "It only works for symmetric distributions"],
            optsDE: ["Fast sichere Konvergenz impliziert stochastische Konvergenz, aber nicht umgekehrt", "Es weniger Voraussetzungen braucht", "Es für abhängige Variablen gilt", "Es nur für symmetrische Verteilungen gilt"],
            correct: 0,
            explain: "Almost sure convergence is a strictly stronger property than convergence in probability, which is what makes the Strong Law a more powerful statement than the Weak Law.",
            explainDE: "Fast sichere Konvergenz ist eine strikt stärkere Eigenschaft als stochastische Konvergenz, was das starke Gesetz zu einer stärkeren Aussage macht als das schwache."
        },
        {
            q: "Almost sure convergence Xₙ →ᵃ·ˢ· X means:",
            qDE: "Fast sichere Konvergenz Xₙ →ᵃ·ˢ· X bedeutet:",
            opts: ["P(lim_{n→∞} Xₙ = X) = 1", "P(|Xₙ − X| ≥ ε) → 0 for all ε > 0", "E[Xₙ] → E[X]", "Xₙ = X for all large n with high probability"],
            optsDE: ["P(lim_{n→∞} Xₙ = X) = 1", "P(|Xₙ − X| ≥ ε) → 0 für alle ε > 0", "E[Xₙ] → E[X]", "Xₙ = X für alle großen n mit hoher Wahrscheinlichkeit"],
            correct: 0,
            explain: "Almost sure convergence means the set of outcomes where the sequence actually converges to X has probability 1 — convergence happens for essentially every realization.",
            explainDE: "Fast sichere Konvergenz bedeutet, dass die Menge der Ausgänge, bei denen die Folge tatsächlich gegen X konvergiert, Wahrscheinlichkeit 1 hat — Konvergenz tritt für praktisch jede Realisierung ein."
        },

        // --- Fast sichere Konvergenz ---
        {
            q: "Almost sure convergence is also called:",
            qDE: "Fast sichere Konvergenz wird auch genannt:",
            opts: ["Convergence with probability 1", "Weak convergence", "Convergence in measure", "L¹ convergence"],
            optsDE: ["Konvergenz mit Wahrscheinlichkeit 1", "Schwache Konvergenz", "Konvergenz im Maß", "L¹-Konvergenz"],
            correct: 0,
            explain: "This is simply the alternate name for almost sure convergence, emphasizing that the convergence event itself has full probability.",
            explainDE: "Dies ist lediglich die alternative Bezeichnung für fast sichere Konvergenz, die betont, dass das Konvergenzereignis selbst die volle Wahrscheinlichkeit besitzt."
        },
        {
            q: "Which convergence concept is used in the Strong Law of Large Numbers?",
            qDE: "Welcher Konvergenzbegriff wird im starken Gesetz der großen Zahlen verwendet?",
            opts: ["Almost sure convergence", "Convergence in probability", "Convergence in distribution", "Convergence in L²"],
            optsDE: ["Fast sichere Konvergenz", "Stochastische Konvergenz", "Konvergenz in Verteilung", "Konvergenz in L²"],
            correct: 0,
            explain: "The Strong Law's defining feature is that it uses almost sure convergence, which is what distinguishes it from the Weak Law's convergence in probability.",
            explainDE: "Das entscheidende Merkmal des starken Gesetzes ist die Verwendung der fast sicheren Konvergenz, wodurch es sich von der stochastischen Konvergenz des schwachen Gesetzes unterscheidet."
        },
        {
            q: "If Xₙ → X almost surely, which of the following is guaranteed?",
            qDE: "Wenn Xₙ → X fast sicher gilt, was ist dann garantiert?",
            opts: ["Xₙ →ᵖ X (convergence in probability)", "Xₙ = X for all n ≥ 1", "E[Xₙ] → E[X] in all cases", "Var(Xₙ) → 0"],
            optsDE: ["Xₙ →ᵖ X (stochastische Konvergenz)", "Xₙ = X für alle n ≥ 1", "E[Xₙ] → E[X] in allen Fällen", "Var(Xₙ) → 0"],
            correct: 0,
            explain: "Because almost sure convergence is strictly stronger, it always guarantees convergence in probability as a consequence, even though the converse isn't true.",
            explainDE: "Da fast sichere Konvergenz strikt stärker ist, garantiert sie stets auch die stochastische Konvergenz als Folge, auch wenn die Umkehrung nicht gilt."
        },

        // --- Hauptsatz der Statistik (Glivenko-Cantelli) ---
        {
            q: "The Fundamental Theorem of Statistics states that the empirical distribution function F̂ₙ(x):",
            qDE: "Der Hauptsatz der Statistik besagt, dass die empirische Verteilungsfunktion F̂ₙ(x):",
            opts: ["Converges almost surely to the true distribution function F(x) uniformly in x", "Converges to 0 for all x", "Equals F(x) for all n", "Only converges at the median"],
            optsDE: ["Fast sicher gleichmäßig in x gegen die wahre Verteilungsfunktion F(x) konvergiert", "Für alle x gegen 0 konvergiert", "Für alle n gleich F(x) ist", "Nur am Median konvergiert"],
            correct: 0,
            explain: "The Glivenko–Cantelli theorem guarantees that the empirical distribution function converges almost surely and uniformly to the true distribution as sample size grows.",
            explainDE: "Der Satz von Glivenko-Cantelli garantiert, dass die empirische Verteilungsfunktion mit wachsendem Stichprobenumfang fast sicher und gleichmäßig gegen die wahre Verteilung konvergiert."
        },
        {
            q: "The empirical distribution function F̂ₙ(x) based on n i.i.d. observations is defined as:",
            qDE: "Die empirische Verteilungsfunktion F̂ₙ(x) basierend auf n i.i.d. Beobachtungen ist definiert als:",
            opts: ["(number of observations ≤ x) / n", "P(X ≤ x)", "The density evaluated at x", "(number of observations = x) / n"],
            optsDE: ["(Anzahl der Beobachtungen ≤ x) / n", "P(X ≤ x)", "Die Dichte ausgewertet an der Stelle x", "(Anzahl der Beobachtungen = x) / n"],
            correct: 0,
            explain: "The empirical distribution function simply counts the fraction of your sample that falls at or below x, giving a step-function estimate of the true F(x).",
            explainDE: "Die empirische Verteilungsfunktion zählt einfach den Anteil der Stichprobe, der bei oder unterhalb von x liegt, und liefert so eine Treppenfunktions-Schätzung der wahren Verteilungsfunktion F(x)."
        },
        {
            q: "The Fundamental Theorem of Statistics implies that sup_x |F̂ₙ(x) − F(x)| converges:",
            qDE: "Der Hauptsatz der Statistik impliziert, dass sup_x |F̂ₙ(x) − F(x)| konvergiert:",
            opts: ["To 0 almost surely as n → ∞", "To 1 as n → ∞", "To σ² as n → ∞", "To a normal distribution"],
            optsDE: ["Fast sicher gegen 0 für n → ∞", "Gegen 1 für n → ∞", "Gegen σ² für n → ∞", "Gegen eine Normalverteilung"],
            correct: 0,
            explain: "The uniform convergence in the Fundamental Theorem means the worst-case gap between empirical and true distribution — measured by the supremum — vanishes almost surely.",
            explainDE: "Die gleichmäßige Konvergenz im Hauptsatz der Statistik bedeutet, dass die größte Abweichung zwischen empirischer und wahrer Verteilung — gemessen durch das Supremum — fast sicher verschwindet."
        },

        // --- Zentraler Grenzwertsatz ---
        {
            q: "The Central Limit Theorem states that (X̄ₙ − μ) / (σ/√n) converges in distribution to:",
            qDE: "Der Zentrale Grenzwertsatz besagt, dass (X̄ₙ − μ) / (σ/√n) in Verteilung konvergiert gegen:",
            opts: ["N(0, 1)", "N(μ, σ²)", "Exp(1)", "U(0, 1)"],
            optsDE: ["N(0, 1)", "N(μ, σ²)", "Exp(1)", "U(0, 1)"],
            correct: 0,
            explain: "The Central Limit Theorem shows that after standardizing the sample mean by its own standard deviation, its distribution approaches the standard normal, regardless of the original shape.",
            explainDE: "Der Zentrale Grenzwertsatz zeigt, dass sich die Verteilung des standardisierten arithmetischen Mittels der Standardnormalverteilung annähert, unabhängig von der ursprünglichen Form."
        },
        {
            q: "The Central Limit Theorem applies regardless of the underlying distribution, provided that:",
            qDE: "Der Zentrale Grenzwertsatz gilt unabhängig von der Verteilung der Xᵢ, sofern:",
            opts: ["The variables are i.i.d. with finite variance", "The variables follow a normal distribution", "The sample size n is exactly 30", "The variables are discrete"],
            optsDE: ["Die Variablen i.i.d. mit endlicher Varianz sind", "Die Variablen normalverteilt sind", "Der Stichprobenumfang n genau 30 beträgt", "Die Variablen diskret sind"],
            correct: 0,
            explain: "The remarkable power of the CLT is that it holds for i.i.d. variables from almost any distribution, as long as the variance is finite — no normality assumption needed.",
            explainDE: "Die bemerkenswerte Stärke des ZGS liegt darin, dass er für i.i.d. Variablen aus fast jeder Verteilung gilt, solange die Varianz endlich ist — keine Normalverteilungsannahme nötig."
        },
        {
            q: "The Central Limit Theorem is used to approximate probabilities about X̄ₙ. Which distribution is used?",
            qDE: "Der Zentrale Grenzwertsatz wird zur Approximation von Wahrscheinlichkeiten über X̄ₙ genutzt. Welche Verteilung wird verwendet?",
            opts: ["Normal distribution N(μ, σ²/n)", "Poisson distribution with λ = μ", "Exponential distribution Exp(μ)", "Uniform distribution U(0, μ)"],
            optsDE: ["Normalverteilung N(μ, σ²/n)", "Poisson-Verteilung mit λ = μ", "Exponentialverteilung Exp(μ)", "Gleichverteilung U(0, μ)"],
            correct: 0,
            explain: "To approximate probabilities for the sample mean in practice, the CLT lets us treat X̄ₙ as approximately normal with mean μ and variance σ²/n.",
            explainDE: "Um in der Praxis Wahrscheinlichkeiten für das arithmetische Mittel zu approximieren, erlaubt der ZGS, X̄ₙ als näherungsweise normalverteilt mit Erwartungswert μ und Varianz σ²/n zu behandeln."
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
            correct: 0,
            explain: "Inferential statistics goes beyond just summarizing the sample at hand — its purpose is to use that sample to say something about the larger population it came from.",
            explainDE: "Die schließende Statistik geht über die reine Zusammenfassung der vorliegenden Stichprobe hinaus — ihr Zweck ist es, anhand dieser Stichprobe etwas über die größere Grundgesamtheit auszusagen, aus der sie stammt."
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
            correct: 0,
            explain: "Modelling is the step where we decide on a plausible distributional family for the data, before we can even think about estimating parameters or testing hypotheses within it.",
            explainDE: "Die Modellierung ist der Schritt, in dem eine plausible Verteilungsfamilie für die Daten festgelegt wird, bevor überhaupt Parameter geschätzt oder Hypothesen innerhalb dieser Familie getestet werden können."
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
            correct: 0,
            explain: "Turning data into a concrete numerical approximation of an unknown parameter is precisely what estimation means, as opposed to choosing a model or testing a hypothesis.",
            explainDE: "Daten in eine konkrete numerische Näherung eines unbekannten Parameters zu überführen, ist genau das, was Schätzen bedeutet, im Unterschied zur Modellwahl oder zum Testen einer Hypothese."
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
            correct: 0,
            explain: "Checking whether a fitted model actually fits the data well, rather than estimating parameters within it, is the job of model validation.",
            explainDE: "Zu prüfen, ob ein angepasstes Modell tatsächlich gut zu den Daten passt, anstatt Parameter innerhalb des Modells zu schätzen, ist die Aufgabe der Modellvalidierung."
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
            correct: 0,
            explain: "Descriptive statistics stays within the observed data, summarizing it, while inferential statistics uses that data as a stepping stone to conclusions about the wider population.",
            explainDE: "Die beschreibende Statistik bleibt innerhalb der beobachteten Daten und fasst sie zusammen, während die schließende Statistik diese Daten als Sprungbrett für Rückschlüsse auf die größere Grundgesamtheit nutzt."
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
            correct: 0,
            explain: "The sample size simply counts how many individual data points were actually collected, regardless of how large the underlying population or parameter space might be.",
            explainDE: "Der Stichprobenumfang zählt schlicht, wie viele einzelne Datenpunkte tatsächlich erhoben wurden, unabhängig davon, wie groß die zugrunde liegende Grundgesamtheit oder der Parameterraum ist."
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
            correct: 0,
            explain: "The sample space describes what a single observation could possibly look like — it's a property of the data, not to be confused with the parameter space, which concerns the unknown parameter.",
            explainDE: "Der Stichprobenraum beschreibt, wie eine einzelne Beobachtung möglicherweise aussehen könnte — er ist eine Eigenschaft der Daten und nicht mit dem Parameterraum zu verwechseln, der den unbekannten Parameter betrifft."
        },
        {
            q: "We record whether each of 50 patients recovers (yes/no). What is the sample space for a single observation?",
            qDE: "Wir erfassen, ob jeder der 50 Patienten sich erholt (ja/nein). Was ist der Stichprobenraum für eine einzelne Beobachtung?",
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
            correct: 0,
            explain: "Since each single patient's outcome can only be yes or no, the sample space for one observation is exactly these two possible values — the 50 only matters for the overall sample size.",
            explainDE: "Da das Ergebnis eines einzelnen Patienten nur ja oder nein sein kann, besteht der Stichprobenraum für eine Beobachtung genau aus diesen zwei möglichen Werten — die 50 spielt nur für den gesamten Stichprobenumfang eine Rolle."
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
            correct: 0,
            explain: "The standard i.i.d. assumption treats each observation as coming independently from the same underlying distribution, which is what makes tools like the law of large numbers and the CLT applicable.",
            explainDE: "Die übliche i.i.d.-Annahme behandelt jede Beobachtung als unabhängig aus derselben zugrunde liegenden Verteilung stammend, was Werkzeuge wie das Gesetz der großen Zahlen und den ZGS überhaupt erst anwendbar macht."
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
            correct: 0,
            explain: "A parametric model doesn't pin down one exact distribution; instead it specifies a whole family of candidate distributions, with the unknown parameter determining which member of the family applies.",
            explainDE: "Ein parametrisches Modell legt keine einzelne exakte Verteilung fest, sondern beschreibt eine ganze Familie von Kandidatenverteilungen, wobei der unbekannte Parameter bestimmt, welches Mitglied der Familie zutrifft."
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
            correct: 0,
            explain: "The parameter space defines the range of legitimate values the unknown parameter could take, keeping it distinct from the sample space, which concerns the data itself.",
            explainDE: "Der Parameterraum legt den Bereich zulässiger Werte fest, die der unbekannte Parameter annehmen kann, und ist damit klar vom Stichprobenraum zu unterscheiden, der die Daten selbst betrifft."
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
            correct: 0,
            explain: "Since a normal distribution's mean can in principle be any real number, with no positivity or boundedness restriction, the parameter space for μ here is all of ℝ.",
            explainDE: "Da der Erwartungswert einer Normalverteilung grundsätzlich jede reelle Zahl sein kann, ohne Positivitäts- oder Beschränktheitsbedingung, ist der Parameterraum für μ hier ganz ℝ."
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
            correct: 0,
            explain: "This is a reminder that all inference happens within an assumed model family — pick a different family and the estimates, tests, and conclusions can genuinely differ, even from the same data.",
            explainDE: "Dies zeigt, dass jede Inferenz innerhalb einer angenommenen Modellfamilie stattfindet — wählt man eine andere Familie, können sich Schätzungen, Tests und Schlussfolgerungen selbst bei denselben Daten tatsächlich unterscheiden."
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
            correct: 0,
            explain: "A statistic must be computable from the data alone — if it required knowing the unknown parameter to evaluate it, it wouldn't be usable in practice as a summary or estimator.",
            explainDE: "Eine Statistik muss allein aus den Daten berechenbar sein — würde man zu ihrer Berechnung den unbekannten Parameter benötigen, wäre sie in der Praxis als Zusammenfassung oder Schätzer nicht nutzbar."
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
            correct: 0,
            explain: "Since an estimator is a function of the sample, and the sample itself is random, a new dataset would generally produce a different estimator value — making the estimator itself random.",
            explainDE: "Da ein Schätzer eine Funktion der Stichprobe ist und die Stichprobe selbst zufällig ist, würde ein neuer Datensatz im Allgemeinen einen anderen Schätzerwert liefern — der Schätzer selbst ist somit zufällig."
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
            correct: 0,
            explain: "Unbiasedness is a statement about the average behavior over repeated sampling — the estimator's expected value hits the true parameter, even though any single estimate can still miss it.",
            explainDE: "Erwartungstreue ist eine Aussage über das durchschnittliche Verhalten bei wiederholter Stichprobenziehung — der Erwartungswert des Schätzers trifft den wahren Parameter, auch wenn ein einzelner Schätzwert davon abweichen kann."
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
            correct: 0,
            explain: "The estimator is the formula or procedure applied to any sample, while the estimate is just the concrete number that comes out once actual observed data is plugged in.",
            explainDE: "Der Schätzer ist die Formel bzw. das Verfahren, das auf eine beliebige Stichprobe angewendet wird, während der Schätzwert die konkrete Zahl ist, die sich nach Einsetzen der tatsächlich beobachteten Daten ergibt."
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
            correct: 0,
            explain: "By definition, the empirical distribution function at x is just the proportion of the sample lying at or below x, giving a data-based stand-in for the true cumulative distribution.",
            explainDE: "Per Definition ist die empirische Verteilungsfunktion an der Stelle x einfach der Anteil der Stichprobe, der bei oder unterhalb von x liegt, und liefert so einen datenbasierten Ersatz für die wahre Verteilungsfunktion."
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
            correct: 0,
            explain: "Two of the four observations (2 and 4) are less than or equal to 4, so the empirical distribution function evaluates to 2/4 = 0.5 at that point.",
            explainDE: "Zwei der vier Beobachtungen (2 und 4) sind kleiner oder gleich 4, daher ergibt die empirische Verteilungsfunktion an dieser Stelle 2/4 = 0,5."
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
            correct: 0,
            explain: "Since the true distribution function is unknown, the empirical distribution function built from the sample serves as a natural, data-driven estimator for it.",
            explainDE: "Da die wahre Verteilungsfunktion unbekannt ist, dient die aus der Stichprobe gebildete empirische Verteilungsfunktion als naheliegender, datengetriebener Schätzer für sie."
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
            correct: 0,
            explain: "This is exactly the content of the Glivenko-Cantelli theorem covered earlier: with more data, the empirical distribution function tracks the true distribution ever more closely.",
            explainDE: "Dies ist genau der Inhalt des zuvor behandelten Satzes von Glivenko-Cantelli: Mit mehr Daten nähert sich die empirische Verteilungsfunktion der wahren Verteilung immer weiter an."
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
            correct: 0,
            explain: "The likelihood flips the usual perspective: instead of asking how probable θ is, it fixes the observed data and asks how probable that data would be for each candidate value of θ.",
            explainDE: "Die Likelihood kehrt die übliche Sichtweise um: Statt zu fragen, wie wahrscheinlich θ ist, hält sie die beobachteten Daten fest und fragt, wie wahrscheinlich diese Daten für jeden möglichen Wert von θ wären."
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
            correct: 0,
            explain: "The maximum likelihood principle picks out whichever parameter value makes the data we actually observed as probable as possible, rather than optimizing variance or any other criterion.",
            explainDE: "Das Maximum-Likelihood-Prinzip wählt genau den Parameterwert, der die tatsächlich beobachteten Daten so wahrscheinlich wie möglich macht, statt Varianz oder ein anderes Kriterium zu optimieren."
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
            correct: 0,
            explain: "For a Bernoulli model, the MLE for p is simply the observed relative frequency of successes, so 7 heads out of 10 flips gives p̂ = 0.7.",
            explainDE: "Für ein Bernoulli-Modell ist der ML-Schätzer für p schlicht die beobachtete relative Häufigkeit der Erfolge, sodass 7 Kopf bei 10 Würfen p̂ = 0,7 ergibt."
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
            correct: 0,
            explain: "The likelihood principle asserts that the likelihood function alone summarizes everything the data can tell us about the parameter — no additional information from the data is relevant beyond it.",
            explainDE: "Das Likelihood-Prinzip besagt, dass allein die Likelihood-Funktion alles zusammenfasst, was die Daten über den Parameter aussagen können — keine weitere Information aus den Daten ist darüber hinaus relevant."
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
            correct: 0,
            explain: "Since the likelihood of i.i.d. data is a product of many terms, taking logs converts it into a sum, which is far simpler to differentiate and maximize while leaving the location of the maximum unchanged.",
            explainDE: "Da die Likelihood bei i.i.d. Daten ein Produkt vieler Terme ist, wandelt der Logarithmus dieses in eine Summe um, die sich viel leichter ableiten und maximieren lässt, ohne die Lage des Maximums zu verändern."
        },

    ],



    // WORLD 9
    // WORLD 9
    9: [

        // --- Erwartungstreue Schätzer / Bias ---
        {
            q: "An estimator θ̂ for a parameter θ is called unbiased if:",
            qDE: "Ein Schätzer θ̂ für einen Parameter θ heißt erwartungstreu, wenn:",
            opts: ["E[θ̂] = θ for all θ in the parameter space", "θ̂ = θ with probability 1", "Var(θ̂) = 0", "E[θ̂] = 0"],
            optsDE: ["E[θ̂] = θ für alle θ im Parameterraum", "θ̂ = θ mit Wahrscheinlichkeit 1", "Var(θ̂) = 0", "E[θ̂] = 0"],
            correct: 0,
            explain: "Unbiasedness requires the estimator's expected value to hit the true parameter for every possible value in the parameter space, not just for one particular θ.",
            explainDE: "Erwartungstreue verlangt, dass der Erwartungswert des Schätzers den wahren Parameter für jeden möglichen Wert im Parameterraum trifft, nicht nur für ein bestimmtes θ."
        },
        {
            q: "The bias of an estimator θ̂ for θ is defined as:",
            qDE: "Der Bias eines Schätzers θ̂ für θ ist definiert als:",
            opts: ["Bias(θ̂) = E[θ̂] − θ", "Bias(θ̂) = θ − θ̂", "Bias(θ̂) = Var(θ̂)", "Bias(θ̂) = E[θ̂²] − θ²"],
            optsDE: ["Bias(θ̂) = E[θ̂] − θ", "Bias(θ̂) = θ − θ̂", "Bias(θ̂) = Var(θ̂)", "Bias(θ̂) = E[θ̂²] − θ²"],
            correct: 0,
            explain: "The bias measures the systematic gap between what the estimator gives on average and the true parameter value, so it's defined as the expected value minus θ.",
            explainDE: "Der Bias misst die systematische Abweichung zwischen dem durchschnittlichen Wert des Schätzers und dem wahren Parameterwert, weshalb er als Erwartungswert minus θ definiert ist."
        },
        {
            q: "If g(θ) is a function of the parameter θ, an estimator T for g(θ) is unbiased if:",
            qDE: "Wenn g(θ) eine Funktion des Parameters θ ist, heißt ein Schätzer T für g(θ) erwartungstreu, wenn:",
            opts: ["E[T] = g(θ) for all θ", "E[T] = θ for all θ", "T = g(θ) always", "Var(T) = g(θ)"],
            optsDE: ["E[T] = g(θ) für alle θ", "E[T] = θ für alle θ", "T = g(θ) immer", "Var(T) = g(θ)"],
            correct: 0,
            explain: "Unbiasedness is always relative to the target being estimated — if the target is g(θ) rather than θ itself, the expectation of T must match g(θ), not θ.",
            explainDE: "Erwartungstreue bezieht sich immer auf die zu schätzende Zielgröße — ist das Ziel g(θ) statt θ selbst, muss der Erwartungswert von T mit g(θ) übereinstimmen, nicht mit θ."
        },
        {
            q: "If X̄ₙ is unbiased for μ, is X̄ₙ² generally unbiased for μ²?",
            qDE: "Wenn X̄ₙ erwartungstreu für μ ist, ist X̄ₙ² im Allgemeinen erwartungstreu für μ²?",
            opts: ["No, because E[X̄ₙ²] = μ² + Var(X̄ₙ) ≠ μ² in general", "Yes, always", "Yes, but only if μ = 0", "No, because X̄ₙ is never unbiased"],
            optsDE: ["Nein, denn E[X̄ₙ²] = μ² + Var(X̄ₙ) ≠ μ² im Allgemeinen", "Ja, immer", "Ja, aber nur wenn μ = 0", "Nein, denn X̄ₙ ist nie erwartungstreu"],
            correct: 0,
            explain: "Unbiasedness does not transfer through nonlinear transformations — squaring introduces an extra Var(X̄ₙ) term, so X̄ₙ² is biased upward for μ² unless the variance happens to vanish.",
            explainDE: "Erwartungstreue überträgt sich nicht durch nichtlineare Transformationen — das Quadrieren führt einen zusätzlichen Var(X̄ₙ)-Term ein, sodass X̄ₙ² für μ² nach oben verzerrt ist, außer die Varianz verschwindet zufällig."
        },
        {
            q: "The sample variance S²ₙ = (1/(n−1))∑(Xᵢ − X̄ₙ)² is used instead of (1/n)∑(Xᵢ − X̄ₙ)² because:",
            qDE: "Die Stichprobenvarianz S²ₙ = (1/(n−1))∑(Xᵢ − X̄ₙ)² wird anstelle von (1/n)∑(Xᵢ − X̄ₙ)² verwendet, weil:",
            opts: ["Dividing by (n−1) makes S²ₙ an unbiased estimator of σ²", "It always gives a smaller value", "It is easier to compute", "It removes the need for X̄ₙ"],
            optsDE: ["Die Division durch (n−1) macht S²ₙ zu einem erwartungstreuen Schätzer für σ²", "Es liefert stets einen kleineren Wert", "Es ist einfacher zu berechnen", "Dadurch entfällt die Notwendigkeit von X̄ₙ"],
            correct: 0,
            explain: "Dividing by n instead of n−1 systematically underestimates σ² because using X̄ₙ instead of the true μ removes one degree of freedom; correcting for this with (n−1) restores unbiasedness.",
            explainDE: "Die Division durch n statt n−1 unterschätzt σ² systematisch, da die Verwendung von X̄ₙ anstelle des wahren μ einen Freiheitsgrad kostet; die Korrektur mit (n−1) stellt die Erwartungstreue wieder her."
        },

        // --- Asymptotische Erwartungstreue ---
        {
            q: "An estimator θ̂ₙ is asymptotically unbiased if:",
            qDE: "Ein Schätzer θ̂ₙ heißt asymptotisch erwartungstreu, wenn:",
            opts: ["lim_{n→∞} E[θ̂ₙ] = θ", "E[θ̂ₙ] = θ for every n", "Var(θ̂ₙ) → 0 as n → ∞", "θ̂ₙ → θ almost surely"],
            optsDE: ["lim_{n→∞} E[θ̂ₙ] = θ", "E[θ̂ₙ] = θ für jedes n", "Var(θ̂ₙ) → 0 für n → ∞", "θ̂ₙ → θ fast sicher"],
            correct: 0,
            explain: "Asymptotic unbiasedness is a weaker, limiting version of unbiasedness: the bias doesn't have to vanish for every finite n, only as n grows without bound.",
            explainDE: "Asymptotische Erwartungstreue ist eine schwächere, im Grenzwert geltende Version der Erwartungstreue: Der Bias muss nicht für jedes endliche n verschwinden, sondern nur für wachsendes n."
        },
        {
            q: "The biased variance estimator (1/n)∑(Xᵢ − X̄ₙ)² is asymptotically unbiased for σ² because:",
            qDE: "Der verzerrte Varianzschätzer (1/n)∑(Xᵢ − X̄ₙ)² ist asymptotisch erwartungstreu für σ², weil:",
            opts: ["Its bias, proportional to −σ²/n, vanishes as n → ∞", "Its variance is always zero", "It equals S²ₙ for all n", "It never converges"],
            optsDE: ["Sein Bias, proportional zu −σ²/n, verschwindet für n → ∞", "Seine Varianz ist stets null", "Es ist für alle n gleich S²ₙ", "Es konvergiert nie"],
            correct: 0,
            explain: "The gap between this estimator and the unbiased S²ₙ shrinks like 1/n, so while the bias is present for any finite sample, it disappears in the limit as n → ∞.",
            explainDE: "Die Lücke zwischen diesem Schätzer und dem erwartungstreuen S²ₙ schrumpft wie 1/n, sodass der Bias zwar für jede endliche Stichprobe vorhanden ist, im Grenzwert n → ∞ jedoch verschwindet."
        },
        {
            q: "An estimator that is unbiased for every finite n is automatically:",
            qDE: "Ein Schätzer, der für jedes endliche n erwartungstreu ist, ist automatisch:",
            opts: ["Asymptotically unbiased as well", "Consistent", "Efficient", "MSE-efficient"],
            optsDE: ["Auch asymptotisch erwartungstreu", "Konsistent", "Effizient", "MSE-effizient"],
            correct: 0,
            explain: "If the bias is exactly zero for every n, its limit as n → ∞ is trivially zero too, so exact unbiasedness always implies asymptotic unbiasedness — the reverse is not guaranteed.",
            explainDE: "Ist der Bias für jedes n exakt null, so ist auch sein Grenzwert für n → ∞ trivialerweise null — exakte Erwartungstreue impliziert also stets asymptotische Erwartungstreue, die Umkehrung gilt aber nicht."
        },

        // --- MSE und Zerlegung ---
        {
            q: "The Mean Squared Error (MSE) of an estimator θ̂ for θ is defined as:",
            qDE: "Der mittlere quadratische Fehler (MSE) eines Schätzers θ̂ für θ ist definiert als:",
            opts: ["MSE(θ̂) = E[(θ̂ − θ)²]", "MSE(θ̂) = E[θ̂] − θ", "MSE(θ̂) = Var(θ̂) · Bias(θ̂)", "MSE(θ̂) = E[θ̂²]"],
            optsDE: ["MSE(θ̂) = E[(θ̂ − θ)²]", "MSE(θ̂) = E[θ̂] − θ", "MSE(θ̂) = Var(θ̂) · Bias(θ̂)", "MSE(θ̂) = E[θ̂²]"],
            correct: 0,
            explain: "The MSE captures overall estimation error by averaging the squared distance between the estimator and the true parameter, combining both bias and variability into one number.",
            explainDE: "Der MSE erfasst den Gesamtschätzfehler, indem er die quadrierte Distanz zwischen Schätzer und wahrem Parameter mittelt, und vereint so Bias und Streuung in einer einzigen Kennzahl."
        },
        {
            q: "The bias-variance decomposition of the MSE states that MSE(θ̂) equals:",
            qDE: "Die Bias-Varianz-Zerlegung des MSE besagt, dass MSE(θ̂) gleich ist:",
            opts: ["Var(θ̂) + Bias(θ̂)²", "Var(θ̂) − Bias(θ̂)²", "Var(θ̂) · Bias(θ̂)", "Var(θ̂) + Bias(θ̂)"],
            optsDE: ["Var(θ̂) + Bias(θ̂)²", "Var(θ̂) − Bias(θ̂)²", "Var(θ̂) · Bias(θ̂)", "Var(θ̂) + Bias(θ̂)"],
            correct: 0,
            explain: "Expanding E[(θ̂ − θ)²] algebraically separates the total error into a variance term and a squared-bias term, both of which contribute positively and must be added together.",
            explainDE: "Das algebraische Ausmultiplizieren von E[(θ̂ − θ)²] trennt den Gesamtfehler in einen Varianzterm und einen quadrierten Bias-Term auf, die beide positiv beitragen und addiert werden müssen."
        },
        {
            q: "If an estimator θ̂ is unbiased, its MSE simplifies to:",
            qDE: "Wenn ein Schätzer θ̂ erwartungstreu ist, vereinfacht sich sein MSE zu:",
            opts: ["MSE(θ̂) = Var(θ̂)", "MSE(θ̂) = 0", "MSE(θ̂) = Bias(θ̂)²", "MSE(θ̂) = E[θ̂]"],
            optsDE: ["MSE(θ̂) = Var(θ̂)", "MSE(θ̂) = 0", "MSE(θ̂) = Bias(θ̂)²", "MSE(θ̂) = E[θ̂]"],
            correct: 0,
            explain: "When Bias(θ̂) = 0, the squared-bias term in the decomposition drops out entirely, leaving only the variance as the source of the estimator's error.",
            explainDE: "Wenn Bias(θ̂) = 0 ist, entfällt der quadrierte Bias-Term in der Zerlegung vollständig, sodass nur die Varianz als Fehlerquelle des Schätzers übrig bleibt."
        },
        {
            q: "An estimator with Bias(θ̂) = 2 and Var(θ̂) = 3 has MSE(θ̂) equal to:",
            qDE: "Ein Schätzer mit Bias(θ̂) = 2 und Var(θ̂) = 3 hat einen MSE(θ̂) von:",
            opts: ["7", "5", "6", "9"],
            optsDE: ["7", "5", "6", "9"],
            correct: 0,
            explain: "Applying the decomposition MSE = Var + Bias² gives 3 + 2² = 3 + 4 = 7.",
            explainDE: "Die Anwendung der Zerlegung MSE = Var + Bias² ergibt 3 + 2² = 3 + 4 = 7."
        },
        {
            q: "A biased estimator can have a lower MSE than an unbiased one because:",
            qDE: "Ein verzerrter Schätzer kann einen niedrigeren MSE als ein erwartungstreuer haben, weil:",
            opts: ["A small increase in bias² can be offset by a larger reduction in variance", "Bias always reduces variance to zero", "Unbiased estimators always have infinite variance", "MSE ignores bias entirely"],
            optsDE: ["Eine kleine Zunahme des Bias² kann durch eine größere Reduktion der Varianz ausgeglichen werden", "Bias reduziert die Varianz immer auf null", "Erwartungstreue Schätzer haben immer unendliche Varianz", "MSE ignoriert den Bias vollständig"],
            correct: 0,
            explain: "Since MSE sums variance and squared bias, deliberately accepting a small bias can sometimes buy a much larger drop in variance, producing a smaller total MSE than an unbiased alternative.",
            explainDE: "Da der MSE Varianz und quadrierten Bias addiert, kann das bewusste Inkaufnehmen eines kleinen Bias manchmal eine viel größere Reduktion der Varianz erkaufen und so einen kleineren Gesamt-MSE liefern als eine erwartungstreue Alternative."
        },

        // --- Konsistenz (schwach / stark) ---
        {
            q: "An estimator θ̂ₙ is weakly consistent for θ if:",
            qDE: "Ein Schätzer θ̂ₙ heißt schwach konsistent für θ, wenn:",
            opts: ["θ̂ₙ →ᵖ θ as n → ∞ (convergence in probability)", "θ̂ₙ = θ for all n", "θ̂ₙ →ᵃ·ˢ· θ as n → ∞", "E[θ̂ₙ] = θ for all n"],
            optsDE: ["θ̂ₙ →ᵖ θ für n → ∞ (stochastische Konvergenz)", "θ̂ₙ = θ für alle n", "θ̂ₙ →ᵃ·ˢ· θ für n → ∞", "E[θ̂ₙ] = θ für alle n"],
            correct: 0,
            explain: "Weak consistency is defined directly through convergence in probability: as the sample grows, the estimator becomes increasingly unlikely to deviate far from θ.",
            explainDE: "Schwache Konsistenz wird direkt über stochastische Konvergenz definiert: Mit wachsender Stichprobe wird es immer unwahrscheinlicher, dass der Schätzer stark von θ abweicht."
        },
        {
            q: "An estimator θ̂ₙ is strongly consistent for θ if:",
            qDE: "Ein Schätzer θ̂ₙ heißt stark konsistent für θ, wenn:",
            opts: ["θ̂ₙ →ᵃ·ˢ· θ as n → ∞ (almost sure convergence)", "θ̂ₙ →ᵖ θ as n → ∞", "Var(θ̂ₙ) = 0 for all n", "θ̂ₙ is unbiased for all n"],
            optsDE: ["θ̂ₙ →ᵃ·ˢ· θ für n → ∞ (fast sichere Konvergenz)", "θ̂ₙ →ᵖ θ für n → ∞", "Var(θ̂ₙ) = 0 für alle n", "θ̂ₙ ist für alle n erwartungstreu"],
            correct: 0,
            explain: "Strong consistency demands the stronger notion of almost sure convergence, guaranteeing that the sequence of estimates actually settles on θ with probability 1.",
            explainDE: "Starke Konsistenz verlangt den stärkeren Begriff der fast sicheren Konvergenz und garantiert, dass die Folge der Schätzwerte mit Wahrscheinlichkeit 1 tatsächlich bei θ landet."
        },
        {
            q: "Strong consistency implies weak consistency because:",
            qDE: "Starke Konsistenz impliziert schwache Konsistenz, weil:",
            opts: ["Almost sure convergence implies convergence in probability", "They are defined identically", "Weak consistency requires unbiasedness", "Strong consistency requires a larger sample"],
            optsDE: ["Fast sichere Konvergenz stochastische Konvergenz impliziert", "Sie identisch definiert sind", "Schwache Konsistenz Erwartungstreue voraussetzt", "Starke Konsistenz eine größere Stichprobe erfordert"],
            correct: 0,
            explain: "This mirrors the general relationship between convergence modes: almost sure convergence is strictly stronger, so it always carries convergence in probability along with it.",
            explainDE: "Dies spiegelt die allgemeine Beziehung zwischen Konvergenzarten wider: Fast sichere Konvergenz ist strikt stärker und impliziert daher stets auch die stochastische Konvergenz."
        },
        {
            q: "A common sufficient condition for weak consistency, via Chebyshev's inequality, is:",
            qDE: "Eine gängige hinreichende Bedingung für schwache Konsistenz (via Tschebyscheff) ist:",
            opts: ["θ̂ₙ is asymptotically unbiased and Var(θ̂ₙ) → 0 as n → ∞", "θ̂ₙ is unbiased for finite n only", "θ̂ₙ has infinite variance", "θ̂ₙ is a constant"],
            optsDE: ["θ̂ₙ ist asymptotisch erwartungstreu und Var(θ̂ₙ) → 0 für n → ∞", "θ̂ₙ ist nur für endliches n erwartungstreu", "θ̂ₙ hat unendliche Varianz", "θ̂ₙ ist eine Konstante"],
            correct: 0,
            explain: "Since Chebyshev bounds deviation probability using MSE, and MSE = Var + Bias², having both the variance and the (asymptotic) bias vanish is exactly what's needed to force convergence in probability.",
            explainDE: "Da die Tschebyscheff-Schranke die Abweichungswahrscheinlichkeit über den MSE beschränkt und MSE = Var + Bias² gilt, ist es genau das Verschwinden von Varianz und (asymptotischem) Bias, das stochastische Konvergenz erzwingt."
        },
        {
            q: "By the Weak Law of Large Numbers, the sample mean X̄ₙ is a consistent estimator for μ provided that:",
            qDE: "Nach dem schwachen Gesetz der großen Zahlen ist X̄ₙ ein konsistenter Schätzer für μ, sofern:",
            opts: ["The Xᵢ are i.i.d. with finite variance", "The Xᵢ are normally distributed", "n is at least 30", "The Xᵢ are dependent"],
            optsDE: ["Die Xᵢ i.i.d. mit endlicher Varianz sind", "Die Xᵢ normalverteilt sind", "n mindestens 30 beträgt", "Die Xᵢ abhängig sind"],
            correct: 0,
            explain: "This is exactly the Weak Law's condition from world 7: i.i.d. observations with finite variance are enough to guarantee that X̄ₙ converges in probability to μ.",
            explainDE: "Dies ist genau die Bedingung des schwachen Gesetzes aus Welt 7: i.i.d. Beobachtungen mit endlicher Varianz genügen, um zu garantieren, dass X̄ₙ stochastisch gegen μ konvergiert."
        },
        {
            q: "MSE(θ̂ₙ) → 0 as n → ∞ is sufficient to conclude:",
            qDE: "MSE(θ̂ₙ) → 0 für n → ∞ genügt, um zu folgern:",
            opts: ["θ̂ₙ is (weakly) consistent for θ", "θ̂ₙ is unbiased for every n", "θ̂ₙ is strongly consistent", "θ̂ₙ is efficient"],
            optsDE: ["θ̂ₙ ist (schwach) konsistent für θ", "θ̂ₙ ist für jedes n erwartungstreu", "θ̂ₙ ist stark konsistent", "θ̂ₙ ist effizient"],
            correct: 0,
            explain: "MSE going to zero forces both variance and bias to vanish, and by Chebyshev-type arguments this is enough to guarantee convergence in probability — but not the stronger almost sure convergence.",
            explainDE: "Ein gegen null gehender MSE zwingt sowohl die Varianz als auch den Bias zum Verschwinden, und über Tschebyscheff-artige Argumente genügt dies, um stochastische Konvergenz zu garantieren — nicht jedoch die stärkere fast sichere Konvergenz."
        },

        // --- Effizienz (unter erwartungstreuen Schätzern) ---
        {
            q: "Given two unbiased estimators θ̂₁ and θ̂₂ for θ, θ̂₁ is called more efficient than θ̂₂ if:",
            qDE: "Bei zwei erwartungstreuen Schätzern θ̂₁ und θ̂₂ für θ heißt θ̂₁ effizienter als θ̂₂, wenn:",
            opts: ["Var(θ̂₁) ≤ Var(θ̂₂), with strict inequality for at least one θ", "E[θ̂₁] < E[θ̂₂]", "θ̂₁ has a larger sample size", "Var(θ̂₁) = Var(θ̂₂)"],
            optsDE: ["Var(θ̂₁) ≤ Var(θ̂₂), mit strikter Ungleichung für mindestens ein θ", "E[θ̂₁] < E[θ̂₂]", "θ̂₁ eine größere Stichprobe verwendet", "Var(θ̂₁) = Var(θ̂₂)"],
            correct: 0,
            explain: "Since both estimators are already unbiased, their MSE reduces to variance alone, so efficiency is just a matter of comparing variances directly, with at least one strict inequality needed to break ties.",
            explainDE: "Da beide Schätzer bereits erwartungstreu sind, reduziert sich ihr MSE allein auf die Varianz, sodass Effizienz einfach dem direkten Vergleich der Varianzen entspricht, wobei mindestens eine strikte Ungleichung nötig ist, um Gleichstand auszuschließen."
        },
        {
            q: "Efficiency, as a criterion for comparing estimators, is only meaningfully defined between:",
            qDE: "Effizienz als Kriterium zum Vergleich von Schätzern ist nur sinnvoll definiert zwischen:",
            opts: ["Two unbiased estimators of the same parameter", "Any two estimators, biased or not", "Two consistent estimators only", "Two estimators with equal variance"],
            optsDE: ["Zwei erwartungstreuen Schätzern desselben Parameters", "Beliebigen zwei Schätzern, verzerrt oder nicht", "Zwei konsistenten Schätzern", "Zwei Schätzern mit gleicher Varianz"],
            correct: 0,
            explain: "Efficiency as a variance comparison only makes sense once bias is already equal (namely zero) for both estimators; otherwise differing bias would confound a pure variance comparison.",
            explainDE: "Effizienz als Varianzvergleich ist nur sinnvoll, wenn der Bias bei beiden Schätzern bereits gleich (nämlich null) ist; andernfalls würde ein unterschiedlicher Bias einen reinen Varianzvergleich verfälschen."
        },
        {
            q: "θ̂₁ has Var(θ̂₁) = 4 and θ̂₂ has Var(θ̂₂) = 9; both are unbiased for θ. Which is more efficient?",
            qDE: "θ̂₁ hat Var(θ̂₁) = 4, θ̂₂ hat Var(θ̂₂) = 9; beide sind erwartungstreu für θ. Welcher ist effizienter?",
            opts: ["θ̂₁, since it has the smaller variance", "θ̂₂, since it has the larger variance", "Both are equally efficient", "Neither, efficiency cannot be compared here"],
            optsDE: ["θ̂₁, da er die kleinere Varianz hat", "θ̂₂, da er die größere Varianz hat", "Beide sind gleich effizient", "Keiner, Effizienz ist hier nicht vergleichbar"],
            correct: 0,
            explain: "With both estimators unbiased, efficiency comes down to variance alone, and 4 < 9 means θ̂₁ concentrates more tightly around θ, making it the more efficient choice.",
            explainDE: "Da beide Schätzer erwartungstreu sind, kommt es allein auf die Varianz an, und 4 < 9 bedeutet, dass θ̂₁ enger um θ konzentriert ist, was ihn zur effizienteren Wahl macht."
        },
        {
            q: "An unbiased estimator that achieves the Cramér-Rao lower bound is called:",
            qDE: "Ein erwartungstreuer Schätzer, der die Cramér-Rao-Schranke erreicht, heißt:",
            opts: ["Efficient", "Consistent", "Biased", "Asymptotically unbiased"],
            optsDE: ["Effizient", "Konsistent", "Verzerrt", "Asymptotisch erwartungstreu"],
            correct: 0,
            explain: "The Cramér-Rao bound sets the theoretical minimum possible variance for an unbiased estimator, so any unbiased estimator that actually attains it is, by definition, efficient — it can't be beaten.",
            explainDE: "Die Cramér-Rao-Schranke legt die theoretisch kleinstmögliche Varianz für einen erwartungstreuen Schätzer fest, sodass jeder erwartungstreue Schätzer, der sie tatsächlich erreicht, per Definition effizient ist — er kann nicht unterboten werden."
        },

        // --- MSE-Effizienz (beliebige Schätzer) ---
        {
            q: "Given two estimators θ̂₁ and θ̂₂ for θ, not necessarily unbiased, θ̂₁ is MSE-efficient relative to θ̂₂ if:",
            qDE: "Bei zwei nicht notwendig erwartungstreuen Schätzern θ̂₁ und θ̂₂ für θ heißt θ̂₁ MSE-effizienter als θ̂₂, wenn:",
            opts: ["MSE(θ̂₁) ≤ MSE(θ̂₂), with strict inequality for at least one θ", "Var(θ̂₁) ≤ Var(θ̂₂) regardless of bias", "Bias(θ̂₁) = 0 and Bias(θ̂₂) ≠ 0", "E[θ̂₁] = E[θ̂₂]"],
            optsDE: ["MSE(θ̂₁) ≤ MSE(θ̂₂), mit strikter Ungleichung für mindestens ein θ", "Var(θ̂₁) ≤ Var(θ̂₂) unabhängig vom Bias", "Bias(θ̂₁) = 0 und Bias(θ̂₂) ≠ 0", "E[θ̂₁] = E[θ̂₂]"],
            correct: 0,
            explain: "Because MSE-efficiency doesn't assume unbiasedness, the comparison must use the full MSE — which folds in both variance and bias² — rather than variance alone.",
            explainDE: "Da MSE-Effizienz keine Erwartungstreue voraussetzt, muss der Vergleich über den vollständigen MSE erfolgen — der sowohl Varianz als auch Bias² enthält — statt allein über die Varianz."
        },
        {
            q: "Why is MSE-efficiency a more general comparison criterion than (variance-based) efficiency?",
            qDE: "Warum ist MSE-Effizienz ein allgemeineres Vergleichskriterium als (varianzbasierte) Effizienz?",
            opts: ["It can compare any two estimators, including biased ones, not just unbiased ones", "It only applies to consistent estimators", "It ignores variance completely", "It requires both estimators to be unbiased"],
            optsDE: ["Sie kann beliebige zwei Schätzer vergleichen, auch verzerrte, nicht nur erwartungstreue", "Sie gilt nur für konsistente Schätzer", "Sie ignoriert die Varianz vollständig", "Sie setzt voraus, dass beide Schätzer erwartungstreu sind"],
            correct: 0,
            explain: "Ordinary efficiency only applies once bias is ruled out, but MSE-efficiency accounts for bias directly within its formula, letting it rank biased and unbiased estimators alike on equal footing.",
            explainDE: "Gewöhnliche Effizienz gilt nur, wenn Bias bereits ausgeschlossen ist, doch MSE-Effizienz berücksichtigt den Bias direkt in ihrer Formel und erlaubt so, verzerrte und erwartungstreue Schätzer gleichberechtigt zu vergleichen."
        },
        {
            q: "θ̂₁ (biased) has MSE = 5; θ̂₂ (unbiased) has MSE = 8. Which is MSE-efficient?",
            qDE: "θ̂₁ (verzerrt) hat MSE = 5; θ̂₂ (erwartungstreu) hat MSE = 8. Welcher ist MSE-effizient?",
            opts: ["θ̂₁, despite being biased, since its MSE is smaller", "θ̂₂, since it is unbiased", "Both, since MSE-efficiency ignores bias", "Neither can be compared"],
            optsDE: ["θ̂₁, trotz Verzerrung, da sein MSE kleiner ist", "θ̂₂, da er erwartungstreu ist", "Beide, da MSE-Effizienz den Bias ignoriert", "Keiner ist vergleichbar"],
            correct: 0,
            explain: "MSE-efficiency ranks purely by total MSE regardless of bias, so θ̂₁'s smaller MSE of 5 makes it the MSE-efficient choice even though it isn't unbiased.",
            explainDE: "MSE-Effizienz rangiert rein nach dem Gesamt-MSE unabhängig vom Bias, sodass der kleinere MSE von θ̂₁ mit 5 ihn zur MSE-effizienten Wahl macht, obwohl er nicht erwartungstreu ist."
        },
        {
            q: "If both θ̂₁ and θ̂₂ are unbiased, comparing them by MSE-efficiency reduces to comparing them by:",
            qDE: "Wenn sowohl θ̂₁ als auch θ̂₂ erwartungstreu sind, reduziert sich der Vergleich nach MSE-Effizienz auf den Vergleich nach:",
            opts: ["Variance", "Bias", "Sample size", "Consistency"],
            optsDE: ["Varianz", "Bias", "Stichprobenumfang", "Konsistenz"],
            correct: 0,
            explain: "With bias equal to zero for both, the bias² term drops out of each MSE, leaving variance as the only thing distinguishing them — so MSE-efficiency collapses back to ordinary efficiency.",
            explainDE: "Ist der Bias bei beiden gleich null, entfällt der Bias²-Term aus jedem MSE, sodass nur noch die Varianz die beiden unterscheidet — MSE-Effizienz reduziert sich damit wieder auf die gewöhnliche Effizienz."
        },

    ],


    10: [

        // --- Konfidenzintervall: Grundidee ---
        {
            q: "A confidence interval with confidence level 1−α is constructed so that:",
            qDE: "Ein Konfidenzintervall mit Konfidenzniveau 1−α wird so konstruiert, dass:",
            opts: ["It contains the true parameter with probability 1−α (over repeated sampling)", "It contains the true parameter with certainty", "It equals the point estimate exactly", "It always has width 1−α"],
            optsDE: ["Es den wahren Parameter mit Wahrscheinlichkeit 1−α überdeckt (bei wiederholter Stichprobenziehung)", "Es den wahren Parameter mit Sicherheit enthält", "Es genau dem Punktschätzer entspricht", "Es stets die Breite 1−α hat"],
            correct: 0,
            explain: "The confidence level is a statement about the procedure over repeated sampling — 1−α of all intervals constructed this way would capture the true parameter, not a guarantee for any single interval.",
            explainDE: "Das Konfidenzniveau ist eine Aussage über das Verfahren bei wiederholter Stichprobenziehung — 1−α aller so konstruierten Intervalle würden den wahren Parameter überdecken, nicht eine Garantie für ein einzelnes Intervall."
        },
        {
            q: "A two-sided confidence interval for a parameter θ has the form:",
            qDE: "Ein zweiseitiges Konfidenzintervall für einen Parameter θ hat die Form:",
            opts: ["[θ̂ − c, θ̂ + c] bounding θ from both below and above", "(−∞, θ̂ + c] only", "[θ̂ − c, ∞) only", "A single point estimate θ̂"],
            optsDE: ["[θ̂ − c, θ̂ + c], das θ von unten und oben begrenzt", "Nur (−∞, θ̂ + c]", "Nur [θ̂ − c, ∞)", "Ein einzelner Punktschätzer θ̂"],
            correct: 0,
            explain: "A two-sided interval brackets the parameter on both ends, providing both a lower and an upper bound around the point estimate, unlike one-sided intervals which only bound in one direction.",
            explainDE: "Ein zweiseitiges Intervall begrenzt den Parameter auf beiden Seiten und liefert sowohl eine untere als auch eine obere Schranke um den Punktschätzer, im Gegensatz zu einseitigen Intervallen, die nur in eine Richtung begrenzen."
        },
        {
            q: "A one-sided (upper) confidence interval for θ has the form:",
            qDE: "Ein einseitiges (oberes) Konfidenzintervall für θ hat die Form:",
            opts: ["(−∞, θ̂ + c]", "[θ̂ − c, θ̂ + c]", "[θ̂ − c, ∞)", "{θ̂}"],
            optsDE: ["(−∞, θ̂ + c]", "[θ̂ − c, θ̂ + c]", "[θ̂ − c, ∞)", "{θ̂}"],
            correct: 0,
            explain: "An upper one-sided interval only claims that θ is below some bound, so it extends from negative infinity up to θ̂ + c without imposing any lower limit.",
            explainDE: "Ein oberes einseitiges Intervall behauptet nur, dass θ unterhalb einer bestimmten Schranke liegt, und erstreckt sich daher von minus unendlich bis θ̂ + c, ohne eine untere Grenze festzulegen."
        },
        {
            q: "Increasing the confidence level from 90% to 99% (all else equal) makes the confidence interval:",
            qDE: "Eine Erhöhung des Konfidenzniveaus von 90% auf 99% (bei sonst gleichen Bedingungen) macht das Konfidenzintervall:",
            opts: ["Wider", "Narrower", "Unchanged", "Negative"],
            optsDE: ["Breiter", "Schmaler", "Unverändert", "Negativ"],
            correct: 0,
            explain: "Demanding higher confidence means the interval must capture the true parameter more reliably, which requires a larger critical value and therefore a wider interval.",
            explainDE: "Ein höheres Konfidenzniveau zu fordern bedeutet, dass das Intervall den wahren Parameter zuverlässiger erfassen muss, was einen größeren kritischen Wert und damit ein breiteres Intervall erfordert."
        },
        {
            q: "Increasing the sample size n (all else equal) typically makes a confidence interval:",
            qDE: "Eine Erhöhung des Stichprobenumfangs n (bei sonst gleichen Bedingungen) macht ein Konfidenzintervall typischerweise:",
            opts: ["Narrower", "Wider", "Unchanged", "Undefined"],
            optsDE: ["Schmaler", "Breiter", "Unverändert", "Undefiniert"],
            correct: 0,
            explain: "Since the margin of error typically shrinks with 1/√n, collecting more data reduces the standard error of the estimator and narrows the interval around it.",
            explainDE: "Da die Fehlermarge typischerweise mit 1/√n schrumpft, verringert mehr gesammelte Daten den Standardfehler des Schätzers und verengt das Intervall um ihn."
        },

        // --- Konfidenzintervall für Erwartungswert ---
        {
            q: "For X₁,…,Xₙ i.i.d. N(μ, σ²) with σ² known, the two-sided CI for μ at level 1−α is:",
            qDE: "Für X₁,…,Xₙ i.i.d. N(μ, σ²) mit bekanntem σ² lautet das zweiseitige KI für μ zum Niveau 1−α:",
            opts: ["X̄ₙ ± z_{1−α/2} · σ/√n", "X̄ₙ ± z_{1−α} · σ/√n", "X̄ₙ ± t_{1−α/2} · σ/√n", "X̄ₙ ± σ²/n"],
            optsDE: ["X̄ₙ ± z_{1−α/2} · σ/√n", "X̄ₙ ± z_{1−α} · σ/√n", "X̄ₙ ± t_{1−α/2} · σ/√n", "X̄ₙ ± σ²/n"],
            correct: 0,
            explain: "Since σ² is known, X̄ₙ standardizes to a standard normal, so the interval uses the normal quantile z_{1−α/2} (splitting α across both tails) applied to the known standard error σ/√n.",
            explainDE: "Da σ² bekannt ist, standardisiert sich X̄ₙ zu einer Standardnormalverteilung, sodass das Intervall das Normalquantil z_{1−α/2} (das α auf beide Enden aufteilt) auf den bekannten Standardfehler σ/√n anwendet."
        },
        {
            q: "When σ² is unknown and must be estimated from the sample, the two-sided CI for μ uses:",
            qDE: "Wenn σ² unbekannt ist und aus der Stichprobe geschätzt werden muss, verwendet das zweiseitige KI für μ:",
            opts: ["The t-distribution with n−1 degrees of freedom", "The standard normal distribution", "The chi-squared distribution", "The binomial distribution"],
            optsDE: ["Die t-Verteilung mit n−1 Freiheitsgraden", "Die Standardnormalverteilung", "Die Chi-Quadrat-Verteilung", "Die Binomialverteilung"],
            correct: 0,
            explain: "Replacing the unknown σ with the estimate Sₙ introduces extra variability, and it turns out the resulting standardized statistic follows a t-distribution with n−1 degrees of freedom rather than the normal.",
            explainDE: "Das Ersetzen des unbekannten σ durch den Schätzer Sₙ führt zusätzliche Variabilität ein, und die daraus resultierende standardisierte Statistik folgt einer t-Verteilung mit n−1 Freiheitsgraden statt der Normalverteilung."
        },
        {
            q: "The two-sided CI for μ with unknown σ² is given by:",
            qDE: "Das zweiseitige KI für μ bei unbekanntem σ² lautet:",
            opts: ["X̄ₙ ± t_{n−1, 1−α/2} · Sₙ/√n", "X̄ₙ ± z_{1−α/2} · Sₙ/√n", "X̄ₙ ± t_{n−1, 1−α/2} · σ/√n", "X̄ₙ ± Sₙ/√n"],
            optsDE: ["X̄ₙ ± t_{n−1, 1−α/2} · Sₙ/√n", "X̄ₙ ± z_{1−α/2} · Sₙ/√n", "X̄ₙ ± t_{n−1, 1−α/2} · σ/√n", "X̄ₙ ± Sₙ/√n"],
            correct: 0,
            explain: "Both the unknown σ and the normal quantile need to be adjusted together: σ is replaced by its estimate Sₙ, and the critical value must come from the t-distribution rather than the standard normal.",
            explainDE: "Sowohl das unbekannte σ als auch das Normalquantil müssen zusammen angepasst werden: σ wird durch seinen Schätzer Sₙ ersetzt, und der kritische Wert muss aus der t-Verteilung statt der Standardnormalverteilung stammen."
        },
        {
            q: "A one-sided upper CI for μ (σ² known) at level 1−α is:",
            qDE: "Ein einseitiges oberes KI für μ (σ² bekannt) zum Niveau 1−α lautet:",
            opts: ["(−∞, X̄ₙ + z_{1−α} · σ/√n]", "(−∞, X̄ₙ + z_{1−α/2} · σ/√n]", "[X̄ₙ − z_{1−α} · σ/√n, ∞)", "[X̄ₙ, ∞)"],
            optsDE: ["(−∞, X̄ₙ + z_{1−α} · σ/√n]", "(−∞, X̄ₙ + z_{1−α/2} · σ/√n]", "[X̄ₙ − z_{1−α} · σ/√n, ∞)", "[X̄ₙ, ∞)"],
            correct: 0,
            explain: "Since a one-sided interval puts all of α into a single tail rather than splitting it, the correct quantile here is z_{1−α}, not z_{1−α/2} which is reserved for two-sided intervals.",
            explainDE: "Da ein einseitiges Intervall das gesamte α in ein einziges Ende legt, statt es aufzuteilen, ist das richtige Quantil hier z_{1−α}, nicht z_{1−α/2}, das für zweiseitige Intervalle reserviert ist."
        },

        // --- Konfidenzintervall für Varianz (Chi-Quadrat) ---
        {
            q: "For X₁,…,Xₙ i.i.d. N(μ, σ²), the quantity (n−1)Sₙ²/σ² follows a:",
            qDE: "Für X₁,…,Xₙ i.i.d. N(μ, σ²) folgt die Größe (n−1)Sₙ²/σ² einer:",
            opts: ["Chi-squared distribution with n−1 degrees of freedom", "Standard normal distribution", "t-distribution with n−1 degrees of freedom", "Binomial distribution"],
            optsDE: ["Chi-Quadrat-Verteilung mit n−1 Freiheitsgraden", "Standardnormalverteilung", "t-Verteilung mit n−1 Freiheitsgraden", "Binomialverteilung"],
            correct: 0,
            explain: "This standardized sum of squared deviations, scaled by the unknown σ², is a classical result for normal samples: it follows a chi-squared distribution, with degrees of freedom reduced by one for estimating μ.",
            explainDE: "Diese standardisierte Summe quadrierter Abweichungen, skaliert mit dem unbekannten σ², ist ein klassisches Resultat für Normalstichproben: Sie folgt einer Chi-Quadrat-Verteilung, deren Freiheitsgrade um eins reduziert sind, da μ geschätzt wird."
        },
        {
            q: "The two-sided CI for σ² is constructed using two quantiles of:",
            qDE: "Das zweiseitige KI für σ² wird mithilfe zweier Quantile folgender Verteilung konstruiert:",
            opts: ["The chi-squared distribution with n−1 degrees of freedom", "The standard normal distribution", "The t-distribution", "The exponential distribution"],
            optsDE: ["Der Chi-Quadrat-Verteilung mit n−1 Freiheitsgraden", "Der Standardnormalverteilung", "Der t-Verteilung", "Der Exponentialverteilung"],
            correct: 0,
            explain: "Because (n−1)Sₙ²/σ² is chi-squared distributed, bounding it between two chi-squared quantiles (at α/2 and 1−α/2) is exactly what's used to isolate σ² into an interval.",
            explainDE: "Da (n−1)Sₙ²/σ² chi-quadrat-verteilt ist, wird genau das Einschließen zwischen zwei Chi-Quadrat-Quantilen (bei α/2 und 1−α/2) verwendet, um σ² in ein Intervall einzugrenzen."
        },
        {
            q: "The two-sided CI for σ² at level 1−α is:",
            qDE: "Das zweiseitige KI für σ² zum Niveau 1−α lautet:",
            opts: ["[(n−1)Sₙ² / χ²_{n−1, 1−α/2}, (n−1)Sₙ² / χ²_{n−1, α/2}]", "[Sₙ² − χ²_{1−α/2}, Sₙ² + χ²_{1−α/2}]", "X̄ₙ ± χ²_{1−α/2}", "[Sₙ² / χ²_{α/2}, ∞)"],
            optsDE: ["[(n−1)Sₙ² / χ²_{n−1, 1−α/2}, (n−1)Sₙ² / χ²_{n−1, α/2}]", "[Sₙ² − χ²_{1−α/2}, Sₙ² + χ²_{1−α/2}]", "X̄ₙ ± χ²_{1−α/2}", "[Sₙ² / χ²_{α/2}, ∞)"],
            correct: 0,
            explain: "Isolating σ² from the pivotal quantity (n−1)Sₙ²/σ² between its two chi-squared quantiles flips the inequality direction, producing an interval where the smaller quantile gives the upper bound and vice versa.",
            explainDE: "Das Isolieren von σ² aus der Pivotgröße (n−1)Sₙ²/σ² zwischen ihren beiden Chi-Quadrat-Quantilen kehrt die Ungleichungsrichtung um, sodass das kleinere Quantil die obere Schranke liefert und umgekehrt."
        },
        {
            q: "Unlike the CI for μ, the CI for σ² based on the chi-squared distribution is generally:",
            qDE: "Im Gegensatz zum KI für μ ist das KI für σ² auf Basis der Chi-Quadrat-Verteilung im Allgemeinen:",
            opts: ["Not symmetric around the point estimate", "Symmetric around the point estimate", "Always of infinite width", "Independent of n"],
            optsDE: ["Nicht symmetrisch um den Punktschätzer", "Symmetrisch um den Punktschätzer", "Stets von unendlicher Breite", "Unabhängig von n"],
            correct: 0,
            explain: "Because the chi-squared distribution is itself skewed and not symmetric, the resulting interval for σ² inherits that asymmetry, unlike the symmetric ± form of the CI for μ based on the normal or t-distribution.",
            explainDE: "Da die Chi-Quadrat-Verteilung selbst schief und nicht symmetrisch ist, erbt das resultierende Intervall für σ² diese Asymmetrie, im Gegensatz zur symmetrischen ±-Form des KI für μ auf Basis der Normal- oder t-Verteilung."
        },

        // --- Konfidenzintervall für p (Binomialverteilung, approximativ) ---
        {
            q: "For X ~ Bin(n, p) with p̂ = X/n, the approximate (Wald) CI for p relies on which theorem?",
            qDE: "Für X ~ Bin(n, p) mit p̂ = X/n beruht das approximative (Wald-)KI für p auf welchem Satz?",
            opts: ["The Central Limit Theorem", "The Law of Large Numbers", "Bayes' theorem", "The Fundamental Theorem of Statistics"],
            optsDE: ["Dem Zentralen Grenzwertsatz", "Dem Gesetz der großen Zahlen", "Dem Satz von Bayes", "Dem Hauptsatz der Statistik"],
            correct: 0,
            explain: "Since p̂ is itself an average of Bernoulli trials, the CLT justifies treating it as approximately normal for large n, which is exactly what the Wald interval relies on.",
            explainDE: "Da p̂ selbst ein Mittelwert von Bernoulli-Versuchen ist, rechtfertigt der ZGS, es für großes n als näherungsweise normalverteilt zu behandeln — genau darauf stützt sich das Wald-Intervall."
        },
        {
            q: "The approximate two-sided CI for p (Wald interval) at level 1−α is:",
            qDE: "Das approximative zweiseitige KI für p (Wald-Intervall) zum Niveau 1−α lautet:",
            opts: ["p̂ ± z_{1−α/2} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α/2} · p̂(1−p̂)/n", "p̂ ± z_{1−α/2}/√n"],
            optsDE: ["p̂ ± z_{1−α/2} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α} · √(p̂(1−p̂)/n)", "p̂ ± z_{1−α/2} · p̂(1−p̂)/n", "p̂ ± z_{1−α/2}/√n"],
            correct: 0,
            explain: "Since Var(p̂) = p(1−p)/n, plugging in p̂ as an estimate and taking the square root gives the estimated standard error, which is then multiplied by the normal quantile z_{1−α/2}.",
            explainDE: "Da Var(p̂) = p(1−p)/n ist, ergibt das Einsetzen von p̂ als Schätzer und das Ziehen der Quadratwurzel den geschätzten Standardfehler, der dann mit dem Normalquantil z_{1−α/2} multipliziert wird."
        },
        {
            q: "The approximate CI for p is generally considered reliable when:",
            qDE: "Das approximative KI für p gilt im Allgemeinen als zuverlässig, wenn:",
            opts: ["n is large enough that n·p̂ and n·(1−p̂) are both sufficiently large", "n is small and p̂ is close to 0.5", "p̂ = 0 or p̂ = 1", "n is any value at all"],
            optsDE: ["n groß genug ist, sodass n·p̂ und n·(1−p̂) beide ausreichend groß sind", "n klein ist und p̂ nahe 0,5 liegt", "p̂ = 0 oder p̂ = 1 ist", "n einen beliebigen Wert hat"],
            correct: 0,
            explain: "Since the interval relies on a normal approximation to the binomial, it only works well when both the expected number of successes and failures are large enough for that approximation to hold.",
            explainDE: "Da sich das Intervall auf eine Normalapproximation der Binomialverteilung stützt, funktioniert es nur gut, wenn sowohl die erwartete Anzahl an Erfolgen als auch an Misserfolgen groß genug ist, damit diese Approximation gültig ist."
        },

        // --- Statistische Tests: Grundbegriffe ---
        {
            q: "In hypothesis testing, the null hypothesis H₀ typically represents:",
            qDE: "Beim Hypothesentest repräsentiert die Nullhypothese H₀ typischerweise:",
            opts: ["The default or status-quo claim to be tested against evidence", "The claim the researcher wants to prove", "A claim that is always true", "The sample mean"],
            optsDE: ["Die Standard- bzw. Status-quo-Annahme, die gegen die Evidenz getestet wird", "Die Behauptung, die der Forscher beweisen möchte", "Eine stets wahre Aussage", "Den Stichprobenmittelwert"],
            correct: 0,
            explain: "H₀ is set up as the conservative baseline assumption, which is only abandoned if the data provide strong enough evidence against it.",
            explainDE: "H₀ wird als konservative Basisannahme festgelegt, die nur dann aufgegeben wird, wenn die Daten ausreichend starke Evidenz dagegen liefern."
        },
        {
            q: "The alternative hypothesis H₁ represents:",
            qDE: "Die Alternativhypothese H₁ repräsentiert:",
            opts: ["The claim that contradicts H₀ and is accepted if H₀ is rejected", "The claim that is assumed true by default", "A restatement of H₀", "The observed sample data"],
            optsDE: ["Die Behauptung, die H₀ widerspricht und akzeptiert wird, falls H₀ verworfen wird", "Die standardmäßig als wahr angenommene Behauptung", "Eine Umformulierung von H₀", "Die beobachteten Stichprobendaten"],
            correct: 0,
            explain: "H₁ is the competing claim that stands in direct opposition to H₀, and it's the position we lean toward only once the data have led us to reject the default assumption.",
            explainDE: "H₁ ist die konkurrierende Behauptung, die direkt der H₀ widerspricht, und ihr wenden wir uns erst zu, wenn die Daten uns dazu veranlasst haben, die Standardannahme zu verwerfen."
        },
        {
            q: "A Type I error occurs when:",
            qDE: "Ein Fehler 1. Art tritt auf, wenn:",
            opts: ["H₀ is true but is rejected", "H₀ is false but is not rejected", "H₀ is true and not rejected", "H₁ is true and accepted"],
            optsDE: ["H₀ wahr ist, aber verworfen wird", "H₀ falsch ist, aber nicht verworfen wird", "H₀ wahr ist und nicht verworfen wird", "H₁ wahr ist und akzeptiert wird"],
            correct: 0,
            explain: "A Type I error is a false alarm: the null hypothesis was actually correct, but the test mistakenly rejected it anyway.",
            explainDE: "Ein Fehler 1. Art ist ein Fehlalarm: Die Nullhypothese war eigentlich richtig, doch der Test hat sie fälschlicherweise trotzdem verworfen."
        },
        {
            q: "A Type II error occurs when:",
            qDE: "Ein Fehler 2. Art tritt auf, wenn:",
            opts: ["H₀ is false but is not rejected", "H₀ is true but is rejected", "H₀ is true and not rejected", "H₁ is rejected while true"],
            optsDE: ["H₀ falsch ist, aber nicht verworfen wird", "H₀ wahr ist, aber verworfen wird", "H₀ wahr ist und nicht verworfen wird", "H₁ verworfen wird, obwohl sie wahr ist"],
            correct: 0,
            explain: "A Type II error is a missed detection: the null hypothesis was actually false, but the test failed to reject it, letting the real effect slip past undetected.",
            explainDE: "Ein Fehler 2. Art ist eine verpasste Entdeckung: Die Nullhypothese war eigentlich falsch, doch der Test hat sie nicht verworfen, sodass der tatsächliche Effekt unentdeckt blieb."
        },
        {
            q: "The significance level α of a test is defined as:",
            qDE: "Das Signifikanzniveau α eines Tests ist definiert als:",
            opts: ["The maximum allowed probability of a Type I error", "The probability of a Type II error", "The probability that H₀ is true", "The probability that H₁ is true"],
            optsDE: ["Die maximal zulässige Wahrscheinlichkeit für einen Fehler 1. Art", "Die Wahrscheinlichkeit für einen Fehler 2. Art", "Die Wahrscheinlichkeit, dass H₀ wahr ist", "Die Wahrscheinlichkeit, dass H₁ wahr ist"],
            correct: 0,
            explain: "By construction, a level-α test is designed so that the probability of falsely rejecting a true H₀ never exceeds α — that's the definition of significance level, not a statement about Type II errors.",
            explainDE: "Ein Test zum Niveau α ist so konstruiert, dass die Wahrscheinlichkeit, eine wahre H₀ fälschlicherweise zu verwerfen, α nie überschreitet — das ist die Definition des Signifikanzniveaus, keine Aussage über Fehler 2. Art."
        },
        {
            q: "The power of a test is defined as:",
            qDE: "Die Power (Trennschärfe) eines Tests ist definiert als:",
            opts: ["1 minus the probability of a Type II error", "The probability of a Type I error", "The significance level α", "The sample size n"],
            optsDE: ["1 minus die Wahrscheinlichkeit eines Fehlers 2. Art", "Die Wahrscheinlichkeit eines Fehlers 1. Art", "Das Signifikanzniveau α", "Der Stichprobenumfang n"],
            correct: 0,
            explain: "Power measures the test's ability to correctly detect a false H₀, so it's exactly the complement of the Type II error probability — the chance of correctly rejecting when H₁ is true.",
            explainDE: "Die Power misst die Fähigkeit des Tests, eine falsche H₀ korrekt zu erkennen, und ist damit genau das Komplement der Wahrscheinlichkeit eines Fehlers 2. Art — die Chance, korrekt zu verwerfen, wenn H₁ wahr ist."
        },
        {
            q: "Increasing the sample size n, all else equal, typically has which effect on the power of a test?",
            qDE: "Eine Erhöhung des Stichprobenumfangs n hat, bei sonst gleichen Bedingungen, typischerweise welchen Effekt auf die Power eines Tests?",
            opts: ["It increases the power", "It decreases the power", "It has no effect on power", "It always sets power to 1"],
            optsDE: ["Sie erhöht die Power", "Sie verringert die Power", "Sie hat keinen Einfluss auf die Power", "Sie setzt die Power stets auf 1"],
            correct: 0,
            explain: "More data reduces the variability of the test statistic, making it easier to distinguish true effects from noise, which increases the test's ability to correctly reject a false H₀.",
            explainDE: "Mehr Daten verringern die Variabilität der Teststatistik, wodurch echte Effekte leichter vom Rauschen unterschieden werden können, was die Fähigkeit des Tests erhöht, eine falsche H₀ korrekt zu verwerfen."
        },
        {
            q: "The power function (Gütefunktion) of a test, as a function of the true parameter θ, gives:",
            qDE: "Die Gütefunktion eines Tests gibt in Abhängigkeit vom wahren Parameter θ an:",
            opts: ["The probability of rejecting H₀ for each value of θ", "The probability of accepting H₀ for each value of θ", "The sample mean for each θ", "The significance level for each θ"],
            optsDE: ["Die Wahrscheinlichkeit, H₀ für jeden Wert von θ zu verwerfen", "Die Wahrscheinlichkeit, H₀ für jeden Wert von θ anzunehmen", "Den Stichprobenmittelwert für jedes θ", "Das Signifikanzniveau für jedes θ"],
            correct: 0,
            explain: "The power function traces out the rejection probability across the entire parameter space, letting us see both the Type I error rate (under H₀) and the power (under H₁) in one function.",
            explainDE: "Die Gütefunktion zeichnet die Verwerfungswahrscheinlichkeit über den gesamten Parameterraum nach und zeigt so sowohl die Fehlerwahrscheinlichkeit 1. Art (unter H₀) als auch die Power (unter H₁) in einer einzigen Funktion."
        },
        {
            q: "For θ values under H₀, the power function of a valid level-α test should be:",
            qDE: "Für θ-Werte unter H₀ sollte die Gütefunktion eines gültigen Tests zum Niveau α:",
            opts: ["At most α", "Exactly 1", "At least 1−α", "Equal to the power"],
            optsDE: ["Höchstens α sein", "Genau 1 sein", "Mindestens 1−α sein", "Gleich der Power sein"],
            correct: 0,
            explain: "Since rejecting H₀ when it's actually true is a Type I error, a valid level-α test must keep the rejection probability under H₀ bounded by α across the whole null region.",
            explainDE: "Da das Verwerfen von H₀, wenn sie tatsächlich wahr ist, einen Fehler 1. Art darstellt, muss ein gültiger Test zum Niveau α die Verwerfungswahrscheinlichkeit unter H₀ im gesamten Nullbereich durch α beschränkt halten."
        },

        // --- Tests für den Erwartungswert ---
        {
            q: "For a one-sample test of H₀: μ = μ₀ against H₁: μ ≠ μ₀, the test is called:",
            qDE: "Für einen Ein-Stichproben-Test von H₀: μ = μ₀ gegen H₁: μ ≠ μ₀ heißt der Test:",
            opts: ["Two-sided (two-tailed) test", "One-sided (one-tailed) test", "Chi-squared test", "Approximate test only"],
            optsDE: ["Zweiseitiger Test", "Einseitiger Test", "Chi-Quadrat-Test", "Nur ein approximativer Test"],
            correct: 0,
            explain: "Since H₁ allows deviation in either direction (μ could be larger or smaller than μ₀), the rejection region must be split across both tails, making this a two-sided test.",
            explainDE: "Da H₁ eine Abweichung in beide Richtungen zulässt (μ könnte größer oder kleiner als μ₀ sein), muss der Ablehnungsbereich auf beide Enden aufgeteilt werden, was diesen Test zu einem zweiseitigen macht."
        },
        {
            q: "For a one-sample test of H₀: μ ≤ μ₀ against H₁: μ > μ₀, the test is called:",
            qDE: "Für einen Ein-Stichproben-Test von H₀: μ ≤ μ₀ gegen H₁: μ > μ₀ heißt der Test:",
            opts: ["One-sided (upper-tailed) test", "Two-sided test", "Lower-tailed test only", "A test without a rejection region"],
            optsDE: ["Einseitiger Test (oberer Ablehnungsbereich)", "Zweiseitiger Test", "Nur ein unterer Test", "Ein Test ohne Ablehnungsbereich"],
            correct: 0,
            explain: "Because H₁ only allows deviation in one direction — μ being larger than μ₀ — the entire rejection region sits in the upper tail, making this an upper-tailed one-sided test.",
            explainDE: "Da H₁ eine Abweichung nur in eine Richtung zulässt — μ größer als μ₀ — liegt der gesamte Ablehnungsbereich im oberen Ende, was diesen Test zu einem einseitigen oberen Test macht."
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
            correct: 0,
            explain: "This statistic standardizes the deviation of X̄ₙ from the hypothesized μ₀ by its known standard error σ/√n, which is exactly what makes it follow a standard normal under H₀.",
            explainDE: "Diese Statistik standardisiert die Abweichung von X̄ₙ vom hypothetischen μ₀ durch den bekannten Standardfehler σ/√n, wodurch sie unter H₀ genau einer Standardnormalverteilung folgt."
        },
        {
            q: "Under H₀, the test statistic of the one-sample Gauß-test follows:",
            qDE: "Unter H₀ folgt die Teststatistik des Ein-Stichproben-Gauß-Tests:",
            opts: ["The standard normal distribution N(0,1)", "The t-distribution with n−1 degrees of freedom", "The chi-squared distribution", "The binomial distribution"],
            optsDE: ["Der Standardnormalverteilung N(0,1)", "Der t-Verteilung mit n−1 Freiheitsgraden", "Der Chi-Quadrat-Verteilung", "Der Binomialverteilung"],
            correct: 0,
            explain: "Because σ is known and doesn't need to be estimated, the standardized statistic follows the standard normal distribution exactly, without any correction for extra uncertainty.",
            explainDE: "Da σ bekannt ist und nicht geschätzt werden muss, folgt die standardisierte Statistik exakt der Standardnormalverteilung, ohne Korrektur für zusätzliche Unsicherheit."
        },
        {
            q: "The one-sample t-test for the mean is used instead of the Gauß-test when:",
            qDE: "Der Ein-Stichproben-t-Test für den Erwartungswert wird anstelle des Gauß-Tests verwendet, wenn:",
            opts: ["The variance σ² is unknown and must be estimated from the sample", "The variance σ² is known exactly", "n is extremely large only", "The data are binomially distributed"],
            optsDE: ["Die Varianz σ² unbekannt ist und aus der Stichprobe geschätzt werden muss", "Die Varianz σ² exakt bekannt ist", "n nur extrem groß ist", "Die Daten binomialverteilt sind"],
            correct: 0,
            explain: "Whenever the true σ² isn't available and Sₙ has to stand in for it, the extra estimation uncertainty means the t-test — with its t-distributed statistic — is the appropriate choice instead of the Gauß-test.",
            explainDE: "Wenn das wahre σ² nicht verfügbar ist und Sₙ dafür einspringen muss, bedeutet die zusätzliche Schätzunsicherheit, dass der t-Test — mit seiner t-verteilten Teststatistik — anstelle des Gauß-Tests die passende Wahl ist."
        },
        {
            q: "The test statistic of the one-sample t-test for H₀: μ = μ₀ is:",
            qDE: "Die Teststatistik des Ein-Stichproben-t-Tests für H₀: μ = μ₀ lautet:",
            opts: ["T = (X̄ₙ − μ₀) / (Sₙ/√n)", "T = (X̄ₙ − μ₀) / (σ/√n)", "T = (X̄ₙ − μ₀) · Sₙ√n", "T = X̄ₙ / Sₙ"],
            optsDE: ["T = (X̄ₙ − μ₀) / (Sₙ/√n)", "T = (X̄ₙ − μ₀) / (σ/√n)", "T = (X̄ₙ − μ₀) · Sₙ√n", "T = X̄ₙ / Sₙ"],
            correct: 0,
            explain: "The t-test statistic mirrors the Gauß-test statistic exactly, but with the unknown σ swapped out for its sample estimate Sₙ, which is why it needs the t-distribution instead of the normal.",
            explainDE: "Die t-Test-Statistik entspricht genau der Gauß-Test-Statistik, jedoch mit dem unbekannten σ ersetzt durch den Stichprobenschätzer Sₙ, weshalb sie die t-Verteilung statt der Normalverteilung benötigt."
        },
        {
            q: "Under H₀, the test statistic of the one-sample t-test follows:",
            qDE: "Unter H₀ folgt die Teststatistik des Ein-Stichproben-t-Tests:",
            opts: ["The t-distribution with n−1 degrees of freedom", "The standard normal distribution N(0,1)", "The chi-squared distribution with n degrees of freedom", "The F-distribution"],
            optsDE: ["Der t-Verteilung mit n−1 Freiheitsgraden", "Der Standardnormalverteilung N(0,1)", "Der Chi-Quadrat-Verteilung mit n Freiheitsgraden", "Der F-Verteilung"],
            correct: 0,
            explain: "Estimating σ with Sₙ introduces additional randomness beyond the normal case, and accounting for this exactly gives a t-distribution with n−1 degrees of freedom under H₀.",
            explainDE: "Die Schätzung von σ durch Sₙ führt zusätzliche Zufälligkeit über den Normalfall hinaus ein, und die exakte Berücksichtigung dessen ergibt unter H₀ eine t-Verteilung mit n−1 Freiheitsgraden."
        },
        {
            q: "For a two-sided Gauß-test at level α, H₀ is rejected when:",
            qDE: "Bei einem zweiseitigen Gauß-Test zum Niveau α wird H₀ verworfen, wenn:",
            opts: ["|Z| > z_{1−α/2}", "Z > z_{1−α}", "Z < z_{α}", "|Z| < z_{1−α/2}"],
            optsDE: ["|Z| > z_{1−α/2}", "Z > z_{1−α}", "Z < z_{α}", "|Z| < z_{1−α/2}"],
            correct: 0,
            explain: "Since deviations in either direction count as evidence against a two-sided H₀, the rejection region uses the absolute value of Z compared against the split quantile z_{1−α/2}.",
            explainDE: "Da Abweichungen in beide Richtungen als Evidenz gegen eine zweiseitige H₀ zählen, verwendet der Ablehnungsbereich den Betrag von Z im Vergleich zum aufgeteilten Quantil z_{1−α/2}."
        },
        {
            q: "For a one-sided (upper-tailed) Gauß-test of H₀: μ ≤ μ₀ at level α, H₀ is rejected when:",
            qDE: "Bei einem einseitigen (oberen) Gauß-Test von H₀: μ ≤ μ₀ zum Niveau α wird H₀ verworfen, wenn:",
            opts: ["Z > z_{1−α}", "Z > z_{1−α/2}", "|Z| > z_{1−α}", "Z < z_{1−α}"],
            optsDE: ["Z > z_{1−α}", "Z > z_{1−α/2}", "|Z| > z_{1−α}", "Z < z_{1−α}"],
            correct: 0,
            explain: "Since only large positive deviations count as evidence against this upper-tailed H₀, the entire α gets placed in the upper tail, using the quantile z_{1−α} rather than z_{1−α/2}.",
            explainDE: "Da nur große positive Abweichungen als Evidenz gegen diese einseitige obere H₀ zählen, wird das gesamte α in das obere Ende gelegt, mit dem Quantil z_{1−α} statt z_{1−α/2}."
        },

        // --- Zusammenhang Test und Konfidenzintervall ---
        {
            q: "The duality between confidence intervals and hypothesis tests states that a two-sided level-α test rejects H₀: μ = μ₀ if and only if:",
            qDE: "Die Dualität zwischen Konfidenzintervallen und Hypothesentests besagt: Ein zweiseitiger Test zum Niveau α verwirft H₀: μ = μ₀ genau dann, wenn:",
            opts: ["μ₀ lies outside the (1−α) confidence interval for μ", "μ₀ lies inside the (1−α) confidence interval for μ", "The sample mean equals μ₀", "The p-value is exactly α"],
            optsDE: ["μ₀ außerhalb des (1−α)-Konfidenzintervalls für μ liegt", "μ₀ innerhalb des (1−α)-Konfidenzintervalls für μ liegt", "Der Stichprobenmittelwert gleich μ₀ ist", "Der p-Wert genau α beträgt"],
            correct: 0,
            explain: "Both the test and the interval are built from the same standardized statistic, so a value μ₀ that would be rejected by the test is precisely one that falls outside the corresponding confidence interval.",
            explainDE: "Sowohl der Test als auch das Intervall basieren auf derselben standardisierten Statistik, sodass ein Wert μ₀, der vom Test verworfen würde, genau derjenige ist, der außerhalb des entsprechenden Konfidenzintervalls liegt."
        },
        {
            q: "If the 95% confidence interval for μ is [2.1, 4.8], a two-sided test of H₀: μ = 5 at α = 0.05:",
            qDE: "Wenn das 95%-Konfidenzintervall für μ [2,1; 4,8] ist, ein zweiseitiger Test von H₀: μ = 5 zum Niveau α = 0,05:",
            opts: ["Rejects H₀, since 5 lies outside the interval", "Does not reject H₀, since 5 lies inside the interval", "Cannot be determined from the interval", "Always rejects H₀ regardless of the interval"],
            optsDE: ["Verwirft H₀, da 5 außerhalb des Intervalls liegt", "Verwirft H₀ nicht, da 5 innerhalb des Intervalls liegt", "Kann anhand des Intervalls nicht bestimmt werden", "Verwirft H₀ stets, unabhängig vom Intervall"],
            correct: 0,
            explain: "Applying the CI-test duality directly: since 5 falls outside [2.1, 4.8], the corresponding two-sided test at the same level would reject H₀: μ = 5.",
            explainDE: "Wendet man die Dualität von KI und Test direkt an: Da 5 außerhalb von [2,1; 4,8] liegt, würde der entsprechende zweiseitige Test zum gleichen Niveau H₀: μ = 5 verwerfen."
        },
        {
            q: "Constructing a confidence interval and performing a hypothesis test are related because both are based on:",
            qDE: "Die Konstruktion eines Konfidenzintervalls und die Durchführung eines Hypothesentests hängen zusammen, da beide auf Folgendem beruhen:",
            opts: ["The same test statistic and its sampling distribution", "Completely unrelated statistics", "The p-value alone", "The sample size alone"],
            optsDE: ["Derselben Teststatistik und ihrer Stichprobenverteilung", "Vollkommen unabhängigen Statistiken", "Nur dem p-Wert", "Nur dem Stichprobenumfang"],
            correct: 0,
            explain: "The duality exists precisely because both procedures start from the same pivotal quantity and its known sampling distribution — they're just two different ways of reading the same underlying calculation.",
            explainDE: "Die Dualität existiert genau deshalb, weil beide Verfahren von derselben Pivotgröße und ihrer bekannten Stichprobenverteilung ausgehen — es sind lediglich zwei verschiedene Arten, dieselbe zugrunde liegende Berechnung zu lesen."
        },

        // --- p-Wert ---
        {
            q: "The p-value of a test is defined as:",
            qDE: "Der p-Wert eines Tests ist definiert als:",
            opts: ["The probability, under H₀, of observing a test statistic at least as extreme as the one observed", "The probability that H₀ is true", "The significance level α", "The probability that H₁ is true"],
            optsDE: ["Die Wahrscheinlichkeit unter H₀, eine Teststatistik zu beobachten, die mindestens so extrem ist wie die beobachtete", "Die Wahrscheinlichkeit, dass H₀ wahr ist", "Das Signifikanzniveau α", "Die Wahrscheinlichkeit, dass H₁ wahr ist"],
            correct: 0,
            explain: "The p-value is calculated assuming H₀ is true, asking how surprising the observed data would be under that assumption — it says nothing directly about the probability of H₀ itself.",
            explainDE: "Der p-Wert wird unter der Annahme berechnet, dass H₀ wahr ist, und fragt, wie überraschend die beobachteten Daten unter dieser Annahme wären — er sagt nichts direkt über die Wahrscheinlichkeit von H₀ selbst aus."
        },
        {
            q: "Using the p-value decision rule, H₀ is rejected at significance level α when:",
            qDE: "Bei der p-Wert-Entscheidungsregel wird H₀ zum Signifikanzniveau α verworfen, wenn:",
            opts: ["p-value ≤ α", "p-value ≥ α", "p-value = 1", "p-value = 0.5"],
            optsDE: ["p-Wert ≤ α", "p-Wert ≥ α", "p-Wert = 1", "p-Wert = 0,5"],
            correct: 0,
            explain: "A small p-value means the observed data would be unlikely under H₀, so once it drops to or below the pre-set threshold α, that's taken as sufficient evidence to reject H₀.",
            explainDE: "Ein kleiner p-Wert bedeutet, dass die beobachteten Daten unter H₀ unwahrscheinlich wären, sodass es als ausreichende Evidenz gilt, H₀ zu verwerfen, sobald er auf oder unter die vorab festgelegte Schwelle α fällt."
        },
        {
            q: "A very small p-value (e.g. 0.001) provides:",
            qDE: "Ein sehr kleiner p-Wert (z. B. 0,001) liefert:",
            opts: ["Strong evidence against H₀", "Strong evidence for H₀", "No information at all", "Proof that H₁ is true with certainty"],
            optsDE: ["Starke Evidenz gegen H₀", "Starke Evidenz für H₀", "Überhaupt keine Information", "Den sicheren Beweis, dass H₁ wahr ist"],
            correct: 0,
            explain: "A p-value this small means data this extreme would be very rare if H₀ were actually true, which counts as strong evidence against H₀ — though it's not absolute proof that H₁ holds.",
            explainDE: "Ein so kleiner p-Wert bedeutet, dass so extreme Daten sehr selten wären, wenn H₀ tatsächlich wahr wäre, was als starke Evidenz gegen H₀ zählt — jedoch kein absoluter Beweis dafür ist, dass H₁ zutrifft."
        },
        {
            q: "A common misinterpretation of the p-value is to treat it as:",
            qDE: "Eine verbreitete Fehlinterpretation des p-Werts besteht darin, ihn zu behandeln als:",
            opts: ["The probability that H₀ is true given the data", "The probability, under H₀, of data as extreme as observed", "A measure of effect size", "The confidence level"],
            optsDE: ["Die Wahrscheinlichkeit, dass H₀ angesichts der Daten wahr ist", "Die Wahrscheinlichkeit unter H₀, Daten mindestens so extrem wie beobachtet zu erhalten", "Ein Maß für die Effektstärke", "Das Konfidenzniveau"],
            correct: 0,
            explain: "This is a classic reversal of conditioning: the p-value conditions on H₀ being true and asks about the data, but people often mistakenly flip it into a statement about the probability of H₀ given the data.",
            explainDE: "Dies ist eine klassische Vertauschung der Bedingung: Der p-Wert setzt voraus, dass H₀ wahr ist, und fragt nach den Daten, doch oft wird er fälschlicherweise umgedreht in eine Aussage über die Wahrscheinlichkeit von H₀ angesichts der Daten."
        },
    ],


    11: [

        // --- Asymptotischer Binomialtest ---
        {
            q: "The asymptotic (approximate) binomial test for H₀: p = p₀ uses which distribution as its approximation for the test statistic?",
            qDE: "Der asymptotische (approximative) Binomialtest für H₀: p = p₀ verwendet welche Verteilung zur Approximation der Teststatistik?",
            opts: ["The standard normal distribution N(0,1)", "The exact binomial distribution", "The t-distribution", "The chi-squared distribution"],
            optsDE: ["Die Standardnormalverteilung N(0,1)", "Die exakte Binomialverteilung", "Die t-Verteilung", "Die Chi-Quadrat-Verteilung"],
            correct: 0,
            explain: "Rather than working with the exact (and often cumbersome) binomial distribution, the asymptotic test standardizes p̂ and relies on the normal distribution as an approximation for large n.",
            explainDE: "Statt mit der exakten (und oft unhandlichen) Binomialverteilung zu arbeiten, standardisiert der asymptotische Test p̂ und stützt sich für großes n approximativ auf die Normalverteilung."
        },
        {
            q: "The test statistic of the asymptotic binomial test for H₀: p = p₀, based on p̂ = X/n, is:",
            qDE: "Die Teststatistik des asymptotischen Binomialtests für H₀: p = p₀, basierend auf p̂ = X/n, lautet:",
            opts: ["Z = (p̂ − p₀) / √(p₀(1−p₀)/n)", "Z = (p̂ − p₀) / √(p̂(1−p̂))", "Z = p̂ / p₀", "Z = (p̂ − p₀) · n"],
            optsDE: ["Z = (p̂ − p₀) / √(p₀(1−p₀)/n)", "Z = (p̂ − p₀) / √(p̂(1−p̂))", "Z = p̂ / p₀", "Z = (p̂ − p₀) · n"],
            correct: 0,
            explain: "Under H₀, the true variance of p̂ is p₀(1−p₀)/n, so the statistic standardizes the deviation p̂ − p₀ using this hypothesized (not estimated) standard error.",
            explainDE: "Unter H₀ ist die wahre Varianz von p̂ gleich p₀(1−p₀)/n, sodass die Statistik die Abweichung p̂ − p₀ mit diesem hypothetischen (nicht geschätzten) Standardfehler standardisiert."
        },
        {
            q: "The asymptotic binomial test relies on which theorem to justify the normal approximation?",
            qDE: "Der asymptotische Binomialtest stützt sich auf welchen Satz, um die Normalapproximation zu rechtfertigen?",
            opts: ["The Central Limit Theorem", "The Law of Total Probability", "Bayes' theorem", "The Fundamental Theorem of Statistics"],
            optsDE: ["Den Zentralen Grenzwertsatz", "Den Satz der totalen Wahrscheinlichkeit", "Den Satz von Bayes", "Den Hauptsatz der Statistik"],
            correct: 0,
            explain: "Since p̂ is an average of i.i.d. Bernoulli variables, the CLT is exactly what justifies treating its standardized form as approximately normal for large n.",
            explainDE: "Da p̂ ein Durchschnitt i.i.d. Bernoulli-Variablen ist, rechtfertigt genau der ZGS, seine standardisierte Form für großes n als näherungsweise normalverteilt zu behandeln."
        },
        {
            q: "A common rule of thumb for the asymptotic binomial test to be reliable is:",
            qDE: "Eine gängige Faustregel für die Zuverlässigkeit des asymptotischen Binomialtests lautet:",
            opts: ["n·p₀·(1−p₀) is sufficiently large (e.g. ≥ 9)", "n is at least 1000", "p₀ = 0.5 exactly", "The data must be continuous"],
            optsDE: ["n·p₀·(1−p₀) ist ausreichend groß (z. B. ≥ 9)", "n ist mindestens 1000", "p₀ = 0,5 genau", "Die Daten müssen stetig sein"],
            correct: 0,
            explain: "This quantity relates to how well the binomial's shape is approximated by the normal curve — a small value means the approximation can be poor regardless of how large n itself is.",
            explainDE: "Diese Größe hängt damit zusammen, wie gut die Form der Binomialverteilung durch die Normalkurve approximiert wird — ein kleiner Wert bedeutet, dass die Approximation schlecht sein kann, unabhängig davon, wie groß n selbst ist."
        },

        // --- Verbundenes Design (paired samples) ---
        {
            q: "In a paired (verbundenes) design, the two samples X₁,…,Xₙ and Y₁,…,Yₙ must satisfy:",
            qDE: "Bei einem verbundenen Design müssen die beiden Stichproben X₁,…,Xₙ und Y₁,…,Yₙ erfüllen:",
            opts: ["Both samples have the same size n, and Xᵢ and Yᵢ belong to the same unit (e.g. same subject before/after)", "The samples must have different sizes", "The samples must be independent of each other", "The variances must be known"],
            optsDE: ["Beide Stichproben haben denselben Umfang n, und Xᵢ und Yᵢ gehören zur selben Einheit (z. B. dieselbe Person vorher/nachher)", "Die Stichproben müssen unterschiedliche Umfänge haben", "Die Stichproben müssen unabhängig voneinander sein", "Die Varianzen müssen bekannt sein"],
            correct: 0,
            explain: "The defining feature of pairing is that each Xᵢ is linked to a specific Yᵢ from the same unit, which requires equal sample sizes and rules out treating the two samples as independent.",
            explainDE: "Das entscheidende Merkmal der Verbundenheit ist, dass jedes Xᵢ mit einem bestimmten Yᵢ derselben Einheit verknüpft ist, was gleiche Stichprobenumfänge erfordert und ausschließt, die beiden Stichproben als unabhängig zu behandeln."
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
            correct: 0,
            explain: "Since the paired test works entirely with the derived differences Dᵢ, the variability that matters is the spread of these differences themselves, not the raw X or Y values individually.",
            explainDE: "Da der verbundene Test vollständig mit den abgeleiteten Differenzen Dᵢ arbeitet, ist die relevante Variabilität die Streuung dieser Differenzen selbst, nicht die der rohen X- oder Y-Werte einzeln."
        },
        {
            q: "The paired-sample test essentially reduces the two-sample problem to:",
            qDE: "Der Test bei verbundenen Stichproben reduziert das Zwei-Stichproben-Problem im Wesentlichen auf:",
            opts: ["A one-sample t-test on the differences Dᵢ against H₀: E[D] = 0", "A two-sample F-test", "An unpaired t-test", "A chi-squared test"],
            optsDE: ["Einen Ein-Stichproben-t-Test auf die Differenzen Dᵢ gegen H₀: E[D] = 0", "Einen Zwei-Stichproben-F-Test", "Einen unverbundenen t-Test", "Einen Chi-Quadrat-Test"],
            correct: 0,
            explain: "By collapsing each pair into a single difference Dᵢ, the two-sample comparison becomes equivalent to asking whether these differences have mean zero — precisely a one-sample t-test.",
            explainDE: "Indem jedes Paar zu einer einzigen Differenz Dᵢ zusammengefasst wird, wird der Zwei-Stichproben-Vergleich äquivalent zur Frage, ob diese Differenzen den Erwartungswert null haben — genau ein Ein-Stichproben-t-Test."
        },
        {
            q: "Under H₀: E[D] = 0, and assuming the Dᵢ are i.i.d. normal, the statistic T = √n · D̄ / S_D follows:",
            qDE: "Unter H₀: E[D] = 0 und unter der Annahme, dass die Dᵢ i.i.d. normalverteilt sind, folgt die Statistik T = √n · D̄ / S_D:",
            opts: ["A t-distribution with n−1 degrees of freedom", "A standard normal distribution", "A chi-squared distribution with n degrees of freedom", "An F-distribution"],
            optsDE: ["Einer t-Verteilung mit n−1 Freiheitsgraden", "Einer Standardnormalverteilung", "Einer Chi-Quadrat-Verteilung mit n Freiheitsgraden", "Einer F-Verteilung"],
            correct: 0,
            explain: "Since this is really a one-sample t-test applied to the Dᵢ, and the unknown variance of D is estimated by S_D, the standard t-distribution result with n−1 degrees of freedom applies directly.",
            explainDE: "Da dies im Grunde ein Ein-Stichproben-t-Test angewendet auf die Dᵢ ist und die unbekannte Varianz von D durch S_D geschätzt wird, gilt direkt das übliche t-Verteilungsresultat mit n−1 Freiheitsgraden."
        },
        {
            q: "A paired design is typically preferred over an unpaired design when:",
            qDE: "Ein verbundenes Design wird einem unverbundenen Design typischerweise vorgezogen, wenn:",
            opts: ["Observations naturally come in related pairs (e.g. before/after on the same subject), reducing variability", "The two samples are collected from unrelated subjects", "The sample sizes differ", "The variances are known"],
            optsDE: ["Beobachtungen natürlich in zusammengehörigen Paaren vorliegen (z. B. vorher/nachher bei derselben Person), was die Variabilität verringert", "Die beiden Stichproben von nicht zusammenhängenden Personen stammen", "Die Stichprobenumfänge unterschiedlich sind", "Die Varianzen bekannt sind"],
            correct: 0,
            explain: "By differencing within the same subject, pairing cancels out subject-specific variability that would otherwise inflate the noise in an unpaired comparison, making the test more sensitive.",
            explainDE: "Durch die Differenzbildung innerhalb derselben Person hebt die Verbundenheit personenspezifische Variabilität auf, die sonst das Rauschen in einem unverbundenen Vergleich erhöhen würde, was den Test empfindlicher macht."
        },

        // --- Unverbundenes Design (unpaired samples) ---
        {
            q: "In an unpaired (unverbundenes) design, the two samples X₁,…,Xₘ and Y₁,…,Yₙ are assumed to be:",
            qDE: "Bei einem unverbundenen Design wird für die beiden Stichproben X₁,…,Xₘ und Y₁,…,Yₙ angenommen, dass sie:",
            opts: ["Independent of each other, and may have different sample sizes m ≠ n", "Always the same size", "Paired observations on the same units", "Perfectly correlated"],
            optsDE: ["Unabhängig voneinander sind und unterschiedliche Stichprobenumfänge m ≠ n haben können", "Immer denselben Umfang haben", "Gepaarte Beobachtungen derselben Einheiten sind", "Perfekt korreliert sind"],
            correct: 0,
            explain: "Without any natural pairing link between observations, the two samples are treated as coming from entirely separate groups, so there's no requirement that m and n match.",
            explainDE: "Ohne eine natürliche Verbindung zwischen den Beobachtungen werden die beiden Stichproben als aus völlig getrennten Gruppen stammend behandelt, sodass keine Anforderung besteht, dass m und n übereinstimmen."
        },
        {
            q: "An unpaired design is typically used when:",
            qDE: "Ein unverbundenes Design wird typischerweise verwendet, wenn:",
            opts: ["The two groups consist of different, unrelated subjects (e.g. treatment vs. control group)", "The same subjects are measured twice", "The sample sizes must be equal", "There is no variability between groups"],
            optsDE: ["Die beiden Gruppen aus unterschiedlichen, nicht zusammenhängenden Personen bestehen (z. B. Behandlungs- vs. Kontrollgruppe)", "Dieselben Personen zweimal gemessen werden", "Die Stichprobenumfänge gleich sein müssen", "Es keine Variabilität zwischen den Gruppen gibt"],
            correct: 0,
            explain: "When there's no way to link an observation in one group to a specific observation in the other — as with distinct treatment and control subjects — the unpaired design is the natural choice.",
            explainDE: "Wenn es keine Möglichkeit gibt, eine Beobachtung in einer Gruppe mit einer bestimmten Beobachtung in der anderen zu verknüpfen — wie bei getrennten Behandlungs- und Kontrollpersonen — ist das unverbundene Design die natürliche Wahl."
        },

        // --- F-Test auf Varianzhomogenität ---
        {
            q: "The F-test for homogeneity of variance tests the null hypothesis:",
            qDE: "Der F-Test auf Varianzhomogenität testet die Nullhypothese:",
            opts: ["H₀: σ_X² = σ_Y²", "H₀: μ_X = μ_Y", "H₀: σ_X² = 0", "H₀: p_X = p_Y"],
            optsDE: ["H₀: σ_X² = σ_Y²", "H₀: μ_X = μ_Y", "H₀: σ_X² = 0", "H₀: p_X = p_Y"],
            correct: 0,
            explain: "This test targets equality of spread between the two populations, not equality of their means or proportions — hence the null hypothesis directly compares the two variances.",
            explainDE: "Dieser Test zielt auf die Gleichheit der Streuung zwischen den beiden Grundgesamtheiten ab, nicht auf die Gleichheit ihrer Mittelwerte oder Anteile — daher vergleicht die Nullhypothese direkt die beiden Varianzen."
        },
        {
            q: "The F-test statistic for comparing two variances is:",
            qDE: "Die F-Teststatistik zum Vergleich zweier Varianzen lautet:",
            opts: ["F = S_X² / S_Y²", "F = S_X² − S_Y²", "F = S_X² · S_Y²", "F = (S_X² + S_Y²) / 2"],
            optsDE: ["F = S_X² / S_Y²", "F = S_X² − S_Y²", "F = S_X² · S_Y²", "F = (S_X² + S_Y²) / 2"],
            correct: 0,
            explain: "Comparing two variances naturally suggests looking at their ratio: under H₀, this ratio of sample variances should be close to 1, which is what the F-statistic captures.",
            explainDE: "Der Vergleich zweier Varianzen legt nahe, ihr Verhältnis zu betrachten: Unter H₀ sollte dieses Verhältnis der Stichprobenvarianzen nahe bei 1 liegen, was die F-Statistik erfasst."
        },
        {
            q: "Under H₀: σ_X² = σ_Y², assuming both samples are normal and independent, the F-statistic S_X²/S_Y² follows:",
            qDE: "Unter H₀: σ_X² = σ_Y², bei normalverteilten und unabhängigen Stichproben, folgt die F-Statistik S_X²/S_Y²:",
            opts: ["An F-distribution with (m−1, n−1) degrees of freedom", "A t-distribution with m+n−2 degrees of freedom", "A standard normal distribution", "A chi-squared distribution"],
            optsDE: ["Einer F-Verteilung mit (m−1, n−1) Freiheitsgraden", "Einer t-Verteilung mit m+n−2 Freiheitsgraden", "Einer Standardnormalverteilung", "Einer Chi-Quadrat-Verteilung"],
            correct: 0,
            explain: "A ratio of two independent chi-squared variables, each divided by its own degrees of freedom, is by definition F-distributed, with (m−1, n−1) degrees of freedom coming from the two sample variances.",
            explainDE: "Ein Verhältnis zweier unabhängiger Chi-Quadrat-Variablen, jeweils dividiert durch ihre eigenen Freiheitsgrade, ist per Definition F-verteilt, mit den Freiheitsgraden (m−1, n−1), die von den beiden Stichprobenvarianzen stammen."
        },
        {
            q: "Why is the F-test on variance homogeneity often performed before a two-sample t-test?",
            qDE: "Warum wird der F-Test auf Varianzhomogenität oft vor einem Zwei-Stichproben-t-Test durchgeführt?",
            opts: ["To check whether the equal-variance assumption needed for the standard t-test holds, or whether the Welch test should be used instead", "To estimate the sample means", "To determine the correct sample size", "Because it replaces the need for a t-test entirely"],
            optsDE: ["Um zu prüfen, ob die für den Standard-t-Test nötige Annahme gleicher Varianzen zutrifft, oder ob stattdessen der Welch-Test verwendet werden sollte", "Um die Stichprobenmittelwerte zu schätzen", "Um den richtigen Stichprobenumfang zu bestimmen", "Weil er den t-Test vollständig ersetzt"],
            correct: 0,
            explain: "The standard pooled-variance t-test is only valid under equal variances, so the F-test serves as a preliminary check to decide whether that assumption is reasonable or whether Welch's test is needed instead.",
            explainDE: "Der Standard-t-Test mit gepoolter Varianz ist nur bei gleichen Varianzen gültig, daher dient der F-Test als vorgeschaltete Prüfung, ob diese Annahme plausibel ist oder ob stattdessen der Welch-Test benötigt wird."
        },

        // --- 2-Stichproben-t-Test (gleiche Varianz) ---
        {
            q: "The two-sample t-test for a location difference μ_X − μ_Y assumes:",
            qDE: "Der Zwei-Stichproben-t-Test auf einen Lageunterschied μ_X − μ_Y setzt voraus:",
            opts: ["Both samples are normal, independent, and have equal (but unknown) variances", "Both samples have known, possibly unequal variances", "The samples are paired", "The variances are unequal"],
            optsDE: ["Beide Stichproben sind normalverteilt, unabhängig und besitzen gleiche (aber unbekannte) Varianzen", "Beide Stichproben haben bekannte, möglicherweise ungleiche Varianzen", "Die Stichproben sind verbunden", "Die Varianzen sind ungleich"],
            correct: 0,
            explain: "The standard two-sample t-test's derivation specifically relies on both groups sharing a common (though unknown) variance, which is exactly what allows pooling them into a single variance estimate.",
            explainDE: "Die Herleitung des Standard-Zwei-Stichproben-t-Tests beruht speziell darauf, dass beide Gruppen eine gemeinsame (wenn auch unbekannte) Varianz teilen, was genau erlaubt, sie zu einem einzigen Varianzschätzer zu poolen."
        },
        {
            q: "In the two-sample t-test (equal variances), the pooled variance estimator S_p² is a weighted average of:",
            qDE: "Beim Zwei-Stichproben-t-Test (gleiche Varianzen) ist der gepoolte Varianzschätzer S_p² ein gewichteter Durchschnitt aus:",
            opts: ["S_X² and S_Y², weighted by their respective degrees of freedom", "X̄ and Ȳ", "m and n only", "The F-statistic and the t-statistic"],
            optsDE: ["S_X² und S_Y², gewichtet nach ihren jeweiligen Freiheitsgraden", "X̄ und Ȳ", "Nur m und n", "Der F-Statistik und der t-Statistik"],
            correct: 0,
            explain: "Pooling combines the information from both samples' variance estimates, giving more weight to whichever sample has more degrees of freedom (i.e., more data) behind its variance estimate.",
            explainDE: "Das Poolen kombiniert die Information aus den Varianzschätzern beider Stichproben und gewichtet dabei stärker, welche Stichprobe mehr Freiheitsgrade (d. h. mehr Daten) hinter ihrem Varianzschätzer hat."
        },
        {
            q: "The test statistic for the two-sample t-test with pooled variance S_p² is:",
            qDE: "Die Teststatistik des Zwei-Stichproben-t-Tests mit gepoolter Varianz S_p² lautet:",
            opts: ["T = (X̄ − Ȳ) / (S_p · √(1/m + 1/n))", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m+n)", "T = (X̄ − Ȳ) / (S_X + S_Y)"],
            optsDE: ["T = (X̄ − Ȳ) / (S_p · √(1/m + 1/n))", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m+n)", "T = (X̄ − Ȳ) / (S_X + S_Y)"],
            correct: 0,
            explain: "Since Var(X̄ − Ȳ) = σ²(1/m + 1/n) under the equal-variance assumption, the standard error uses the pooled S_p multiplied by √(1/m + 1/n), which properly accounts for both sample sizes.",
            explainDE: "Da Var(X̄ − Ȳ) = σ²(1/m + 1/n) unter der Annahme gleicher Varianzen gilt, verwendet der Standardfehler das gepoolte S_p multipliziert mit √(1/m + 1/n), was beide Stichprobenumfänge korrekt berücksichtigt."
        },
        {
            q: "Under H₀: μ_X = μ_Y, the two-sample t-test statistic (equal variances) follows a t-distribution with how many degrees of freedom?",
            qDE: "Unter H₀: μ_X = μ_Y folgt die Zwei-Stichproben-t-Teststatistik (gleiche Varianzen) einer t-Verteilung mit wie vielen Freiheitsgraden?",
            opts: ["m + n − 2", "m + n − 1", "m − 1", "min(m, n) − 1"],
            optsDE: ["m + n − 2", "m + n − 1", "m − 1", "min(m, n) − 1"],
            correct: 0,
            explain: "Two means (X̄ and Ȳ) are estimated from the combined data, one degree of freedom is lost for each, leaving m + n − 2 degrees of freedom for the pooled variance estimate.",
            explainDE: "Aus den kombinierten Daten werden zwei Mittelwerte (X̄ und Ȳ) geschätzt, wobei für jeden ein Freiheitsgrad verloren geht, sodass m + n − 2 Freiheitsgrade für den gepoolten Varianzschätzer übrig bleiben."
        },

        // --- Welch-Test ---
        {
            q: "The Welch test is used instead of the standard two-sample t-test when:",
            qDE: "Der Welch-Test wird anstelle des Standard-Zwei-Stichproben-t-Tests verwendet, wenn:",
            opts: ["The two population variances cannot be assumed equal", "The two samples are paired", "The sample sizes are equal", "The variances are known exactly"],
            optsDE: ["Die Varianzen der beiden Grundgesamtheiten nicht als gleich angenommen werden können", "Die beiden Stichproben verbunden sind", "Die Stichprobenumfänge gleich sind", "Die Varianzen exakt bekannt sind"],
            correct: 0,
            explain: "Since the pooled t-test breaks down when variances genuinely differ between groups, the Welch test was designed specifically to handle that unequal-variance situation correctly.",
            explainDE: "Da der gepoolte t-Test versagt, wenn sich die Varianzen zwischen den Gruppen tatsächlich unterscheiden, wurde der Welch-Test speziell dafür entwickelt, diese Situation ungleicher Varianzen korrekt zu behandeln."
        },
        {
            q: "The Welch test statistic for μ_X − μ_Y is:",
            qDE: "Die Welch-Teststatistik für μ_X − μ_Y lautet:",
            opts: ["T = (X̄ − Ȳ) / √(S_X²/m + S_Y²/n)", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m·n)", "T = (X̄ − Ȳ) / (S_X² + S_Y²)"],
            optsDE: ["T = (X̄ − Ȳ) / √(S_X²/m + S_Y²/n)", "T = (X̄ − Ȳ) / S_p", "T = (X̄ − Ȳ) · √(m·n)", "T = (X̄ − Ȳ) / (S_X² + S_Y²)"],
            correct: 0,
            explain: "Without assuming equal variances, there's no valid pooled estimate to use, so Welch's statistic instead adds the two sample variances separately, each scaled by its own sample size.",
            explainDE: "Ohne die Annahme gleicher Varianzen gibt es keinen gültigen gepoolten Schätzer, den man verwenden könnte, daher addiert die Welch-Statistik stattdessen die beiden Stichprobenvarianzen getrennt, jeweils skaliert mit ihrem eigenen Stichprobenumfang."
        },
        {
            q: "Unlike the standard two-sample t-test, the Welch test uses degrees of freedom that are:",
            qDE: "Im Gegensatz zum Standard-Zwei-Stichproben-t-Test verwendet der Welch-Test Freiheitsgrade, die:",
            opts: ["Estimated from the data via the Welch–Satterthwaite equation, and generally not an integer", "Always equal to m + n − 2", "Always equal to min(m, n) − 1", "Not needed at all"],
            optsDE: ["Über die Welch-Satterthwaite-Gleichung aus den Daten geschätzt werden und in der Regel keine ganze Zahl sind", "Immer gleich m + n − 2", "Immer gleich min(m, n) − 1", "Überhaupt nicht benötigt werden"],
            correct: 0,
            explain: "Because the Welch statistic only approximately follows a t-distribution, the Welch–Satterthwaite formula computes an effective, data-dependent degrees-of-freedom value that need not come out as a whole number.",
            explainDE: "Da die Welch-Statistik nur näherungsweise einer t-Verteilung folgt, berechnet die Welch-Satterthwaite-Formel einen effektiven, datenabhängigen Freiheitsgradwert, der keine ganze Zahl sein muss."
        },
        {
            q: "A key advantage of the Welch test over the pooled-variance t-test is that it remains valid when:",
            qDE: "Ein wesentlicher Vorteil des Welch-Tests gegenüber dem gepoolten t-Test besteht darin, dass er gültig bleibt, wenn:",
            opts: ["The two groups have unequal variances and/or unequal sample sizes", "The two groups have equal variances only", "The data are not normally distributed at all", "The sample sizes must both be small"],
            optsDE: ["Die beiden Gruppen ungleiche Varianzen und/oder ungleiche Stichprobenumfänge haben", "Die beiden Gruppen nur gleiche Varianzen haben", "Die Daten überhaupt nicht normalverteilt sind", "Beide Stichprobenumfänge klein sein müssen"],
            correct: 0,
            explain: "Because Welch's test never assumes the variances are equal in the first place, it stays valid precisely in the situations — unequal variances, unequal sample sizes — where the pooled t-test would break down.",
            explainDE: "Da der Welch-Test von vornherein nie gleiche Varianzen annimmt, bleibt er genau in den Situationen gültig — ungleiche Varianzen, ungleiche Stichprobenumfänge — in denen der gepoolte t-Test versagen würde."
        },

        // --- 2-Stichproben-Binomialtest ---
        {
            q: "The two-sample binomial test compares:",
            qDE: "Der Zwei-Stichproben-Binomialtest vergleicht:",
            opts: ["Two proportions p_X and p_Y from two independent binomial samples", "Two variances from two normal samples", "Two paired means", "A single proportion against a fixed value"],
            optsDE: ["Zwei Anteile p_X und p_Y aus zwei unabhängigen Binomialstichproben", "Zwei Varianzen aus zwei Normalstichproben", "Zwei verbundene Mittelwerte", "Einen einzelnen Anteil gegen einen festen Wert"],
            correct: 0,
            explain: "This test extends the one-sample binomial test to two independent groups, asking whether their underlying success proportions p_X and p_Y differ from each other.",
            explainDE: "Dieser Test erweitert den Ein-Stichproben-Binomialtest auf zwei unabhängige Gruppen und fragt, ob sich ihre zugrunde liegenden Erfolgsanteile p_X und p_Y voneinander unterscheiden."
        },
        {
            q: "For the two-sample binomial test of H₀: p_X = p_Y, the pooled proportion estimator p̂ is computed as:",
            qDE: "Für den Zwei-Stichproben-Binomialtest von H₀: p_X = p_Y wird der gepoolte Anteilsschätzer p̂ berechnet als:",
            opts: ["(Xₛᵤᵤₘ + Yₛᵤₘ) / (m + n), i.e. total successes over total observations", "(p̂_X + p̂_Y) / 2 only", "p̂_X · p̂_Y", "max(p̂_X, p̂_Y)"],
            optsDE: ["(Summe der Erfolge in X + Y) / (m + n), also Gesamterfolge über Gesamtbeobachtungen", "Nur (p̂_X + p̂_Y) / 2", "p̂_X · p̂_Y", "max(p̂_X, p̂_Y)"],
            correct: 0,
            explain: "Under H₀ both groups are assumed to share the same true proportion, so the best combined estimate pools all successes and all observations together rather than simply averaging the two separate estimates.",
            explainDE: "Unter H₀ wird angenommen, dass beide Gruppen denselben wahren Anteil teilen, daher poolt die beste kombinierte Schätzung alle Erfolge und alle Beobachtungen zusammen, statt einfach die beiden getrennten Schätzer zu mitteln."
        },
        {
            q: "The (asymptotic) test statistic for the two-sample binomial test under H₀: p_X = p_Y is approximately:",
            qDE: "Die (asymptotische) Teststatistik des Zwei-Stichproben-Binomialtests unter H₀: p_X = p_Y ist näherungsweise:",
            opts: ["Z = (p̂_X − p̂_Y) / √(p̂(1−p̂)(1/m + 1/n))", "Z = (p̂_X − p̂_Y) / (p̂_X + p̂_Y)", "Z = p̂_X / p̂_Y", "Z = (p̂_X − p̂_Y) · m · n"],
            optsDE: ["Z = (p̂_X − p̂_Y) / √(p̂(1−p̂)(1/m + 1/n))", "Z = (p̂_X − p̂_Y) / (p̂_X + p̂_Y)", "Z = p̂_X / p̂_Y", "Z = (p̂_X − p̂_Y) · m · n"],
            correct: 0,
            explain: "Using the pooled p̂ as the common variance estimate under H₀, the standard error of p̂_X − p̂_Y becomes √(p̂(1−p̂)(1/m + 1/n)), which standardizes the observed difference in proportions.",
            explainDE: "Verwendet man das gepoolte p̂ als gemeinsamen Varianzschätzer unter H₀, ergibt sich der Standardfehler von p̂_X − p̂_Y als √(p̂(1−p̂)(1/m + 1/n)), was die beobachtete Differenz der Anteile standardisiert."
        },
        {
            q: "Under H₀, the two-sample binomial test statistic is approximately distributed as:",
            qDE: "Unter H₀ ist die Teststatistik des Zwei-Stichproben-Binomialtests näherungsweise verteilt als:",
            opts: ["N(0, 1)", "t-distribution with m+n−2 degrees of freedom", "Chi-squared distribution", "F-distribution"],
            optsDE: ["N(0, 1)", "t-Verteilung mit m+n−2 Freiheitsgraden", "Chi-Quadrat-Verteilung", "F-Verteilung"],
            correct: 0,
            explain: "As with the one-sample case, the CLT justifies approximating the standardized difference of proportions by the standard normal distribution when both sample sizes are reasonably large.",
            explainDE: "Wie im Ein-Stichproben-Fall rechtfertigt der ZGS, die standardisierte Differenz der Anteile durch die Standardnormalverteilung zu approximieren, wenn beide Stichprobenumfänge hinreichend groß sind."
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
            optsDE: ["0,5", "0,25", "0,75", "1,0"],
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
            q: "For the CDF F(x) = P(X ≤ x), what is lim F(x) for x → ∞?",
            qDE: "Für die Verteilungsfunktion F(x) = P(X ≤ x), was ist lim F(x) für x → ∞?",
            opts: ["1", "0", "0.5", "Undefined"],
            optsDE: ["1", "0", "0.5", "Undefiniert"],
            correct: 0
        },

    ],
};


